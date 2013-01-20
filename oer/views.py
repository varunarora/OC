from django.http import HttpResponse, Http404
from django.shortcuts import render, redirect
from oer.models import Resource

def resource_center(request):
	return HttpResponse("Page under construction")
	
def view_resource(request, resource_id):
	resource = Resource.objects.get(pk=resource_id)
	# TODO: Need to OC-ize the title here
	context = {'resource': resource, 'title': resource }	
	return render(request, 'resource.html', context)
