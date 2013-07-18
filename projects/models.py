from django.db import models
from django.contrib.auth.models import User
from articles.MarkdownTextField import MarkdownTextField


class Project(models.Model):
    title = models.CharField(max_length=256)
    created = models.DateTimeField(auto_now_add=True, editable=False)
    collection = models.ForeignKey('oer.Collection')
    short_description = models.CharField(max_length=256)
    description = MarkdownTextField()
    admins = models.ManyToManyField(User, related_name="admins")
    members = models.ManyToManyField(User, blank=True, related_name="members")
    cover_pic = models.ImageField(upload_to='project', blank=True)
    visibility = models.CharField(max_length=256)
    meta = models.TextField(blank=True)
    slug = models.SlugField(max_length=256)

    def __unicode__(self):
        return self.title
