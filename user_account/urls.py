from django.conf.urls import patterns, url

from user_account import views


urlpatterns = patterns(
    '',
    url(r'^api/list/(?P<query>\w+)/$', views.list_users, name='list_users'),
    url(r'^api/headline/(?P<user_id>\d+)/edit/$', views.edit_headline, name='edit_headline'),
    url(r'^api/notifications/dismiss/(?P<user_id>\d+)/$', views.dismiss_notifications, name='dismiss_notifications'),
    url(r'^api/subscribe/state/users/$', views.get_subscribe_state, name='get_subscribe_state'),
    url(r'^api/subscribe/(?P<user_id>\d+)/$', views.subscribe, name='subscribe'),
    url(r'^api/registeration-context/$', views.get_registration_context, name='get_registration_context'),
    url(r'^api/username-availability/(?P<username>[a-z0-9_\.]+)/$', views.username_availability, name='username_availability'),
    url(r'^api/social-availability/(?P<service>\w+)/(?P<social_id>\d+)/$', views.social_availability, name='social_availability'),
    url(r'^api/onboard/(?P<tour>\w+)/(?P<version_id>\d+\.\d+)/$', views.onboard, name='onboard'),
    url(r'^api/get-profile/(?P<username>[a-z0-9_\.]+)/$', views.api_get_profile, name='api_get_profile'),
    url(r'^api/resubscribe/(?P<user_id>\d+)/(?P<service>[a-zA-Z\.]+)/$', views.api_resubscribe, name='api_resubscribe'),

    url(r'^api/register-asynchronously/$', views.register_asynchronously, name='register_asynchronously'),
    url(r'^api/load-feed/(?P<context>[a-z0-9_\.]+)/(?P<user_id>\d+)/from/(?P<feed_count>\d+)/$', views.load_feed, name='load_feed'),
    url(r'^api/followers/(?P<user_id>\d+)/$', views.api_followers, name='api_followers'),
    url(r'^api/following/(?P<user_id>\d+)/$', views.api_following, name='api_following'),

    url(r'^(?P<username>[a-z0-9_\.]+)/reset-password/set-new-password/$', views.reset_password_set, name='reset_password_set'),
    url(r'^reset-password/$', views.reset_password, name='reset_password'),
    url(r'^change-password/$', views.change_password, name='change_password'),
    url(r'^unsubscribe/(?P<user_id>\d+)/(?P<service>[a-zA-Z\.]+)/$', views.unsubscribe, name='unsubscribe'),

    url(r'^(?P<username>[a-z0-9_\.]+)/change-picture/$', views.change_profile_picture, name='change_profile_picture'),
    url(r'^(?P<username>[a-z0-9_\.]+)/reposition-picture/$', views.reposition_profile_picture, name='reposition_profile_picture'),

    #url(r'^(?P<username>[a-z0-9_\.]+)/groups/$', views.user_groups, name='user_groups'),
    #url(r'^(?P<username>[a-z0-9_\.]+)/files/(?P<collection_slug>.+)/$', views.list_collection, name='list_collection'),
    #url(r'^(?P<username>[a-z0-9_\.]+)/files/$', views.user_files, name='user_files'),
    url(r'^(?P<username>[a-z0-9_\.]+)/favorites/$', views.user_favorites, name='user_favorites'),
    #url(r'^(?P<username>[a-z0-9_\.]+)/subscribers/$', views.user_subscribers, name='user_subscribers'),
    #url(r'^(?P<username>[a-z0-9_\.]+)/subscriptions/$', views.user_subscriptions, name='user_subscriptions'),
    url(r'^preferences/$', views.user_preferences, name='user_preferences'),

    #url(r'^(?P<username>[a-z0-9_\.]+)/$', views.user_profile, name='user_profile'),

    url(r'^(?P<username>[a-z0-9_\.]+)/planner/classes/$', views.user_classes, name='user_classes'),
    url(r'^(?P<username>[a-z0-9_\.]+)/planner/$', views.user_planner, name='user_planner'),
    url(r'^(?P<username>[a-z0-9_\.]+)/files/(?P<collection_slug>.+)/$', views.user_folder, name='user_folder'),
    url(r'^(?P<username>[a-z0-9_\.]+)/files/$', views.user_files, name='user_files'),
    url(r'^(?P<username>[a-z0-9_\.]+)/followers/$', views.user_followers, name='user_followers'),
    url(r'^(?P<username>[a-z0-9_\.]+)/following/$', views.user_following, name='user_following'),
    url(r'^(?P<username>[a-z0-9_\.]+)/groups/$', views.user_groups, name='user_groups'),
    url(r'^(?P<username>[a-z0-9_\.]+)/curricula/$', views.user_curricula, name='user_curricula'),
    url(r'^(?P<username>[a-z0-9_\.]+)/$', views.user_profile, name='user_profile'),

    url(r'^api/notifications/$', views.notifications, name='notifications'),

    # Newsletters
    url(r'^newsletter/tracker.gif', views.newsletter_tracker, name='newsletter_tracker'),
)
