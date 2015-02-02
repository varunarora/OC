from django.db import models
from django.contrib.auth.models import User
from oc_platform import ModelUtilities as mu
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes import generic
from articles.jsonfield.fields import JSONField
from django.dispatch import Signal
from django.dispatch import receiver


class Curriculum(models.Model):
    title = models.CharField(max_length=256)
    user = models.ForeignKey(User)
    description = models.TextField(null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True, editable=False)
    visibility = models.CharField(max_length=32)
    grade = models.CharField(max_length=32)
    subject = models.CharField(max_length=32)
    textbooks = models.ManyToManyField('curriculum.Textbook', blank=True, null=True)
    units = models.ManyToManyField('curriculum.Unit', blank=True, null=True, related_name='units')
    settings = JSONField(null=True, blank=True)
    standard_categories = models.ManyToManyField('curriculum.StandardCategory', blank=True, null=True)
    synced_to = models.ForeignKey('self', null=True, blank=True)
    slug = models.SlugField(max_length=256)

    def __unicode__(self):
        return self.grade + ': ' + self.subject


class Textbook(models.Model):
    title = models.CharField(max_length=256)
    units = models.ManyToManyField('curriculum.Unit', blank=True, null=True, related_name='unitsy')
    thumbnail = models.ImageField(upload_to='textbook_thumbnail', max_length=256,
        null=True, blank=True, storage=mu.get_file_storage())
    description = models.TextField(null=True, blank=True)

    def __unicode__(self):
        return self.title


class Unit(models.Model):
    unit = models.ForeignKey('oer.Unit', related_name='unit', blank=True, null=True)
    title = models.CharField(max_length=256)
    #objectives = models.ManyToManyField('curriculum.Objective', blank=True, null=True)
    sections = models.ManyToManyField('curriculum.Section', blank=True, null=True)
    period = JSONField(null=True, blank=True)

    def __unicode__(self):
        return self.title


class Section(models.Model):
    position = models.IntegerField(default=0, null=True, blank=True)
    title = models.CharField(max_length=256)
    items = models.ManyToManyField('curriculum.SectionItem', blank=True, null=True)
    settings = JSONField(null=True, blank=True)

    def __unicode__(self):
        return self.title


class SectionItem(models.Model):
    content_type = models.ForeignKey(ContentType, null=True, blank=True)
    content_id = models.PositiveIntegerField(null=True, blank=True)
    content = generic.GenericForeignKey('content_type', 'content_id')
    description = models.TextField()
    meta = JSONField(null=True, blank=True)
    resource_sets = models.ManyToManyField('curriculum.SectionItemResources', null=True, blank=True)
    position = models.PositiveIntegerField()

    def __unicode__(self):
        return self.description[:200]


class SectionItemResources(models.Model):
    title = models.CharField(max_length=256)
    resources = models.ManyToManyField('curriculum.Resource', blank=True, null=True)
    position = models.PositiveIntegerField()

    def __unicode__(self):
        return self.title


class StandardCategory(models.Model):
    title = models.CharField(max_length=256)
    standard_categories = models.ManyToManyField('self', blank=True, null=True, symmetrical=False)
    category = models.ForeignKey('meta.Category', blank=True, null=True)
    sections = models.ManyToManyField('curriculum.Section', blank=True, null=True)

    def __unicode__(self):
        return self.title[:200]

class Objective(models.Model):
    #description = models.TextField()
    #resources = models.ManyToManyField('curriculum.Resource', blank=True, null=True)
    parent = models.ForeignKey('meta.Tag', null=True, blank=True)
    #meta = JSONField(null=True, blank=True)

    def __unicode__(self):
        return self.description[:200]

class Resource(models.Model):
    resource = models.ForeignKey('oer.Resource', related_name='resourcey')
    notes = models.TextField(null=True, blank=True)

    def __unicode__(self):
        return self.resource.title


class Issue(models.Model):
    host_type = models.ForeignKey(ContentType)
    host_id = models.PositiveIntegerField()
    host = generic.GenericForeignKey('host_type', 'host_id')
    message = models.TextField(null=True, blank=True)
    reporter = models.ForeignKey(User)

    def __unicode__(self):
        return self.message[:100] if self.message else '\'' + self.host.description[:100] + '\''


class Reference(models.Model):
    source_type = models.CharField(max_length=64, null=True, blank=True)
    textbook = models.ForeignKey('Textbook')
    scope = JSONField(null=True, blank=True)


class Change(models.Model):
    action = models.CharField(max_length=32)
    path = JSONField(null=True, blank=True)
    context_type = models.ForeignKey(ContentType, related_name='change_context_type')
    context_id = models.PositiveIntegerField()
    context = generic.GenericForeignKey('context_type', 'context_id')
    target_type = models.ForeignKey(ContentType, related_name='change_target_type')
    target_id = models.PositiveIntegerField()
    target = generic.GenericForeignKey('target_type', 'target_id')
    state = models.CharField(max_length=32)
    curriculum = models.ForeignKey('Curriculum', related_name='change_curriculum')
    recipients = models.ManyToManyField(Curriculum, blank=True, null=True, related_name='change_recipients')
    created = models.DateTimeField(auto_now_add=True, editable=False)

    new_change = Signal(providing_args=['action', 'context', 'target', 'curriculum', 'path'])

    @receiver(new_change)
    def create_change(sender, **kwargs):   # FOR REAL, BRO.
        action = kwargs.get('action', None)
        context = kwargs.get('context', None)
        target = kwargs.get('target', None)
        curriculum = kwargs.get('curriculum', None)
        path = kwargs.get('path', None)

        # IF SYNC ON.
        if curriculum.settings['sync']['on']:
            # Determine state based on state of curriculum.
            state = curriculum.settings['sync']['state']

            new_change = Change(
                action=action,
                path=path,
                context=context,
                target=target,
                state=state,
                curriculum=curriculum
            )
            new_change.save()


class CurriculumSyncLink(models.Model):
    link_type = models.ForeignKey(ContentType)
    source_id = models.PositiveIntegerField()
    target_id = models.PositiveIntegerField()
    from_curriculum = models.ForeignKey('Curriculum', related_name='from_curriculum_sync')
    to_curriculum = models.ForeignKey('Curriculum', related_name='to_curriculum_sync')
