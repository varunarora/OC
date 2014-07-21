from django.db import models
from django.contrib.auth.models import User
from oc_platform import ModelUtilities as mu

class Image(models.Model):
    path = models.ImageField(upload_to='images/uploads', storage=mu.get_file_storage())
    title = models.CharField(max_length=256)
    info = models.CharField(max_length=256)
    user = models.ForeignKey(User)
    created = models.DateTimeField(auto_now_add=True, editable=False)

    def __unicode__(self):
        return self.path.name


class ImagePosition(models.Model):
    top = models.IntegerField(default=50)
    left = models.IntegerField(default=50)
