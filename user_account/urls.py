from django.conf.urls import patterns, url

from user_account import views


urlpatterns = patterns(
    '',
    url(r'^api/list/(?P<query>\w+)/$', views.list_users, name='list_users'),
    url(r'^api/headline/(?P<user_id>\d+)/edit/$', views.edit_headline, name='edit_headline'),
    url(r'^api/notifications/dismiss/(?P<user_id>\d+)/$', views.dismiss_notifications, name='dismiss_notifications'),
    url(r'^api/subscribe/(?P<username>\w+)/$', views.subscribe, name='subscribe'),

    url(r'^(?P<username>\w+)/reset-password/set-new-password/$', views.reset_password_set, name='reset_password_set'),
    url(r'^reset-password/$', views.reset_password, name='reset_password'),

    url(r'^(?P<username>\w+)/change-picture/$', views.change_profile_picture, name='change_profile_picture'),
    url(r'^(?P<username>\w+)/reposition-picture/$', views.reposition_profile_picture, name='reposition_profile_picture'),

    url(r'^(?P<username>\w+)/groups/$', views.user_groups, name='user_groups'),
    url(r'^(?P<username>\w+)/files/(?P<collection_slug>.+)/$', views.list_collection, name='list_collection'),
    url(r'^(?P<username>\w+)/files/$', views.user_files, name='user_files'),
    url(r'^(?P<username>\w+)/favorites/$', views.user_favorites, name='user_favorites'),
    url(r'^(?P<username>\w+)/$', views.user_profile, name='user_profile'),
)
