from django.shortcuts import HttpResponse
from django.conf import settings
from interactions.models import Comment, Vote
from django.contrib.contenttypes.models import ContentType
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

            response = {'status': 'true'}
            return HttpResponse(
                json.dumps(response), 200, content_type="application/json")
        except:
            response = {'status': 'false'}
            return HttpResponse(
                json.dumps(response), 401, content_type="application/json")


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

                response = {'status': 'true'}
                return HttpResponse(
                    json.dumps(response), 200, content_type="application/json")

        response = {'status': 'false'}
        return HttpResponse(
            json.dumps(response), 401, content_type="application/json")

    except Comment.DoesNotExist:
        response = {'status': 'false'}
        return HttpResponse(
            json.dumps(response), 404, content_type="application/json")        
