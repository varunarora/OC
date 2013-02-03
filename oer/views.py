from django.http import HttpResponse, Http404
from django.shortcuts import render, redirect
from oer.models import Resource

def resource_center(request):
	return HttpResponse("Page under construction")
	
def view_resource(request, resource_id):
	resource = Resource.objects.get(pk=resource_id)
	related = Resource.objects.all()[:5]
	
	if resource.type == "url":
		from BeautifulSoup import BeautifulSoup
		from urllib import urlopen
		
		source = urlopen(resource.url)
		soup = BeautifulSoup(source)
		
		resource.url_title = soup.find('title').text
		description = soup.findAll('meta', attrs={'name' : "description"})[0]
		
		if description:
			resource.body = description['content']
	
	if resource.type == "attachment":
		filesize = resource.file.size
		if filesize >= 104856:
			resource.filesize = str(_filesizeFormat(float(filesize) / 104856)) + " MB"
		elif filesize >= 1024:
			resource.filesize = str(_filesizeFormat(float(filesize) / 1024)) + " KB"
		else:
			resource.filesize = str(_filesizeFormat(float(filesize))) + " B"
	
		from os.path import splitext	
		name, resource.extension = splitext(resource.file.name)
	
	if resource.type == "video":
		import urlparse
		url_data = urlparse.urlparse(resource.url)
		
		domain = url_data.hostname
		hostname = domain.split(".")[:-1]

		if "youtube" in hostname:
			query = urlparse.parse_qs(url_data.query)
			video = query["v"][0]
			resource.video_tag = video
			resource.provider = "youtube"
			
		elif "vimeo" in hostname:
			resource.video_tag = url_data.path.split('/')[1]
			resource.provider = "vimeo"
	
	userResourceCount = Resource.objects.filter(user=resource.user).count()
	
	context = {'resource': resource, 'title': resource.title + " / OpenCurriculum", 'related' : related, "user_resource_count" : userResourceCount }	
	return render(request, 'resource.html', context)

def _filesizeFormat(size):
	return '{0:.2f}'.format(float(size))
	
def download(request, resource_id):
	resource = Resource.objects.get(pk=resource_id)
	
	import magic
	mime = magic.Magic(mime=True)
	content_type = mime.from_file(resource.file.path)
	# TODO: Security risk. Check file name for safeness
	response = HttpResponse(resource.file, content_type)
	response['Content-Disposition'] = 'attachment; filename="' + resource.file.name + '"'
	return response
