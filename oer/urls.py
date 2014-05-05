from django.conf.urls import patterns, url

from oer import views

urlpatterns = patterns(
    '',
    url(r'^download/(?P<resource_id>\d+)/$', views.download, name='download'),
    url(r'^add-video/$', views.add_video, name='add_video'),
    url(r'^add-link/$', views.add_url, name='add_url'),
    url(r'^new-document/$', views.new_document, name='new_document'),
    url(r'^new-lesson/$', views.new_lesson, name='new_lesson'),
    url(r'^new-unit/$', views.new_unit, name='new_unit'),

    # Collections
    url(r'^new-collection/project/(?P<project_slug>[\w\-]+)/', views.new_project_collection, name='new_project_collection'),
    url(r'^new-collection/user/(?P<username>\w+)/', views.new_user_collection, name='new_user_collection'),

    # Resources API
    url(r'^delete-resource/(?P<resource_id>\d+)/from/(?P<collection_id>.+)/$', views.delete_resource, name='delete_resource'),
    url(r'^delete-collection/(?P<collection_id>\d+)/$', views.delete_collection, name='delete_collection'),

    url(r'^resource-comments/(?P<resource_id>\d+)/', views.get_resource_comments, name='get_resource_comments'),

    url(r'^collection/(?P<collection_id>\d+)/tree/(?P<ask>[\w\-]+)/(?P<host>[\w\-]+)/$', views.collection_tree, name='collection_tree'),
    url(r'^tree/(?P<ask>[\w\-]+)/(?P<host>[\w\-]+)/$', views.user_tree, name='user_tree'),
    url(r'^raw-tree/(?P<ask>[\w\-]+)/(?P<host>[\w\-]+)/$', views.raw_user_collection_tree, name='raw_user_collection_tree'),

    url(r'^parent-collection-from-collection/(?P<collection_id>\d+)/$', views.get_parent_collection_from_collection, name='get_parent_collection_from_collection'),
    url(r'^collection-from-resource/(?P<resource_id>\d+)/$', views.get_collection_from_resource, name='get_collection_from_resource'),

    url(r'^collection/(?P<collection_id>\d+)/add/(?P<user_id>\d+)/$', views.add_user_to_collection, name='add_user_to_collection'),
    url(r'^collection/(?P<collection_id>\d+)/remove/(?P<user_id>\d+)/$', views.remove_user_from_collection, name='remove_user_from_collection'),
    url(r'^collection/(?P<collection_id>\d+)/list-collaborators/$', views.list_collection_collaborators, name='list_collection_collaborators'),
    url(r'^collection/(?P<collection_id>\d+)/visibility/propagate-changes/$', views.propagate_collection_visibility, name='propagate_collection_visibility'),
    url(r'^collection/(?P<collection_id>\d+)/visibility/(?P<visibility>[\w\-]+)/$', views.change_collection_visibility, name='change_collection_visibility'),
    url(r'^collection/(?P<collection_id>\d+)/copy/to/(?P<to_collection_id>\d+)/$', views.copy_collection_to_collection, name='copy_collection_to_collection'),

    url(r'^resource/(?P<resource_id>\d+)/add/(?P<user_id>\d+)/$', views.add_user_to_resource, name='add_user_to_resource'),
    url(r'^resource/(?P<resource_id>\d+)/remove/(?P<user_id>\d+)/$', views.remove_user_from_resource, name='remove_user_from_resource'),
    url(r'^resource/(?P<resource_id>\d+)/list-collaborators/$', views.list_resource_collaborators, name='list_resource_collaborators'),
    url(r'^resource/(?P<resource_id>\d+)/visibility/(?P<visibility>[\w\-]+)/$', views.change_resource_visibility, name='change_resource_visibility'),
    url(r'^resource/(?P<resource_id>\d+)/copy/from/(?P<from_collection_id>\d+)/to/(?P<to_collection_id>\d+)/$', views.copy_resource_to_collection, name='copy_resource_to_collection'),
    url(r'^resource/(?P<resource_id>\d+)/link/from/(?P<from_collection_id>\d+)/to/(?P<to_collection_id>\d+)/$', views.link_resource_to_collection, name='link_resource_to_collection'),

    url(r'^document-element/(?P<document_element_id>\d+)/comments/$', views.get_document_element_comments, name='get_document_element_comments'),

    url(r'^move/resource/(?P<resource_id>\d+)/from/(?P<from_collection_id>\d+)/to/(?P<to_collection_id>\d+)/$', views.move_resource_to_collection, name='move_resource_to_collection'),    
    url(r'^move/collection/(?P<collection_id>\d+)/from/(?P<from_collection_id>\d+)/to/(?P<to_collection_id>\d+)/$', views.move_collection_to_collection, name='move_collection_to_collection'),

    url(r'^(?P<resource_id>\d+)/build-export-document/$', views.build_export_document, name='build_export_document'),

    url(r'^(?P<resource_id>\d+)/$', views.view_resource_by_id, name='read_by_id_old'),
    url(r'^(?P<resource_id>\d+)/edit/$', views.edit_resource, name='edit_resource'),
    url(r'^(?P<resource_id>\d+)/history/$', views.view_history, name='view_history'),

    url(r'^api/search/(?P<query>[\w\ ]+)/$', views.autocomplete_search, name='autocomplete'),
    url(r'^api/editor-search/(?P<query>[\w\ ]+)/$', views.editor_autocomplete_search, name='editor-autocomplete'),
    url(r'^api/load-resources/(?P<collection_id>\d+)/from/(?P<resource_count>\d+)/$', views.load_resources, name='load_resources'),
    url(r'^api/load-browse-resources/(?P<category_id>\d+)/from/(?P<last_category_id>\d+)/$', views.load_browse_resources, name='load_browse_resources'),
    url(r'^api/search-category/(?P<category_id>\d+)/from/(?P<last_category_id>\d+)/query/(?P<query>[\w\ ]+)/$', views.search_category, name='search_category'),

    url(r'^api/post-existing/$', views.post_existing_resource_collection, name='post_existing_resource_collection'),
    url(r'^api/post-url/$', views.post_url, name='post_url'),

    url(r'^template/five-step-lesson-plan/$', views.template_five_step_lesson_plan, name='template_five_step_lesson_plan'),
    url(r'^template/three-act-lesson/$', views.template_three_act_lesson, name='template_three_act_lesson'),
    url(r'^template/understanding-by-design-lesson-plan/$', views.template_understanding_by_design_lesson_plan, name='template_understanding_by_design_lesson_plan'),
    url(r'^template/weekly-lesson-plan/$', views.template_weekly_lesson_plan, name='template_weekly_lesson_plan'),
    url(r'^template/simple-lesson-plan/$', views.template_simple_lesson_plan, name='template_simple_lesson_plan'),

    url(r'^unit/(?P<unit_id>\d+)/(?P<unit_slug>[\w\-]+)/edit/$', views.edit_unit, name='edit_unit'),

    url(r'^$', views.resource_center, name='resource_center'),
)
