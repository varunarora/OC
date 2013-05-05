from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm
from models import UserProfile
from django.forms import ModelForm


class NewUserForm(UserCreationForm):
    email = forms.EmailField(required=True)
    first_name = forms.CharField(required=True)
    last_name = forms.CharField()
    username = forms.CharField(max_length=30, min_length=4, required=True)

    def __init__(self, request, social_login):
        newRequest = request.copy()

        if social_login:
            random_password = self.generate_password()
            # Use this code later for generating a username using AJAX
            #username = self.generate_username(request)
            newRequest.__setitem__('password', random_password)
            newRequest.__setitem__('password1', random_password)
            newRequest.__setitem__('password2', random_password)
            #newRequest.__setitem__('username', username)
        else:
            # Copy the password field into password1 for validation
            newRequest.__setitem__('password1', request.get('password'))

        from datetime import datetime
        newRequest.__setitem__('last_login', datetime.now())
        newRequest.__setitem__('date_joined', datetime.now())
        super(UserCreationForm, self).__init__(newRequest)

    def generate_password(self):
        # Generate temporary password
        from django.contrib.auth.models import User
        random_password = User.objects.make_random_password()

        return random_password

    def generate_username(self, request):
        email = request.get('email')
        from time import time

        try:
            # Try using the valid email address provided to construct a username from the
            #     non host part of the string
            at_position = email.index('@')
            username = email[:at_position] + '.' + str(time())
        except:
            # Else, get the first name and the last name (with a fallback), merge them with a
            # period in the middle, and then add another period and the timestamp
            first_name = request.get('first_name')
            last_name = request.get('last_name')

            username = first_name + '.' + last_name + '.' + str(time())

        return username[:30]

    def clean_username(self):
        username = self.cleaned_data['username']

        import re
        from django.forms import ValidationError

        if re.match(r'^[A-Za-z]\w+$', username) is None:
            raise ValidationError('Username must only have letters, digits, and underscores.')
        try:
            User.objects.get(username=username)
        except User.DoesNotExist:
            return username
        raise ValidationError(u'%s already exists' % username)

    def _clean_name(self, name):
        import re
        if re.match(r'^[A-Za-z\-\.\' ]+$', name) is None:
            raise forms.ValidationError('This field must only have letters.')

        return name

    def clean_first_name(self):
        return self._clean_name(self.cleaned_data['first_name'])

    def clean_last_name(self):
        return self._clean_name(self.cleaned_data['last_name'])

    class Meta:
        model = User


class NewUserProfileForm(ModelForm):
    profile_pic_tmp = open('static/images/tmp/default.jpg')

    def __init__(self, request, social_login, new_user, dob):
        if dob:
            profile_pic = self.default_profile_pic()

            if social_login:
                profile_pic_url = request.get('profile_pic')
                if profile_pic_url:
                    profile_pic = self.generate_profile_pic(profile_pic_url, new_user.id)
            newRequest = request.copy()
            newRequest.__setitem__('dob', dob)
            newRequest.__setitem__('user', new_user.id)

            self.profile_pic_tmp = profile_pic

        super(ModelForm, self).__init__(newRequest)

    # TODO: Move method to UserProfile class
    def generate_profile_pic(self, profile_pic_url, user_id):
        import urllib2
        img_web = urllib2.urlopen(profile_pic_url).read()

        image_path = 'static/images/tmp/' + str(user_id) + "-profile.jpg"
        localImage = open(image_path, 'w')
        localImage.write(img_web)
        localImage.close()

        # TODO: Need to clean the tmp directory from time to time
        return open(image_path)

    # TODO: Move method to UserProfile class
    def default_profile_pic(self):
        # Return a reference to the profile pic associated with new users
        default_image = open('static/images/tmp/' + "default.jpg")

        from django.core.files import File
        return File(default_image)

    class Meta:
        model = UserProfile


class Error():
    description = ""

    def __str__(self):
        return self.description


class Field:
    errors = Error()

    def __init__(self):
        self.errors = Error()


class UserExtended():
    password = Field()

    def __init__(self):
        self.password = Field()


class UserProfileExtended():
    dob = Field()
    recaptcha = Field()

    def __init__(self):
        self.dob = Field()
