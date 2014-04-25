from django.contrib import admin
from projects.models import Project, Membership, GroupCategory

admin.site.register(Project)
admin.site.register(Membership)
admin.site.register(GroupCategory)
