from django.db import models
from django.contrib.auth.models import User
from articles.MarkdownTextField import MarkdownTextField
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes import generic
from django.dispatch import Signal


class Comment(models.Model):
    body_markdown = MarkdownTextField()
    created = models.DateTimeField(auto_now_add=True, editable=False)
    user = models.ForeignKey(User)
    parent_type = models.ForeignKey(ContentType)
    parent_id = models.PositiveIntegerField()
    parent = generic.GenericForeignKey('parent_type', 'parent_id')

    def __unicode__(self):
        return str(self.parent_type) + ": " + str(self.parent_id)

    comment_created = Signal(providing_args=["comment_id"])


"""
class Favorite(models.Model):


class Rating(models.Model):


"""
