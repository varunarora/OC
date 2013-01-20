from django.conf.urls.defaults import *
from haystack.views import SanitizedSearchView


urlpatterns = patterns('haystack.views',
    url(r'^$', SanitizedSearchView(), name='haystack_search'),
)
