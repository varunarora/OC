from __future__ import absolute_import
from oc_platform.celery import app

@app.task
def favorite(host, favorite_id):
    from interactions.models import Favorite

    favorite = Favorite.objects.get(pk=favorite_id)
    Favorite.item_favorited.send(
        sender="Favorite", favorite=favorite, host=host)

@app.task
def comment(comment_id, parent_type_id, host):
    from interactions.models import Comment

    Comment.comment_created.send(
        sender="Comments", comment_id=comment_id,
        parent_type_id=parent_type_id, host=host
    )
