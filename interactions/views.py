from django.shortcuts import HttpResponse
from django.conf import settings
import json


def post_comment(request):
    response = {'status': 'error'}

    if request.method == "POST":
        from forms import NewCommentForm
        comment_form = NewCommentForm(request.POST)

        if comment_form.is_valid():
            comment = comment_form.save()

            from interactions.models import Comment
            Comment.comment_created.send(
                sender="Comments", comment_id=comment.id)

            serialized_comment = {
                'user': comment.user.id,
                'profile_pic': settings.MEDIA_URL + comment.user.get_profile.profile_pic.name,
                'body': comment.body_markdown_html
            }

            response['status'] = 'success'
            response['message'] = serialized_comment

            return HttpResponse(
                json.dumps(response), 200, content_type="application/json")

        else:
            print comment_form.errors

    return HttpResponse(
        json.dumps(response), 401, content_type="application/json")
