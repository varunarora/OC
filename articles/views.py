from django.http import HttpResponse, Http404
from django.shortcuts import render, redirect
from articles.models import Article
from meta.models import Category
from oer.models import Resource
from django.core.cache import cache
from datetime import datetime
import itertools

def index(request):
	return HttpResponse("Page under construction")

def read_article(request, article):
	# from datetime import datetime
	print datetime.now()

	# Look for breadcrumb value in cache
	ar_cache_key = "ar_" + str(article.id)
	articleRevision = cache.get(ar_cache_key)

	if not articleRevision:
		# Fetch the current revision associated with the article
		articleRevision = article.revision
		articleRevision.title = article.title
	
		# Store other article fields in the revision object to be passed to the view
		articleRevision.difficulty = article.difficulty
		articleRevision.resources = article.resources
		articleRevision.slug = article.slug

	# Look for breadcrumb value in cache
	bc_cache_key = "bc_" + str(article.id)
	breadcrumb = cache.get(bc_cache_key)

	if not breadcrumb:
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
		resource.body_markdown_html = resource.body_markdown_html[0:200]

	# Set caches
	cache.set(bc_cache_key, breadcrumb)
	cache.set(ar_cache_key, articleRevision)

	context = {'article' : articleRevision, 'breadcrumb': breadcrumb, 'title': title,
		'siblings': siblings }
	return render(request, 'article.html', context)

def category_catalog(request, category):
	breadcrumb = buildBreadcrumb(category)
	breadcrumbTitle = breadcrumb[:]
	breadcrumbTitle.pop()

	title = ""
	for bc_category in breadcrumbTitle:
		title += bc_category.title + " / "
	title+= "OpenCurriculum"

	# Look for childCategories in cache
	cc_cache_key = "cc_" + str(category.id)
	childCategories = cache.get(cc_cache_key)
	
	if not childCategories:
		# TODO: This operation is very slow. Need to optimize
		childCategories = buildChildCategories([], [category])
		
		cache.set(cc_cache_key, childCategories)

	top_articles = Article.objects.filter(category__in=childCategories).order_by('views')

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
	
	setCounts = {}
	for article in top_articles:
		if article.category in sets:
			if article.category in setCounts:
				setCounts[article.category] += 1
			else:
				setCounts[article.category] = 1

	for key, value in setCounts.items():
		setBreadcrumb = buildBreadcrumb(key)

		# HACK: This will break when doing projects. Needs to be fixed to resolve properly.
		setBreadcrumb.pop()
		setBreadcrumb.reverse()
		
		# HACK: So dirty. So hackish. This is not good
		newSlug = ""
		for bc_category in setBreadcrumb:
			newSlug += bc_category.slug
			newSlug += "/" if setBreadcrumb.index(bc_category) != (len(setBreadcrumb)-1) else ""
			
		key.slug = newSlug

	context = {'articles': top_articles, 'breadcrumb': breadcrumb, 'title' : title, 
		'category': category, 'resources': top_resources, 'sets': setCounts}	
	return render(request, 'category.html', context)

def catalog(request):
	# TODO: Build administrative environment to choose top subjects to display, not this way
	
	# Build the object for showing the mathematics panel
	# TODO: Need to get objects for all relevant article together, not using separate calls
	mathematicsCategory = Category.objects.get(title='Mathematics')
	mathematics = CatalogCategory()
	mathChildCategories = buildChildCategories([], [mathematicsCategory])
	mathematicsArticles = Article.objects.filter(category__in=mathChildCategories).order_by('views')
	mathematics.articlesView = mathematicsArticles.order_by('views')[:4]
	mathematics.count = mathematicsArticles.count()
	mathematics.countMore = (mathematics.count - 4) if mathematics.count>=4 else 0
	mathematics.title = "Mathematics"
	mathematics.slug = mathematicsCategory.slug
	
	# Build the object for showing the science panel
	# TODO: Need to get objects for all relevant article together, not using separate calls
	scienceCategory = Category.objects.get(title='Science')
	science = CatalogCategory()
	scienceChildCategories = buildChildCategories([], [scienceCategory])
	scienceArticles = Article.objects.filter(category__in=scienceChildCategories).order_by('views')
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
	
	# Returns a reverse breadcrumb
	return breadcrumb

def buildChildCategories(allCategories, categories):
	if len(categories) == 0:
		return allCategories
	else:
		allCategories.extend(categories)
		allChildLists = map(_hasImmediateChildren, categories)
		try:
			childCategories = list(itertools.chain.from_iterable(allChildLists))
		except:
			childCategories = []
		
		return buildChildCategories(allCategories, childCategories)

def _hasImmediateChildren(category):
	childCategories = Category.objects.filter(parent=category)
	if childCategories.count() > 0:
		return childCategories

def categoryURLResolver(request, categories_slugs, n):
	# Get the Category object of the parent of the request
	childCategorySlug = categories_slugs[n]
	
	# TODO: This does not belong to this function, design wise. Move it out and may be create a hook
	#	of sorts or place in URLConf
	if childCategorySlug == "opencurriculum":
		return redirect('articles:catalog')
	
	category = Category.objects.filter(slug=childCategorySlug)

	if category.count() == 1:
		return category_catalog(request, category.all()[0])
	else:
		# If parent/child category pair unique, return child category page (through correct def)
		truePairs = [cat for cat in category if _testCategoryUniqueness(cat, categories_slugs[n])]
		if len(truePairs) == 1:
			# HACK: For some reason, when a child is not found, the nearest parent is rendered. This
			#	surprisingly works in terms of usability in future, but in future there should be a
			# 	redirection to the parent page or a 404 should be raised
			return category_catalog(request, truePairs[0][-1])
		else:
			# Else recursively call function with parent as child
			return categoryURLResolver(request, categories_slugs, n-1)
		
def _testCategoryUniqueness(category, parent_slug):
	if category.parent.slug == parent_slug:
		return True

#def articleURLResolver():

def reader(request, category_slug):
	articleSlug = request.GET.get('q', '')

	if articleSlug != '':
		# Look up article from slug, if article name provided
		try:
			article = Article.objects.filter(slug=articleSlug)
		except Article.DoesNotExist:
			raise Http404

		# If non-unique article name, call articleURLResolver()
		articleCount = article.count()
		
		if articleCount == 1:
			# TODO: Due to this rather trivial code, the category is not even looked up is a unique
			#	child is found. This ought to be fixed to avoid misleading. Ideally, a lookup table
			# 	of URLs to category/article pages
			return read_article(request, article[0])
		else:
			return articleURLResolver(category_slug, articleSlug) 
	
	else:
		# Else, this is a category page, give back category if it is unique
		categories_slugs = category_slug.split('/')
		return categoryURLResolver(request, categories_slugs, -1)

class CatalogCategory():
	pass

class CatalogCategorySet():
	pass
