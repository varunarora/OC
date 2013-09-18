from django.conf.urls import patterns, url

from projects import views

urlpatterns = patterns(
    '',
    url(r'^new/', views.new_project, name='new'),
    url(r'^launch/', views.launch, name='launch'),
    url(r'^invite/', views.invite, name='invite'),
    url(r'^(?P<project_slug>[\w\-]+)/$', views.project_home, name='project_home'),
    url(r'^(?P<project_slug>[\w\-]+)/discussion/(?P<discussion_id>\d+)/$', views.discussion, name='project_discussion'),
    url(r'^(?P<project_slug>[\w\-]+)/discussions/$', views.discussions, name='project_discussions'),
    url(r'^(?P<project_slug>[\w\-]+)/discussions/post/$', views.post_discussion, name='post_discussion'),

    url(r'^(?P<project_slug>[\w\-]+)/browse/(?P<collection_slug>.+)/$', views.list_collection, name='list_collection'),
    url(r'^(?P<project_slug>[\w\-]+)/browse/', views.browse, name='project_browse'),
    #url(r'^(?P<project_slug>[\w\-]+)/new-collection/', views.new_collection, name='new_collection'),
    url(r'^(?P<project_id>\d+)/add/(?P<user_id>\d+)/$', views.add_member, name='add_member'),
    url(r'^(?P<project_id>\d+)/remove/(?P<user_id>\d+)/$', views.remove_member, name='remove_member'),
    url(r'^(?P<project_id>\d+)/add-admin/(?P<user_id>\d+)/$', views.add_admin, name='add_admin'),
    url(r'^(?P<project_id>\d+)/remove-admin/(?P<user_id>\d+)/$', views.remove_admin, name='remove_admin'),
)
