from django.conf.urls import patterns, url

from oer import views

urlpatterns = patterns('',
	url(r'^download/(?P<resource_id>.+)/$', views.download, name='download'),
	url(r'^(?P<resource_id>.+)/$', views.view_resource, name='read'),

	url(r'^$', views.resource_center, name='resource_center'),
)
