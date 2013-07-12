from django.contrib import admin
from user_account.models import UserProfile
from user_account.models import Activity

admin.site.register(UserProfile)
admin.site.register(Activity)
