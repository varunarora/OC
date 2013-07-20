from oc_platform import settings
from django.core.management import setup_environ
setup_environ(settings)

from articles.models import Article
from oer.models import Resource

from django.conf import settings

articles = Article.objects.all()

for article in articles:
    from django.core.files.images import ImageFile
    thumbnail = settings.MEDIA_ROOT + 'article/' + str(article.id) + '-thumb'
    try:
        thumbnail_to_assign = ImageFile(open(thumbnail + ".jpg"))
        article.image.save(thumbnail_to_assign.name, thumbnail_to_assign, save=True)
    except IOError:
        print "Could not find file " + thumbnail

resources = Resource.objects.all()

for resource in resources:
    from django.core.files.images import ImageFile
    thumbnail = settings.MEDIA_ROOT + 'resource_thumbnail/' + str(resource.id) + '-thumb'
    try:
        thumbnail_to_assign = ImageFile(open(thumbnail + ".jpg"))
        article.image.save(thumbnail_to_assign.name, thumbnail_to_assign, save=True)
    except IOError:
        print "Could not find file " + thumbnail
