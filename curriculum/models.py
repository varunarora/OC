from django.db import models
from django.contrib.auth.models import User
from oc_platform import ModelUtilities as mu
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes import generic
from articles.jsonfield.fields import JSONField


class Curriculum(models.Model):
    user = models.ForeignKey(User)
    description = models.TextField(null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True, editable=False)
    visibility = models.CharField(max_length=32)
    grade = models.CharField(max_length=32)
    subject = models.CharField(max_length=32)
    textbooks = models.ManyToManyField('curriculum.Textbook', blank=True, null=True)
    units = models.ManyToManyField('curriculum.Unit', blank=True, null=True, related_name='units')
    settings = JSONField(null=True, blank=True)

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
    objectives = models.ManyToManyField('curriculum.Objective', blank=True, null=True)
    period = JSONField(null=True, blank=True)

    def __unicode__(self):
        return self.title


class Objective(models.Model):
    description = models.TextField()
    resources = models.ManyToManyField('curriculum.Resource', blank=True, null=True)
    parent = models.ForeignKey('meta.Tag', null=True, blank=True)
    meta = JSONField(null=True, blank=True)

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