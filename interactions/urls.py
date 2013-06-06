from django.conf.urls import patterns, url

from interactions import views

urlpatterns = patterns(
    '',
    url(r'^comment/$', views.post_comment, name='post_comment'),
)
