from curriculum.models import Curriculum, Unit, Objective, Resource, Issue, Section, Textbook
from curriculum.models import SectionItem, SectionItemResources, StandardCategory, Reference
from curriculum.models import CurriculumSyncLink, Change
from django.shortcuts import render
from django.core.urlresolvers import reverse
from django.conf import settings
from django.http import Http404
from oc_platform import APIUtilities

def curriculum(request, username, organization_slug, curriculum_slug):
    #from django.template.defaultfilters import slugify
    try:
        from django.contrib.auth.models import User
        user = User.objects.get(username=username)
    except:
        return APIUtilities._api_not_found()

    if organization_slug:
        try:
            from user_account.models import Organization
            organization = Organization.objects.get(slug=organization_slug)
        except:
            raise Http404

    #curricula = Curriculum.objects.filter(user=user)
    try:
        #curriculum = next(curriculum for curriculum in curricula if (
        #    slugify(curriculum.grade) == grade_slug and slugify(curriculum.subject) == subject_slug))
        curriculum = Curriculum.objects.get(user=user, slug=curriculum_slug)
    except:
        raise Http404

    is_owner = False
    if request.user == curriculum.user:
        is_owner = True

    from user_account.views import _prepare_org_user_context
    user_profile = user.get_profile()
    user_context = _prepare_org_user_context(request, user, user_profile)

    context = {
        'user_profile': user,
        'organization': organization,
        'curriculum': curriculum,
        'is_owner': is_owner,
        'page': 'curricula',
        'subpage': 'curriculum',
        'title': curriculum.grade + ': ' + curriculum.subject + " &lsaquo; OpenCurriculum"
    }
    return render(request, 'new-profile.html', dict(context.items(
        ) + user_context.items()))


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
            'description': textbook.description,
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

    from oer.models import Link, Attachment
    link_content_type = ContentType.objects.get_for_model(Link)
    reference_content_type = ContentType.objects.get_for_model(Reference)
    attachment_content_type = ContentType.objects.get_for_model(Attachment)

    from meta.models import Tag

    serialized_sections = []

    for section in parent.sections.all().order_by('position'):
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

            from os.path import splitext
            document = [".doc", ".docx", ".rtf", "odt"]

            for resource_set in item.resource_sets.all():
                serialized_resources = []

                for resource in resource_set.resources.all():
                    import oer.CollectionUtilities as cu
                    cu.set_resources_type([resource.resource])
                    cu.preprocess_collection_listings([resource.resource])

                    if resource.resource.revision.content_type == attachment_content_type:
                        name, extension = splitext(
                            resource.resource.revision.content.file.name)

                        if extension in document:
                            resource.resource.type = 'pdf'

                    thumbnail = settings.MEDIA_URL + resource.resource.revision.content.textbook.thumbnail.name if (
                        resource.resource.revision.content_type == reference_content_type) else settings.MEDIA_URL + resource.resource.image.name

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
                        'thumbnail': thumbnail,
                        'user_thumbnail': settings.MEDIA_URL + resource.resource.user.get_profile().profile_pic.name,
                        'type': resource.resource.type
                    })

                serialized_resource_sets.append({
                    'id': resource_set.id,
                    'position': resource_set.position,
                    'title': resource_set.title,
                    'resources': serialized_resources
                })

            """if item.resource_sets.count() == 0:
                serialized_resource_sets.append({
                    'id': None,
                    'resources': []
                })"""

            if item.meta:
                for meta_item in item.meta:
                    if 'standards' in meta_item:
                        standards = []
                        for std_id in meta_item['standards']:
                            standard = Tag.objects.get(pk=std_id)
                            standards.append({
                                'title': standard.title,
                                'description': standard.description
                            })

                        meta_item['standards'] = standards

            serialized_items.append({
                'id': item.id,
                'description': item.description,
                'issue': serialized_issue,
                'meta': item.meta if item.meta else [],
                'resource_sets': serialized_resource_sets,
                'position': item.position if item.position else 0,
                'parent': (item.content.parent.title if item.content.parent else None) if item.content else None
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
            new_metas = []
            import re

            for post_key, post_value in request.POST.items():
                if 'meta' in post_key:
                    # Loop through the json objects.
                    match = re.match('meta\[(?P<num>\d+)\]\[(?P<key>.+)\]', post_key)
                    
                    try:
                        new_metas[int(match.group('num'))][match.group('key')] = post_value
                    except:
                        new_metas.append({match.group('key'): post_value})

            for new_meta in new_metas:
                # If the meta object exists, update it.
                try:
                    next(meta_item for meta_item in item.meta if meta_item['slug'] == new_meta['slug'])['body'] = new_meta['body']
                except:
                    # If not, create it.
                    item.meta.append({
                        'slug': new_meta['slug'],
                        'body': new_meta['body'],
                        'title': new_meta['title'],
                        'position': new_meta['position']
                    })

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
    curriculum_id = request.POST.get('curriculum_id', None)
    position = request.POST.get('position', None)

    new_item = SectionItem(description=description, position=position)
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
    
    from curriculum.tasks import create_item as create_item_task
    create_item_task.delay(new_item.id, section_id, curriculum_id)

    return APIUtilities.success(context)


def delete_item(request, section_item_id):
    try:
        item = SectionItem.objects.get(pk=section_item_id)
    except:
        return APIUtilities._api_not_found()

    if not request.user:
        return APIUtilities._api_unauthorized_failure()

    delete_individual_item(item)

    return APIUtilities.success()


def delete_individual_item(item):
    # Remove all section references to this item.
    sections_with_item = Section.objects.filter(items=item)

    for section in sections_with_item:
        section.items.remove(item)

    # Delete all resource sets associated with this item, and all resources
    #     within them.
    for resource_set in item.resource_sets.all():
        for resource in resource_set.resources.all():
            resource.delete()

    # Delete the item.
    item.delete()


def delete_item_meta(request, section_item_id, position):
    try:
        item = SectionItem.objects.get(pk=section_item_id)
    except:
        return APIUtilities._api_not_found()

    meta = item.meta
    del meta[int(position)]

    item.meta = meta
    item.save()

    return APIUtilities.success()


def delete_section_item_resources(request, section_item_resources_id):
    try:
        section_item_resources = SectionItemResources.objects.get(pk=section_item_resources_id)
    except:
        return APIUtilities._api_not_found()

    for resource in section_item_resources.resources.all():
        resource.delete()

    sections_with_resources = SectionItem.objects.get(resource_sets=section_item_resources)
    sections_with_resources.resource_sets.remove(section_item_resources)

    section_item_resources.delete()

    return APIUtilities.success()


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

    import oer.CollectionUtilities as cu
    cu.set_resources_type([resource])
    cu.preprocess_collection_listings([resource])

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
            'title': resource.title,
            'type': resource.type
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


def create_textbook_reference(textbook, scope, title, username,
    description, license, collection):
    DEFAULT_COST = 0

    try:
        from django.contrib.auth.models import User

        title = title if title else 'Untitled reference'
        user = User.objects.get(username=username)

        from django.template.defaultfilters import slugify

        # Create a new resource
        from oer.models import Resource as OEResource
        new_resource = OEResource(
            title=title,
            cost=DEFAULT_COST,
            user=user,
            slug=slugify(title),
            visibility='public',
            description=description,
            license=license
        )

        new_reference = Reference(source_type='textbook', textbook=textbook, scope=scope)
        new_reference.save()

        from oer.models import ResourceRevision
        new_resource_revision = ResourceRevision()
        new_resource_revision.content = new_reference
        new_resource_revision.user = user
        new_resource_revision.save()

        new_resource.revision = new_resource_revision
        new_resource.save()

        # Assign this resource to the revision created.
        new_resource.revision.resource = new_resource
        new_resource.revision.save()

        # Now add this resource to the collection it belongs to
        collection.resources.add(new_resource)
        collection.save()

        new_curriculum_resource = Resource(resource=new_resource)
        new_curriculum_resource.save()

        return (new_resource.id, new_curriculum_resource.id)

    except Exception, exception:
        print exception


def asynchronous_view(request, resource_id):
    from oer.views import render_resource
    try:
        resource = Resource.objects.get(pk=resource_id)
    except:
        return APIUtilities._api_not_found()

    (resource, resource_type, revision) = render_resource(resource.resource.id)

    from django.template import Template, Context
    template = Template(open(
        settings.TEMPLATE_DIR + '/templates/partials/resource-body.html', 'r').read())
    context = Context({
        'MEDIA_URL': settings.MEDIA_URL,
        'STATIC_URL': settings.STATIC_URL,
        'debug': settings.DEBUG,
        'resource': resource
    })
    template_html = template.render(context)

    from django.http import HttpResponse
    return HttpResponse(
        template_html, 200,
        content_type="text/html"
    )


def favorite(request, resource_id):
    try:
        resource = Resource.objects.get(pk=resource_id)
    except:
        return APIUtilities._api_not_found()

    from interactions.views import favorite_resource
    return favorite_resource(request, 'resource', resource.resource.id)


def get_reference(request, resource_id):
    try:
        resource = Resource.objects.get(pk=resource_id)
    except:
        return APIUtilities._api_not_found()

    reference = resource.resource.revision.content
    context = dict({
        'textbook_title': reference.textbook.title,
        'thumbnail': settings.MEDIA_URL + reference.textbook.thumbnail.name,
    }.items() + reference.scope.items())

    return APIUtilities.success(context)


def create_section(request):
    parent_id = request.POST.get('parent_id', None)
    is_unit = request.POST.get('is_unit', None)
    title = request.POST.get('title', None)
    section_type = request.POST.get('section_type', None)
    position = request.POST.get('position', None)

    settings = {
        'type': section_type
    }

    try:
        if is_unit:
            parent = Unit.objects.get(pk=parent_id)
        else:
            parent = StandardCategory.objects.get(pk=parent_id)
    except:
        return APIUtilities._api_not_found()

    new_section = Section(position=position, title=title, settings=settings)
    new_section.save()

    parent.sections.add(new_section)

    context = {
        'id': new_section.id
    }
    
    return APIUtilities.success(context)


def delete_section(request, section_id):
    try:
        section = Section.objects.get(pk=section_id)
    except:
        return APIUtilities._api_not_found()

    if not request.user:
        return APIUtilities._api_unauthorized_failure()

    for item in section.items.all():
        delete_individual_item(item)

    section.delete()

    return APIUtilities.success()


def create_textbook(request):
    title = request.POST.get('title', None)
    description = request.POST.get('description', None)
    curriculum_id = request.POST.get('curriculum_id', None)

    try:
        curriculum = Curriculum.objects.get(pk=curriculum_id)
    except:
        return APIUtilities._api_not_found()

    new_textbook = Textbook(title=title, description=description)
    new_textbook.save()

    curriculum.textbooks.add(new_textbook)

    context = {
        'id': new_textbook.id
    }
    
    return APIUtilities.success(context)


def create_unit(request):
    title = request.POST.get('title', None)
    textbook_id = request.POST.get('textbook_id', None)
    curriculum_id = request.POST.get('curriculum_id', None)

    # Period properties.
    period_type = request.POST.get('type', None)
    unit = request.POST.get('unit', None)
    begin = request.POST.get('begin', None)
    end = request.POST.get('end', None)
    period_from = request.POST.get('from', None)
    period_to = request.POST.get('to', None)
    position = request.POST.get('position', None)
    parent = request.POST.get('parent', None)

    if begin:
        period = {
            'type': period_type,
            'unit': unit,
            'begin': int(begin),
            'end': int(end),
            'from': period_from,
            'to': period_to
        }
    else:
        period = {
            'type': period_type,
            'unit': unit,
            'position': int(position),
            'parent': int(parent)
        }

    try:
        curriculum = Curriculum.objects.get(pk=curriculum_id)
    except:
        return APIUtilities._api_not_found()

    if textbook_id:
        try:
            textbook = Textbook.objects.get(pk=textbook_id)
        except:
            return APIUtilities._api_not_found()
    else:
        textbook = None

    new_unit = Unit(title=title, period=period)
    new_unit.save()

    if textbook:
        textbook.units.add(new_unit)

    curriculum.units.add(new_unit)

    context = {
        'id': new_unit.id
    }
    
    return APIUtilities.success(context)


def update_settings(request):
    curriculum_id = request.POST.get('curriculum_id', None)
    title = request.POST.get('title', None)
    grade = request.POST.get('grade', None)
    subject = request.POST.get('subject', None)
    session = request.POST.get('session', None)
    from_datetime = request.POST.get('from', None)
    to_datetime = request.POST.get('to', None)
    """duration_relevance = request.POST.get('duration_relevance', None)
    standards = request.POST.get('standards', None)"""
    sync = request.POST.get('sync', None)

    try:
        curriculum = Curriculum.objects.get(pk=curriculum_id)
    except:
        return APIUtilities._api_not_found()

    if title:
        curriculum.title = title

    if subject:
        curriculum.subject = subject

    if grade:
        curriculum.grade = grade

    if session or from_datetime or to_datetime or sync:
        current_settings = curriculum.settings

        if session:
            current_settings['periods']['session'] = session

        if from_datetime:
            current_settings['periods']['start'] = from_datetime
        
        if to_datetime:
            current_settings['periods']['end'] = to_datetime

        if sync:
            current_settings['sync']['on'] = True if sync == 'true' else False

        curriculum.settings = current_settings

    curriculum.save()

    return APIUtilities.success()


def reposition_items(request):
    for item_id, item_position in request.POST.items():
        item = SectionItem.objects.get(pk=item_id)
        item.position = int(item_position)
        item.save()

    return APIUtilities.success()


def reposition_sections(request):
    for section_id, section_position in request.POST.items():
        section = Section.objects.get(pk=section_id)
        section.position = int(section_position)
        section.save()

    return APIUtilities.success()


def reposition_meta(request, section_item_id):
    try:
        section_item = SectionItem.objects.get(pk=section_item_id)
    except:
        return APIUtilities._api_not_found()

    for resource_set_meta_id, resource_set_meta_id_position in request.POST.items():
        if 'set' in resource_set_meta_id:
            resource_set = SectionItemResources.objects.get(pk=resource_set_meta_id[4:])
            resource_set.position = int(resource_set_meta_id_position)
            resource_set.save()

        elif 'meta' in resource_set_meta_id:
            current_meta = section_item.meta
            current_meta[int(resource_set_meta_id[5:])]['position'] = int(resource_set_meta_id_position)
            section_item.meta = current_meta
            section_item.save()

    return APIUtilities.success()


def create_item_resources(request):
    section_item_id = request.POST.get('id', None)
    title = request.POST.get('title', None)
    position = request.POST.get('position', None)

    try:
        section_item = SectionItem.objects.get(pk=section_item_id)
    except:
        return APIUtilities._api_not_found()

    new_section_item_resources = SectionItemResources(
        title=title, position=int(position))
    new_section_item_resources.save()

    section_item.resource_sets.add(new_section_item_resources)

    return APIUtilities.success({'id': new_section_item_resources.id})


def copy_curriculum(request):
    curriculum_id = request.POST.get('curriculum_id', None)
    title = request.POST.get('title', None)
    sync = request.POST.get('sync', None)

    if not request.user.is_authenticated():
        return APIUtilities._api_failure()

    from django.contrib.contenttypes.models import ContentType
    curriculum_content_type = ContentType.objects.get_for_model(Curriculum)
    unit_content_type = ContentType.objects.get_for_model(Unit)
    section_content_type = ContentType.objects.get_for_model(Section)
    sectionitem_content_type = ContentType.objects.get_for_model(SectionItem)
    sectionitemresources_content_type = ContentType.objects.get_for_model(SectionItemResources)
    resource_content_type = ContentType.objects.get_for_model(Resource)
    standardcategory_content_type = ContentType.objects.get_for_model(StandardCategory)

    try:
        curriculum = Curriculum.objects.get(pk=curriculum_id)
    except:
        return APIUtilities._api_not_found()

    def add_sections_to(parent, sections):
        for section in sections:
            new_section = Section(
                position=section.position,
                title=section.title,
                settings=section.settings
            )
            new_section.save()
            parent.sections.add(new_section)

            # IF SYNC IS TURNED ON.
            CurriculumSyncLink(
                link_type=section_content_type, from_curriculum=curriculum, to_curriculum=new_curriculum,
                source_id=section.id, target_id=new_section.id
            ).save()

            for item in section.items.all():
                new_item = SectionItem(
                    content_type=item.content_type,
                    content_id=item.content_id,
                    description=item.description,
                    meta=item.meta,
                    position=item.position
                )
                new_item.save()
                new_section.items.add(new_item)

                # IF SYNC IS TURNED ON.
                CurriculumSyncLink(
                    link_type=sectionitem_content_type, from_curriculum=curriculum, to_curriculum=new_curriculum,
                    source_id=item.id, target_id=new_item.id
                ).save()

                for resource_set in item.resource_sets.all():
                    new_item_resources = SectionItemResources(
                        title=resource_set.title,
                        position=resource_set.position
                    )
                    new_item_resources.save()
                    new_item.resource_sets.add(new_item_resources)

                    # IF SYNC IS TURNED ON.
                    CurriculumSyncLink(
                        link_type=sectionitemresources_content_type, from_curriculum=curriculum, to_curriculum=new_curriculum,
                        source_id=resource_set.id, target_id=new_item_resources.id
                    ).save()

                    for resource in resource_set.resources.all():
                        new_curriculum_resource = Resource(
                            resource=resource.resource,
                            notes=resource.notes
                        )
                        new_curriculum_resource.save()
                        new_item_resources.resources.add(new_curriculum_resource)

                        # IF SYNC IS TURNED ON.
                        CurriculumSyncLink(
                            link_type=resource_content_type, from_curriculum=curriculum, to_curriculum=new_curriculum,
                            source_id=resource.id, target_id=new_curriculum_resource.id
                        ).save()

    def make_standard_category_copies(parent, original_standard_category):
        if original_standard_category.standard_categories.count() == 0:
            return
        else:
            for standard_category in original_standard_category.standard_categories.all():
                new_standard_category = StandardCategory(
                    title=standard_category.title,
                    category=standard_category.category,
                )
                new_standard_category.save()
                parent.standard_categories.add(new_standard_category)

                # IF SYNC IS TURNED ON.
                CurriculumSyncLink(
                    link_type=standardcategory_content_type, from_curriculum=curriculum, to_curriculum=new_curriculum,
                    source_id=standard_category.id, target_id=new_standard_category.id
                ).save()

                add_sections_to(new_standard_category, standard_category.sections.all())
                return make_standard_category_copies(new_standard_category, standard_category)

    new_curriculum = Curriculum(
        title=title,
        user=request.user,
        description=curriculum.description,
        visibility=curriculum.visibility,
        grade=curriculum.grade,
        subject=curriculum.subject,
        settings=curriculum.settings,
        slug=curriculum.slug,
        synced_to=curriculum
    )
    new_curriculum.save()

    # IF SYNC IS TURNED ON.
    CurriculumSyncLink(
        link_type=curriculum_content_type, from_curriculum=curriculum, to_curriculum=new_curriculum,
        source_id=curriculum.id, target_id=new_curriculum.id,
    ).save()

    # Add references to EXISTING textbooks.
    for textbook in curriculum.textbooks.all():
        new_curriculum.textbooks.add(textbook)

    # Make a deep copy of the units.
    for unit in curriculum.units.all():
        new_unit = Unit(
            title=unit.title,
            period=unit.period
        )
        new_unit.save()
        new_curriculum.units.add(new_unit)

        # IF SYNC IS TURNED ON.
        CurriculumSyncLink(
            link_type=unit_content_type, from_curriculum=curriculum, to_curriculum=new_curriculum,
            source_id=unit.id, target_id=new_unit.id
        ).save()

        add_sections_to(new_unit, unit.sections.all())

        for textbook in new_curriculum.textbooks.all():
            if unit in textbook.units.all():
                textbook.units.add(new_unit)

    # Make a deep copy of the standard categories.
    make_standard_category_copies(new_curriculum, curriculum)

    return APIUtilities.success({'url': reverse(
        'curriculum:curriculum', kwargs={
            'organization_slug': request.organization.slug,
            'username': new_curriculum.user.username,
            'curriculum_slug': new_curriculum.slug
        }
    )})


def delete_curriculum(request, curriculum_id):
    try:
        curriculum = Curriculum.objects.get(pk=curriculum_id)
    except:
        return APIUtilities._api_not_found()

    if request.user != curriculum.user:
        return APIUtilities._api_unauthorized_failure()
    
    delete_individual_curriculum(curriculum)
    return APIUtilities.success()


def delete_individual_curriculum(curriculum):
    def delete_child_sections(parent):
        for section in parent.sections.all():
            for item in section.items.all():
                for resource_set in item.resource_sets.all():
                    for resource in resource_set.resources.all():
                        resource.delete()
                    resource_set.delete()
                item.delete()
            section.delete()

    def delete_descendant_standard_categories(parent):
        if parent.standard_categories.count() == 0:
            return
        else:
            for standard_category in parent.standard_categories.all():
                delete_child_sections(standard_category)
                delete_descendant_standard_categories(standard_category)

                standard_category.delete()
                return

    # Remove references to EXISTING textbooks.
    for textbook in curriculum.textbooks.all():
        curriculum.textbooks.remove(textbook)

    # Delete standard categories.
    delete_descendant_standard_categories(curriculum)

    # Remove all unit-descendant objects.
    for unit in curriculum.units.all():
        delete_child_sections(unit)
        unit.delete()

    # Delete all link from this curriculum.
    sync_links = CurriculumSyncLink.objects.filter(from_curriculum=curriculum)
    for link in sync_links:
        link.delete()

    # Delete from any list of recipients,
    curriculum.delete()


def traverse_and_replace_link(path, from_curriculum, to_curriculum):
    from django.contrib.contenttypes.models import ContentType

    try:
        if path['type'] == 'unit':
            unit_content_type = ContentType.objects.get_for_model(Unit)
            unit_link = CurriculumSyncLink.objects.get(
                from_curriculum=from_curriculum, source_id=path['id'],
                link_type=unit_content_type, to_curriculum=to_curriculum)
            path['id'] = unit_link.target_id

        elif path['type'] == 'section':
            section_content_type = ContentType.objects.get_for_model(Section)
            section_link = CurriculumSyncLink.objects.get(
                from_curriculum=from_curriculum, source_id=path['id'],
                link_type=section_content_type, to_curriculum=to_curriculum)
            path['id'] = section_link.target_id

        elif path['type'] == 'item':
            item_content_type = ContentType.objects.get_for_model(SectionItem)
            item_link = CurriculumSyncLink.objects.get(
                from_curriculum=from_curriculum, source_id=path['id'],
                link_type=item_content_type, to_curriculum=to_curriculum)
            path['id'] = item_link.target_id

        if path['child']:
            return traverse_and_replace_link(
                path['child'], from_curriculum, to_curriculum)
        else:
            return
    except:
        return


def serialize_change_target(change, curriculum):
    traverse_and_replace_link(change.path, change.curriculum, curriculum)

    if change.target_type.name == 'unit':
        target = {
            'type': change.target_type.name,
            'title': change.target.title,
            'period': change.target.period
        }

    elif change.target_type.name == 'section':
        target = {
            'type': change.target_type.name,
            'title': change.target.title,
            'position': change.target.position,
            'settings': change.target.settings
        }


    elif change.target_type.name == 'section item':
        target = {
            'type': change.target_type.name,
            'description': change.target.description,
            'meta': change.target.meta,
            'position': change.target.position
        }

    """serialized_changes.append({
        'path': change.path,
        'action': change.action,
        'target': target
    })"""
        #change.recipients.remove(curriculum)


    # If no recipient remains, purge change.

    #return APIUtilities.success(serialized_changes)
    return target


def push_changes(request, curriculum_id):
    import datetime
    now = datetime.datetime.now().isoformat()

    from curriculum.tasks import push_changes as push_changes_task
    push_changes_task.delay(now, curriculum_id)

    return APIUtilities.success({'lastPushed': now})


def pause_changes(request, curriculum_id):
    try:
        curriculum = Curriculum.objects.get(pk=curriculum_id)
    except:
        return APIUtilities._api_not_found()

    current_settings = curriculum.settings
    
    if current_settings['sync']['state'] == 'pause':
        # Turn all paused changes into pending.
        Change.objects.filter(state='pause', curriculum=curriculum).update(
            state='pending')
        current_settings['sync']['state'] = 'pending'
    else:
        current_settings['sync']['state'] = 'pause'
        
    curriculum.settings = current_settings
    curriculum.save()

    return APIUtilities.success()


def curriculum_changes(request, username, grade_slug, subject_slug):
    from django.shortcuts import redirect
    return redirect('curriculum:curriculum_resources',
        username=username,
        grade_slug=grade_slug,
        subject_slug=subject_slug
    )


def create(request):
    title = request.POST.get('title', None)
    subject = request.POST.get('subject', None)
    grade = request.POST.get('grade', None)
    session = request.POST.get('session', None)
    raw_start_date = request.POST.get('start_date', None)
    raw_end_date = request.POST.get('end_date', None)
    organization_slug = request.POST.get('organization_slug', None)

    import dateutil.parser
    from_date = dateutil.parser.parse(raw_start_date)
    end_date = dateutil.parser.parse(raw_end_date)

    settings = {
        'menu': [
            {
                'organization': 'textbook-units', 
                'title': 'UNITS / RESOURCES'
            }
        ], 
        'periods': {
            'session': session,
            'start': from_date.isoformat(), 
            'title': 'weekly',
            'end': end_date.isoformat(), 
            'data': []
        }
    }

    from django.template.defaultfilters import slugify

    new_curriculum = Curriculum(
        title=title,
        user=request.user,
        description='',
        visibility='private',
        grade=grade,
        subject=subject,
        settings=settings,
        slug=slugify(title)
    )
    new_curriculum.save()
    
    from django.shortcuts import redirect
    return redirect('curriculum:curriculum', username=request.user.username,
        organization_slug=organization_slug, curriculum_slug=new_curriculum.slug)


def delete(request):
    curriculum_id = request.POST.get('curriculum_id')
    username = request.POST.get('username')

    try:
        curriculum = Curriculum.objects.get(pk=curriculum_id, user__username=username)
    except:
        return Http404

    from django.core.exceptions import PermissionDenied
    if request.user != curriculum.user:
        raise PermissionDenied

    from django.contrib import messages
    messages.success(request, 'Curriculum \'%s\' deleted succesfully.' % curriculum.title)

    delete_individual_curriculum(curriculum)

    from django.shortcuts import redirect
    return redirect('user:user_curricula', username=username)
