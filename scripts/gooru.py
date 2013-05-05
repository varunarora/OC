import httplib
from oc_platform import settings
from django.core.management import setup_environ
setup_environ(settings)

from articles.models import Article
from oer.models import Resource
from license.models import License
from meta.models import Category
from django.contrib.auth.models import User
import json

from oer.BeautifulSoup import BeautifulSoup
from urllib import urlopen
		

def connect():
	req = httplib.HTTPConnection('concept.goorulearning.org', 80)
	req.connect()

	req.request('POST', '/gooruapi/rest/account/signin.json?userName=varunarora&password=gooru1136&apiKey=04e9137a-70ad-11e2-b8f5-12313b0af644')

	response = req.getresponse()

	authJSON = json.loads(response.read())

	token = authJSON['token']
	#print '"' + token + '"'
	return req, token

req, token = connect()

articleList = Article.objects.filter(title="Force and Motion")

"""
category = Category.objects.get(title="Light and Matter")
articleList = Article.objects.filter(category=category) # ["Trigonometric Functions of an Acute Angle"] 
"""

for article in articleList:
	
	for r in article.resources.all():
		r.delete()

	article.resources = []

	#searchTerm = article.title
	searchTerm = article.title
	print searchTerm

	#try:
	req.request('POST', '/gooru-search/rest/search/resource?sessionToken=' + token + '&query=' + searchTerm)
	searchOutput = req.getresponse().read()
	#print searchOutput

	result = json.loads(searchOutput)

	searchResults = result['searchResults']
	oerSet = []

	for sr in searchResults:
		oer = Resource()
		# If resourcetype is video/url, set it to be that way
		oer.title = sr['title']
		print sr['title']
		if sr['resourceType']['name'] == "resource/url":
			oer.type = "url"
		elif sr['resourceType']['name'] == "video/youtube" or sr['resourceType']['name'] == "video/vimeo":
			oer.type = "video"

		oer.url = sr['url']

		if sr['license']['name'] == "Other":
			lo = License.objects.get(title="Unknown")
			oer.license = lo

		oer.cost = 0.0
		oer.user = User.objects.get(username="ocrootu")

		if sr['description'] != "":
			oer.body_markdown = sr['description']

		else:
			if sr['resourceType']['name'] == "resource/url" or sr['resourceType']['name'] == "video/youtube":
				try:
					source = urlopen(sr['url'])
					soup = BeautifulSoup(source)
					description = soup.findAll('meta', attrs={'name' : "description"})[0]

					if description:
						oer.body_markdown = description['content']
				except:
					pass
				
		oer.save()
		oerSet.append(oer)

	print oerSet
	article.resources = oerSet
	article.save()

	except:
		for oer in oerSet:
			oer.delete()
		print "ended up here"
		req, token = connect()

