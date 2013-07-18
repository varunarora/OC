from django.contrib import admin
from meta.models import Language, Category, Tag, TagCategory, TagLabel

admin.site.register(Language)
admin.site.register(Category)
admin.site.register(Tag)
admin.site.register(TagCategory)
admin.site.register(TagLabel)
