from django.contrib import admin
from oer.models import Resource, Collection
from oer.models import ResourceOld, ResourceRevision, Document, DocumentElement, Element, Link, Attachment, Unit

admin.site.register(Resource)
admin.site.register(Collection)

admin.site.register(ResourceOld)
admin.site.register(ResourceRevision)
admin.site.register(Document)
admin.site.register(DocumentElement)
admin.site.register(Element)
admin.site.register(Link)
admin.site.register(Attachment)
admin.site.register(Unit)