from django.shortcuts import render
from articles.models import Article

def home(request):
	top_articles = Article.objects.order_by('title')[:10]
	context = {'top_articles': top_articles, 'title': 'OpenCurriculum: A K-12 Textbook Hub'}	
	return render(request, 'index.html', context)
	
def chapter(request):
	top_articles = Article.objects.order_by('title')[:2]
	context = {'top_articles': top_articles}	
	return render(request, 'chapter.html', context)
	
def search(request):
	top_articles = Article.objects.order_by('title')[:2]
	context = {'top_articles': top_articles}	
	return render(request, 'search.html', context)
