from django.conf.urls import patterns, url

from curriculum import views

urlpatterns = patterns(
    '',
    url(r'^create/$', views.create, name='create'),
    url(r'^curriculum/delete/$', views.delete, name='delete'),

    # API stuff below.
    url(r'^api/curriculum/(?P<curriculum_id>\d+)/$', views.get_curriculum, name='get_curriculum'),
    url(r'^api/sections/(?P<unit_id>\d+)/$', views.get_sections, name='get_sections'),
    url(r'^api/standard/(?P<standard_id>\d+)/$', views.get_standard, name='get_standard'),

    url(r'^api/settings/update/$', views.update_settings, name='update_settings'),

    url(r'^api/sections/reposition/$', views.reposition_sections, name='reposition_sections'),
    url(r'^api/meta/(?P<section_item_id>\d+)/reposition/$', views.reposition_meta, name='reposition_meta'),

    url(r'^api/unit/create/$', views.create_unit, name='create_unit'),
    url(r'^api/textbook/create/$', views.create_textbook, name='create_textbook'),
    url(r'^api/section/create/$', views.create_section, name='create_section'),
    url(r'^api/section/(?P<section_id>\d+)/delete/$', views.delete_section, name='delete_section'),

    url(r'^api/section-item/(?P<section_item_id>\d+)/suggest-resources/$', views.suggest_resources, name='suggest_resources'),

    url(r'^api/section-item/update/$', views.update_item, name='update_item'),
    url(r'^api/section-item/create/$', views.create_item, name='create_item'),
    url(r'^api/section-item/(?P<section_item_id>\d+)/delete/$', views.delete_item, name='delete_item'),
    url(r'^api/section-item/(?P<section_item_id>\d+)/delete-meta/(?P<position>\d+)/$', views.delete_item_meta, name='delete_item_meta'),

    url(r'^api/section-item/add-item-to-section/$', views.add_item_to_section, name='add_item_to_section'),
    url(r'^api/section-item/remove-resource/$', views.remove_resource_from_objective, name='remove_resource_from_objective'),
    url(r'^api/section-items/reposition/$', views.reposition_items, name='reposition_items'),
    url(r'^api/section-item/create-resource-set/$', views.create_item_resources, name='create_item_resources'),

    url(r'^api/section-item-resources/add-url/$', views.add_url_to_section_item_resources, name='add_url_to_section_item_resources'),
    url(r'^api/section-item-resources/add-existing/$', views.add_existing_to_section_item_resources, name='add_existing_to_section_item_resources'),
    url(r'^api/section-item-resources/add-upload/$', views.add_upload_to_section_item_resources, name='add_upload_to_section_item_resources'),
    url(r'^api/section-item-resources/(?P<section_item_resources_id>\d+)/delete/$', views.delete_section_item_resources, name='delete_section_item_resources'),

    url(r'^api/resource-view/(?P<resource_id>\d+)/$', views.asynchronous_view, name='asynchronous_view'),
    url(r'^api/favorite/(?P<resource_id>\d+)/$', views.favorite, name='favorite'),
    url(r'^api/reference/(?P<resource_id>\d+)/$', views.get_reference, name='get_reference'),

    url(r'^api/curriculum/copy/$', views.copy_curriculum, name='copy_curriculum'),
    url(r'^api/curriculum/(?P<curriculum_id>\d+)/delete/$', views.delete_curriculum, name='delete_curriculum'),

    # Changes.
    url(r'^api/curriculum/(?P<curriculum_id>\d+)/push/$', views.push_changes, name='push_changes'),
    url(r'^api/curriculum/(?P<curriculum_id>\d+)/pause/$', views.pause_changes, name='pause_changes'),
    url(r'^(?P<username>[a-z0-9_\.]+)/(?P<grade_slug>[\w\-\.]+)/(?P<subject_slug>[\w\-\.]+)/changes/', views.curriculum_changes, name='curriculum_changes'),

    # Issues.
    url(r'^api/issue/create-update/$', views.create_update_issue, name='create_update_issue'),

    url(r'^(?P<organization_slug>[a-z0-9_\.]+)/(?P<username>[a-z0-9_\.]+)/(?P<curriculum_slug>[\w\-\.]+)/', views.curriculum, name='curriculum'),
)
