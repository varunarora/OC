from django.conf.urls import patterns, include, url
from django.conf import settings

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns(
    '',
    # Discussion board stuff
    # TODO: Editing a post
    url(r'^board/(\d+)/$', 'oc_platform.views.discussionBoard', name='board'),
    url(r'^topic/(\d+)/$', 'oc_platform.views.topic', name='topic'),
)

