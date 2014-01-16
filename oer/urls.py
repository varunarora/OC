from django.conf.urls import patterns, url

from oer import views

urlpatterns = patterns(
    '',
    url(r'^download/(?P<resource_id>.+)/$', views.download, name='download'),
    url(r'^add-video/$', views.add_video, name='add_video'),
    url(r'^add-link/$', views.add_url, name='add_url'),
    url(r'^new-document/$', views.new_document, name='new_document'),

    # Collections
    url(r'^new-collection/project/(?P<project_slug>[\w\-]+)/', views.new_project_collection, name='new_project_collection'),
    url(r'^new-collection/user/(?P<username>\w+)/', views.new_user_collection, name='new_user_collection'),

    # Resources API
    url(r'^delete-resource/(?P<resource_id>.+)/', views.delete_resource, name='delete_resource'),
    url(r'^delete-collection/(?P<collection_id>.+)/', views.delete_collection, name='delete_collection'),

    url(r'^resource-comments/(?P<resource_id>.+)/', views.get_resource_comments, name='get_resource_comments'),

    url(r'^collection/(?P<collection_id>\d+)/tree/(?P<host>[\w\-]+)/$', views.collection_tree, name='collection_tree'),
    url(r'^tree/(?P<host>[\w\-]+)/$', views.user_tree, name='user_tree'),

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

    url(r'^(?P<resource_id>\d+)/$', views.view_resource_by_id, name='read_by_id_old'),
    url(r'^(?P<resource_id>\d+)/edit/$', views.edit_resource, name='edit_resource'),
    url(r'^(?P<resource_id>\d+)/history/$', views.view_history, name='view_history'),

    url(r'^$', views.resource_center, name='resource_center'),
)
