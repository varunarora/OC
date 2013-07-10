from django.contrib import admin
from user_account.models import UserProfile
from user_account.models import FeedItem

admin.site.register(UserProfile)
admin.site.register(FeedItem)
