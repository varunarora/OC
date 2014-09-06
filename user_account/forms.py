from django import forms
from django.contrib.auth.models import User


class UploadProfilePicture(forms.Form):
    new_profile_picture = forms.ImageField()


class UserPreferences(forms.ModelForm):
    def __init__(self, request, user):
        # Get and assign email notification preferences.
        digests = {
            'subscription': True if request.get('subscription', None) else False,
            'newsletter': True if request.get('newsletter', None) else False,
            'activity_weekly': True if request.get('activity_weekly', None) else False,
        }

        user_profile = user.get_profile()
        user_profile.digests = digests
        user_profile.save()

        super(UserPreferences, self).__init__(request, instance=user)

    class Meta:
        model = User
        exclude = ('username', 'password', 'email', 'last_login',
            'date_joined', 'is_staff', 'is_active', 'is_superuser')
