from django.db import models

from django.contrib.auth.models import User
from meta.models import Language, Category, TagLabel
from license.models import License

from articles.MarkdownTextField import MarkdownTextField
from articles.jsonfield.fields import JSONField
from ArticleThumbnail import ArticleThumbnail


def get_default_category():
    return Category.objects.get(pk=1)


def get_default_language():
    return Language.objects.get(pk=1)


def get_default_license():
    return License.objects.get(pk=1)


class ArticleRevision(models.Model):
    article = models.ForeignKey('Article', null=True, blank=True)
    title = models.CharField(max_length=256)
    category = models.ForeignKey('meta.Category', default=get_default_category)
    created = models.DateTimeField(auto_now_add=True, editable=False)
    objectives = JSONField()
    body_markdown = MarkdownTextField()
    tags = models.ManyToManyField('meta.Tag', null=True, blank=True)
    issues = models.ManyToManyField(TagLabel, null=True, blank=True)
    user = models.ForeignKey(User, null=True, blank=True)
    log = models.CharField(max_length=256, blank=True)
    flag = models.CharField(max_length=64)

    def __unicode__(self):
        return self.title


class Article(models.Model):
    # TODO: Make this editable=False
    revision = models.ForeignKey('ArticleRevision', related_name="current_revision")
    category = models.ForeignKey('meta.Category')
    language = models.ForeignKey('meta.Language', default=get_default_language)
    created = models.DateTimeField(auto_now_add=True, editable=False)
    changed = models.DateTimeField(auto_now=True, editable=False)
    title = models.CharField(max_length=256)
    resources = models.ManyToManyField('oer.Resource', blank=True)
    image = models.ImageField(upload_to='article', blank=True)
    views = models.IntegerField(editable=False, default=0)
    license = models.ForeignKey('license.License', default=get_default_license)
    slug = models.SlugField(max_length=256)
    difficulty = models.PositiveIntegerField(editable=True, default=0)
    published = models.NullBooleanField()
    citation = models.CharField(max_length=1024, blank=True, null=True)
    resource = models.ForeignKey('oer.Resource', related_name='resource_redirect')

    def __unicode__(self):
        return self.title

    def save(self, *args, **kwargs):
        #TODO: Shouldn't need to create instance object
        a = ArticleThumbnail()
        a.generateThumbnail(self)
        return super(Article, self).save(*args, **kwargs)


class SuggestedArticle(models.Model):
    article = models.ForeignKey('Article')
    revision = models.ForeignKey('ArticleRevision')
    suggested_users = models.ManyToManyField(User, blank=True)

    def __unicode__(self):
        return self.article.title
