from django.db import models
from django.contrib.auth.models import User
from license.models import License
from articles.MarkdownTextField import MarkdownTextField
from ResourceThumbnail import ResourceThumbnail
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes import generic
from articles.models import Node


def get_default_license():
    return License.objects.get(id=1)


class Resource(models.Model):
    title = models.CharField(max_length=256)
    type = models.CharField(max_length=40, default='url')
    license = models.ForeignKey('license.License', default=get_default_license)
    url = models.URLField(blank=True)
    body_markdown = MarkdownTextField()
    tags = models.ManyToManyField('meta.Tag', blank=True)
    created = models.DateTimeField(auto_now_add=True, editable=False)
    cost = models.FloatField()
    views = models.IntegerField(editable=False, default=0)
    user = models.ForeignKey(User)
    file = models.FileField(upload_to='resources')
    image = models.ImageField(upload_to='resource_thumbnail', blank=True)

    def save(self, *args, **kwargs):
        ResourceThumbnail.generateThumbnail(self)
        newResource = super(Resource, self).save(*args, **kwargs)
        return newResource

    def __unicode__(self):
        return self.title


class Collection(models.Model):
    title = models.CharField(max_length=256)
    created = models.DateTimeField(auto_now_add=True, editable=False)
    host_type = models.ForeignKey(ContentType)
    host_id = models.PositiveIntegerField()
    host = generic.GenericForeignKey('host_type', 'host_id')
    nodes = models.ManyToManyField(Node, blank=True)
    visibility = models.CharField(max_length=256)
    changed = models.DateTimeField(auto_now=True, editable=False)
    slug = models.SlugField(max_length=256)

    def __unicode__(self):
        return self.title
