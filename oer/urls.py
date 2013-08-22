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

    url(r'^(?P<resource_id>\d+)/edit/$', views.edit_resource, name='edit_resource'),
    url(r'^(?P<resource_id>\d+)/$', views.view_resource, name='read'),

    url(r'^$', views.resource_center, name='resource_center'),
)
