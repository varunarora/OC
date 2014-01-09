from oc_platform import settings
from django.core.management import setup_environ
setup_environ(settings)

from oer.models import Resource, ResourceNew, ResourceRevision, Document, Element, DocumentElement, Link, Attachment, Collection
#from interactions.models import Favorite, Vote

import json

# Get all resources from Resource

old_resources = Resource.objects.all()

# Iterate through each resource.
for old in old_resources:

    from BeautifulSoup import BeautifulSoup 
    description = ''.join(BeautifulSoup(old.body_markdown_html).findAll(text=True))

    from django.template.defaultfilters import slugify

    # Create a new resource and RevisionRevision with the info available.
    new_resource = ResourceNew(
        title=old.title,
        license=old.license,
        user=old.user,
        description=description if old.type != "article" else "",
        created=old.created,
        visibility='public' if old.visibility == '' else '',
        cost=old.cost,
        views=old.views,
        image=old.image,
        source=old.source,
        slug=slugify(old.title),
        id=old.id
    )

    # Add collaborators.
    for person in old.collaborators.all():
        new_resource.collaborators.add(person)

    try:
        # Based on its type, create appropriate content.
        if old.type == "article":
            content = Document()
            content.save()

            element = Element(body=json.loads('{"type": "textblock", "data": "' + old.body_markdown_html + '"}'))
            element.save()

            document_element = DocumentElement(
                document=content,
                element=element,
                position=1
            )
            document_element.save()

        elif old.type == "url":
            content = Link(url=old.url)
            content.save()

        elif old.type == "video":
            content = Link(url=old.url)
            content.save()

        elif old.type == "attachment":
            content = Attachment(file=old.file)
            content.save()

        # Make a copy of the revision content.
        revision = ResourceRevision(
            content=content,
            log='',
            user=old.user
        )

        revision.save()
        new_resource.revision = revision
        new_resource.save()

        revision.resource = new_resource
        revision.save()

        # Find all collections where the original resource was a part and add this resource there.
        collections = Collection.objects.filter(resources__id=old.id)
        """
        for collection in collections:
            print "came in and removed an old reference"
            collection.resources.remove(old)
            collection.resources.add(new_resource)
        """

        if len(collections) == 0:
            default_collection = Collection.objects.get(title='ocrootu_root')
            default_collection.resources.add(new_resource)

        """
        # Update favorites references
        favorites = Favorite.objects.filter(resource=old)
        for favorite in favorites:
            favorites.resource = new_resource
            favorites.save()

        from django.contrib.contenttypes.models import ContentType
        vote_ct = ContentType.objects.get_for_model(Vote)

        # Update vote references
        votes = Vote.objects.filter(
            parent_id=old.id,
            parent_type=vote_ct.id
        )
        for vote in votes:
            vote.parent = new_resource
            vote.save()
        """

    except Exception, e:
        print e
        print "Couldn't create a resource for " + old.title