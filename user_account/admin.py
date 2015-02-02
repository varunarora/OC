from django.contrib import admin
from user_account.models import UserProfile, Cohort, Notification, Activity, Campaign, CampaignOpen, Organization, Subscription

admin.site.register(UserProfile)
admin.site.register(Cohort)
admin.site.register(Notification)
admin.site.register(Activity)
admin.site.register(Campaign)
admin.site.register(CampaignOpen)
admin.site.register(Organization)
admin.site.register(Subscription)
