import httplib
from oc_platform import settings
from django.core.management import setup_environ
setup_environ(settings)

from oer.models import Collection
from oer.BeautifulSoup import BeautifulSoup
import urlparse
import urllib
from subprocess import call
from django.core.files.images import ImageFile

collection = Collection.objects.get(pk=1236)

thumbnailDir = settings.MEDIA_ROOT + 'resource_thumbnail/tmp/'

for resource in collection.resources.all():
    url = resource.revision.content.url

    parsed_url = urlparse.urlparse(url)
    req = httplib.HTTPConnection(parsed_url.netloc, 80)
    req.connect()

    req.request('GET', parsed_url.path)
    response = req.getresponse().read()

    soup = BeautifulSoup(response)

    img_wrapper = soup.find('div', {'class': 'post-thumbnail'})
    img = img_wrapper.find('img')

    thumbnail = thumbnailDir + str(resource.id)

    # Returns a 120x90 image
    urllib.urlretrieve(img['src'], thumbnail + "-tmp.jpg")

    call(["convert", "-size", "200x200", "xc:white", thumbnail + '.jpg'])

    call(["composite", "-geometry", "-30-15", '-gravity', 'center', thumbnail + "-tmp.jpg",
            thumbnail + '.jpg', thumbnail + '.jpg'])

    image_file = open(thumbnail + '.jpg')
    thumbnail_to_assign = ImageFile(image_file)

    resource.image.save(
        thumbnail_to_assign.name, thumbnail_to_assign)

    image_file.close()

    # Now delete the temporary image thumbnail
    call(["rm", thumbnail + '.jpg'])
