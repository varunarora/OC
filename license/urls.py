from django.conf.urls import patterns, url

from license import views

urlpatterns = patterns(
    '',
    url(r'^api/list/$', views.get_licenses, name='get_licenses'),
)
