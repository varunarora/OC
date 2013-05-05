from django.conf.urls import patterns, url

from projects import views

urlpatterns = patterns(
    '',
    url(r'^new/', views.new_project, name='new'),
    url(r'^launch/', views.launch, name='launch'),
    url(r'^invite/', views.invite, name='invite'),
    url(r'^(?P<project_slug>[\w\-]+)/$', views.project_home, name='project_home'),
)
