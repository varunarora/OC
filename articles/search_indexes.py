import datetime
from haystack.indexes import *
from haystack import site
from articles.models import Article
from oer.models import Resource

class ArticleIndex(SearchIndex):
    title = CharField(document=True, use_template=True)
    date = DateTimeField(model_attr='created')

    def index_queryset(self):
        """Used when the entire index for model is updated."""
        return Article.objects.filter(created__lte=datetime.datetime.now())

class ResourceIndex(SearchIndex):
    title = CharField(document=True, use_template=True)
    date = DateTimeField(model_attr='created')
    
    def index_queryset(self):
        """Used when the entire index for model is updated."""
        return Resource.objects.filter(created__lte=datetime.datetime.now())
        
site.register(Article, ArticleIndex)
site.register(Resource, ResourceIndex)
