from django.utils import unittest

from articles.models import Article, ArticleRevision

from django.contrib.auth.models import User
from meta.models import Language, Category
from license.models import License
from media.models import Image
        
class ArticlesTests(unittest.TestCase):

	def setUp(self):	
		self.category = Category(id=32, title="English", project=False, slug="english")
		self.language = Language(id=6, title="Arabic")
		self.image = Image(path="/dir/image.png", title="Roman Wallpaper", info="Created in the 18th century, this is a Roman marvel")
		self.license = License(id=2, title="CC BY SA NC", description="Need to attribute, share-alike and not charge")
		self.user = User(username="chacha_1234", password="nobodysgonnaguessthis")
		#TODO: Add ManyToMany tags field to the mock
		#TODO: Add resources to the mock
		
		self.articleRevision = ArticleRevision(id=84, title="Roman civilization", category=self.category, objectives="['Explore the myths of the establishment of the Roman civilization in the early 10th century']", body_markdown="A recent exploration into the Roman civilization...", user=self.user, log="The first revision as per requested by user @hopejef")
	
	def createArticles(self):
		self.setUp()
		self.article1 = Article(id=24, revision=self.articleRevision, category=self.category, language=self.language, title="Roman Wallpaper", views=24, license=self.license, slug="roman-wallpaper", published=False)
		# TODO: Needs to test with image association after its ManyToMany model rule is changed
		# self.article1.image.add(self.image)

		self.assertEqual(self.article1.id, 24)
		self.assertEqual(self.article1.revision.id, 84)
		self.assertEqual(self.article1.revision.log, "The first revision as per requested by user @hopejef")
		self.assertEqual(self.article1.revision.title, "Roman civilization")
		self.assertEqual(self.article1.revision.objectives, "['Explore the myths of the establishment of the Roman civilization in the early 10th century']")
		self.assertEqual(self.article1.revision.body_markdown, "A recent exploration into the Roman civilization...")
		self.assertEqual(self.article1.revision.user.username, "chacha_1234")
		self.assertEqual(self.article1.revision.user.password, "nobodysgonnaguessthis")
		self.assertEqual(self.article1.language.id, 6)
		self.assertEqual(self.article1.language.title, "Arabic")
		self.assertEqual(self.article1.category.id, 32)
		self.assertEqual(self.article1.category.title, "English")
		self.assertEqual(self.article1.category.slug, "english")
		self.assertEqual(self.article1.license.id, 2)
		self.assertEqual(self.article1.license.title, "CC BY SA NC")
		self.assertEqual(self.article1.license.description, "Need to attribute, share-alike and not charge")
