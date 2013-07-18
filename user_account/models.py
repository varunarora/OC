from django.contrib.auth.models import User
from django.db import models


class UserProfile(models.Model):
    user = models.OneToOneField(User, related_name='profile')
    dob = models.DateTimeField()
    gender = models.NullBooleanField()
    location = models.CharField(max_length=256)
    profession = models.CharField(max_length=256)
    profile_pic = models.ImageField(upload_to='profile', blank=True)
    subscribers = models.ManyToManyField('self', symmetrical=False,
                                         related_name="subscribees",
                                         blank=True, null=True)

    def __unicode__(self):
        return self.user.username


class Activity(models.Model):
    actor = models.ForeignKey(User, related_name='actor')
    action = models.CharField(max_length=30)
    target = models.ForeignKey(User, null=True, blank=True,
                               related_name='target')
    action_object = models.CharField(max_length=30, blank=True, null=True)
    recipients = models.ManyToManyField(User, related_name="feed")

    def __unicode__(self):
        return unicode(self.action)

from interactions.models import new_comment
from user_account.views import add_activity
new_comment.connect(add_activity)
