from django.contrib import admin
from curriculum.models import Curriculum, Textbook, Unit, Resource, Objective
from curriculum.models import Issue, Section, SectionItem, SectionItemResources
from curriculum.models import StandardCategory, Reference, Change, CurriculumSyncLink

admin.site.register(Curriculum)
admin.site.register(Textbook)
admin.site.register(Unit)
admin.site.register(Resource)
admin.site.register(Objective)
admin.site.register(Issue)
admin.site.register(Section)
admin.site.register(SectionItem)
admin.site.register(SectionItemResources)
admin.site.register(StandardCategory)
admin.site.register(Reference)
admin.site.register(Change)
admin.site.register(CurriculumSyncLink)