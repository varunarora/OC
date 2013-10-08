from django.http import Http404
from django.shortcuts import render, redirect
from django.utils.translation import ugettext as _
from django.conf import settings
from projects.models import Project, Membership
from interactions.models import Comment
from django.core.exceptions import PermissionDenied
from oc_platform import APIUtilities

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
    if not request.user.is_authenticated():
        return redirect('/?login=true&source=%s' % request.path)

    # If a form submission was made
    if request.method == "POST":
        from forms import ProjectForm

        new_project_form = ProjectForm(request.POST, request.user)

        if new_project_form.is_valid():
            try:
                # Try creating a new project with the form inputs
                new_project = new_project_form.save()

                # Add the creator to the project members.
                project_creator = Membership(
                    user=request.user, project=new_project, confirmed=True)
                project_creator.save()

                # Create a new root collection for the project
                from django.template.defaultfilters import slugify
                title = request.POST.get('title')

                from oer.models import Collection
                root_collection = Collection(
                    title=title + "_root",
                    host=new_project,
                    visibility=request.POST.get('visibility'),
                    slug=slugify(title),
                    creator=request.user
                )
                root_collection.save()
                new_project.collection = root_collection

                new_project.save()

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


def change_cover_picture(request, project_id):
    if request.method == "POST":
        # TODO(Varun): Get rid of this after setting the right form.
        from forms import UploadCoverPicture
        form = UploadCoverPicture(request.POST, request.FILES)

        project = Project.objects.get(pk=int(project_id))

        if form.is_valid():
            from django.core.files.base import ContentFile
            cover_pic = ContentFile(request.FILES['new_cover_picture'].read())  # write_pic(request.FILES['new_profile_picture'])
            project.cover_pic.save(
                str(project.id) + '-cover.jpg', cover_pic)

    return redirect(request.META.get('HTTP_REFERER'))


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

    if request.user not in project.members.all():
        raise PermissionDenied

    # Get all the comments whose parent is the project (in order of newest first)
    from django.contrib.contenttypes.models import ContentType
    project_ct = ContentType.objects.get_for_model(Project)
    posts = Comment.objects.filter(
        parent_id=project.id, parent_type=project_ct).order_by('-created')

    # For each of the comments, get its child comments recursively
    comments_ct = ContentType.objects.get_for_model(Comment)

    build_posts_social(posts, request.user)

    context = {
        'posts': posts,
        'comments_content_type': comments_ct,
        'project': project,
        'title': (_(settings.STRINGS['projects']['DISCUSSION_BOARD_TITLE']) +
                  ' &lsaquo; ' + project.title)
    }
    return render(request, 'project/discussion-board.html', context)


def discussion(request, project_slug, discussion_id):
    from django.contrib.contenttypes.models import ContentType

    try:
        project_ct = ContentType.objects.get_for_model(Project)
        post = Comment.objects.get(pk=discussion_id, parent_type=project_ct)
        project = Project.objects.get(slug=project_slug)
    except:
        raise Http404

    if request.user not in project.members.all():
        raise PermissionDenied

    build_posts_social([post], request.user)
    
    from oer.BeautifulSoup import BeautifulSoup
    soup = BeautifulSoup(post.body_markdown_html)
    post_title_short = soup.text[:200] + "..."

    # For each of the comments, get its child comments recursively
    from django.contrib.contenttypes.models import ContentType
    comments_ct = ContentType.objects.get_for_model(Comment)

    context = {
        'post': post,
        'comments_content_type': comments_ct,
        'project': project,
        'title': post_title_short + ' &lsaquo; ' + project.title
    }

    return render(request, 'project/discussion.html', context)


def build_posts_social(posts, user):
    for post in posts:
        from interactions.CommentUtilities import CommentUtilities
        (post.comments, flatted_post_descendants) = CommentUtilities.build_comment_tree(
            {'root': [post]}, []
        )
        # Set post upvotes & downvotes
        from interactions.VoteUtilities import VoteUtilities
        post.upvotes = VoteUtilities.get_upvotes_of(post)
        post.downvotes = VoteUtilities.get_downvotes_of(post)

        post.user_in_upvotes = False
        for vote in post.upvotes.all():
            if user == vote.user:
                post.user_in_upvotes = True
                break

        post.user_in_downvotes = False
        for vote in post.downvotes.all():
            if user == vote.user:
                post.user_in_downvotes = True
                break


def post_discussion(request, project_slug):
    # Validate request through new discussion post form
    from forms import NewDiscussionPost
    new_post = NewDiscussionPost(request.POST, request.user)

    # Save the post
    if new_post.is_valid():
        comment_created = new_post.save()

        # Send notifications for the new post.
        Project.discussion_post_created.send(
            sender="Projects", comment_id=comment_created.id)

    # Redirect to discussions page
    return redirect('projects:project_discussions', project_slug=project_slug)


def list_collection(request, project_slug, collection_slug):
    project = Project.objects.get(slug=project_slug)

    (browse_tree, flattened_tree) = _get_browse_tree(project.collection)

    collection = next(
        tree_item for tree_item in flattened_tree if tree_item.slug == collection_slug)

    root_assets = collection.resources

    import oer.CollectionUtilities as cu
    child_collections = cu._get_child_collections(collection)

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


def project_settings(request, project_slug):
    project = Project.objects.get(slug=project_slug)

    submit_context = {}

    if request.method == "POST":
        from forms import ProjectSettings
        settings_form = ProjectSettings(request.POST, project)

        if settings_form.is_valid():
            settings_form.save()
            submit_context = {
                'success': 'Successfully saved your changes.'
            }            
        else:
            print settings_form.errors
            submit_context = {
                'error': 'There were errors with your submission.'
            }

    context = dict({
        'project': project,
        'title': (_(settings.STRINGS['projects']['SETTINGS_TITLE']) +
                  ' &lsaquo; ' + project.title)
    }.items() + submit_context.items())
    return render(request, 'project/settings.html', context)


def requests(request, project_slug):
    project = Project.objects.get(slug=project_slug)

    membership_requestors = Membership.objects.filter(
        project=project, confirmed=False)

    context = {
        'project': project,
        'membership_requestors': membership_requestors,
        'title': (_(settings.STRINGS['projects']['REQUESTS_TITLE']) +
                  ' &lsaquo; ' + project.title)
    }
    return render(request, 'project/pending-invites.html', context)


# Projects-specific API below

def add_member(request, project_id, user_id):
    if not request.user.is_authenticated():
        context = {
            'title': 'You are not logged in',
            'message': 'You need to be logged in to add a member to the' +
                       'project.'
        }
        return APIUtilities._api_failure(context)

    project = Project.objects.get(pk=project_id)

    if request.user not in project.admins.all():
        context = {
            'title': 'You are not the administrator',
            'message': 'You must be an administrator of the project to add a'
            + 'member'
        }
        return APIUtilities._api_failure(context)

    from django.contrib.auth.models import User
    user = User.objects.get(pk=user_id)

    if Membership.objects.filter(user=user, project=project).count() != 0:
        context = {
            'title': 'Member is already added',
            'message': 'This member is already a part of the project.'
        }
        return APIUtilities._api_failure(context)        

    try:
        # Add the user to the project members.
        new_member = Membership(user=user, project=project, confirmed=True)
        new_member.save()

        # Notify the member about being added.
        Membership.new_member_added.send(
            sender="Projects", membership_id=new_member.id)

        # Prepare (serialize) user object be sent through the response.
        context = {
            'user': {
                'id': user.id,
                'name': user.get_full_name(),
                'username': user.username,
                'profile_pic': settings.MEDIA_URL + user.get_profile().profile_pic.name,
                'project_id': project.id
            }
        }

        return APIUtilities._api_success(context)

    except:
        context = {
            'title': 'Cannot add new member',
            'message': 'We failed to add this member to this project. We '
            + 'apologize for the inconvenience. Visit our Help center to look '
            + 'for a solution.'
        }
        return APIUtilities._api_failure(context)


def remove_member(request, project_id, user_id):
    if not request.user.is_authenticated():
        context = {
            'title': 'You are not logged in',
            'message': 'You need to be logged in to remove a member from the' +
                       'project.'
        }
        return APIUtilities._api_failure(context)

    project = Project.objects.get(pk=project_id)

    if request.user not in project.admins.all():
        context = {
            'title': 'You are not the administrator',
            'message': 'You must be an administrator of the project to remove a'
            + 'member'
        }
        return APIUtilities._api_failure(context)

    from django.contrib.auth.models import User
    user = User.objects.get(pk=user_id)

    try:
        # Remove the user from the project members and admins.
        member = Membership.objects.get(user=user, project=project)
        member.delete()

        project.admins.remove(user)
        project.save()

        return APIUtilities._api_success()

    except:
        context = {
            'title': 'Cannot remove the member',
            'message': 'We failed to remove the member from this project. We '
            + 'apologize for the inconvenience. Visit our Help center to look '
            + 'for a solution.'
        }
        return APIUtilities._api_failure(context)


def add_admin(request, project_id, user_id):
    if not request.user.is_authenticated():
        context = {
            'title': 'You are not logged in',
            'message': 'You need to be logged in to add an administrator to ' +
                       'the project.'
        }
        return APIUtilities._api_failure(context)

    project = Project.objects.get(pk=project_id)

    if request.user not in project.admins.all():
        context = {
            'title': 'You are not the administrator',
            'message': 'You must be an administrator of the project to add an'
            + 'administrator'
        }
        return APIUtilities._api_failure(context)

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
        return APIUtilities._api_failure(context)

    try:
        # Add the user to the project members.
        project.admins.add(user)
        project.save()

        # Notify the member about being assigned an admin.
        Membership.member_turned_admin.send(
            sender="Projects", project=project, user=user)

        # Prepare (serialize) user object be sent through the response.
        context = {
            'user': {
                'id': user.id,
                'name': user.get_full_name(),
                'username': user.username,
                'profile_pic': user.get_profile().profile_pic.name
            }
        }

        return APIUtilities._api_success(context)

    except:
        context = {
            'title': 'Cannot add new administrator',
            'message': 'We failed to add this administrator to this project. '
            + 'We apologize for the inconvenience. Visit our Help center to '
            + 'look for a solution.'
        }
        return APIUtilities._api_failure(context)


def remove_admin(request, project_id, user_id):
    if not request.user.is_authenticated():
        context = {
            'title': 'You are not logged in',
            'message': 'You need to be logged in to remove an administrator ' +
                       'from the project.'
        }
        return APIUtilities._api_failure(context)

    project = Project.objects.get(pk=project_id)

    if request.user not in project.admins.all():
        context = {
            'title': 'You are not the administrator',
            'message': 'You must be an administrator of the project to remove '
            + 'another administrator'
        }
        return APIUtilities._api_failure(context)

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
        return APIUtilities._api_failure(context)

    try:
        # Add the user to the project members.
        project.admins.remove(user)
        project.save()

        return APIUtilities._api_success()

    except:
        context = {
            'title': 'Cannot remove the administrator',
            'message': 'We failed to remove this administrator from this '
            + 'project. We apologize for the inconvenience. Visit our Help '
            + 'center to look for a solution.'
        }
        return APIUtilities._api_failure(context)


def request_invite(request, project_id):
    project = Project.objects.get(pk=project_id)

    try:
        # Check to see if the user already exists as a member.
        Membership.objects.get(
            user=request.user, project=project)

        context = {
            'title': 'Cannot complete the request invite.',
            'message': 'We failed to make a request invite on your behalf '
            + 'because you either have already sent an invite request or are a '
            + 'current member.'
        }
        return APIUtilities._api_failure(context)

    except Membership.DoesNotExist:
        new_membership = Membership(
            user=request.user, project=project, confirmed=False)
        new_membership.save()

        # Create a notification for the admins about this request.
        Membership.new_invite_request.send(
            sender="Projects", membership_id=new_membership.id)

        return APIUtilities._api_success()


def accept_request(request, request_id):
    try:
        membership_request = Membership.objects.get(pk=request_id)
        membership_request.confirmed = True
        membership_request.save()

        # Generate notification for user just accepted into the project to notify.
        Membership.invite_request_accepted.send(
            sender="Projects", membership_id=membership_request.id)

        return APIUtilities._api_success()
    except:
        context = {
            'title': 'Could not accept the request.',
            'message': 'We failed to make a accept the invite request into the project '
            + 'due to an internal problem. Please contact us if this problem persists.'
        }
        return APIUtilities._api_failure(context)        


def decline_request(request, request_id):
    try:
        membership_request = Membership.objects.get(pk=request_id)
        membership_request.delete()

        return APIUtilities._api_success()
    except:
        context = {
            'title': 'Could not accept the request.',
            'message': 'We failed to make a decline the invite request into the project '
            + 'due to an internal problem. Please contact us if this problem persists.'
        }
        return APIUtilities._api_failure(context)


def get_project_visibility(request, project_id):
    try:
        project = Project.objects.get(pk=project_id)

        if not request.user:
            return APIUtilities._api_unauthorized_failure()

        context = {
            'visibility': project.visibility
        }

        return APIUtilities._api_success(context)

    except:
        context = {
            'title': 'Could not get the visibility of this project.',
            'message': 'We failed to retrieve the visibility of '
            + 'this project. Please contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)
