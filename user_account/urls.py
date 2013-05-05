from django.conf.urls import patterns, url

from user_account import views


urlpatterns = patterns(
    '',
    url(r'^(?P<username>\w+)/$', views.user_profile, name='user_profile'),
)
