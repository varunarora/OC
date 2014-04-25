from django.db import models
from django.contrib.auth.models import User
from oer.models import Resource
from articles.MarkdownTextField import MarkdownTextField
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes import generic
from django.dispatch import Signal
from meta.models import Tag
from projects.models import GroupCategory


class Vote(models.Model):
    user = models.ForeignKey(User)
    created = models.DateTimeField(auto_now_add=True, editable=False)
    parent_type = models.ForeignKey(ContentType)
    parent_id = models.PositiveIntegerField()
    parent = generic.GenericForeignKey('parent_type', 'parent_id')
    positive = models.NullBooleanField(null=True, blank=True, default=None)

    vote_casted = Signal(providing_args=["vote"])
    resource_vote_casted = Signal(providing_args=["vote"])
    resource_revision_vote_casted = Signal(providing_args=["vote"])


class Comment(models.Model):
    body_markdown = MarkdownTextField()
    created = models.DateTimeField(auto_now_add=True, editable=False)
    user = models.ForeignKey(User)
    parent_type = models.ForeignKey(ContentType)
    parent_id = models.PositiveIntegerField()
    parent = generic.GenericForeignKey('parent_type', 'parent_id')
    #tags=models.ForeignKey(Tag)

    def __unicode__(self):
        return str(self.parent_type) + ": " + str(self.parent_id)

    comment_created = Signal(providing_args=["comment_id", "parent_type", "request"])


class CommentReference(models.Model):
    comment = models.ForeignKey('interactions.Comment', null=True, blank=True)
    reference = models.CharField(max_length=64)
    owner_type = models.ForeignKey(ContentType)
    owner_id = models.PositiveIntegerField()
    owner = generic.GenericForeignKey('owner_type', 'owner_id')    


class Favorite(models.Model):
    user = models.ForeignKey(User)
    created = models.DateTimeField(auto_now_add=True, editable=False)    
    resource = models.ForeignKey(Resource)

    resource_favorited = Signal(providing_args=["favorite", "request"])
