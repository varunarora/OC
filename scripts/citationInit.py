from oc_platform import settings
from django.core.management import setup_environ
setup_environ(settings)

from articles.models import Article
from meta.models import Category

trigCategory = Category.objects.get(title="Trigonometry")
trigArticles = Article.objects.filter(category=Category)

lmCategory = Category.objects.get(title="Light and Matter")
lmArticles = Article.objects.filter(category=lmCategory)

bioCategory = Category.objects.get(title="Biology")
bioArticles = Article.objects.filter(category=bioCategory)


def sc(x):
	x.citation = "Originally ported from <a href=\"http://www.mecmath.net/trig/\" target=\"_blank\">Michael Corral's Trigonometry textbook</a> under the  <a href=\"http://www.gnu.org/copyleft/fdl.html\" target=\"_blank\">GNU Free Documentation License, Version 1.3</a> accessed on October 5th, 2012"
	x.save()

def lm(x):
	x.citation = "Originally ported from <a href=\"http://www.lightandmatter.com/lm/\" target=\"_blank\">Benjamin Crowell's Light and Matter textbook</a> under the  <a href=\"http://creativecommons.org/licenses/by-sa/3.0/us/\" target=\"_blank\">CC-BY-SA USA License</a> accessed on February 12th, 2013"
	x.save()

def bio(x):
	x.citation = "Originally ported from <a href=\"http://en.wikibooks.org/wiki/High_School_Biology\" target=\"_blank\">CK-12's High School Biology textbook</a> under the  <a href=\"http://creativecommons.org/licenses/by-sa/3.0/us/\" target=\"_blank\">CC-BY-SA USA License</a> accessed on March 7th, 2013"
	x.save()

#map(sc, articles)
map(lm, lmArticles)
map(bio, bioArticles)
