import datetime
from haystack.indexes import *
from haystack import site
from oer.models import Resource

class ResourceIndex(SearchIndex):
    text = CharField(document=True, use_template=True, model_attr='title')
    date = DateTimeField(model_attr='created')
    visibility = CharField(model_attr='visibility')
    category = CharField(model_attr='category', null=True)
    tags = MultiValueField(null=True)
    objectives = MultiValueField(null=True)
    content_auto = EdgeNgramField(model_attr='title')

    def index_queryset(self):
        """Used when the entire index for model is updated."""
        return Resource.objects.filter(created__lte=datetime.datetime.now())
        
    def prepare_tags(self, obj):
        return [tag.title for tag in obj.tags.all()]

    def prepare_category(self, obj):
        return obj.category.title if hasattr(obj.category, 'title') else None

    def prepare_objectives(self, obj):
        try:
            return [objective for objective in obj.meta.objectives]
        except:
            return []

site.register(Resource, ResourceIndex)
