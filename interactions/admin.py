from django.contrib import admin
from interactions.models import Comment, CommentReference, Vote, Favorite

admin.site.register(Comment)
admin.site.register(CommentReference)
admin.site.register(Vote)
admin.site.register(Favorite)
