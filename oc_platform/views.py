from django.shortcuts import render
from articles.models import Article

def home(request):
	top_articles = Article.objects.order_by('title')[:10]
	context = {'top_articles': top_articles, 'title': 'OpenCurriculum: A K-12 Textbook Hub'}	
	return render(request, 'index.html', context)
	
def t404(request):
	top_articles = Article.objects.order_by('title')[:10]
	context = {'top_articles': top_articles, 'title': 'OpenCurriculum: A K-12 Textbook Hub'}	
	return render(request, '404.html', context)

def t505(request):
	top_articles = Article.objects.order_by('title')[:10]
	context = {'top_articles': top_articles, 'title': 'OpenCurriculum: A K-12 Textbook Hub'}	
	return render(request, '500.html', context)

def contact(request):
	top_articles = Article.objects.order_by('title')[:10]
	context = {'top_articles': top_articles, 'title': 'OpenCurriculum: A K-12 Textbook Hub'}	
	return render(request, 'contact.html', context)
