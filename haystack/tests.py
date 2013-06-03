from django.test import TestCase
from haystack import trim

class trimTests(TestCase):
    def testTrim(self):
        """Making sure trim() never has bad outputs."""
        str0 = "34\u2345\u3456"
        str1 = "\u1234\u2345\u3456"
        str2 = "\u2345\u3456\\"
        str3 = "34\u2345\u3456 \u"
        str4 = "34\u2345\u3456\u3"
        str5 = "34\u2345\u3456\u34"
        str6 = "34\u2345\u3456\u345"
        str7 = ""
    
        self.assertTrue(trim.isTrimmed(trim.trim(str0))) 
        self.assertTrue(trim.isTrimmed(trim.trim(str1)))
        self.assertTrue(trim.isTrimmed(trim.trim(str2)))
        self.assertTrue(trim.isTrimmed(trim.trim(str3)))
        self.assertTrue(trim.isTrimmed(trim.trim(str4)))
        self.assertTrue(trim.isTrimmed(trim.trim(str5)))
        self.assertTrue(trim.isTrimmed(trim.trim(str6)))
        self.assertTrue(trim.isTrimmed(trim.trim(str7)))

