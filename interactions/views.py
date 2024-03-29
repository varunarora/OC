from django.shortcuts import HttpResponse
from django.conf import settings
from interactions.models import Comment, Vote, Favorite
from django.contrib.contenttypes.models import ContentType
from oc_platform import APIUtilities

import json


def post_comment(request):
    response = {'status': 'error'}

    if request.method == "POST":
        try:
            comment = create_comment(request, request.POST)
            if comment:
                comment_ct = ContentType.objects.get_for_model(Comment)

                import datetime
                serialized_comment = {
                    'user_id': comment.user.id,
                    'name': str(comment.user.get_full_name()),
                    'username': comment.user.username,
                    'created': datetime.datetime.strftime(comment.created, '%b. %d, %Y, %I:%M %P'),
                    'profile_pic': settings.MEDIA_URL + comment.user.get_profile().profile_pic.name,
                    'body': comment.body_markdown_html,
                    'content_type': comment_ct.id,
                    'id': comment.id
                }

                response['status'] = 'success'
                response['message'] = serialized_comment

                return HttpResponse(
                    json.dumps(response), 200, content_type="application/json")
        except:
            return APIUtilities._api_failure()

    return HttpResponse(
        json.dumps(response), 401, content_type="application/json")


def post_comment_reference(request):
    if request.method == "POST":
        try:
            from interactions.models import CommentReference
            from django.contrib.contenttypes.models import ContentType

            # Get comment reference owner.
            owner_content_type = ContentType.objects.get(pk=request.POST.get('owner_type'))

            # Create a comment reference to no comment.
            new_comment_reference = CommentReference(
                reference=request.POST.get('reference'),
                owner_id=request.POST.get('owner_id'),
                owner_type=owner_content_type
            )
            new_comment_reference.save()

            # Create a new comment.
            comment_reference_content_type = ContentType.objects.get_for_model(CommentReference)

            modified_request = request.POST.copy()
            modified_request.setdefault('parent_type', comment_reference_content_type.id)
            modified_request.setdefault('parent_id', new_comment_reference.id)

            new_comment = create_comment(request, modified_request)

            # Map the comment to the reference.
            new_comment_reference.comment = new_comment
            new_comment_reference.save()

            import datetime
            context = {
                'username': new_comment.user.username,
                'name': new_comment.user.get_full_name(),
                'created': datetime.datetime.strftime(new_comment.created, '%b. %d, %Y, %I:%M %P'),
                'profile_pic': settings.MEDIA_URL + new_comment.user.get_profile().profile_pic.name,
                'body': new_comment.body_markdown_html,
                'id': new_comment.id        
            }
            return APIUtilities._api_success(context)

        except:
            return APIUtilities._api_failure()
    else:
        return APIUtilities._api_failure()


def create_comment(request, postRequest):
    from forms import NewCommentForm
    comment_form = NewCommentForm(postRequest)

    if comment_form.is_valid():
        comment = comment_form.save()

        parent_type_id = postRequest.get('parent_type')

        from interactions.tasks import comment as comment_task
        commenting_task = comment_task.delay(
            comment.id, parent_type_id, request.get_host())

        return comment

    else:
        return None


def upvote_comment(request, comment_id):
    return cast_vote(request, comment_id, True)


def downvote_comment(request, comment_id):
    return cast_vote(request, comment_id, False)


def cast_vote(request, comment_id, positive):
    comment_ct = ContentType.objects.get_for_model(Comment)       

    # Check if the comment already exists
    try:
        existing_vote = Vote.objects.get(
            parent_id=comment_id, parent_type=comment_ct,
            positive=positive, user=request.user
        )

        existing_vote.delete()

        response = {'status': 'unvote success'}
        return HttpResponse(
            json.dumps(response), 200, content_type="application/json")        
    except Vote.DoesNotExist:
        try:
            comment = Comment.objects.get(pk=comment_id)

            # Create the vote and save it
            new_vote = Vote()
            new_vote.user = request.user
            new_vote.positive = positive
            new_vote.parent = comment
            new_vote.save()

            if positive:
                # Send out a notification to the person who originally wrote
                # the comment, if a positive vote is casted.
                Vote.vote_casted.send(sender="Comments", vote=new_vote)

            return APIUtilities._api_success()
        except:
            return APIUtilities._api_failure()


def delete_comment(request, comment_id):
    try:
        comment = Comment.objects.get(pk=comment_id)

        # TODO(Varun): Same logic as duplicated from template generation to show
        # delete button
        from interactions.CommentUtilities import CommentUtilities
        (host_type, host, root) = CommentUtilities.get_comment_root(comment)

        if host_type.name == 'project':
            if request.user == comment.user or request.user in host.admins.all():
                # Delete all descendant elements of this comment.
                delete_comment_tree(comment)
                return APIUtilities._api_success()

            else:
                return APIUtilities._api_unauthorized_failure()

        elif host_type.name == 'resource':
            if request.user == comment.user or (
                request.user in host.collaborators.all() or
                request.user == host.creator):
                    delete_comment_tree(comment)
                    return APIUtilities._api_success()            

        return APIUtilities._api_failure()

    except Comment.DoesNotExist:
        return APIUtilities._api_not_found()    


def delete_comment_tree(comment):
    # Get a flat list of all descendant comment, including itself.
    comment_ct = ContentType.objects.get_for_model(Comment)
    from interactions.CommentUtilities import CommentsBuilder

    comments_builder = CommentsBuilder(comment, comment_ct)
    (comment.comments, flatted_comment_descendants) = comments_builder.build_tree()

    for child_comment in flatted_comment_descendants:
        # Delete all votes associated with this comment
        votes = Vote.objects.filter(
            parent_type=comment_ct, parent_id=child_comment.id
        )

        for vote in votes:
            vote.delete()

        child_comment.delete()


def get_favorite_state(request, favorite_type, parent_id):
    try:
        from oer.models import Resource, Collection
        from django.contrib.contenttypes.models import ContentType
        resource_ct = ContentType.objects.get_for_model(Resource)
        collection_ct = ContentType.objects.get_for_model(Collection)

        favorite = Favorite.objects.get(
            user=request.user, parent_id=parent_id, parent_type=(
                resource_ct if favorite_type == 'resource' else collection_ct))

        context = {
            'favorite': {
                'state': 'true',
                'created': str(favorite.created)
            }
        }
        return APIUtilities._api_success(context)

    except:
        context = {
            'favorite': {
                'state': 'false'
            }
        }
        return APIUtilities._api_success(context)


def favorite_resource(request, favorite_type, parent_id):
    # Check if the favorite already exists
    try:
        from oer.models import Resource, Collection
        from django.contrib.contenttypes.models import ContentType
        resource_ct = ContentType.objects.get_for_model(Resource)
        collection_ct = ContentType.objects.get_for_model(Collection)

        existing_favorite = Favorite.objects.get(
            user=request.user, parent_id=parent_id, parent_type=(
                resource_ct.id if favorite_type == 'resource' else collection_ct.id))

        existing_favorite.delete()

        response = {'status': 'unfavorite success'}
        return HttpResponse(
            json.dumps(response), 200, content_type="application/json")

    except Favorite.DoesNotExist:
        try:
            # Create the favorite and save it
            new_favorite = Favorite(user=request.user,
                parent_id=parent_id, parent_type=(
                    resource_ct if favorite_type == 'resource' else collection_ct))
            new_favorite.save()

            if (favorite_type == 'resource' and new_favorite.parent.user != request.user) or (
                favorite_type == 'collection' and new_favorite.parent.creator != request.user):
                # Send out a notification to the person who originally made
                # the resource.
                from interactions.tasks import favorite as favorite_task
                favoriting_task = favorite_task.delay(request.get_host(), new_favorite.id)
 
            return APIUtilities._api_success()
        except:
            return APIUtilities._api_failure()

    except TypeError:
        return APIUtilities._api_failure()


def get_resource_vote_count(request, resource_id):
    try:
        from oer.models import Resource
        resource = Resource.objects.get(pk=resource_id)
    except:
        return APIUtilities._api_not_found()

    try:
        from django.contrib.contenttypes.models import ContentType
        resource_ct = ContentType.objects.get_for_model(Resource)

        upvotes = Vote.objects.filter(
            parent_id=resource.id, parent_type=resource_ct, positive=1)
        downvotes = Vote.objects.filter(
            parent_id=resource.id, parent_type=resource_ct, positive=0)

        user_upvoted = False
        user_downvoted = False
        
        if (request.user.is_authenticated()):
            if upvotes.filter(user=request.user).count() > 0:
                user_upvoted = True

            if downvotes.filter(user=request.user).count() > 0:
                user_downvoted = True

        context = {
            'upvote_count': upvotes.count(),
            'downvote_count': downvotes.count(),
            'user_upvoted': 'true' if user_upvoted else 'false',
            'user_downvoted': 'true' if user_downvoted else 'false'
        }
        return APIUtilities._api_success(context)
    except:
        return APIUtilities._api_failure()


def get_resource_revision_vote_count(request, resource_id, revision_id):
    try:
        from oer.models import Resource, ResourceRevision
        Resource.objects.get(pk=resource_id)
        revision = ResourceRevision.objects.get(pk=revision_id)
    except:
        return APIUtilities._api_not_found()

    try:
        from django.contrib.contenttypes.models import ContentType
        resource_revision_ct = ContentType.objects.get_for_model(ResourceRevision)

        upvotes = Vote.objects.filter(
            parent_id=revision.id, parent_type=resource_revision_ct, positive=1)
        downvotes = Vote.objects.filter(
            parent_id=revision.id, parent_type=resource_revision_ct, positive=0)

        user_upvoted = False
        user_downvoted = False
        
        if (request.user.is_authenticated()):
            if upvotes.filter(user=request.user).count() > 0:
                user_upvoted = True

            if downvotes.filter(user=request.user).count() > 0:
                user_downvoted = True

        context = {
            'upvote_count': upvotes.count(),
            'downvote_count': downvotes.count(),
            'user_upvoted': 'true' if user_upvoted else 'false',
            'user_downvoted': 'true' if user_downvoted else 'false'
        }
        return APIUtilities._api_success(context)
    except:
        return APIUtilities._api_failure()


def upvote_resource(request, resource_id):
    return cast_resource_vote(request, resource_id, True)


def upvote_resource_revision(request, resource_id, revision_id):
    return cast_resource_revision_vote(request, resource_id, revision_id, True)


def downvote_resource(request, resource_id):
    return cast_resource_vote(request, resource_id, False)


def downvote_resource_revision(request, resource_id, revision_id):
    return cast_resource_revision_vote(request, resource_id, revision_id, False)


def cast_resource_vote(request, resource_id, positive):
    try:
        from oer.models import Resource
        resource = Resource.objects.get(pk=resource_id)
    except:
        return APIUtilities._api_not_found()    

    # Check if the vote already exists.
    try:
        from django.contrib.contenttypes.models import ContentType
        resource_ct = ContentType.objects.get_for_model(Resource)

        existing_vote = Vote.objects.get(
            user=request.user, parent_type=resource_ct, parent_id=resource.id,
            positive=positive)

        existing_vote.delete()

        context = {'action': 'unvote'}
        return APIUtilities._api_success(context)

    except Vote.DoesNotExist:
        try:
            # Create the vote and save it
            new_vote = Vote()
            new_vote.user = request.user
            new_vote.positive = positive
            new_vote.parent = resource
            new_vote.save()

            if positive and resource.user != request.user:
                Vote.resource_vote_casted.send(sender="Resource", vote=new_vote)

            return APIUtilities._api_success()
        except:
            context = {
                'title': 'Unable to cast resource vote',
                'message': 'We apologize as we failed to cast your vote on this resource. '
                + 'Please contact us if the problem persists.'
            }
            return APIUtilities._api_failure(context)


def cast_resource_revision_vote(request, resource_id, revision_id, positive):
    try:
        from oer.models import Resource, ResourceRevision
        Resource.objects.get(pk=resource_id)
        revision = ResourceRevision.objects.get(pk=revision_id)
    except:
        return APIUtilities._api_not_found()

    # Check if the vote already exists.
    try:
        from django.contrib.contenttypes.models import ContentType
        resource_revision_ct = ContentType.objects.get_for_model(ResourceRevision)

        existing_vote = Vote.objects.get(
            user=request.user, parent_type=resource_revision_ct, parent_id=revision.id,
            positive=positive)

        existing_vote.delete()

        context = {'action': 'unvote'}
        return APIUtilities._api_success(context)

    except Vote.DoesNotExist:
        try:
            # Create the vote and save it
            new_vote = Vote()
            new_vote.user = request.user
            new_vote.positive = positive
            new_vote.parent = revision
            new_vote.save()

            if positive and revision.user != request.user:
                Vote.resource_revision_vote_casted.send(sender="ResourceRevision", vote=new_vote)

            return APIUtilities._api_success()
        except:
            context = {
                'title': 'Unable to cast revision vote',
                'message': 'We apologize as we failed to cast your vote on this resource revision. '
                + 'Please contact us if the problem persists.'
            }
            return APIUtilities._api_failure(context)


def list_user_favorites(request):
    try:
        from django.contrib.auth.models import User
        user = User.objects.get(username=request.user.username)
    except:
        return APIUtilities._api_not_found()

    # Get user favorites.
    user_favorites = Favorite.objects.filter(user=user)

    from django.core.urlresolvers import reverse

    serialized_favorites = list()
    for favorite in user_favorites:
        if favorite.parent_type.name == 'resource':
            url = reverse(
                'read', kwargs={
                    'resource_id': favorite.parent.id,
                    'resource_slug': favorite.parent.slug
            })
            thumbnail = 'http://' + request.get_host(
                ) + settings.MEDIA_URL + favorite.parent.image.name
        else:
            url = reverse(
                'user:user_folder', kwargs={
                    'username': favorite.parent.creator.username,
                    'collection_slug': favorite.parent.slug
            })
            thumbnail = 'http://' + request.get_host(
                ) + settings.STATIC_URL + 'images/folder-icon.png'

        serialized_favorites.append({
            'id': favorite.parent.id,
            'user_url': reverse('user:user_profile', kwargs={
                'username': favorite.user.username }),
            'url': url,
            'title': favorite.parent.title,
            'user': favorite.user.get_full_name(),
            'username': favorite.user.username,
            'views': favorite.parent.views,
            'thumbnail': thumbnail
        })

    context = {
        'favorites': serialized_favorites
    }
    return APIUtilities._api_success(context)


def review_resource(request):
    if request.method == "POST":
        from django.core.urlresolvers import reverse
        from interactions.models import Review

        try:
            modified_request = request.POST.copy()
            modified_request.setdefault('user', request.user.id)

            comment = create_comment(request, modified_request)
            review = Review(
                comment=comment, rating=int(request.POST.get('stars', None))
            )
            review.save()

            import datetime
            serialized_review = {
                'user_url': reverse('user:user_profile', kwargs={
                    'username': comment.user.username
                }),
                'name': str(comment.user.get_full_name()),
                'username': comment.user.username,
                'created': datetime.datetime.strftime(comment.created, '%b. %d, %Y, %I:%M %P'),
                'profile_pic': settings.MEDIA_URL + comment.user.get_profile().profile_pic.name,
                'body': comment.body_markdown_html,
                'stars': review.rating
            }
            context = {
                'review': serialized_review
            }
            return APIUtilities._api_success(context)
        except:
            context = {
                'title': 'Unable to post your review',
                'message': 'We apologize as we failed to post your highly useful review. '
                + 'Please contact us if the problem persists.'            
            }
            return APIUtilities._api_failure(context)
    else:
        return APIUtilities._api_not_found()