import json
from django.conf import settings
import os

class AttachmentUtilities:
    def __init__(self):
        pass

    @staticmethod
    def render_attachment(resource):
        from os.path import splitext
        name, resource.extension = splitext(resource.revision.content.file.name)

        ext = str.lower(str(resource.extension))
        import httplib
        import urllib

        if ext == ".doc" or ext == ".docx":
            # Init a POST request to services to convert to PDF.
            req = httplib.HTTPConnection(settings.SERVICES_HOST, 8888)
            req.connect()
            
            params = urllib.urlencode({'url': settings.MEDIA_URL + resource.revision.content.file.name})

            req.request('POST', '/render', params)
            response = req.getresponse()

            document = json.loads(response.read())

            temporary = settings.MEDIA_ROOT + 'rendered_resources/tmp/' + str(resource.id) + '.pdf'
            urllib.urlretrieve(document['url'], temporary)

            from django.core.files import File
            rendered_file_to_assign = File(open(temporary))

            resource.revision.content.rendered_file.save(
                rendered_file_to_assign.name, rendered_file_to_assign)

            os.remove(temporary)
