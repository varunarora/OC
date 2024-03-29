from django.utils import unittest

from oer.models import Resource
from license.models import License
from django.contrib.auth.models import User

class OerTests(unittest.TestCase):

	def createResources(self):
		self.license = License(id=2, title="CC BY SA NC", description="Need to attribute, share-alike and not charge")
		self.user = User(username="chacha_1234", password="nobodysgonnaguessthis")
	
		self.resource = Resource(title="Bloody berry", license=self.license, url="http://www.google.com", body_markdown="Bloody berry is bloody very bloody merry", cost=9.78, user=self.user)
	
		
		self.assertEqual(self.resource.title, "Bloody berry")
		self.assertEqual(self.resource.type, "url")
		self.assertEqual(self.resource.license, self.license)
		self.assertEqual(self.resource.url, "http://www.google.com")
		self.assertEqual(self.resource.body_markdown, "Bloody berry is bloody very bloody merry")
		#self.assertIsNone(self.resource.tags)
		self.assertIsNone(self.resource.created)		
		self.assertEqual(self.resource.cost, 9.78)
		self.assertEqual(self.resource.views, 0)
		
		# TODO: Find a test for the file field
		#self.assertIsNone(self.resource.file)
				
		self.assertEqual(self.resource.license.id, 2)
		self.assertEqual(self.resource.license.title, "CC BY SA NC")
		self.assertEqual(self.resource.license.description, "Need to attribute, share-alike and not charge")
		self.assertEqual(self.resource.user.username, "chacha_1234")
		self.assertEqual(self.resource.user.password, "nobodysgonnaguessthis")
