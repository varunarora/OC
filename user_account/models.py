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
    actor = models.CharField(max_length=30)
    action = models.CharField(max_length=30)
    target = models.CharField(max_length=30)
    recipients = models.CharField(max_length=60)

    def __unicode__(self):
        return "".join(self.recipients)
