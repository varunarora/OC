from django.conf.urls import patterns, url

from meta import views

urlpatterns = patterns(
    '',
    #url(r'^$', views.index, name='index'),
    url(r'^standards/tree/', views.get_standards_tree, name='get_standards_tree'),
    #url(r'^(?P<number>\d+)/$', views.match, name='match')
)
