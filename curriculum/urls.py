from django.conf.urls import patterns, url

from curriculum import views

urlpatterns = patterns(
    '',
    url(r'^(?P<username>[a-z0-9_\.]+)/(?P<grade_slug>[\w\-\.]+)/(?P<subject_slug>[\w\-\.]+)/', views.curriculum_resources, name='curriculum_resources'),

    # API stuff below.
    url(r'^api/objective/update/$', views.update_objective, name='update_objective'),
    url(r'^api/objective/create/$', views.create_objective, name='create_objective'),
    url(r'^api/objective/add-objective-to-unit/$', views.add_objective_to_unit, name='add_objective_to_unit'),
    url(r'^api/objective/remove-resource/$', views.remove_resource_from_objective, name='remove_resource_from_objective'),

    url(r'^api/objective/add-url/$', views.add_url_to_objective, name='add_url_to_objective'),
    url(r'^api/objective/add-existing/$', views.add_existing_to_objective, name='add_existing_to_objective'),
    url(r'^api/objective/add-upload/$', views.add_upload_to_objective, name='add_upload_to_objective'),

    # Issues.
    url(r'^api/issue/create-update/$', views.create_update_issue, name='create_update_issue'),
)
