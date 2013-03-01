from django.db import models

class License(models.Model):
	title = models.CharField(max_length=256)
	description = models.TextField()
	custom = models.NullBooleanField(default=False)
	
	def __unicode__(self):
		return self.title
