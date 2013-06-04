from django.contrib import admin
from articles.models import Article, ArticleRevision


class ArticleRevisionAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'article', 'flag', 'user', )
    list_select_related = True


class ArticleAdmin(admin.ModelAdmin):
    list_display = ('title', 'published', 'category', 'revision')
    list_select_related = True

admin.site.register(Article, ArticleAdmin)
admin.site.register(ArticleRevision, ArticleRevisionAdmin)
