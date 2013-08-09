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
