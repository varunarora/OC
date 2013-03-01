from django.db import models
from django.contrib.auth.models import User
from license.models import License
from articles.MarkdownTextField import MarkdownTextField
from ResourceThumbnail import ResourceThumbnail

def get_default_license():
	return License.objects.get(id=1)

class Resource(models.Model):
	title = models.CharField(max_length=256)
	type = models.CharField(max_length=40, default='url')
	license = models.ForeignKey('license.License', default=get_default_license)
	url = models.URLField(blank=True)
	body_markdown = MarkdownTextField()
	tags = models.ManyToManyField('meta.Tag', blank=True)
	created = models.DateTimeField(auto_now_add=True, editable=False)
	cost = models.FloatField()
	views = models.IntegerField(editable=False, default=0)
	user = models.ForeignKey(User)
	file = models.FileField(upload_to='resources')
	
	def save(self, *args, **kwargs):
		newResource = super(Resource, self).save(*args, **kwargs)
		ResourceThumbnail.generateThumbnail(self)
		return newResource
			
	def __unicode__(self):
		return self.title
