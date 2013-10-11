from django.shortcuts import HttpResponse
from django.conf import settings
from interactions.models import Comment, Vote, Favorite
from django.contrib.contenttypes.models import ContentType
from oc_platform import APIUtilities

import json


def post_comment(request):
    response = {'status': 'error'}

    if request.method == "POST":
        from forms import NewCommentForm
        comment_form = NewCommentForm(request.POST)

        if comment_form.is_valid():
            comment = comment_form.save()

            parent_type = request.POST.get('parent_type')
            Comment.comment_created.send(
                sender="Comments", comment_id=comment.id, parent_type=parent_type)

            comment_ct = ContentType.objects.get_for_model(Comment)       

            import datetime
            serialized_comment = {
                'user_id': comment.user.id,
                'name': str(comment.user.get_full_name()),
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

        else:
            print comment_form.errors

    return HttpResponse(
        json.dumps(response), 401, content_type="application/json")


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
            if request.user == comment.user or root.admins.all():
                # Delete all descendant elements of this comment.

                # Get a flat list of all descendant comment, including itself.
                comment_ct = ContentType.objects.get_for_model(Comment)
                from interactions.CommentUtilities import CommentUtilities
                (comment.comments, flatted_comment_descendants) = CommentUtilities.build_comment_tree(
                    {'root': [comment]}, []
                )

                for child_comment in flatted_comment_descendants:
                    child_comment.delete()

                    # Delete all votes associated with this comment
                    votes = Vote.objects.filter(
                        parent_type=comment_ct, parent_id=child_comment.id
                    )

                    for vote in votes:
                        vote.delete()

                return APIUtilities._api_success()

        return APIUtilities._api_failure()

    except Comment.DoesNotExist:
        return APIUtilities._api_not_found()    


def get_favorite_state(request, resource_id, user_id):
    try:
        from oer.models import Resource
        resource = Resource.objects.get(pk=resource_id)

        from django.contrib.auth.models import User
        user = User.objects.get(pk=user_id)
    except:
        return APIUtilities._api_not_found()

    try:
        favorite = Favorite.objects.get(user=user, resource=resource)

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


def favorite_resource(request, resource_id, user_id):
    try:
        from oer.models import Resource
        resource = Resource.objects.get(pk=resource_id)

        from django.contrib.auth.models import User
        user = User.objects.get(pk=user_id)
    except:
        return APIUtilities._api_not_found()

    # Check if the favorite already exists
    try:
        existing_favorite = Favorite.objects.get(
            user=user, resource=resource)

        existing_favorite.delete()

        response = {'status': 'unfavorite success'}
        return HttpResponse(
            json.dumps(response), 200, content_type="application/json")

    except Favorite.DoesNotExist:
        try:
            if request.user != user:
                return APIUtilities._api_unauthorized_failure()

            # Create the favorite and save it
            new_favorite = Favorite(user=user, resource=resource)
            new_favorite.save()

            if resource.user != user:
                # Send out a notification to the person who originally made
                # the resource.
                Favorite.resource_favorited.send(sender="Favorite", favorite=new_favorite)

            return APIUtilities._api_success()
        except:
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


def upvote_resource(request, resource_id):
    return cast_resource_vote(request, resource_id, True)


def downvote_resource(request, resource_id):
    return cast_resource_vote(request, resource_id, False)


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

        response = {'status': 'unvote success'}
        return HttpResponse(
            json.dumps(response), 200, content_type="application/json")

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
            return APIUtilities._api_failure()


