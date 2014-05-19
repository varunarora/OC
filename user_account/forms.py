from django import forms
from django.contrib.auth.models import User


class UploadProfilePicture(forms.Form):
    new_profile_picture = forms.ImageField()


class UserPreferences(forms.ModelForm):
    def __init__(self, request, user):
        super(UserPreferences, self).__init__(request, instance=user)

    class Meta:
        model = User
        exclude = ('username', 'password', 'email', 'last_login', 'date_joined',)
