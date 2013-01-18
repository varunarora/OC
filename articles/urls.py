from django.conf.urls import patterns, url

from articles import views

urlpatterns = patterns('',
	#url(r'^$', views.index, name='index'),
	
	url(r'^(?P<category_slug>.+)/$', views.reader, name='reader'),

	url(r'^$', views.catalog, name='catalog'),
)
