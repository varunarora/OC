from django.db import models
from django.contrib.auth.models import User
from license.models import License
from articles.MarkdownTextField import MarkdownTextField
from ResourceThumbnail import ResourceThumbnail
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes import generic


def get_default_license():
    return License.objects.get(id=1)


class Resource(models.Model):
    title = models.CharField(max_length=256)
    type = models.CharField(max_length=40, default='url')
    license = models.ForeignKey('license.License', default=get_default_license)
    url = models.URLField(null=True, blank=True)
    body_markdown = MarkdownTextField(null=True, blank=True)
    tags = models.ManyToManyField('meta.Tag', blank=True)
    created = models.DateTimeField(auto_now_add=True, editable=False)
    visibility = models.CharField(max_length=256)
    cost = models.FloatField()
    views = models.IntegerField(editable=False, default=0)
    user = models.ForeignKey(User)
    file = models.FileField(upload_to='resources', null=True, blank=True)
    image = models.ImageField(upload_to='resource_thumbnail', blank=True)

    def __unicode__(self):
        return self.title


def generate_thumnbnail(sender, instance, created, raw, **kwargs):
    ResourceThumbnail.generateThumbnail(instance)
    # Now disconnect the dispatcher
    post_save.disconnect(generate_thumnbnail, sender=Resource)
    instance.save()
    # Connect it again
    post_save.connect(generate_thumnbnail, sender=Resource)


from django.db.models.signals import post_save
post_save.connect(generate_thumnbnail, sender=Resource)


class Collection(models.Model):
    title = models.CharField(max_length=256)
    created = models.DateTimeField(auto_now_add=True, editable=False)
    host_type = models.ForeignKey(ContentType)
    host_id = models.PositiveIntegerField()
    host = generic.GenericForeignKey('host_type', 'host_id')
    resources = models.ManyToManyField(Resource, blank=True)
    visibility = models.CharField(max_length=256)
    changed = models.DateTimeField(auto_now=True, editable=False)
    slug = models.SlugField(max_length=256)
    creator = models.ForeignKey(User)

    def __unicode__(self):
        return self.title
