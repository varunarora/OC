from django.conf.urls import patterns, url

from meta import views

urlpatterns = patterns(
    '',
    #url(r'^$', views.index, name='index'),
    url(r'^standards/tree/', views.get_standards_tree, name='get_standards_tree'),
    #url(r'^(?P<number>\d+)/$', views.match, name='match')
    url(r'^api/standards/$', views.get_standards, name='get_standards'),
    url(r'^api/get-child-tags-from-category/(?P<category_id>\d+)/$', views.get_child_tags_from_category, name='get_child_tags_from_category'),

    url(r'^api/topic/search/(?P<query>[\w\ ]+)/$', views.autocomplete_topic, name='autocomplete_topic'),
    url(r'^api/concept/search/(?P<query>[\w\ ]+)/$', views.autocomplete_concept, name='autocomplete_concept'),
    url(r'^api/standard/search/(?P<query>[\w\ \-\.]+)/$', views.autocomplete_standard, name='autocomplete_standard'),

    url(r'^standard/(?P<tag_title>[\w\-\.]+)/$', views.standard, name='standard'),
)
