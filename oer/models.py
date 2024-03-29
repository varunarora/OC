from django.db import models
from django.contrib.auth.models import User
from license.models import License
from meta.models import Language
from articles.jsonfield.fields import JSONField
from articles.MarkdownTextField import MarkdownTextField
from AttachmentUtilities import AttachmentUtilities
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes import generic
from django.dispatch import Signal
from oc_platform import ModelUtilities as mu


def get_default_license():
    return License.objects.get(id=1)


def get_default_language():
    return Language.objects.get(pk=1)


class ResourceOld(models.Model):
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
    source = models.CharField(max_length=256, null=True, blank=True)
    collaborators = models.ManyToManyField(User, blank=True, null=True,
        related_name='collabsy')


class Resource(models.Model):
    title = models.CharField(max_length=256)
    license = models.ForeignKey('license.License', default=get_default_license)
    revision = models.ForeignKey('ResourceRevision', related_name="current_revision")
    user = models.ForeignKey(User)
    tags = models.ManyToManyField('meta.Tag', null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True, editable=False)
    visibility = models.CharField(max_length=256)
    cost = models.FloatField()
    views = models.IntegerField(editable=False, default=0)
    image = models.ImageField(upload_to='resource_thumbnail', max_length=256, null=True, blank=True, storage=mu.get_file_storage())
    source = models.CharField(max_length=256, null=True, blank=True)
    collaborators = models.ManyToManyField(User, blank=True, null=True,
        related_name='collabs')
    viewers = models.ManyToManyField(User, blank=True, null=True, related_name='viewers')
    categories = models.ManyToManyField('meta.Category', null=True, blank=True)
    language = models.ForeignKey('meta.Language', default=get_default_language)
    slug = models.SlugField(max_length=256)
    stage = models.CharField(max_length=64, null=True, blank=True)
    meta = models.ForeignKey('oer.ResourceMeta', null=True, blank=True)

    def __unicode__(self):
        return self.title

    collaborator_added = Signal(providing_args=["resource", "user"])
    resource_created = Signal(providing_args=["resource"])


def generate_thumnbnail(sender, instance, created, raw, **kwargs):
    if created:
        if instance.image.name == None:
            from oer.tasks import generate_thumbnail
            generate_thumbnail.delay(instance.id)

        # Now disconnect the dispatcher
        post_save.disconnect(generate_thumnbnail, sender=Resource)
        instance.save()
        # Connect it again
        post_save.connect(generate_thumnbnail, sender=Resource)


def generate_rendered_attachment(sender, instance, created, raw, **kwargs):
    from django.contrib.contenttypes.models import ContentType
    attachment_content_type = ContentType.objects.get_for_model(Attachment)

    if created and instance.revision.content_type == attachment_content_type:
        AttachmentUtilities.render_attachment(instance)
        # Now disconnect the dispatcher
        post_save.disconnect(generate_rendered_attachment, sender=Resource)
        instance.save()
        # Connect it again
        post_save.connect(generate_rendered_attachment, sender=Resource)

from django.db.models.signals import post_save
post_save.connect(generate_thumnbnail, sender=Resource)
post_save.connect(generate_rendered_attachment, sender=Resource)


class ResourceMeta(models.Model):
    objectives = JSONField(null=True, blank=True)
    prior = models.ManyToManyField('meta.Concept', null=True, blank=True)
    time = models.PositiveIntegerField()
    materials = JSONField(null=True, blank=True)
    context = JSONField(null=True, blank=True)
    show_description = models.BooleanField(default=False)


class Suggestion(models.Model):
    suggested_type = models.ForeignKey(ContentType)
    suggested_id = models.PositiveIntegerField()
    suggested = generic.GenericForeignKey('suggested_type', 'suggested_id')    
    user = models.ForeignKey(User, null=True, blank=True)
    category = models.ForeignKey('meta.Category', null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True, editable=False)


class Collection(models.Model):
    title = models.CharField(max_length=256)
    created = models.DateTimeField(auto_now_add=True, editable=False)
    host_type = models.ForeignKey(ContentType)
    host_id = models.PositiveIntegerField()
    host = generic.GenericForeignKey('host_type', 'host_id')
    resources = models.ManyToManyField(Resource, blank=True, null=True)
    units = models.ManyToManyField('oer.Unit', blank=True, null=True, related_name='unit_set')
    collaborators = models.ManyToManyField(User, blank=True, null=True,
        related_name='collaborators')
    visibility = models.CharField(max_length=256)
    changed = models.DateTimeField(auto_now=True, editable=False)
    slug = models.SlugField(max_length=256)
    creator = models.ForeignKey(User)
    categories = models.ManyToManyField('meta.Category', null=True, blank=True)
    tags = models.ManyToManyField('meta.Tag', null=True, blank=True)

    def __unicode__(self):
        return self.title
    
    collaborator_added = Signal(providing_args=["collection", "user", "request"])
    new_collection_created = Signal(providing_args=["collection", "collection_host"])


class Forks(models.Model):
    resource = models.ForeignKey('Resource', related_name='resource')
    fork_of = models.ForeignKey('Resource', related_name='fork_of')
    flag = models.CharField(max_length=64)
    created = models.DateTimeField(auto_now_add=True, editable=False)


class ResourceRevision(models.Model):
    resource = models.ForeignKey('Resource', null=True, blank=True)    
    content_type = models.ForeignKey(ContentType)
    content_id = models.PositiveIntegerField()
    content = generic.GenericForeignKey('content_type', 'content_id')
    log = models.CharField(max_length=256, null=True, blank=True)
    user = models.ForeignKey(User, null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True, editable=False)

    def __unicode__(self):
        return self.content_type.name

class Element(models.Model):
    body = JSONField()

    def __unicode__(self):
        return str(self.id)


class Document(models.Model):
    elements = models.ManyToManyField(
        'oer.Element', null=True, blank=True, through='DocumentElement')


class DocumentElement(models.Model):
    document = models.ForeignKey(Document)
    element = models.ForeignKey(Element)
    position = models.PositiveIntegerField()


class Link(models.Model):
    url = models.URLField(null=True, blank=True)
    rendered_url = models.ForeignKey('oer.Document', null=True, blank=True)
    attachment = models.ForeignKey('oer.Attachment', null=True, blank=True)


class Attachment(models.Model):
    file = models.FileField(upload_to='resources', max_length=256, null=True, blank=True, storage=mu.get_file_storage())
    rendered_file = models.FileField(upload_to='rendered_resources', max_length=256, null=True, blank=True, storage=mu.get_file_storage())


class Unit(models.Model):
    tags = models.ManyToManyField('meta.Tag', null=True, blank=True)
    question = models.CharField(max_length=256, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
