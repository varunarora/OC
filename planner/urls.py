from django.conf.urls import patterns, url

from planner import views

urlpatterns = patterns(
    '',
    url(r'^events/around/(?P<around_date>[TZ0-9\:\.\-]+)/$', views.events_around, name='events_around'),
    url(r'^events/(?P<user_id>\d+)/(?P<zone>.+)/$', views.events, name='events'),
    url(r'^event/after/(?P<event_id>\d+)/$', views.event_after, name='event_after'),
    url(r'^event/before/(?P<event_id>\d+)/$', views.event_before, name='event_before'),

    url(r'^daily/(?P<date>[TZ0-9\:\.\-]+)/$', views.daily, name='daily'),
    url(r'^daily/(?P<date>[TZ0-9\:\.\-]+)/zone/(?P<zone>.+)/$', views.daily_zone, name='daily_zone'),

    url(r'^event/(?P<event_id>\d+)/delete/$', views.delete_event, name='delete_event'),
    url(r'^class/(?P<class_id>\d+)/delete/$', views.delete_class, name='delete_class'),

    url(r'^event/(?P<event_id>\d+)/$', views.event, name='event'),
    url(r'^api/event/(?P<event_id>\d+)/$', views.event_body, name='event_body'),
    url(r'^event/add-item/$', views.add_item_to_event, name='add_item_to_event'),
    url(r'^event/remove-item/$', views.remove_item_from_event, name='remove_item_from_event'),

    url(r'^class/save/$', views.save_class, name='save_class'),
    url(r'^event/save/$', views.save_event, name='save_event'),
)
