from django.http import HttpResponse
from django.shortcuts import render
from articles.models import Article
import json

"""
def index(request):
	top_languages = Language.objects.order_by('title')[:2]
	#output = ", ".join([l.title for l in top_languages])
	context = {'top_languages': top_languages}	
	return render(request, 'meta/index.html', context)
"""
def read_article(request, subject, article_slug):
	article = Article.objects.get(slug=article_slug)
	articleRevision = article.revision
	bodyObject = json.loads(articleRevision.body)
	articleRevision.objectives = bodyObject["objectives"]
	articleRevision.bodyContent = bodyObject["body"]
	articleRevision.difficulty = article.difficulty
	
	articleRevision.resources = article.resources
	
	for resource in articleRevision.resources.all():
		resource.body = resource.body[0:200]
	
	context = {'article' : articleRevision}
	return render(request, 'chapter.html', context)