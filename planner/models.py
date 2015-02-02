from django.db import models
from django.contrib.auth.models import User
from curriculum.models import SectionItem
from oer.models import Resource
from articles.jsonfield.fields import JSONField


class Event(models.Model):
    start = models.DateTimeField(null=True, blank=True)
    end = models.DateTimeField(null=True, blank=True)
    all_day = models.BooleanField(default=False)
    title = models.CharField(max_length=256)
    description = models.TextField(null=True, blank=True)
    user = models.ForeignKey(User)
    class_link = models.ForeignKey('planner.Class', null=True, blank=True)
    items = models.ManyToManyField(SectionItem, null=True, blank=True)
    resources = models.ManyToManyField(Resource, blank=True, null=True)

    def __unicode__(self):
        return self.title


class Class(models.Model):
    title = models.CharField(max_length=64)
    palette = models.CharField(max_length=32)
    schedule = JSONField(null=True, blank=True)
    user = models.ForeignKey(User)
    start = models.DateTimeField(null=True, blank=True)
    end = models.DateTimeField(null=True, blank=True)

    def __unicode__(self):
        return self.title