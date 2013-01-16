from django.conf.urls import patterns, url

from articles import views

urlpatterns = patterns('',
	#url(r'^$', views.index, name='index'),
	url(r'^(?P<category_slug>\w+)/(?P<article_slug>\w+)/$', views.read_article, name='read'),
	
	url(r'^(?P<category_slug>\w+)/', views.category_catalog, name='category_catalog'),
	
	url(r'^$', views.catalog, name='catalog'),
)
