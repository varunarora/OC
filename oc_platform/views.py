from django.shortcuts import render, redirect
from articles.models import Article

def home(request):
	top_articles = Article.objects.order_by('title').order_by('-views')[:10]
	article_count = Article.objects.all().count()
	context = {'top_articles': top_articles, 'title': 'OpenCurriculum: A K-12 Learning Content Hub',
		'count' : article_count}	
	return render(request, 'index.html', context)
	
def t404(request):
	top_articles = Article.objects.order_by('title')[:10]
	context = {'top_articles': top_articles, 'title': 'OpenCurriculum: A K-12 Learning Content Hub'}	
	return render(request, '404.html', context)

def t505(request):
	top_articles = Article.objects.order_by('title')[:10]
	context = {'top_articles': top_articles, 'title': 'OpenCurriculum: A K-12 Learning Content Hub'}	
	return render(request, '500.html', context)

def contact(request):
	top_articles = Article.objects.order_by('title')[:10]
	context = {'top_articles': top_articles, 'title': 'OpenCurriculum: A K-12 Learning Content Hub'}
	return render(request, 'contact.html', context)
	
def developers(request):
	top_articles = Article.objects.order_by('title')[:10]
	context = {'top_articles': top_articles, 'title': 'OpenCurriculum: A K-12 Textbook Hub'}	
	return render(request, 'developers.html', context)
	
def about(request):
	context = {'title': 'About OpenCurriculum'}
	return render(request, 'about.html', context)

def team(request):
	context = {'title': 'OpenCurriculum\'s Team'}
	return render(request, 'team.html', context)
	
def press(request):
	context = {'title': 'Press &lsaquo; OpenCurriculum'}
	return render(request, 'press.html', context)
	
def help(request):
	return redirect('http://opencurriculum.uservoice.com')
	
def jobs(request):
	context = {'title': 'Jobs @ OpenCurriculum'}
	return render(request, 'jobs.html', context)
	
def terms(request):
	context = {'title': 'Terms of Use &lsaquo; OpenCurriculum'}
	return render(request, 'terms.html', context)
	
def privacy(request):
	context = {'title': 'Privacy Policy &lsaquo; OpenCurriculum'}
	return render(request, 'privacy.html', context)

def license(request):
	context = {'title': 'License &lsaquo; OpenCurriculum'}
	return render(request, 'license.html', context)
