from django import forms


class UploadImage(forms.Form):
    file = forms.ImageField()
