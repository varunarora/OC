import datetime
from haystack.indexes import *
from haystack import site
from oer.models import Resource

class ResourceIndex(SearchIndex):
    text = CharField(document=True, use_template=True, model_attr='title')
    date = DateTimeField(model_attr='created')
    visibility = CharField(model_attr='visibility')
    categories = MultiValueField(null=True)
    tags = MultiValueField(null=True)
    objectives = MultiValueField(null=True)
    content_auto = EdgeNgramField(model_attr='title')
    content_description = EdgeNgramField(model_attr='description')

    def index_queryset(self):
        """Used when the entire index for model is updated."""
        return Resource.objects.filter(created__lte=datetime.datetime.now())

    def prepare_tags(self, obj):
        return [tag.title for tag in obj.tags.all()]

    def prepare_categories(self, obj):
        return [cat.title for cat in obj.categories.all() if hasattr(cat, 'title')]

    def prepare_objectives(self, obj):
        try:
            return [objective for objective in obj.meta.objectives]
        except:
            return []

    def prepare_content_description(self, obj):
        if obj.description is None: return ''

site.register(Resource, ResourceIndex)
