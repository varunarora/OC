from django.db import models
from django.contrib.auth.models import User
from media.models import ImagePosition
from articles.MarkdownTextField import MarkdownTextField
from django.dispatch import Signal


class Project(models.Model):
    title = models.CharField(max_length=256)
    created = models.DateTimeField(auto_now_add=True, editable=False)
    collection = models.ForeignKey('oer.Collection', null=True, blank=True)
    short_description = models.CharField(max_length=256)
    description = MarkdownTextField()
    admins = models.ManyToManyField(User, related_name='admins')
    members = models.ManyToManyField(
        User, blank=True, related_name='members', through='Membership')
    cover_pic = models.ImageField(upload_to='project', blank=True)
    cover_pic_position = models.ForeignKey(ImagePosition)
    visibility = models.CharField(max_length=256)
    meta = models.TextField(blank=True)
    slug = models.SlugField(max_length=256)

    def __unicode__(self):
        return self.title

    discussion_post_created = Signal(providing_args=["comment_id"])
    project_created = Signal(providing_args=["project", "creator"])

    @property
    def confirmed_members(self):
        return self.members.filter(membership__confirmed=True)


class Membership(models.Model):
    project = models.ForeignKey(Project)
    user = models.ForeignKey(User)
    confirmed = models.BooleanField()
    joined = models.DateTimeField(auto_now_add=True, editable=False)

    new_invite_request = Signal(providing_args=["membership_id", "request"])
    invite_request_accepted = Signal(providing_args=["membership_id", "request"])
    new_member = Signal(providing_args=["membership_id", "request"])

    new_member_added = Signal(providing_args=["membership_id"])
    member_turned_admin = Signal(providing_args=["project", "user", "request"])

    def __unicode__(self):
        return str(self.project.title) + ":" + str(self.user.id)


class GroupCategory(models.Model):
    title = models.CharField(max_length=256)
    parent = models.ForeignKey(Project)
    created = models.DateTimeField(auto_now_add=True, editable=False)
    slug = models.SlugField(max_length=256, blank=True)

    def __unicode__(self):
        return self.title
