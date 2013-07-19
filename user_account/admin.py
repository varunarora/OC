from django.contrib import admin
from user_account.models import UserProfile, Cohort, Notification, Activity

admin.site.register(UserProfile)
admin.site.register(Activity)
admin.site.register(Cohort)
admin.site.register(Notification)

