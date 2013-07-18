from django import forms


class UploadProfilePicture(forms.Form):
    new_profile_picture = forms.ImageField()
