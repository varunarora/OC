from django import forms
from oer.models import Resource, Document, ResourceRevision, Link
from oc_platform import FormUtilities

class UploadResource(forms.Form):
    file = forms.FileField()


class NewVideoForm(forms.ModelForm):
    def __init__(self, request, user):
        newRequest = request.copy()

        default_cost = 0

        if not newRequest.get('title'):
            newRequest.__setitem__('title', 'Untitled Video')

        newRequest.setdefault('user', user.id)
        newRequest.setdefault('cost', default_cost)

        from django.template.defaultfilters import slugify
        newRequest.setdefault('slug', slugify(newRequest.get('title')))

        # Create and save new Link.
        new_video_link = Link(url=sanitize_url(newRequest.get('url', None)))
        new_video_link.save()

        new_resource_revision = ResourceRevision()
        new_resource_revision.content = new_video_link
        new_resource_revision.user = user
        new_resource_revision.save()

        newRequest.setdefault('revision', new_resource_revision.id);

        from meta.models import TagCategory
        tag_category = TagCategory.objects.get(title='Resources')
        newRequest.setlist('tags', FormUtilities.get_taglist(
            newRequest.getlist('tags'), tag_category))

        super(NewVideoForm, self).__init__(newRequest)

    class Meta:
        model = Resource
        exclude = ('language',)


class NewURLForm(forms.ModelForm):
    def __init__(self, request, user):
        newRequest = request.copy()

        default_cost = 0

        newRequest.setdefault('user', user.id)
        newRequest.setdefault('cost', default_cost)

        title = newRequest.get('title', None)

        # Fetch the URL page by making Http requests
        # using BeautifulSoup, and find meta tags in the DOM.
        try:
            from BeautifulSoup import BeautifulSoup
            from urllib import urlopen
            # Open the resource and build its DOM into a BeautifulSoup
            #     object.
            source = urlopen(newRequest.get('url'))
            soup = BeautifulSoup(source)

            # Extract the page title, and the description from its meta
            #     tags in <head>
            if not title:
                title = soup.find('title').text

            description = soup.findAll(
                'meta', attrs={'name': "description"}
            )[0]

            # If a description was found, set it on the resource.
            if description:
                newRequest.setdefault('description', description['content'])
        except:
            if not title:
                title = 'Untitled website'

        newRequest.__setitem__('title', title)

        from django.template.defaultfilters import slugify
        newRequest.setdefault('slug', slugify(newRequest.get('title')))

        # Create and save new Link.
        new_video_link = Link(url=sanitize_url(newRequest.get('url', None)))
        new_video_link.save()

        new_resource_revision = ResourceRevision()
        new_resource_revision.content = new_video_link
        new_resource_revision.user = user
        new_resource_revision.save()

        newRequest.setdefault('revision', new_resource_revision.id);

        from meta.models import TagCategory
        tag_category = TagCategory.objects.get(title='URL')
        newRequest.setlist('tags', FormUtilities.get_taglist(
            newRequest.getlist('tags'), tag_category))

        super(NewURLForm, self).__init__(newRequest)

    class Meta:
        model = Resource
        exclude = ('language',)


class URLEditForm(forms.ModelForm):
    def __init__(self, request, user, instance):
        newRequest = request.copy()

        # For now, default to the previous values of user, slug & cost
        newRequest.setdefault('user', instance.user.id)
        newRequest.setdefault('cost', instance.cost)        
        newRequest.setdefault('slug', instance.slug)

        # Create and save new Link, if the link URL changed.
        url_submitted = sanitize_url(newRequest.get('url', None))
        if instance.revision.url == url_submitted:
            new_link = Link(url=url_submitted)
            new_link.save()
            content = new_link
        else:
            content = instance.revision.url

        new_resource_revision = ResourceRevision()
        new_resource_revision.content = content
        new_resource_revision.resource = instance
        new_resource_revision.user = user
        new_resource_revision.save()

        newRequest.setdefault('revision', new_resource_revision.id);

        from meta.models import TagCategory
        tag_category = TagCategory.objects.get(title='URL')
        newRequest.setlist('tags', FormUtilities.get_taglist(
            newRequest.getlist('tags'), tag_category))

        super(URLEditForm, self).__init__(newRequest, instance=instance)

    class Meta:
        model = Resource
        exclude = ('language',)


class VideoEditForm(forms.ModelForm):
    def __init__(self, request, user, instance):
        newRequest = request.copy()

        # For now, default to the previous values of user, slug & cost
        newRequest.setdefault('user', instance.user.id)
        newRequest.setdefault('cost', instance.cost)        
        newRequest.setdefault('slug', instance.slug)

        # Create and save new Link, if the link URL changed.
        url_submitted = sanitize_url(newRequest.get('url', None))
        if instance.revision.url == url_submitted:
            new_video_link = Link(url=url_submitted)
            new_video_link.save()
            content = new_video_link
        else:
            content = instance.revision.url

        new_resource_revision = ResourceRevision()
        new_resource_revision.content = content
        new_resource_revision.resource = instance
        new_resource_revision.user = user        
        new_resource_revision.save()

        newRequest.setdefault('revision', new_resource_revision.id);

        from meta.models import TagCategory
        tag_category = TagCategory.objects.get(title='Resources')
        newRequest.setlist('tags', FormUtilities.get_taglist(
            newRequest.getlist('tags'), tag_category))

        super(VideoEditForm, self).__init__(newRequest, instance=instance)

    class Meta:
        model = Resource
        exclude = ('language',)


class DocumentEditForm(forms.ModelForm):
    def __init__(self, request, user, instance):
        newRequest = request.copy()

        # For now, default to the previous values of user, slug & cost
        newRequest.setdefault('user', instance.user.id)
        newRequest.setdefault('cost', instance.cost)
        newRequest.setdefault('slug', instance.slug)

        # Create and save new Document.
        new_document = Document()
        new_document.save()

        new_resource_revision = ResourceRevision()
        new_resource_revision.content = new_document
        new_resource_revision.resource = instance
        new_resource_revision.user = user
        new_resource_revision.save()

        newRequest.setdefault('revision', new_resource_revision.id);

        from meta.models import TagCategory
        tag_category = TagCategory.objects.get(title='Document')
        newRequest.setlist('tags', FormUtilities.get_taglist(
            newRequest.getlist('tags'), tag_category))

        super(DocumentEditForm, self).__init__(newRequest, instance=instance)

    class Meta:
        model = Resource
        exclude = ('language',)


class AttachmentEditForm(forms.ModelForm):
    def __init__(self, request, user, instance):
        newRequest = request.copy()

        # For now, default to the previous values of user, slug & cost
        newRequest.setdefault('user', instance.user.id)
        newRequest.setdefault('cost', instance.cost)
        newRequest.setdefault('slug', instance.slug)

        # Maintain the original attachment, as a revision.
        newRequest.setdefault('revision', instance.revision.id);

        from meta.models import TagCategory
        tag_category = TagCategory.objects.get(title='Resources')
        newRequest.setlist('tags', FormUtilities.get_taglist(
            newRequest.getlist('tags'), tag_category))

        super(AttachmentEditForm, self).__init__(newRequest, instance=instance)

    class Meta:
        model = Resource
        exclude = ('language',)


class NewDocumentForm(forms.ModelForm):
    def __init__(self, request, user):
        newRequest = request.copy()

        default_cost = 0

        if not newRequest.get('title'):
            newRequest.__setitem__('title', 'Untitled Document')

        newRequest.setdefault('user', user.id)
        newRequest.setdefault('cost', default_cost)

        from django.template.defaultfilters import slugify
        newRequest.setdefault('slug', slugify(newRequest.get('title')))

        # Create and save new Document.
        new_document = Document()
        new_document.save()

        new_resource_revision = ResourceRevision()
        new_resource_revision.content = new_document
        new_resource_revision.save()

        newRequest.setdefault('revision', new_resource_revision.id);

        from meta.models import TagCategory
        tag_category = TagCategory.objects.get(title='Document')
        newRequest.setlist('tags', FormUtilities.get_taglist(
            newRequest.getlist('tags'), tag_category))

        super(NewDocumentForm, self).__init__(newRequest)

    class Meta:
        model = Resource
        exclude = ('language',)


def sanitize_url(user_submitted_url):
    cleaned_url = user_submitted_url
    if cleaned_url[:3] != "http":
        cleaned_url = 'http://' + user_submitted_url

    return cleaned_url
