from django.contrib.auth.models import User
from django.db import models


class UserProfile(models.Model):
    user = models.OneToOneField(User)
    dob = models.DateTimeField()
    gender = models.NullBooleanField()
    location = models.CharField(max_length=256)
    profession = models.CharField(max_length=256)
    profile_pic = models.ImageField(upload_to='profile', blank=True)

    def __unicode__(self):
        return self.user.username


class FeedItem(models.Model):
    actor = models.ForeignKey(User, related_name='actor')
    action = models.CharField(max_length=30)
    target = models.ForeignKey(User, null=True, blank=True,
                               related_name='target')
    action_object = models.CharField(max_length=30, blank=True)
    recipients = models.ManyToManyField(User, related_name="feed")

    def __unicode__(self):
        return unicode(self.action)
