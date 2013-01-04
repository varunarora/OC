from django.db import models

class Image(models.Model):
	path = models.ImageField(upload_to='images')
	title = models.CharField(max_length=256)
	info = models.CharField(max_length=256)