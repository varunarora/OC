from django import forms


class UploadResource(forms.Form):
    new_resource = forms.FileField()
