from django.http import Http404
from django.shortcuts import render, redirect, HttpResponse
from django.utils.translation import ugettext as _
from django.conf import settings
from projects.models import Project
from oer.models import Collection
import json
import itertools


def project_home(request, project_slug):
    try:
        project = Project.objects.get(slug=project_slug)
        # TODO(Varun): Check if this is a private project, and if it is, check
        #     if the requestee of the page is a member of the project. If not,
        #     have a flag that blocks the page contents from being listed, or has
        #     an alternative view.
        context = {
            'title': project.title + ' &lsaquo; OpenCurriculum',
            'project': project
        }
        #return render(request, 'project/project.html', context)
        return redirect('projects:project_browse', project_slug=project_slug)
    except:
        raise Http404


def launch(request):
    country = request.GET.get('q', '')

    if country.lower() == 'rsa':
        vocab = [
            "curricula", "workbooks", "lesson plans", "assessments",
            "old exam papers", "supplementary exams"
        ]
    elif country.lower() == 'npl':
        vocab = [
            "syllabus", "examinations", "textbooks", "support materials",
            "activities", "model question papers"
        ]
    elif country.lower() == 'ind':
        vocab = [
            "worksheets", "mock exams", "notes", "question banks", "guides",
            "tests"
        ]
    else:
        vocab = ["lesson plans", "worksheets", "syllabi", "tests"]

    context = {
        'title': _(settings.STRINGS['projects']['TITLE']),
        'vocab': vocab
    }
    return render(request, 'project/invite.html', context)


def invite(request):
    context = {'title': _(settings.STRINGS['projects']['TITLE'])}

    INVITE_RECIPIENTS = ['anup@theopencurriculum.org']

    # If a form submission was made
    if request.method == "POST":
        submission = request.POST
        message = '%s, %s, %s\n\n%s' % (submission.get('name'), submission.get(
            'email'), submission.get('organization'), submission.get('use'))

        try:
            from django.core.mail import send_mail
            recipients = settings.SIGNUPS_ADMINS

            send_mail(
                'OC-Invite: Projects', message,
                'OpenCurriculum <%s>' % settings.SERVER_EMAIL,
                recipients + INVITE_RECIPIENTS,
                fail_silently=False)
            context = {
                'title': _(
                    settings.STRINGS['projects']['invite']['SUCCESS_TITLE'])
            }
            return render(request, 'project/invite-success.html', context)

        except:
            context = {
                'form_failure': _(
                    settings.STRINGS['projects']['invite']['FAILURE'])
            }

    return render(request, 'project/invite.html', context)


def new_project(request):

    # If a form submission was made
    if request.method == "POST":
        from forms import ProjectForm

        new_project_form = ProjectForm(request.POST, request.user)

        if new_project_form.is_valid():
            try:
                # Try creating a new project with the form inputs
                new_project = new_project_form.save()

                # Assign this project as owner to the collection created earlier
                new_project.collection.owner = new_project

                # Set default cover pic if not uploaded by user
                if not new_project.cover_pic:
                    _set_cover_picture(new_project, new_project_form)

                return redirect(
                    'projects:project_home', project_slug=new_project.slug)

            except:
                print "Could not create new project"

        else:
            print new_project_form.errors
            print "The form had errors"

    context = {
        'title': _(settings.STRINGS['projects']['NEW_PROJECT_TITLE'])
    }
    return render(request, 'new-project.html', context)


# HACK: Code copied from user_account.views. Horrible idea. Need to move to
#     independant class
def _set_cover_picture(project, project_form):
    try:
        # Now set and save the profile image
        from django.core.files.base import ContentFile
        import os.path

        cover_pic_filename = os.path.basename(project_form.cover_pic_tmp.name)
        project.cover_pic.save(
            cover_pic_filename, ContentFile(project_form.cover_pic_tmp.read()))
        project.save()
    except:
        # TODO(Varun): Django notification for failure to create and assign
        #     profile picture
        print "Cover picture failed to be created"


def members(request, project_slug):
    try:
        project = Project.objects.get(slug=project_slug)
        context = {
            'project': project,
            'title': (_(settings.STRINGS['projects']['MEMBERS_TITLE']) +
                      ' &lsaquo; ' + project.title)
        }
        return render(request, 'project/members.html', context)
    except:
        raise Http404


def about(request, project_slug):
    try:
        project = Project.objects.get(slug=project_slug)
        context = {
            'project': project,
            'title': (_(settings.STRINGS['projects']['ABOUT_TITLE']) +
                      ' &lsaquo; ' + project.title)
        }
        return render(request, 'project/about.html', context)
    except:
        raise Http404


def browse(request, project_slug):
    try:
        project = Project.objects.get(slug=project_slug)
    except:
        raise Http404

    # Get the root collection of the project.
    root_collection = project.collection

    # Get all the assets of the root collection.
    root_assets = root_collection.resources

    import oer.CollectionUtilities as cu
    child_collections = cu._get_child_collections(root_collection)

    (browse_tree, flattened_tree) = _get_browse_tree(root_collection)

    context = {
        'project': project,
        'resources': root_assets.all, 'collections': child_collections,
        'collection': root_collection,
        'browse_tree': browse_tree,
        'title': (_(settings.STRINGS['projects']['BROWSE_TITLE']) +
                  ' &lsaquo; ' + project.title)
    }
    return render(request, 'project/browse.html', context)


def _get_browse_tree(collection):
    return buildChildCollections({'root': [collection]}, [])


def buildChildCollections(collectionModel, flattenedDescendants):
    """Adapted from buildChildCategories() in articles.views"""
    # Get the child collections of this collection recursively
    if len(collectionModel) == 0:
        return (None, flattenedDescendants)
    else:
        # Get all child collections whose children need to be found
        colValues = collectionModel.values()

        # Chain all the contents of the values
        childCollections = list(itertools.chain.from_iterable(colValues))

        # Create a master list [] of all { parent : [child, child] } mapping
        children = map(_hasImmediateChildren, childCollections)

        # Flatten the {} objects in the master list into one new dict
        collectionModel = {}
        for child in children:
            try:
                for k, v in child.iteritems():
                    collectionModel[k] = v
            except:
                pass

        # Call this function recursively to obtain the current models'
        #     descendant child categories
        (descendantsTree, descendantsFlattened) = buildChildCollections(
            collectionModel, childCollections
        )

        # Append "my" descendants to the descendants of "my" children
        flattenedDescendants += descendantsFlattened

        if descendantsTree is not None:
            # Iterate through all the dictionary keys, and replace the collection
            #     model items, and return the collection model
            for val in collectionModel.itervalues():
                for v in val:
                    for a, b in descendantsTree.iteritems():
                        if a == v:
                            val[val.index(v)] = {a: b}
            return (collectionModel, flattenedDescendants)
        else:
            return (collectionModel, flattenedDescendants)


def _hasImmediateChildren(collection):
    """Adapted from _hasImmediateChildren() in articles.views"""
    import oer.CollectionUtilities as cu
    childCollections = list(cu._get_child_collections(collection))
    if len(childCollections) > 0:
        return {collection: childCollections}
    else:
        return None


def discussions(request, project_slug):
    project = Project.objects.get(slug=project_slug)
    context = {
        'project': project,
        'title': (_(settings.STRINGS['projects']['DISCUSSION_BOARD_TITLE']) +
                  ' &lsaquo; ' + project.title)
    }
    return render(request, 'project/discussion-board.html', context)


def list_collection(request, project_slug, collection_slug):
    project = Project.objects.get(slug=project_slug)

    collection = Collection.objects.get(slug=collection_slug)
    root_assets = collection.resources

    import oer.CollectionUtilities as cu
    child_collections = cu._get_child_collections(collection)

    (browse_tree, flattened_tree) = _get_browse_tree(project.collection)

    context = {
        'project': project,
        'resources': root_assets.all(), 'collections': child_collections,
        'collection': collection,
        'browse_tree': browse_tree,
        # TODO(Varun): Make this a custom title.
        'title': (_(settings.STRINGS['projects']['BROWSE_TITLE']) +
                  ' &lsaquo; ' + project.title)
    }
    return render(request, 'project/browse.html', context)


# Projects-specific API below

def add_member(request, project_id, user_id):
    if not request.user.is_authenticated():
        context = {
            'title': 'You are not logged in',
            'message': 'You need to be logged in to add a member to the' +
                       'project.'
        }
        return _api_failure(context)

    project = Project.objects.get(pk=project_id)

    if request.user not in project.admins.all():
        context = {
            'title': 'You are not the administrator',
            'message': 'You must be an administrator of the project to add a'
            + 'member'
        }
        return _api_failure(context)

    from django.contrib.auth.models import User
    user = User.objects.get(pk=user_id)

    try:
        # Add the user to the project members.
        project.members.add(user)
        project.save()

        # Prepare (serialize) user object be sent through the response.
        context = {
            'user': {
                'id': user.id,
                'name': user.get_full_name(),
                'username': user.username,
                'profile_pic': user.get_profile().profile_pic.path
            }
        }

        return _api_success(context)

    except:
        context = {
            'title': 'Cannot add new member',
            'message': 'We failed to add this member to this project. We '
            + 'apologize for the inconvenience. Visit our Help center to look '
            + 'for a solution.'
        }
        return _api_failure(context)


def remove_member(request, project_id, user_id):
    if not request.user.is_authenticated():
        context = {
            'title': 'You are not logged in',
            'message': 'You need to be logged in to remove a member from the' +
                       'project.'
        }
        return _api_failure(context)

    project = Project.objects.get(pk=project_id)

    if request.user not in project.admins.all():
        context = {
            'title': 'You are not the administrator',
            'message': 'You must be an administrator of the project to remove a'
            + 'member'
        }
        return _api_failure(context)

    from django.contrib.auth.models import User
    user = User.objects.get(pk=user_id)

    try:
        # Add the user to the project members.
        project.members.remove(user)
        project.save()

        return _api_success()

    except:
        context = {
            'title': 'Cannot remove the member',
            'message': 'We failed to remove the member from this project. We '
            + 'apologize for the inconvenience. Visit our Help center to look '
            + 'for a solution.'
        }
        return _api_failure(context)


def add_admin(request, project_id, user_id):
    if not request.user.is_authenticated():
        context = {
            'title': 'You are not logged in',
            'message': 'You need to be logged in to add an administrator to ' +
                       'the project.'
        }
        return _api_failure(context)

    project = Project.objects.get(pk=project_id)

    if request.user not in project.admins.all():
        context = {
            'title': 'You are not the administrator',
            'message': 'You must be an administrator of the project to add an'
            + 'administrator'
        }
        return _api_failure(context)

    from django.contrib.auth.models import User
    user = User.objects.get(pk=user_id)

    # Check if the user being requested to be added is a current member.
    if user not in project.members.all():
        context = {
            'title': user.username + ' is not a member',
            'message': ('The user who you wish to make an administrator is not'
            + 'member. In order to make %s an administrator, the user must'
            + 'first be added to the project as a member') % user.username
        }
        return _api_failure(context)

    try:
        # Add the user to the project members.
        project.admins.add(user)
        project.save()

        # Prepare (serialize) user object be sent through the response.
        context = {
            'user': {
                'id': user.id,
                'name': user.get_full_name(),
                'username': user.username,
                'profile_pic': user.get_profile().profile_pic.path,
            }
        }

        return _api_success(context)

    except:
        context = {
            'title': 'Cannot add new administrator',
            'message': 'We failed to add this administrator to this project. '
            + 'We apologize for the inconvenience. Visit our Help center to '
            + 'look for a solution.'
        }
        return _api_failure(context)


def remove_admin(request, project_id, user_id):
    if not request.user.is_authenticated():
        context = {
            'title': 'You are not logged in',
            'message': 'You need to be logged in to remove an administrator ' +
                       'from the project.'
        }
        return _api_failure(context)

    project = Project.objects.get(pk=project_id)

    if request.user not in project.admins.all():
        context = {
            'title': 'You are not the administrator',
            'message': 'You must be an administrator of the project to remove '
            + 'another administrator'
        }
        return _api_failure(context)

    from django.contrib.auth.models import User
    user = User.objects.get(pk=user_id)

    # Check if the user being requested to be added is a current member.
    if user not in project.admins.all():
        context = {
            'title': user.username + ' is not an administrator',
            'message': ('The user who you wish to remove as an administrator '
            + 'is not an administrator. In order to remove %s as an '
            + 'administrator, the user must first be be assigned as an '
            + 'administrator') % user.username
        }
        return _api_failure(context)

    try:
        # Add the user to the project members.
        project.admins.remove(user)
        project.save()

        return _api_success()

    except:
        context = {
            'title': 'Cannot remove the administrator',
            'message': 'We failed to remove this administrator from this '
            + 'project. We apologize for the inconvenience. Visit our Help '
            + 'center to look for a solution.'
        }
        return _api_failure(context)


def _api_success(context={}):
    # TODO(Varun): Move this to an independant universal util class.
    status = dict({'status': 'true'}.items() + context.items())
    return HttpResponse(
        json.dumps(status), 200,
        content_type="application/json"
    )


def _api_failure(context={}):
    # TODO(Varun): Move this to an independant universal util class.
    status = dict({'status': 'false'}.items() + context.items())
    return HttpResponse(
        json.dumps(status), 401,
        content_type="application/json"
    )
