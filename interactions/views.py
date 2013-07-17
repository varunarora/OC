from django.shortcuts import HttpResponse
import json


def post_comment(request):
    response = {'status': 'error'}

    if request.method == "POST":
        from forms import NewCommentForm
        comment_form = NewCommentForm(request.POST)

        if comment_form.is_valid():
            comment = comment_form.save()
            from interactions.models import new_comment
            new_comment.send(sender='post_comment', actor_id=comment.user.id,
                             action='comment', object_id=comment.parent_id)

            serialized_comment = {'user': comment.user.id, 'body': comment.body_markdown_html}

            response['status'] = 'success'
            response['message'] = serialized_comment

            return HttpResponse(
                json.dumps(response), 200, content_type="application/json")

        else:
            print comment_form.errors

    return HttpResponse(
        json.dumps(response), 401, content_type="application/json")
