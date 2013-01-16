from django.http import HttpResponse
from django.shortcuts import render, redirect
from articles.models import Article
from meta.models import Category
from oer.models import Resource

def index(request):
	return HttpResponse("Page under construction")

def read_article(request, category_slug, article_slug):
	# Get the article based on the unique slug
	# TODO: Resolve the case of non-unique slugs by doing a upward category lookup
	article = Article.objects.get(slug=article_slug)
	
	# Fetch the current revision associated with the article
	articleRevision = article.revision
	articleRevision.title = article.title
	
	# Store other article fields in the revision object to be passed to the view
	articleRevision.difficulty = article.difficulty
	articleRevision.resources = article.resources
	articleRevision.slug = article.slug
	
	breadcrumb = buildBreadcrumb(article.category)
	breadcrumbTitle = breadcrumb[:]
	breadcrumbTitle.pop()
	title = article.title + " / "
	
	for category in breadcrumbTitle:
		title += category.title + " / "
	title+= "OpenCurriculum"	
	
	breadcrumb.reverse()
	
	# Get sibling articles of current article
	siblings = Article.objects.filter(category=article.category)
	
	# Limit the body size of all resources descriptions to 200 chars
	for resource in articleRevision.resources.all():
		resource.body = resource.body[0:200]
	
	context = {'article' : articleRevision, 'breadcrumb': breadcrumb, 'title': title,
		'siblings': siblings }
	return render(request, 'chapter.html', context)

def category_catalog(request, category_slug):
	if category_slug == "opencurriculum":
		return redirect('articles:catalog')
	
	category = Category.objects.get(slug=category_slug)
	breadcrumb = buildBreadcrumb(category)
	breadcrumbTitle = breadcrumb[:]
	breadcrumbTitle.pop()
	
	title = ""
	for category in breadcrumbTitle:
		title += category.title + " / "
	title+= "OpenCurriculum"	

	top_articles = Article.objects.filter(category__in=breadcrumb).order_by('views')
	
	breadcrumb.reverse()
	breadcrumb.pop()
	
	top_resources = []
	
	# TODO: Doing an n^2 look-up every single time is going to be time consuming, this needs to
	#	either be cached using a smart way or assigned to a background task
	# TODO: Sort the resources by popularity/relevance, etc.
	for article in top_articles:
		for resource in article.resources.all():
			if resource not in top_resources:
				top_resources.append(resource)
			else:
				index = top_resources.index(resource)
				top_resource.index(index).count += 1
	
	sets = list(Category.objects.filter(parent=category))
	
	for article in top_articles:
		if article.category in sets:
			sets.index(article.category).count += 1
	
	for category in sets:
		if not hasattr(category, 'count'):
			category.count = 0

	context = {'articles': top_articles, 'breadcrumb': breadcrumb, 'title' : title, 
		'category': category, 'resources': top_resources, 'sets': sets}	
	return render(request, 'category.html', context)

def catalog(request):
	#TODO: Build administrative environment to choose top subjects to display, not this way
	
	# Build the object for showing the mathematics panel
	# TODO: Need to get objects for all relevant article together, not using separate calls
	mathematicsCategory = Category.objects.get(title='Mathematics')
	mathematics = CatalogCategory()
	mathematicsArticles = Article.objects.filter(category=mathematicsCategory)
	mathematics.articlesView = mathematicsArticles.order_by('views')[:4]
	mathematics.count = mathematicsArticles.count()
	mathematics.countMore = (mathematics.count - 4) if mathematics.count>=4 else 0
	mathematics.title = "Mathematics"
	mathematics.slug = mathematicsCategory.slug
	
	# Build the object for showing the science panel
	# TODO: Need to get objects for all relevant article together, not using separate calls
	scienceCategory = Category.objects.get(title='Science')
	science = CatalogCategory()
	scienceArticles = Article.objects.filter(category=scienceCategory)
	science.articlesView = scienceArticles.order_by('views')[:4]
	science.count = scienceArticles.count()
	science.countMore = (science.count - 4) if science.count>=4 else 0
	science.title = "Science"
	science.slug = scienceCategory.slug
		
	articles = CatalogCategorySet()
	articles.categories = {mathematics, science}
	articles.resources = Resource.objects.order_by('views')[:8]
	
	context = {'articles' : articles, 'title': 'High-quality article catalog / OpenCurriculum'}	
	return render(request, 'catalog.html', context)

def buildBreadcrumb(category):
	# Create breadcrumb list and add the current category as current node
	breadcrumb = []
	breadcrumb.append(category)

	while True:
		breadcrumb.append(category.parent)
		# HACK: Need to look for root object using something unique like PK
		if category.parent.title == "OpenCurriculum":
			break
		else:
			category = category.parent

	return breadcrumb

class CatalogCategory():
	pass

class CatalogCategorySet():
	pass
