from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm
from models import UserProfile
from django.forms import ModelForm
from django.utils.translation import ugettext as _
from django.conf import settings


class NewUserForm(UserCreationForm):
    """
    Sub-class of UserCreationForm which extends the superclass functionality
    by performing validation functionality associated with new user form
    objects.

    Attributes:
        email: An EmailField object of the user's email address.
        first_name: A CharField representing the user's first name.
        last_name: A CharField representing the user's last name.
        username: A CharField representing the user's username.
    """
    email = forms.EmailField(required=True)
    first_name = forms.CharField(required=True)
    last_name = forms.CharField()
    username = forms.CharField(max_length=30, min_length=4, required=True)

    def __init__(self, request, social_login):
        """Initialize the user form object by modifying the Django request
        object

        Args:
            request: The HTTP request object, as passed by django.
            social_login: Boolean of whether or not social login was used.
        """
        # Create a deep copy of the POST request object.
        newRequest = request.copy()

        # If the social login were used, generate a password for the user.
        if social_login:
            random_password = self.generate_password()
            # Use this code later for generating a username using AJAX.
            # username = self.generate_username(request)
            # newRequest.__setitem__('username', username)
            newRequest.__setitem__('password', random_password)
            newRequest.__setitem__('password1', random_password)
            newRequest.__setitem__('password2', random_password)
        else:
            # Copy the password field into password1 for validation
            newRequest.__setitem__('password1', request.get('password'))

        # Put timestamps of last login and date of joining of user.
        from datetime import datetime
        newRequest.__setitem__('last_login', datetime.now())
        newRequest.__setitem__('date_joined', datetime.now())

        # Invoke the superclass with this new QueryDict object.
        super(UserCreationForm, self).__init__(newRequest)

    def generate_password(self):
        """Generate and returns a password using Django function"""
        # Generate temporary password.
        from django.contrib.auth.models import User
        random_password = User.objects.make_random_password()

        return random_password

    def generate_username(self, request):
        """Generates a username based on the user email address and timestamp.

        Args:
            request: The HTTP request object, as passed by django.

        Returns:
            A string generated using the user's email username and the current
            epoch timestamp.
        """
        email = request.get('email')
        from time import time

        try:
            # Try using the valid email address provided to construct a
            #     username from the non host part of the string.
            at_position = email.index('@')
            username = email[:at_position] + '.' + str(time())
        except:
            # Else, get the first name and the last name (with a fallback),
            #     merge them with a period in the middle, and then add another
            #     period and the timestamp.
            first_name = request.get('first_name')
            last_name = request.get('last_name')

            username = first_name + '.' + last_name + '.' + str(time())

        # Return only the first 30 characters of the generated string.
        return username[:30]

    def clean_username(self):
        """Test the validity of the username or raise a validation error.

        Returns:
            The username attribute of the class.

        Raises:
            ValidationError: In the case that the username has undesired
                characters or if it already exists.
        """
        username = self.cleaned_data['username']

        import re
        from django.forms import ValidationError

        # If the username does not match the simple regex pattern of only
        #     letters, digits, and underscores, raise validation error.
        if re.match(r'^[A-Za-z]\w+$', username) is None:
            raise ValidationError(
                _(settings.STRINGS['user']['register']['form']['USERNAME_VALIDATION_ERROR']))

        # Try locating the username, and if found, raise error.
        try:
            User.objects.get(username=username)
        except User.DoesNotExist:
            return username
        raise ValidationError(u'%s already exists' % username)

    def _clean_name(self, name):
        """Checks to see if the name of the person is clean, raises an error.

        Args:
            name: A string (without spaces) representing a part of a larger
                name.

        Returns:
            The name, as it is, if it clears the regex pattern check.

        Raises:
            ValidationError: If the name has anything other than letters in it.
        """
        import re
        if re.match(r'^[A-Za-z\-\.\' ]+$', name) is None:
            raise forms.ValidationError(
                _(settings.STRINGS['user']['register']['form']['USERNAME_VALIDATION_ERROR']))

        return name

    def clean_first_name(self):
        return self._clean_name(self.cleaned_data['first_name'])

    def clean_last_name(self):
        return self._clean_name(self.cleaned_data['last_name'])

    class Meta:
        model = User


class NewUserProfileForm(ModelForm):
    """
    Sub-class of the ModelForm class based on the User Profile object model.
    Creates and validates the User Profile form object, and initialized the
    profile picture if provided.

    Attributes:
        profile_pic_tmp: A file IO object representing the default user profile
            picture.
    """
    profile_pic_tmp = open(settings.TEMP_IMAGE_DIR + 'default.jpg')

    def __init__(self, request, social_login, new_user, dob):
        """Initializes the profile form object after setting a profile picture,
        date of birth, and the User object it is associated with.

        Args:
            request: The HTTP request object, as passed by django.
            social_login: Boolean of whether or not social login was used.
            new_user: User object that was just created.
            dob: Date of birth date/timestamp.
        """
        # If date of birth has been set, set up the user profile object.
        if dob:
            profile_pic = self.default_profile_pic()

            # If social login has been used, get the profile picture URL from
            #     the Http request.
            if social_login:
                profile_pic_url = request.get('profile_pic')
                if profile_pic_url:
                    profile_pic = self.generate_profile_pic(
                        profile_pic_url, new_user.id)

            # Make a deep copy of the user request.
            newRequest = request.copy()
            newRequest.__setitem__('dob', dob)
            newRequest.__setitem__('user', new_user.id)
            newRequest.__setitem__('gender', request.get('gender') == '1')

            self.profile_pic_tmp = profile_pic

        # Invoke the superclass with this new QueryDict object.
        super(ModelForm, self).__init__(newRequest)

    def generate_profile_pic(self, profile_pic_url, user_id):
        """Pulls a request image, usually from social login, off the web and
        makes and returns a local copy of it.

        Args:
            profile_pic_url: Remote (web) URL of the profile picture.
            user_id: The user with whom the profile picture is to be associated.

        Returns:
            A file IO buffer of the local copy of the profile picture.
        """
        # Fetch the image from the web.
        # TODO(Varun): Move method to UserProfile class.
        import urllib2
        img_web = urllib2.urlopen(profile_pic_url).read()

        # Write the image to disk.
        image_path = settings.TEMP_IMAGE_DIR + str(user_id) + "-profile.jpg"
        localImage = open(image_path, 'w')
        localImage.write(img_web)
        localImage.close()

        # TODO(Varun): Need to clean the tmp directory from time to time.
        return open(image_path)

    def default_profile_pic(self):
        """Returns the default profile picture as a File object.

        Returns:
            File object of the default profile picture.
        """
        # TODO(Varun): Move method to UserProfile class
        # Return a reference to the profile pic associated with new users.
        default_image = open(settings.TEMP_IMAGE_DIR + "default.jpg")

        from django.core.files import File
        return File(default_image)

    class Meta:
        model = UserProfile


class Error():
    """
    Represents the model of a form error attribute.

    Attributes:
        description: String that holds the error description body.
    """
    description = ""

    def __str__(self):
        return self.description


class Field:
    """
    Represents the model of a form field.

    Attributes:
        errors: Error object that describes the error.
    """
    errors = Error()

    def __init__(self):
        self.errors = Error()


class UserExtended():
    """
    Represents the model of the extended User object.

    Attributes:
        password: Empty Field object that can hold errors.
    """
    password = Field()

    def __init__(self):
        self.password = Field()


class UserProfileExtended():
    """
    Represents the model of the extended User Profile object.

    Attributes:
        dob: Date of Birth Field object that can hold errors.
        recaptcha: recaptcha Field object that can hold errors.
    """
    dob = Field()
    recaptcha = Field()

    def __init__(self):
        self.dob = Field()
