from django.conf.urls import patterns, url

from articles import views

urlpatterns = patterns('',
	#url(r'^$', views.index, name='index'),
	url(r'^(?P<subject>\w+)/(?P<article_slug>\w+)/$', views.read_article, name='read')
)
