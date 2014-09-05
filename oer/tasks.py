from __future__ import absolute_import
from oc_platform.celery import app

@app.task
def generate_thumbnail(resource_id):
    from oer.ResourceThumbnail import ResourceThumbnail
    from oer.models import Resource

    resource = Resource.objects.get(pk=resource_id)
    ResourceThumbnail.generateThumbnail(resource)
    resource.save()
