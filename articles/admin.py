from django.contrib import admin
from articles.models import Article, ArticleRevision

admin.site.register(Article)
admin.site.register(ArticleRevision)
