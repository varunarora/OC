from django.utils import unittest

from meta.models import Language, Category, Tag

class MetaTests(unittest.TestCase):
	
	def createCategories(self):
		self.category1 = Category(title="Social studies", slug="social-studies")
		self.category2 = Category(title="Geometery", project=True)
		self.category3 = Category(title="Information Sciences", created=12346457, parent=self.category2)
		
		self.assertFalse(self.category1.project)
		self.assertEqual(self.category1.title, "Social studies")
		self.assertIsNone(self.category1.created)
		#self.assertTrue(self.category1.parent)
		self.assertEqual(self.category1.slug, "social-studies")
		
		self.assertTrue(self.category2.project)
		self.assertEqual(self.category2.title, "Geometery")		
		self.assertIsNone(self.category2.created)
		#self.assertTrue(self.category2.parent)
		self.assertFalse(self.category2.slug)
				
		self.assertFalse(self.category3.project)
		self.assertEqual(self.category3.title, "Information Sciences")
		self.assertEqual(self.category3.created, 12346457)
		self.assertEqual(self.category3.parent, self.category2)
		self.assertFalse(self.category3.slug)
	
	def createTags(self):
		self.tag1 = Tag(title="freesource", description="Tonnes of free resources")
		self.tag2 = Tag(title="Design resource", created=6536515)
		self.tag3 = Tag(created=12346457)

		self.assertEqual(self.tag1.title, "freesource")
		self.assertIsNone(self.tag1.created)
		self.assertEqual(self.tag1.description, "Tonnes of free resources")

		self.assertEqual(self.tag2.title, "Design resource")
		self.assertEqual(self.tag2.created, 6536515)
		self.assertEqual(self.tag2.description, '')

		self.assertEqual(self.tag3.title, '')
		self.assertEqual(self.tag3.created, 12346457)
		self.assertEqual(self.tag3.description, '')
		
	# Creating languages is quite an interesting prospect :P	
	def createLanguages(self):
		self.language1 = Language(title="English")
		self.language2 = Language(title="Arabic", encoding="UTF-7")
		self.language3 = Language(support=True)

		self.assertEqual(self.language1.title, "English")
		self.assertFalse(self.language1.support)
		self.assertEqual(self.language1.encoding, "UTF-8")

		self.assertEqual(self.language2.title, "Arabic")
		self.assertFalse(self.language2.support)
		self.assertEqual(self.language2.encoding, "UTF-7")

		self.assertEqual(self.language3.title, '')
		self.assertTrue(self.language3.support)
		self.assertEqual(self.language3.encoding, "UTF-8")
