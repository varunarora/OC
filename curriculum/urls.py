from django.conf.urls import patterns, url

from curriculum import views

urlpatterns = patterns(
    '',

    # API stuff below.
    url(r'^api/curriculum/(?P<curriculum_id>\d+)/$', views.get_curriculum, name='get_curriculum'),
    #url(r'^api/objectives/(?P<unit_id>\d+)/$', views.get_objectives, name='get_objectives'),
    url(r'^api/sections/(?P<unit_id>\d+)/$', views.get_sections, name='get_sections'),
    url(r'^api/standard/(?P<standard_id>\d+)/$', views.get_standard, name='get_standard'),

    #url(r'^api/objective/(?P<objective_id>\d+)/suggest-resources/$', views.suggest_resources, name='suggest_resources'),
    url(r'^api/section-item/(?P<section_item_id>\d+)/suggest-resources/$', views.suggest_resources, name='suggest_resources'),

    #url(r'^api/objective/update/$', views.update_objective, name='update_objective'),
    url(r'^api/section-item/update/$', views.update_item, name='update_item'),
    #url(r'^api/objective/create/$', views.create_objective, name='create_objective'),
    url(r'^api/section-item/create/$', views.create_item, name='create_item'),
    #url(r'^api/objective/add-objective-to-unit/$', views.add_objective_to_unit, name='add_objective_to_unit'),
    url(r'^api/section-item/add-item-to-section/$', views.add_item_to_section, name='add_item_to_section'),
    url(r'^api/objective/remove-resource/$', views.remove_resource_from_objective, name='remove_resource_from_objective'),

    url(r'^api/section-item-resources/add-url/$', views.add_url_to_section_item_resources, name='add_url_to_section_item_resources'),
    url(r'^api/section-item-resources/add-existing/$', views.add_existing_to_section_item_resources, name='add_existing_to_section_item_resources'),
    url(r'^api/section-item-resources/add-upload/$', views.add_upload_to_section_item_resources, name='add_upload_to_section_item_resources'),

    url(r'^(?P<username>[a-z0-9_\.]+)/(?P<grade_slug>[\w\-\.]+)/(?P<subject_slug>[\w\-\.]+)/', views.curriculum_resources, name='curriculum_resources'),

    # Issues.
    url(r'^api/issue/create-update/$', views.create_update_issue, name='create_update_issue'),
)
