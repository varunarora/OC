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
    parent_type = models.ForeignKey(ContentType, related_name='comment_parent_type')
    parent_id = models.PositiveIntegerField()
    parent = generic.GenericForeignKey('parent_type', 'parent_id')
    category = models.ForeignKey(GroupCategory, null=True, blank=True, default=None)
    attachment_type = models.ForeignKey(ContentType, null=True, blank=True)
    attachment_id = models.PositiveIntegerField(null=True, blank=True)
    attachment = generic.GenericForeignKey('attachment_type', 'attachment_id')
    #tags=models.ForeignKey(Tag)
    classification = models.CharField(max_length=64, null=True, blank=True)

    def __unicode__(self):
        return str(self.parent_type) + ": " + str(self.parent_id)

    comment_created = Signal(providing_args=['comment_id', 'parent_type_id', 'host'])


def remove_comment_activity(sender, instance, created=None, raw=None, **kwargs):
    from django.contrib.contenttypes.models import ContentType
    comment_ct = ContentType.objects.get_for_model(Comment)

    from user_account.models import Activity
    comment_actions = Activity.objects.filter(
        action_type=comment_ct, action_id=instance.id)

    comment_targets = Activity.objects.filter(
        target_type=comment_ct, target_id=instance.id)

    comment_context = Activity.objects.filter(
        context_type=comment_ct, context_id=instance.id)

    comment_activities = comment_actions | comment_targets | comment_context

    for activity in comment_activities:
        activity.delete()

from django.db.models.signals import post_delete
post_delete.connect(remove_comment_activity, sender=Comment)


class CommentReference(models.Model):
    comment = models.ForeignKey('interactions.Comment', null=True, blank=True)
    reference = models.CharField(max_length=64)
    owner_type = models.ForeignKey(ContentType)
    owner_id = models.PositiveIntegerField()
    owner = generic.GenericForeignKey('owner_type', 'owner_id')    


class Favorite(models.Model):
    user = models.ForeignKey(User)
    created = models.DateTimeField(auto_now_add=True, editable=False)    
    parent_type = models.ForeignKey(ContentType)
    parent_id = models.PositiveIntegerField()
    parent = generic.GenericForeignKey('parent_type', 'parent_id')

    item_favorited = Signal(providing_args=["host", "favorite_id"])


class Review(models.Model):
    comment = models.ForeignKey('interactions.Comment', null=True, blank=True)
    rating = models.PositiveIntegerField()
