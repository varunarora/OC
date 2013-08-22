from django import forms
from oer.models import Resource
from oc_platform import FormUtilities

class UploadResource(forms.Form):
    file = forms.FileField()


class NewVideoForm(forms.ModelForm):
    def __init__(self, request, user):
        newRequest = request.copy()

        default_cost = 0

        newRequest.setdefault('user', user.id)
        newRequest.setdefault('type', 'video')
        newRequest.setdefault('cost', default_cost)

        from meta.models import TagCategory
        tag_category = TagCategory.objects.get(title='Resources')
        newRequest.setlist('tags', FormUtilities.get_taglist(
            newRequest.getlist('tags'), tag_category))

        super(NewVideoForm, self).__init__(newRequest)

    class Meta:
        model = Resource


class NewURLForm(forms.ModelForm):
    def __init__(self, request, user):
        newRequest = request.copy()

        default_cost = 0

        newRequest.setdefault('user', user.id)
        newRequest.setdefault('type', 'url')
        newRequest.setdefault('cost', default_cost)

        from meta.models import TagCategory
        tag_category = TagCategory.objects.get(title='URL')
        newRequest.setlist('tags', FormUtilities.get_taglist(
            newRequest.getlist('tags'), tag_category))

        super(NewURLForm, self).__init__(newRequest)

    class Meta:
        model = Resource


class URLEditForm(forms.ModelForm):
    def __init__(self, request, instance):
        newRequest = request.copy()

        # For now, default to the previous values of user, type & cost
        newRequest.setdefault('user', instance.user.id)
        newRequest.setdefault('type', instance.type)
        newRequest.setdefault('cost', instance.cost)        

        from meta.models import TagCategory
        tag_category = TagCategory.objects.get(title='URL')
        newRequest.setlist('tags', FormUtilities.get_taglist(
            newRequest.getlist('tags'), tag_category))

        super(URLEditForm, self).__init__(newRequest, instance=instance)

    class Meta:
        model = Resource


class VideoEditForm(forms.ModelForm):
    def __init__(self, request, instance):
        newRequest = request.copy()

        # For now, default to the previous values of user, type & cost
        newRequest.setdefault('user', instance.user.id)
        newRequest.setdefault('type', instance.type)
        newRequest.setdefault('cost', instance.cost)        

        from meta.models import TagCategory
        tag_category = TagCategory.objects.get(title='Resources')
        newRequest.setlist('tags', FormUtilities.get_taglist(
            newRequest.getlist('tags'), tag_category))

        super(VideoEditForm, self).__init__(newRequest, instance=instance)

    class Meta:
        model = Resource


class DocumentEditForm(forms.ModelForm):
    def __init__(self, request, instance):
        newRequest = request.copy()

        # For now, default to the previous values of user, type & cost
        newRequest.setdefault('user', instance.user.id)
        newRequest.setdefault('type', instance.type)
        newRequest.setdefault('cost', instance.cost)        

        from meta.models import TagCategory
        tag_category = TagCategory.objects.get(title='Document')
        newRequest.setlist('tags', FormUtilities.get_taglist(
            newRequest.getlist('tags'), tag_category))

        super(DocumentEditForm, self).__init__(newRequest, instance=instance)

    class Meta:
        model = Resource


class AttachmentEditForm(forms.ModelForm):
    def __init__(self, request, instance):
        newRequest = request.copy()

        # For now, default to the previous values of user, type & cost
        newRequest.setdefault('user', instance.user.id)
        newRequest.setdefault('type', instance.type)
        newRequest.setdefault('cost', instance.cost)
        newRequest.setdefault('file', instance.file)
        newRequest.setdefault('url', instance.url)

        from meta.models import TagCategory
        tag_category = TagCategory.objects.get(title='Resources')
        newRequest.setlist('tags', FormUtilities.get_taglist(
            newRequest.getlist('tags'), tag_category))

        super(AttachmentEditForm, self).__init__(newRequest, instance=instance)

    class Meta:
        model = Resource


class NewDocumentForm(forms.ModelForm):
    def __init__(self, request, user):
        newRequest = request.copy()

        default_cost = 0

        newRequest.setdefault('user', user.id)
        newRequest.setdefault('type', 'article')
        newRequest.setdefault('cost', default_cost)

        from meta.models import TagCategory
        tag_category = TagCategory.objects.get(title='Document')
        newRequest.setlist('tags', FormUtilities.get_taglist(
            newRequest.getlist('tags'), tag_category))

        super(NewDocumentForm, self).__init__(newRequest)

    class Meta:
        model = Resource
