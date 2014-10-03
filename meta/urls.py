from django.conf.urls import patterns, url

from meta import views

urlpatterns = patterns(
    '',
    #url(r'^$', views.index, name='index'),
    url(r'^standards/tree/', views.get_standards_tree, name='get_standards_tree'),
    #url(r'^(?P<number>\d+)/$', views.match, name='match')
    url(r'^api/standards/$', views.get_standards, name='get_standards'),
    url(r'^api/get-child-tags-from-category/(?P<category_id>\d+)/$', views.get_child_tags_from_category, name='get_child_tags_from_category'),
    url(r'^api/get-nested-child-tags-from-category/(?P<category_id>\d+)/$', views.get_nested_child_tags_from_category, name='get_nested_child_tags_from_category'),
    url(r'^api/standard/(?P<category_id>\d+)/$', views.get_standard, name='get_standard'),
    url(r'^api/get-mappings-from-standard/(?P<standard_id>\d+)/$', views.get_mappings, name='get_mappings'),
    url(r'^api/get-links-from-standard/(?P<standard_id>\d+)/$', views.get_links, name='get_links'),

    url(r'^api/mapping/create/$', views.create_mapping, name='create_mapping'),
    url(r'^api/mapping/update/$', views.update_mapping, name='update_mapping'),
    url(r'^api/mapping/delete/$', views.delete_mapping, name='delete_mapping'),

    url(r'^api/link-objective/create-update/$', views.link_objective_to_standard, name='link_objective_to_standard'),

    url(r'^api/topic/search/(?P<query>[\w\ \-\.]+)/$', views.autocomplete_topic, name='autocomplete_topic'),
    url(r'^api/concept/search/(?P<query>[\w\ \-\.]+)/$', views.autocomplete_concept, name='autocomplete_concept'),
    url(r'^api/standard/search/(?P<query>[\w\ \-\.]+)/$', views.autocomplete_standard, name='autocomplete_standard'),

    url(r'^standard/(?P<tag_title>[\w\-\.]+)/$', views.standard, name='standard'),

    # Internal tools.
    url(r'^standards/play/', views.play, name='play'),
)
