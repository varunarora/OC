from django.contrib import admin
from interactions.models import Comment, CommentReference, Vote, Favorite, Review

admin.site.register(Comment)
admin.site.register(CommentReference)
admin.site.register(Vote)
admin.site.register(Favorite)
admin.site.register(Review)
