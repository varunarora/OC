from django.utils import unittest

from license.models import License

class LicenseTests(unittest.TestCase):
	def createLicenses(self):
	
		self.license1 = License(title="CC BY ND")
		self.license2 = License(title="CC BY", description="All free, as long as you attribute")
		self.license3 = License(custom=True)

		self.assertEqual(self.license1.title, "CC BY ND")
		self.assertFalse(self.license1.custom)
		self.assertEqual(self.license1.description, '')

		self.assertEqual(self.license2.title, "CC BY")
		self.assertFalse(self.license2.custom)
		self.assertEqual(self.license2.description, "All free, as long as you attribute")

		self.assertEqual(self.license3.title, '')
		self.assertTrue(self.license3.custom)
		self.assertEqual(self.license3.description, '')
