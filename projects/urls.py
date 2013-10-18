from django.conf.urls import patterns, url

from projects import views

urlpatterns = patterns(
    '',
    url(r'^new/', views.new_project, name='new'),
    url(r'^launch/', views.launch, name='launch'),
    url(r'^invite/', views.invite, name='invite'),

    url(r'^(?P<project_id>\d+)/visibility/$', views.get_project_visibility, name='get_project_visibility'),
 
    url(r'^request/(?P<request_id>\d+)/accept/', views.accept_request, name='accept_request'),
    url(r'^request/(?P<request_id>\d+)/decline/', views.decline_request, name='decline_request'),

    url(r'^(?P<project_slug>[\w\-]+)/$', views.project_home, name='project_home'),
    url(r'^(?P<project_slug>[\w\-]+)/members/$', views.members, name='project_members'),
    url(r'^(?P<project_slug>[\w\-]+)/about/$', views.about, name='project_about'),

    url(r'^(?P<project_slug>[\w\-]+)/discussion/(?P<discussion_id>\d+)/$', views.discussion, name='project_discussion'),
    url(r'^(?P<project_slug>[\w\-]+)/discussions/$', views.discussions, name='project_discussions'),
    url(r'^(?P<project_slug>[\w\-]+)/discussions/post/$', views.post_discussion, name='post_discussion'),

    url(r'^(?P<project_slug>[\w\-]+)/browse/(?P<collection_slug>.+)/$', views.list_collection, name='list_collection'),
    url(r'^(?P<project_slug>[\w\-]+)/browse/', views.browse, name='project_browse'),

    url(r'^(?P<project_id>\d+)/add/(?P<user_id>\d+)/$', views.add_member, name='add_member'),
    url(r'^(?P<project_id>\d+)/remove/(?P<user_id>\d+)/$', views.remove_member, name='remove_member'),
    url(r'^(?P<project_id>\d+)/add-admin/(?P<user_id>\d+)/$', views.add_admin, name='add_admin'),
    url(r'^(?P<project_id>\d+)/remove-admin/(?P<user_id>\d+)/$', views.remove_admin, name='remove_admin'),

    url(r'^(?P<project_id>\d+)/change-cover/$', views.change_cover_picture, name='change_cover_picture'),
    url(r'^(?P<project_id>\d+)/reposition-cover/$', views.reposition_cover_picture, name='reposition_cover_picture'),
    url(r'^(?P<project_id>\d+)/request-invite/$', views.request_invite, name='request_invite'),

    url(r'^(?P<project_slug>[\w\-]+)/settings/requests/', views.requests, name='project_requests'),
    url(r'^(?P<project_slug>[\w\-]+)/settings/', views.project_settings, name='project_settings'),
)
