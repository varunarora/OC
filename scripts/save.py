from oc_platform import settings
from django.core.management import setup_environ
setup_environ(settings)

from articles.models import Article
from meta.models import Category

category = Category.objects.get(title="BIology")
articleList = Article.objects.filter(category=category) # ["Trigonometric Functions of an Acute Angle"]

def save(x):
	x.save()

map(save, articleList)
