from curriculum.models import Curriculum, Textbook, Unit, Objective, Resource, Issue
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

    from django.contrib.contenttypes.models import ContentType
    objective_content_type = ContentType.objects.get_for_model(Objective)

    serialized_textbooks = []

    for textbook in curriculum.textbooks.all():
        serialized_units = []

        for unit in curriculum.units.all():
            serialized_objectives = []

            if unit in textbook.units.all():

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
                            'url': reverse(
                                'read', kwargs={
                                    'resource_id': resource.resource.id,
                                    'resource_slug': resource.resource.slug
                                }
                            ),
                            'title': resource.resource.title
                        })

                    serialized_objectives.append({
                        'id': objective.id,
                        'description': objective.description,
                        'issue': serialized_issue,
                        'resources': serialized_resources
                    })

                serialized_units.append({
                    'id': unit.id,
                    'title': unit.title,
                    'objectives': serialized_objectives
                })

        serialized_textbooks.append({
            'title': textbook.title,
            'thumbnail': settings.MEDIA_URL + textbook.thumbnail.name,
            'units': serialized_units
        })

    context = {
        'curriculum': curriculum,
        'serialized_textbooks': serialized_textbooks,
        'title': curriculum.grade + ': ' + curriculum.subject
    }
    return render(request, 'curriculum-resources.html', context)


def update_objective(request):
    description = request.POST.get('description', None)
    objective_id = request.POST.get('id', None)

    try:
        objective = Objective.objects.get(pk=objective_id)
    except:
        return APIUtilities._api_not_found()

    try:
        objective.description = description
        objective.save()

        context = { 'objective': {
            'id': objective.id,
            'description': objective.description
        }}
        return APIUtilities._api_success(context)

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
    
    return APIUtilities.success(context)


def add_objective_to_unit(request):
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
        return APIUtilities._api_failure()


def create_update_issue(request):
    objective_id = request.POST.get('host_id', None)
    issue_state = request.POST.get('ready', None)
    message = request.POST.get('message', None)
    issue_id = request.POST.get('id', None)

    from django.contrib.contenttypes.models import ContentType
    objective_content_type = ContentType.objects.get_for_model(Objective)

    if issue_state == 'false':
        try:
            objective = Objective.objects.get(pk=objective_id)
        except:
            return APIUtilities._api_not_found()

        try:
            # Temp. associate all bugs with me.
            from django.contrib.auth.models import User
            reporter = User.objects.get(username='ocrootu')

            issue = Issue(
                host=objective,
                reporter=reporter
            )
            issue.save()

            context = {
                'issue': {
                    'id': issue.id,
                    'host_id': objective.id,
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
        issue = Issue.objects.get(host_id=objective_id, host_type=objective_content_type)
        issue.delete()

        context = {
            'issue': {
                'id': None,
                'host_id': None,
                'message': None,
            }
        }

        return APIUtilities.success(context)


def add_url_to_objective(request):
    objective_id = request.POST.get('objective_id', None)

    try:
        objective = Objective.objects.get(pk=objective_id)
    except:
        return APIUtilities._api_not_found()

    from oer.views import new_url_from_form
    new_resource = new_url_from_form(
        request.user, request.POST.get('title', None),
        request.POST.get('url', None))

    new_objective_resource = Resource(resource=new_resource)
    new_objective_resource.save()

    objective.resources.add(new_objective_resource)

    context = {
        'resource': {
            'id': new_objective_resource.id,
            'url': new_resource.revision.content.url,
            'title': new_resource.title
        }
    }

    return APIUtilities.success(context)


def add_existing_to_objective(request):
    objective_id = request.POST.get('objective_id', None)
    #is_resource = request.POST.get('is_resource', None) == 'true'
    resource_collection_id = request.POST.get('resource_collection_ID', None)

    try:
        objective = Objective.objects.get(pk=objective_id)
    except:
        return APIUtilities._api_not_found()

    from oer.models import Resource as OEResource    
    resource = OEResource.objects.get(pk=resource_collection_id)

    new_objective_resource = Resource(resource=resource)
    new_objective_resource.save()

    objective.resources.add(new_objective_resource)

    context = {
        'resource': {
            'id': new_objective_resource.id,
            'url': reverse(
                'read', kwargs={
                    'resource_id': resource.id,
                    'resource_slug': resource.slug
                }
            ),
            'title': resource.title
        }
    }

    return APIUtilities.success(context)


def add_upload_to_objective(request):
    objective_id = request.POST.get('objective_id', None)
    resource_id = request.POST.get('key', None)

    from oer.models import Resource as OEResource

    try:
        objective = Objective.objects.get(pk=objective_id)
        resource = OEResource.objects.get(pk=resource_id)
    except:
        return APIUtilities._api_not_found()

    new_objective_resource = Resource(resource=resource)
    new_objective_resource.save()

    objective.resources.add(new_objective_resource)

    context = {
        'resource': {
            'id': new_objective_resource.id,
            'url': reverse(
                'read', kwargs={
                    'resource_id': resource.id,
                    'resource_slug': resource.slug
                }
            ),
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