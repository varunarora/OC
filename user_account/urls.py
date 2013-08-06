from django.conf.urls import patterns, url

from user_account import views


urlpatterns = patterns(
    '',
    url(r'^api/list/(?P<query>\w+)/$', views.list_users, name='list_users'),
    url(r'^api/headline/(?P<user_id>\d+)/edit/$', views.edit_headline, name='edit_headline'),
    url(r'^api/notifications/dismiss/(?P<user_id>\d+)/$', views.dismiss_notifications, name='dismiss_notifications'),
    url(r'^(?P<username>\w+)/reset-password/set-new-password/$', views.reset_password_set, name='reset_password_set'),
    url(r'^reset-password/$', views.reset_password, name='reset_password'),

    url(r'^(?P<username>\w+)/change-picture/$', views.change_profile_picture, name='change_profile_picture'),
    url(r'^(?P<username>\w+)/browse/(?P<collection_slug>.+)/$', views.list_collection, name='list_collection'),
    url(r'^(?P<username>\w+)/$', views.user_profile, name='user_profile'),
)
