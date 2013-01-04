from django.http import HttpResponse
from django.shortcuts import render
from meta.models import Language

def index(request):
	top_languages = Language.objects.order_by('title')[:2]
	#output = ", ".join([l.title for l in top_languages])
	context = {'top_languages': top_languages}	
	return render(request, 'meta/index.html', context)

def match(request, number):
	return HttpResponse("You are looking for the language at position %s." % number)
