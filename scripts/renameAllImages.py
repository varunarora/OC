from oc_platform import settings
from django.core.management import setup_environ
setup_environ(settings)

from articles.models import ArticleRevision

allArticles = ArticleRevision.objects.all()

for article in allArticles:
    article.body_markdown = article.body_markdown.replace('/static/images/articles/', '/static/media/articles_manual/')
    article.save()
