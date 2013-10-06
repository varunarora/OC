from django.contrib import admin
from interactions.models import Comment, Vote, Favorite

admin.site.register(Comment)
admin.site.register(Vote)
admin.site.register(Favorite)
