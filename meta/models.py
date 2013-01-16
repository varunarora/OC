from django.db import models

class Category(models.Model):
	title = models.CharField(max_length=256)
	parent = models.ForeignKey('self')
	project = models.NullBooleanField(default=False)
	created = models.DateTimeField(auto_now_add=True, editable=False)
	slug = models.SlugField(max_length=256, blank=True)
	
	def __unicode__(self):
		return self.title

class Tag(models.Model):
	title = models.CharField(max_length=256)
	description = models.TextField()
	created = models.DateTimeField(auto_now_add=True, editable=False)

class Language(models.Model):
	title = models.CharField(max_length=256)
	encoding = models.CharField(max_length=20, default='UTF-8')
	support = models.NullBooleanField(default=False)

	def __unicode__(self):
		return self.title
