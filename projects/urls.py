from django.conf.urls import patterns, url

from projects import views

urlpatterns = patterns(
    '',
    url(r'^new/', views.new_project, name='new'),
    url(r'^launch/', views.launch, name='launch'),
    url(r'^invite/', views.invite, name='invite'),
    url(r'^(?P<project_slug>[\w\-]+)/$', views.project_home, name='project_home'),
    url(r'^(?P<project_slug>[\w\-]+)/members/', views.members, name='project_members'),
    url(r'^(?P<project_slug>[\w\-]+)/about/', views.about, name='project_about'),
    url(r'^(?P<project_slug>[\w\-]+)/browse/(?P<collection_slug>.+)/$', views.list_collection, name='list_collection'),
    url(r'^(?P<project_slug>[\w\-]+)/browse/', views.browse, name='project_browse'),
    url(r'^(?P<project_id>\d+)/add/(?P<user_id>\d+)/$', views.add_member, name='add_member'),
    url(r'^(?P<project_id>\d+)/remove/(?P<user_id>\d+)/$', views.remove_member, name='remove_member'),
    url(r'^(?P<project_id>\d+)/add-admin/(?P<user_id>\d+)/$', views.add_admin, name='add_admin'),
    url(r'^(?P<project_id>\d+)/remove-admin/(?P<user_id>\d+)/$', views.remove_admin, name='remove_admin'),
)
