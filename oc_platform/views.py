from django.shortcuts import render
from articles.models import Article

def home(request):
	top_articles = Article.objects.order_by('title')[:2]
	context = {'top_articles': top_articles}	
	return render(request, 'index.html', context)
	
def chapter(request):
	top_articles = Article.objects.order_by('title')[:2]
	context = {'top_articles': top_articles}	
	return render(request, 'chapter.html', context)
