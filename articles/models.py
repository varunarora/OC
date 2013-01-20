from django.db import models
from django.contrib.auth.models import User
from meta.models import Language, Category
from license.models import License
from media.models import Image
from articles.MarkdownTextField import MarkdownTextField
from articles.jsonfield.fields import JSONField

def get_default_category():
	return Category.objects.get(pk=1)

def get_default_language():
	return Language.objects.get(pk=1)
	
def get_default_license():
	return License.objects.get(pk=1)

class ArticleRevision(models.Model):
	title = models.CharField(max_length=256)
	category = models.ForeignKey('meta.Category', default=get_default_category)
	created = models.DateTimeField(auto_now_add=True, editable=False)
	objectives = JSONField()
	body_markdown = MarkdownTextField()
	tags = models.ManyToManyField('meta.Tag', blank=True)
	user = models.ForeignKey(User)
	log = models.CharField(max_length=256)
	
	def __unicode__(self):
		return self.title

class Article(models.Model):
	revision = models.ForeignKey(ArticleRevision) # TODO: Make this editable=False
	category = models.ForeignKey('meta.Category')
	language = models.ForeignKey('meta.Language', default=get_default_language)
	created = models.DateTimeField(auto_now_add=True, editable=False)
	changed = models.DateTimeField(auto_now=True, editable=False)
	title = models.CharField(max_length=256)
	resources = models.ManyToManyField('oer.Resource', blank=True)
	# TODO: Articles should have only one image, this is wrongly done
	image = models.ManyToManyField('media.Image')
	views = models.IntegerField(editable=False, default=0)
	license = models.ForeignKey('license.License', default=get_default_license)
	slug = models.SlugField(max_length=256)
	difficulty = models.PositiveIntegerField(editable=True, default=0)
	published = models.NullBooleanField()
	
	def __unicode__(self):
		return self.title
