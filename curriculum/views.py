from curriculum.models import Curriculum, Unit, Objective, Resource, Issue, Section, SectionItem, SectionItemResources, StandardCategory
from django.shortcuts import render
from django.core.urlresolvers import reverse
from django.conf import settings
from oc_platform import APIUtilities

def curriculum_resources(request, username, grade_slug, subject_slug):
    from django.template.defaultfilters import slugify

    try:
        from django.contrib.auth.models import User
        user = User.objects.get(username=username)
    except:
        return APIUtilities._api_not_found()

    curricula = Curriculum.objects.filter(user=user)
    curriculum = next(curriculum for curriculum in curricula if (
        slugify(curriculum.grade) == grade_slug and slugify(curriculum.subject) == subject_slug))

    context = {
        'curriculum': curriculum,
        'title': curriculum.grade + ': ' + curriculum.subject
    }
    return render(request, 'curriculum-resources.html', context)


def get_curriculum(request, curriculum_id):
    try:
        curriculum = Curriculum.objects.get(pk=curriculum_id)
    except:
        return APIUtilities._api_not_found()

    def get_serialized_standard_children(standard):
        sub_standards = []

        for sub_standard in standard.standard_categories.all():
            sub_standards.append(
                get_serialized_standard_children(sub_standard))

        return {
            'id': standard.id,
            'title': standard.title,
            'standards': sub_standards
        }

    serialized_textbooks = []
    serialized_units = []
    serialized_standards = []

    for textbook in curriculum.textbooks.all():
        serialized_textbook_units = []

        for unit in curriculum.units.all():
            if unit in textbook.units.all():
                serialized_textbook_units.append({
                    'id': unit.id,
                    'textbook_id': textbook.id
                })

        serialized_textbooks.append({
            'id': textbook.id,
            'title': textbook.title,
            'thumbnail': settings.MEDIA_URL + textbook.thumbnail.name,
            'units': serialized_textbook_units
        })

    for unit in curriculum.units.all():
        serialized_units.append({
            'id': unit.id,
            'title': unit.title,
            'period': unit.period
        })

    for standard_category in curriculum.standard_categories.all():
        serialized_standards.append(
            get_serialized_standard_children(standard_category))

    return APIUtilities.success({
        'textbooks': serialized_textbooks,
        'units': serialized_units,
        'standards': serialized_standards
    })


"""def get_objectives(request, unit_id):
    try:
        unit = Unit.objects.get(pk=unit_id)
    except:
        return APIUtilities._api_not_found()

    from oer.models import Link
    from django.contrib.contenttypes.models import ContentType
    objective_content_type = ContentType.objects.get_for_model(Objective)
    link_content_type = ContentType.objects.get_for_model(Link)

    serialized_objectives = []

    for objective in unit.objectives.all():
        serialized_resources = []

        try:
            issue = Issue.objects.get(
                host_id=objective.id, host_type=objective_content_type)
            serialized_issue = {
                'id': issue.id,
                'host_id': issue.host_id,
                'message': issue.message
            }
        except:
            serialized_issue = None

        for resource in objective.resources.all():
            serialized_resources.append({
                'id': resource.id,
                'url': resource.resource.revision.content.url if (
                    resource.resource.revision.content_type == link_content_type) else reverse(
                    'read', kwargs={
                        'resource_id': resource.resource.id,
                        'resource_slug': resource.resource.slug
                    }
                ),
                'title': resource.resource.title,
                'thumbnail': settings.MEDIA_URL + resource.resource.image.name
            })

        serialized_objectives.append({
            'id': objective.id,
            'description': objective.description,
            'issue': serialized_issue,
            'meta': objective.meta if objective.meta else {},
            'resources': serialized_resources
        })

    return APIUtilities.success(serialized_objectives)"""


def get_sections(request, unit_id):
    try:
        unit = Unit.objects.get(pk=unit_id)
    except:
        return APIUtilities._api_not_found()

    return APIUtilities.success(get_serialized_sections(unit))


def get_standard(request, standard_id):
    try:
        standard = StandardCategory.objects.get(pk=standard_id)
    except:
        return APIUtilities._api_not_found()

    return APIUtilities.success(get_serialized_sections(standard))


def get_serialized_sections(parent):
    from django.contrib.contenttypes.models import ContentType
    section_item_content_type = ContentType.objects.get_for_model(SectionItem)

    from oer.models import Link
    link_content_type = ContentType.objects.get_for_model(Link)

    serialized_sections = []

    for section in parent.sections.all():
        serialized_items = []

        for item in section.items.all():
            serialized_resource_sets = []

            try:
                issue = Issue.objects.get(
                    host_id=item.id, host_type=section_item_content_type)
                serialized_issue = {
                    'id': issue.id,
                    'host_id': issue.host_id,
                    'message': issue.message
                }
            except:
                serialized_issue = None

            for resource_set in item.resource_sets.all():
                serialized_resources = []

                for resource in resource_set.resources.all():
                    serialized_resources.append({
                        'id': resource.id,
                        'url': resource.resource.revision.content.url if (
                            resource.resource.revision.content_type == link_content_type) else reverse(
                            'read', kwargs={
                                'resource_id': resource.resource.id,
                                'resource_slug': resource.resource.slug
                            }
                        ),
                        'title': resource.resource.title,
                        'thumbnail': settings.MEDIA_URL + resource.resource.image.name
                    })

                serialized_resource_sets.append({
                    'id': resource_set.id,
                    'resources': serialized_resources
                })

            if item.resource_sets.count() == 0:
                serialized_resource_sets.append({
                    'id': None,
                    'resources': []
                })

            serialized_items.append({
                'id': item.id,
                'description': item.description,
                'issue': serialized_issue,
                'meta': item.meta if item.meta else {},
                'resource_sets': serialized_resource_sets,
                'parent': item.content.parent if item.content else None
            })

        serialized_sections.append({
            'id': section.id,
            'title': section.title,
            'type': section.settings['type'],
            'position': section.position,
            'items': serialized_items,
        })

    return serialized_sections


"""def update_objective(request):
    objective_id = request.POST.get('id', None)
    description = request.POST.get('description', None)

    try:
        objective = Objective.objects.get(pk=objective_id)
    except:
        return APIUtilities._api_not_found()

    try:
        if description:
            objective.description = description
            objective.save()

            context = { 'objective': {
                'id': objective.id,
                'description': objective.description
            }}
        else:
            for post_key, post_value in request.POST.items():
                if 'meta' in post_key:
                    objective.meta[post_key[5:-1]] = post_value

            objective.save()
            context = {
                'id': objective.id,
                'meta': objective.meta
            }

        return APIUtilities.success(context)

    except:
        return APIUtilities._api_failure()


def create_objective(request):
    description = request.POST.get('description', None)
    unit_id = request.POST.get('unit_id', None)

    new_objective = Objective(description=description)
    new_objective.save()

    context = {
        'id': new_objective.id,
        'description': new_objective.description,
        'issue': {
            'id': None,
            'host_id': None,
            'message': None
        },
        'unit_id': unit_id
    }
    
    return APIUtilities.success(context)"""


def update_item(request):
    item_id = request.POST.get('id', None)
    description = request.POST.get('description', None)

    try:
        item = SectionItem.objects.get(pk=item_id)
    except:
        return APIUtilities._api_not_found()

    try:
        if description:
            item.description = description
            item.save()

            context = { 'item': {
                'id': item.id,
                'description': item.description
            }}
        else:
            for post_key, post_value in request.POST.items():
                if 'meta' in post_key:
                    item.meta[post_key[5:-1]] = post_value

            item.save()
            context = {
                'id': item.id,
                'meta': item.meta
            }

        return APIUtilities.success(context)

    except:
        return APIUtilities._api_failure()


def create_item(request):
    description = request.POST.get('description', None)
    section_id = request.POST.get('section_id', None)

    new_item = SectionItem(description=description)
    new_item.save()

    context = {
        'id': new_item.id,
        'description': new_item.description,
        'issue': {
            'id': None,
            'host_id': None,
            'message': None
        },
        'section_id': section_id
    }
    
    return APIUtilities.success(context)


"""def add_objective_to_unit(request):
    unit_id = request.POST.get('id', None)
    objective_id = request.POST.get('objective_id', None)

    try:
        unit = Unit.objects.get(pk=unit_id)
        objective = Objective.objects.get(pk=objective_id)
    except:
        return APIUtilities._api_not_found()

    try:
        unit.objectives.add(objective)
        return APIUtilities.success()

    except:
        return APIUtilities._api_failure()"""


def add_item_to_section(request):
    section_id = request.POST.get('id', None)
    item_id = request.POST.get('item_id', None)

    try:
        section = Section.objects.get(pk=section_id)
        item = SectionItem.objects.get(pk=item_id)
    except:
        return APIUtilities._api_not_found()

    try:
        section.items.add(item)
        return APIUtilities.success()

    except:
        return APIUtilities._api_failure()


def create_update_issue(request):
    section_item_id = request.POST.get('host_id', None)
    issue_state = request.POST.get('ready', None)
    message = request.POST.get('message', None)
    issue_id = request.POST.get('id', None)

    from django.contrib.contenttypes.models import ContentType
    section_item_content_type = ContentType.objects.get_for_model(SectionItem)

    if issue_state == 'false':
        try:
            section_item = SectionItem.objects.get(pk=section_item_id)
        except:
            return APIUtilities._api_not_found()

        try:
            # Temp. associate all bugs with me.
            from django.contrib.auth.models import User
            reporter = User.objects.get(username='ocrootu')

            issue = Issue(
                host=section_item,
                reporter=reporter
            )
            issue.save()

            context = {
                'issue': {
                    'id': issue.id,
                    'host_id': section_item.id,
                    'message': issue.message,
                }
            }

            return APIUtilities.success(context)

        except:
            return APIUtilities._api_failure()

    elif message:
        issue = Issue.objects.get(pk=issue_id)
        issue.message = message
        issue.save()

        context = {
            'issue': {
                'message': issue.message,
            }
        }

        return APIUtilities.success(context)

    else:
        issue = Issue.objects.get(host_id=section_item_id, host_type=section_item_content_type)
        issue.delete()

        context = {
            'issue': {
                'id': None,
                'host_id': None,
                'message': None,
            }
        }

        return APIUtilities.success(context)


def create_resource_set(request, section_item_resources_id):
    if request.user:
        if section_item_resources_id == 'null':
            section_item_id = request.POST.get('section_item_id', None)

            if section_item_id:
                section_item = SectionItem.objects.get(pk=section_item_id)

                section_item_resources = SectionItemResources(title='Resources')
                section_item_resources.save()

                section_item.resource_sets.add(section_item_resources)
            
            else:
                return None

        else:
            return None

    else:
        return None


def add_url_to_section_item_resources(request):
    section_item_resources_id = request.POST.get('section_item_resources_id', None)

    try:
        section_item_resources = SectionItemResources.objects.get(pk=section_item_resources_id)
    except:
        section_item_resources = create_resource_set(request, section_item_resources)

        if not section_item_resources:
            return APIUtilities._api_not_found()


    from oer.views import new_url_from_form
    new_resource = new_url_from_form(
        request.user, request.POST.get('title', None),
        request.POST.get('url', None))

    new_objective_resource = Resource(resource=new_resource)
    new_objective_resource.save()

    section_item_resources.resources.add(new_objective_resource)

    context = {
        'resource': {
            'id': new_objective_resource.id,
            'url': new_resource.revision.content.url,
            'title': new_resource.title,
            'thumbnail': settings.MEDIA_URL + new_resource.image.name if new_resource.image else '',
        }
    }

    return APIUtilities.success(context)


def add_existing_to_section_item_resources(request):
    section_item_resources_id = request.POST.get('section_item_resources_id', None)
    #is_resource = request.POST.get('is_resource', None) == 'true'
    resource_collection_id = request.POST.get('resource_collection_ID', None)

    try:
        section_item_resources = SectionItemResources.objects.get(pk=section_item_resources_id)
    except:
        section_item_resources = create_resource_set(request, section_item_resources)

        if not section_item_resources:
            return APIUtilities._api_not_found()


    from oer.models import Resource as OEResource    
    resource = OEResource.objects.get(pk=resource_collection_id)

    new_objective_resource = Resource(resource=resource)
    new_objective_resource.save()

    section_item_resources.resources.add(new_objective_resource)

    context = {
        'resource': {
            'id': new_objective_resource.id,
            'url': reverse(
                'read', kwargs={
                    'resource_id': resource.id,
                    'resource_slug': resource.slug
                }
            ),
            'thumbnail': settings.MEDIA_URL + resource.image.name if resource.image else '',
            'title': resource.title
        }
    }

    return APIUtilities.success(context)


def add_upload_to_section_item_resources(request):
    section_item_resources_id = request.POST.get('section_item_resources_id', None)
    resource_id = request.POST.get('key', None)

    from oer.models import Resource as OEResource

    try:
        section_item_resources = SectionItemResources.objects.get(pk=section_item_resources_id)
        resource = OEResource.objects.get(pk=resource_id)
    except:
        section_item_resources = create_resource_set(request, section_item_resources)

        if not section_item_resources:
            return APIUtilities._api_not_found()


    new_objective_resource = Resource(resource=resource)
    new_objective_resource.save()

    section_item_resources.resources.add(new_objective_resource)

    context = {
        'resource': {
            'id': new_objective_resource.id,
            'url': reverse(
                'read', kwargs={
                    'resource_id': resource.id,
                    'resource_slug': resource.slug
                }
            ),
            'thumbnail': settings.MEDIA_URL + resource.image.name if resource.image else '',
            'title': resource.title
        }
    }

    return APIUtilities.success(context)


def remove_resource_from_objective(request):
    objective_id = request.POST.get('id', None)
    resource_id = request.POST.get('resource_id', None)

    try:
        objective = Objective.objects.get(pk=objective_id)
        resource = Resource.objects.get(pk=resource_id)
    except:
        return APIUtilities._api_not_found()

    objective.resources.remove(resource)

    all_resource_objectives = Objective.objects.filter(resources=resource)

    if all_resource_objectives.count() == 0:
        resource.delete()

    return APIUtilities.success()


def suggest_resources(request, section_item_id):
    try:
        section_item = SectionItem.objects.get(pk=section_item_id)
    except:
        return APIUtilities._api_not_found()

    if section_item.content:
        if not section_item.content.parent:
            context = {
                'message': 'To suggest resources, the objective needs to be linked ' +
                    'a standard.'
            }
            return APIUtilities._api_failure(context)
    else:
        context = {
            'message': 'To suggest resources, this item needs to be an objective.'
        }
        return APIUtilities._api_failure(context)

    from meta.models import TagMapping
    mappings = TagMapping.objects.filter(from_node=section_item.content.parent)

    from oer.models import Resource as OEResource

    #resources = OEResource.objects.none()
    tags = []
    for mapping in mappings:
        tags.append(mapping.to_node)

    resources = OEResource.objects.filter(tags__in=tags)

    serialized_resources = {}
    for resource in resources:
        serialized_resources[resource.id] = {
            'id': resource.id,
            'url': reverse(
                'read', kwargs={
                    'resource_id': resource.id,
                    'resource_slug': resource.slug
                }
            ),
            'title': resource.title,
            'user': resource.user.get_full_name(),
            'user_url': reverse('user:user_profile', kwargs={
                'username': resource.user.username }),
            'description': resource.description,
            'thumbnail': settings.MEDIA_URL + resource.image.name,
       }

    context = {
        'resources': serialized_resources
    }
    return APIUtilities.success(context)
