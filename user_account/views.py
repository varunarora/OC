from django.shortcuts import render, HttpResponse, redirect, Http404
from django.utils.translation import ugettext as _
from django.contrib.auth.models import User
from user_account.models import Activity
from interactions.models import Comment
from django.template import Context
from django.dispatch import Signal
from django.conf import settings
import json


def register_tmp(request):
    # TODO(Varun): Remove this temp function.
    from django.contrib.auth.forms import UserCreationForm
    context = {'form': UserCreationForm().as_p()}
    return render(request, "registration-success.html", context)


def register(request):
    """Renders the register page for a new user, and performs validation upon
    submissions.

    In the case that no POST submission has been made to the register form,
    returns populated field data for the template, along with context from
    Google+/social login option. In the case of a POST submission on the
    register form, process and validate the form. As a result, either report
    errors or redirect to success page.

    Args:
        request: The HTTP request object, as passed by django.

    Returns:
        Either the form HttpResponse page (with or without errors), or a
        redirection object to successful account creation.
    """
    if request.user.is_authenticated():
        return redirect('home')

    # TODO(Varun): Make this more "function"al.
    registration_template = 'register.html'
    success_template = 'registration-success.html'
    page_context = {
        'title': _(settings.STRINGS['user']['REGISTER_TITLE'])
    }

    form_context = _prepare_registration_form_context()

    # Context objects which render the form.
    fields_context = {}

    if request.method == "POST":
        # Capture only thse inputs from the original form that need to be
        #     returned in the case of an error with form validation.
        form_fields_to_return = [
            'first_name', 'last_name', 'email', 'dob_month', 'dob_date',
            'dob_year', 'profile_pic', 'social_login', 'location',
            'profession', 'username', 'gender'
        ]
        # TODO(Varun): Turn this into a non-short statement.
        original_form_inputs = _get_original_form_values(
            request, form_fields_to_return)

        # Returns context if form registration fails, else redirects response.
        (fields_context, user_creation_success) = _create_user(request)

        if user_creation_success:
            return render(request, success_template, fields_context)

        fields_context['form'] = original_form_inputs

    # Build the form from previous inputs and Google+ login data to
    #     pre-populate form.
    #registration_template += "?"
    from AuthHelper import AuthHelper
    context = dict(
        AuthHelper.generateGPlusContext(request).items() + page_context.items()
        + fields_context.items() + form_context.items())
    return render(request, registration_template, context)


def _prepare_registration_form_context():
    professions = [
        _(settings.STRINGS['user']['register']['professions']['STUDENT']),
        _(settings.STRINGS['user']['register']['professions']['TEACHER']),
        _(settings.STRINGS['user']['register']['professions']['ADMIN']),
        _(settings.STRINGS['user']['register']['professions']['PUBLISHER']),
        _(settings.STRINGS['user']['register']['professions']['OTHER'])
    ]

    months = {
        '01': 'January',
        '02': 'February',
        '03': 'March',
        '04': 'April',
        '05': 'May',
        '06': 'June',
        '07': 'July',
        '08': 'August',
        '09': 'September',
        '10': 'October',
        '11': 'November',
        '12': 'December',
    }

    # Setup form <select> field options.
    form_context = {
        'months': sorted(months.iteritems()), 'professions': professions
    }

    return form_context


def _get_original_form_values(request, form_fields_to_return):
    original_form_values = {}

    form_dict = dict(request.POST.copy())

    for k, v in form_dict.iteritems():
        if k in form_fields_to_return:
            original_form_values[k] = v[0] if len(v) <= 1 else v

    return original_form_values


def _create_user(request):
    # Create Django user and profile form objects.
    import NewUserForm
    user_form = NewUserForm.UserExtended()
    profile_form = NewUserForm.UserProfileExtended()

    # Try to create a date from the form inputs.
    dob_success = _set_dob(request, profile_form)

    # Set recaptcha success defaults.
    recaptcha_success = False
    password_success = False

    # Determine if social login was used or organic signup.
    social_login = request.POST.get('social_login').lower() == "true"

    # Determine if this is a private form.
    try:
        no_recaptcha = request.POST.get('no-recaptcha')
        if no_recaptcha.lower() == "true":
            recaptcha_success = True
    except:
        pass

    if social_login:
        # Ignore reCaptcha validation entirely.
        recaptcha_success = True
        password_success = True

    else:
        if not recaptcha_success:
            # Check if the captcha entries were valid.
            recaptcha_success = _check_recaptcha(request, profile_form)

        password_success = _check_password(request, user_form)

    # Only if passwords match, reCaptcha is successful and DoB is created,
    #     move forward with creating a user and connected Profile model.
    if password_success and recaptcha_success and dob_success:
        user_form = NewUserForm.NewUserForm(request.POST, social_login)

        if user_form.is_valid():
            _prepare_user_from_form(user_form)

            # TODO(Varun): Check for uniqueness of email address.
            try:
                # Save the user; this automatically sets is_active on the
                #     user as false.
                new_user = user_form.save()

                # If a new user was created with success.
                if new_user:
                    # Proceed with creation of the profile object.
                    profile_form = NewUserForm.NewUserProfileForm(
                        request.POST, social_login,
                        new_user, profile_form.dob
                    )

                    if profile_form.is_valid():
                        # Call a function to process cleaned form fields.
                        _prepare_profile_from_form(profile_form)

                        try:
                            # Need to pass the user to the profile_form
                            #    before saving.
                            profile = profile_form.save()

                            _set_profile_picture(profile, profile_form)

                            # Send confirmation email with confirmation
                            #     code.
                            confirmation_code = _generate_confirmation_code(
                                new_user)
                            _send_email_confirmation(
                                new_user, confirmation_code, request
                            )

                            return ({
                                'title': _(
                                    settings.STRINGS['user']['register']['ACCOUNT_CREATE_SUCCESS']),
                                'new_user': new_user
                            }, True)

                        except:
                            # TODO(Varun): Delete user and announce failure.
                            new_user.delete()

                            # TODO(Varun): Create a django error notication.
                            print "Profile object failed to be created"
                    else:
                        print profile_form.errors
                        new_user.delete()
            except:
                new_user.delete()
                # TODO(Varun): Create a django error notication.
                print "User object failed to be created"
        else:
            print user_form.errors
            print "Failed to validate form"

    return ({
        'user_form': user_form, 'profile_form': profile_form,
        'social_login': social_login
    }, False)


def _check_password(request, user_form):
    password1 = request.POST.get('password')
    password2 = request.POST.get('password2')

    # If the password does not match the simple regex pattern of only
    #     atleast letters, numbers, and special characters from the list,
    #     @#$%^&+=, raise validation error.
    import re
    if re.match(r'^.*(?=.{6,})(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W]).*$', password1) is None:
        user_form.password.errors = _(
            settings.STRINGS['user']['register']['form']['PASSWORD_VALIDATION_ERROR'])
        return False

    # Validate the match between both passwords.
    # TODO(Varun): Remove this check, default check built into
    #     UserCreationForm.
    if not password1 == password2:
        # If password mismatch, set appropriate error message.
        user_form.password.errors = _(
            settings.STRINGS['user']['register']['form']['PASSWORD_MISMATCH'])
        return False

    return True


def _generate_confirmation_code(user):
    """Generates a Hex digest of SHA1 confirmation code from the user join
    timestamp"""
    import hashlib

    # Convert the DateField output from readable string to epoch timestamp.
    from django.utils.dateformat import format
    date_joined = format(user.date_joined, u'U')

    # Create and return a hash of the username along with the timestamp of the
    #     user joining.
    return hashlib.sha1(str(user.username + date_joined)).hexdigest()


def _send_email_confirmation(user, confirmation_code, request):
    """Dispatches an email message with a confirmation code to a newly created
    user

    Args:
        user: The Django user object.
        confirmation_code: Previously generated SHA1 confirmation code.
        request: The HTTP request object, as passed by django.
    """
    from django.core.urlresolvers import reverse

    # Append the host with the reverse() URL look up for confirming account
    #    with appropriate GET parameters.
    # TODO(Varun): Replace with request.get_host() and test.
    host = 'http://' + request.META.get('HTTP_HOST')
    confirm_account_url = host + str(reverse("confirm_account")) + (
        "?username=%s&confirmation_key=%s" % (user.username, confirmation_code))

    # Draft a message for the user as a welcome/account confirmation.
    # TODO(Varun): Throw a 2 hour confirmation time constraint.
    confirmation_message = _(
        settings.STRINGS['user']['register']['EMAIL_CONFIRMATION_MSG']) % (
            user.first_name, confirm_account_url, settings.HELP_EMAIL)

    # Send the email with the fields prepared above.
    from django.core.mail import send_mail
    send_mail(
        _(settings.STRINGS['user']['register']['ACCOUNT_CREATE_SUCCESS']),
        confirmation_message, 'OpenCurriculum <%s>' % settings.SERVER_EMAIL,
        [user.email], fail_silently=False
    )


def confirm_account(request):
    """Responds to the URL click in the confirmation email by confirming the
    account.

    Args:
        request: The HTTP request object, as passed by django.

    Returns:
        The profile HttpResponse page in the case that the confirmation was
        successful, or a failed confirmation page, in case of failure.
    """
    # TODO(Varun): Through a time constraint.
    # Get the username and confirmation code from the GET parameters.
    username = request.GET.get('username', None)
    confirmation_code = request.GET.get('confirmation_key', None)

    # Fetch the user that exists but isn't activated, from the database.
    user = User.objects.get(username=username)

    # Generate a new confirmation code from user fields.
    generated_confirmation_code = _generate_confirmation_code(user)

    # TODO(Varun); Account for case where account is already active.

    if (generated_confirmation_code == confirmation_code):
        # Mark the user account as active.
        user.is_active = True
        user.save()

        # TODO(Varun): Automatically authenticate the user at this stage.

        # Return the user to their profile with the pop-up message that their
        #     account has been confirmed.
        popup_message = _(
            settings.STRINGS['user']['register']['EMAIL_CONFIRMATION_SUCCESS'])
        context = {
            'popup_message': popup_message,
            'title': popup_message
        }
        # TODO(Varun): Change redirection back to profile.html when
        #     profile/auth ready.
        return render(request, 'confirmation.html', context)
    else:
        # Set the appropriate failure message and return failed page to user.
        failure_message = _(
            settings.STRINGS['user']['register']['EMAIL_CONFIRMATION_FAILURE'])
        context = {
            'failure_message': failure_message,
            'title': failure_message
        }
        return render(request, 'failed_confirmation.html', context)


def _set_dob(request, profile_form):
    """Sets the date of birth of a user based on a profile form object,
    setting errors and success flags through the process

    Args:
        request: The HTTP request object, as passed by django.
        profile_form: User profile ModelForm object.

    Returns:
        Boolean on whether or not the date of birth could be setup on the user
        profile object or not.
    """
    # Create flag for successfully creating a Date of Birth.
    setting_success = False

    # Set DoB and append to profile_form.
    month = request.POST.get('dob_month')
    date = request.POST.get('dob_date')
    year = request.POST.get('dob_year')

    try:
        import datetime
        date_dob = datetime.date(int(year), int(month), int(date))
        date_of_birth = datetime.datetime.combine(date_dob, datetime.time())

        # If the person is born before 1900 (unlikely), set error as this
        #     leads to Python error due to lack of support.
        if date_of_birth.year < 1900:
            profile_form.dob.errors = _(
                settings.STRINGS['user']['register']['form']['DOB_OUT_OF_RANGE'])
        elif date_of_birth > datetime.datetime.now():
            profile_form.dob.errors = _(
                settings.STRINGS['user']['register']['form']['DOB_AFTER_TODAY'])
        # TODO(Varun): This needs to be a stronger date check.
        elif datetime.datetime.today().year - date_of_birth.year <= 12:
            profile_form.dob.errors = _(
                settings.STRINGS['user']['register']['form']['DOB_LESS_THAN_THIRTEEN'])
        else:
            profile_form.dob = date_of_birth
            setting_success = True
    except:
        profile_form.dob.errors = _(
            settings.STRINGS['user']['register']['form']['DOB_INCORRECT'])

    return setting_success


def _check_recaptcha(request, profile_form):
    """Checks whether or not the recaptcha entered in the form was correct.

    Args:
        request: The HTTP request object, as passed by django.
        profile_form: User profile form object, which holds error messages.

    Returns:
        Boolean on whether or not the recaptch validation was successful.
    """
    recaptcha_success = False

    # Validate captcha.
    try:
        recaptcha_challenge_field = request.POST.get(
            'recaptcha_challenge_field')
        recaptcha_response_field = request.POST.get(
            'recaptcha_response_field')
        recaptcha_success = _validate_captcha(
            request, recaptcha_challenge_field, recaptcha_response_field)
    except:
        recaptcha_success = False

    if not recaptcha_success:
        profile_form.recaptcha.errors = _(
            settings.STRINGS['user']['register']['form']['RECAPTCHA_VALIDATION_FAILURE'])

    return recaptcha_success


def _prepare_user_from_form(user_form):
    """Prepared the User form object with the cleaned fields.

    Args:
        user_form: User Modelform object, whose fields require cleaning.
    """
    first_name = user_form.cleaned_data['first_name']
    last_name = user_form.cleaned_data['last_name']
    username = user_form.cleaned_data['username']
    password1 = user_form.cleaned_data['password']
    password2 = user_form.cleaned_data['password2']
    email = user_form.cleaned_data['email']

    user_form.first_name = first_name
    user_form.last_name = last_name
    user_form.username = username
    user_form.password1 = password1
    user_form.password2 = password2
    user_form.email = email


def _prepare_profile_from_form(profile_form):
    """Prepared the User profile form object with the cleaned fields.

    Args:
        profile_form: User Profile Modelform object, whose fields require
            cleaning.
    """
    dob = profile_form.cleaned_data['dob']
    location = profile_form.cleaned_data['location']
    profession = profile_form.cleaned_data['profession']
    profile_pic = profile_form.cleaned_data['profile_pic']

    profile_form.dob = dob
    profile_form.location = location
    profile_form.profession = profession
    profile_form.profile_pic = profile_pic


def _validate_captcha(request, challenge, response):
    """Communicates with the recaptcha server to check validity of a recaptcha
    response.

    Args:
        request: The HTTP request object, as passed by django.
        challenge: The unique identier of the challenge.
        response: The user response to the recaptcha challenge.

    Returns:
        Boolean on whether or not the the captcha was validated.
    """
    # Make the Http POST request to the ReCaptcha server and capture response.
    import os
    os.environ['http_proxy'] = ''
    import urllib
    import urllib2
    params = urllib.urlencode(
        {
            'privatekey': settings.RECAPTCHA_PRIVATE_KEY,
            'remoteip': request.get_host(),
            'challenge': challenge, 'response': response
        })
    headers = {
        "Content-type": "application/x-www-form-urlencoded",
        "Accept": "text/plain"
    }
    req = urllib2.Request(
        'http://www.google.com/recaptcha/api/verify', params, headers)
    response = urllib2.urlopen(req).read()
    message = response.split('\n')
    captcha_success = message[0]

    # If first line of response is "true", respond True or False if other.
    if captcha_success.strip() == "true":
        return True
    else:
        return False


def _set_profile_picture(profile, profile_form):
    """Set the user's profile picture, from the form the user filed at
    registration.

    Using the created Profile object of the new user, along with the original
    profile_form object, locate and associate the profile picture with the
    User Profile object newly created.

    Args:
        profile: User Profile object.
        profile_form: Original form filled by user upon registering on site.
    """
    try:
        # Now set and save the profile image.
        from django.core.files.base import ContentFile
        import os.path

        # Find the true path of the file originally as saved in the
        #     profile_form, and read from it as it saves as field to the
        #     profile object.
        profile_pic_filename = os.path.basename(
            profile_form.profile_pic_tmp.name)
        profile.profile_pic.save(
            profile_pic_filename,
            ContentFile(profile_form.profile_pic_tmp.read())
        )
        profile.save()
    except:
        # TODO(Varun): Django notification for failure to create and assign
        #     profile picture.
        print "User Profile picture failed to be created"


def authenticate(request):
    """Authenticates the user and redirects to previous page being surfed"""
    # Determine redirect-to path, if any
    redirect_to = request.POST.get('redirect_to', None)

    from django.contrib.auth import authenticate, login

    username = request.POST['username']
    password = request.POST['password']
    user = authenticate(username=username, password=password)

    if user is not None:
        if user.is_active:
            login(request, user)
            if redirect_to:
                return redirect(redirect_to)
            else:
                return redirect('home')
        else:
            # HACK(Varun): These GET parameters need to be moved to settings
            redirect_url = '/?login=true&error=inactive'
            if redirect_to:
                return redirect(redirect_url + ('&source=%s' % redirect_to))
            return redirect(redirect_url)
    else:
        redirect_url = '/?login=true&error=auth'
        if redirect_to:
            return redirect(redirect_url + ('&source=%s' % redirect_to))
        return redirect(redirect_url)


def logout_view(request):
    """Logs the user out of their site session"""
    from django.contrib.auth import logout
    logout(request)

    return redirect(request.META.get('HTTP_REFERER'))


def googleplus_login(request):
    """Authenticate the user through G+ login button through OAuth 2.0.

    Using the inputs provided by the client and the user interaction, attempts
    to authenticate the user through the Google+ OAuth 2.0 authentication flow,
    supported by the OAuth libraries.

    Args:
        request: The HTTP request object, as passed by django.

    Returns:
        A JSON object representing the success/failure of the authentication
        process.
    """
    # Get OpenCurriculum's client ID to make API requests through G+.
    CLIENT_ID = json.loads(
        open('client_secrets.json', 'r').read())['web']['client_id']

    # If the state isn't the same as the one set when loading the page, return
    #     failure message.
    if request.POST.get('state') != request.session['state']:
        return HttpResponse(
            json.dumps('Invalid state parameter.'), 401,
            content_type="application/json"
        )

    gplus_id = request.POST.get('gplus_id')
    code = request.POST.get('code')

    from oauth2client import client
    import httplib2

    try:
        # Upgrade the authorization code into a credentials object.
        oauth_flow = client.flow_from_clientsecrets(
            'client_secrets.json', scope='')
        oauth_flow.redirect_uri = 'postmessage'
        credentials = oauth_flow.step2_exchange(code)
    except client.FlowExchangeError:
        return HttpResponse(
            json.dumps('Failed to upgrade the authorization code.'),
            401, content_type="application/json")

    # Check that the access token is valid.
    access_token = credentials.access_token
    url = 'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=%s' % access_token
    h = httplib2.Http()
    result = json.loads(h.request(url, 'GET')[1])

    # If there was an error in the access token info, abort.
    if result.get('error') is not None:
        return HttpResponse(
            json.dumps(result.get('error')), 500,
            content_type="application/json"
        )

    # Verify that the access token is used for the intended user.
    if result['user_id'] != gplus_id:
        return HttpResponse(
            json.dumps("Token's user ID doesn't match given user ID."),
            401, content_type="application/json"
        )

    # Verify that the access token is valid for this app.
    if result['issued_to'] != CLIENT_ID:
        return HttpResponse(
            json.dumps("Token's client ID does not match app's."),
            401, content_type="application/json"
        )

    # Verify whether or not the user is already connected.
    stored_credentials = request.session.get('credentials')
    stored_gplus_id = request.session.get('gplus_id')
    if stored_credentials is not None and gplus_id == stored_gplus_id:
        return HttpResponse(
            json.dumps('Current user is already connected.'),
            200, content_type="application/json"
        )

    # Store the access token in the session for later use.
    request.session['credentials'] = credentials
    request.session['gplus_id'] = gplus_id
    return HttpResponse(
        json.dumps('Successfully connected user.'), 200,
        content_type="application/json"
    )


def glogin(request):
    google_id = request.POST.get('google_id')

    try:
        # Look for Google ID in the user profiles.
        from user_account.models import UserProfile
        user_profile = UserProfile.objects.get(social_id=int(google_id))
        user = user_profile.user

        from django.contrib.auth import login
        login(request, user)

        response = {"status": "true"}
        return HttpResponse(json.dumps(
            response), 200, content_type="application/json"
        )

    except:
        response = {"status": "false"}
        return HttpResponse(json.dumps(
            response), 401, content_type="application/json"
        )


def user_profile(request, username):
    """Renders the user profile page

    Args:
        request: The HTTP request object, as passed by django.
        username: The username string.
    Returns:
        The User profile HttpResponse page.
    """
    try:
        user = User.objects.get(username=username)

        # Get all the articles the user has forked.
        from articles.models import ArticleRevision
        forks = ArticleRevision.objects.filter(
            user=user.id, flag="fork").order_by("-created")

        # Get all the articles the user has submitted.
        from articles.models import ArticleRevision
        contributions = ArticleRevision.objects.filter(
            user=user.id, flag="submit").order_by("-created")

        # Get all the projects that the user is a part of.
        from projects.models import Project
        projects = Project.objects.filter(members__id__contains=user.id)

        # Get all the resources that the user has created.
        from oer.models import Resource
        resources = Resource.objects.filter(user=user)

        from forms import UploadProfilePicture
        form = UploadProfilePicture(request.POST, request.FILES)

        context = {
            'user_profile': user, 'edits': forks, 'projects': projects,
            'resources': resources, 'contributions': contributions, 'form': form,
            'title': user.first_name + ' ' + user.last_name + " &lsaquo; OpenCurriculum"
        }
        return render(request, 'profile.html', context)

    except User.DoesNotExist:
        raise Http404


def contributor_registration(request):
    # Prepare context to render the form / form response.
    registration_template = 'contributor-registration.html'
    success_template = 'registration-success.html'
    page_context = {
        'title': _(settings.STRINGS['user']['CONTRIBUTOR_REGISTER_TITLE'])
    }
    # Context objects which render the form.
    fields_context = {}
    form_context = _prepare_registration_form_context()

    if request.method == "POST":
        # Capture only thse inputs from the original form that need to be
        #     returned in the case of an error with form validation.
        form_fields_to_return = [
            'first_name', 'last_name', 'email', 'dob_month', 'dob_date',
            'dob_year', 'location', 'profession', 'username', 'gender',
            'interest', 'experience', 'subject', 'savvy', 'other_savvy', 'time_commitment',
            'contact_type', 'phone_number', 'video_call_id', 'contact_other',
            'comments', 'other_subject'
        ]
        original_form_inputs = _get_original_form_values(
            request, form_fields_to_return)

        # Returns context if form registration fails, else redirects response.
        (fields_context, user_creation_success) = _create_user(request)
        fields_context['form'] = original_form_inputs

        if user_creation_success:
            # Send an email with other (non-auth) inputs.
            _email_contributor_admins(original_form_inputs)

            return render(request, success_template, fields_context)

    context = dict(page_context.items() + fields_context.items()
                   + form_context.items())
    return render(request, registration_template, context)


def _email_contributor_admins(original_form_inputs):
    try:
        experience = original_form_inputs['experience']
    except:
        experience = ''

    try:
        subject = original_form_inputs['subject']
    except:
        subject = ''

    try:
        savvy = original_form_inputs['savvy']
    except:
        savvy = ''

    try:
        contact_type = original_form_inputs['contact_type']
    except:
        contact_type = ''

    signup_message = (
        'New contributor sign-up: \n\n'
        'Username: %s\n'
        'Why are you interested in contributing to OpenCurriculum?: %s\n'
        'Do you have any experience writing educational content?: %s\n\n'

        'What subjects are you interested in contributing to?: %s\n'
        'Other: %s\n\n'

        'How tech savvy are you?: %s\n'
        'Other: %s\n\n'

        'How much time are you willing to contribute per week?: %s\n\n'

        'Preferred method of contact: %s\n'
        'Phone: %s\n'
        'Skype: %s\n'
        'Other: %s\n\n'

        'Comments: %s'
    ) % (
        original_form_inputs['username'],
        original_form_inputs['interest'] if original_form_inputs['interest'] else '',
        experience,

        subject,
        original_form_inputs['other_subject'] if original_form_inputs['other_subject'] else '',

        savvy,
        original_form_inputs['other_savvy'] if original_form_inputs['other_savvy'] else '',

        original_form_inputs['time_commitment'] if original_form_inputs['time_commitment'] else '',

        contact_type,
        original_form_inputs['phone_number'] if original_form_inputs['phone_number'] else '',
        original_form_inputs['video_call_id'] if original_form_inputs['video_call_id'] else '',
        original_form_inputs['contact_other'] if original_form_inputs['contact_other'] else '',

        original_form_inputs['comments'] if original_form_inputs['comments'] else ''
    )

    # Send the email with the fields prepared above.
    from django.core.mail import send_mail
    send_mail(
        'Contributor sign-up: %s %s' % (
            original_form_inputs['first_name'], original_form_inputs['last_name']),
        signup_message, 'OpenCurriculum <%s>' % settings.SERVER_EMAIL,
        settings.CONTRIBUTOR_SIGNUPS_ADMINS, fail_silently=False
    )


def add_subscription(request):
    """Subscribes the requester to the user"""
    subscribee_id = request.POST['id']

    from django.contrib.auth.models import User
    subscribee_profile = User.objects.get(id=subscribee_id).profile
    subscriber_profile = User.objects.get(id=request.user.id).profile

    subscribee_profile.subscribers.add(subscriber_profile)

    # Send the signal, so the activity will be created in the feed.
    from user_account.signals import new_subscription
    new_subscription.send(sender='add_subscription', actor_id=request.user.id,
                          action='subscribe', target_id=subscribee_id)

    status = {'status': 'true'}

    return HttpResponse(
        json.dumps(status), 200, content_type="application/json")


def user_home(request, user_id):
    """Show every activity for which this user is a recipient."""
    user = User.objects.get(id=user_id)
    user_feed = user.feed.all()

    c = Context({
        'user': user,
        'name': user.get_full_name(),
        'feed': user_feed,
    })

    return render(request, 'home.html', c)


def profile(request, user_id):
    """Show every activity where this user was the actor."""
    user = User.objects.get(id=user_id)
    user_feed = Activity.objects.filter(actor=user)

    from django.template import Context
    c = Context({
        'user_profile': user,
        'name': user.get_full_name(),
        'id': user_id,
        'feed': user_feed,
    })

    return render(request, 'profile.html', c)


def get_user_from_profile(profile):
    return profile.user


def get_subscribers_from_profile(profile):
    """Return the list of user objects of a given profile's subscribers.

    List of subscriber profiles => list of subscriber user objects.
    """
    return map(get_user_from_profile, profile.subscribers.all())


def find_recipients(**kwargs):
    """Given an actor and action (including its target), finds the users
    on whose feed this action would appear.

    Parameters:
        actor: a user object.
        action: a string (one word) about what the actor did.
        target: the user on whom the action is performed. (optional)

    Examples:
        [Varun] [subscribed] to [Zeenab]                        # no object
        [Varun] [uploaded] a new resource: [resource_name]     # no target
        [Varun] [commented] on [Zeenab]'s resource: [comment_text]

    Returns:
        a set of recipients.
    """
    recipients = set()
    actor = kwargs['actor']
    action = kwargs['action']

    # Build the set of recipients
    if (action == 'subscribe'):
        target = kwargs['target']
        # I'm subscribed to Zuck, I'm also interested in similar cool people.
        # If Zuck subscribes to x, I might be interested in x's coolness.
        recipients.update(get_subscribers_from_profile(actor.profile))

        # Also, obviously x would want to know that Zuck is now stalking her.
        recipients.add(target)

    elif (action == 'upload'):
        # No targets involved. Only subscribers need know.
        recipients.update(get_subscribers_from_profile(actor.profile))

    elif (action == 'comment'):
        target = kwargs['target']
        # Hmm, this guy I'm subscribed to commented about Zuck, interesting.
        recipients.update(get_subscribers_from_profile(actor.profile))

        # Wow, someone finally commented on my stuff!! :excited:
        recipients.add(target)

        # If I commented on my own stuff, don't tell me.
        recipients.discard(actor)      # Removes iff present.

    return recipients


def add_activity(sender, **kwargs):
    """Finds recipients, creates an Activity object, and returns it.

    TODO: Change this to accept objects rather than IDs.

    Parameters:
        actor_id: id to a user object.
        action: a string (one word) about what the actor did.
        target_id: id to the user on whom the action is performed.
        object_id: id to the resource involved if any.

    Examples:
        [Varun] [subscribed] to [Zeenab]                        # no object
        [Varun] [uploaded] a new resource: [resource_name]     # no target
        [Varun] [commented] on [Zeenab]'s resource: [comment_text]
    """
    args_dict = dict()
    args_dict['actor'] = User.objects.get(id=kwargs['actor_id'])
    args_dict['action'] = kwargs['action']
    args_dict['target'] = User.objects.get(id=kwargs['target_id'])
    #action_object = Comment.objects.get(id=kwargs['object_id'])
    recipients = find_recipients(**args_dict)
    item = Activity()
    item.actor = args_dict['actor']
    item.action = args_dict['action']
    item.target = args_dict['target']
    #item.action_object = action_object
    item.save()
    item.recipients.add(*recipients)
    item.save()


def contributor_introduction(request):
    if not request.user.is_authenticated():
        return redirect('/?login=true&source=%s' % request.path)

    cohortID = request.GET.get('cohort', None)

    cohort = None
    if cohortID:
        from user_account.models import Cohort
        cohort = Cohort.objects.get(pk=int(cohortID))

    # Get locations of all contributors using the Google Geocoding API.
    import urllib
    import urllib2

    contributor_locations = {}
    for contributor in cohort.members.all():
        params = urllib.urlencode(
            {'address': contributor.get_profile().location, 'sensor': 'true'})
        getRequest = urllib2.urlopen(
            'http://maps.googleapis.com/maps/api/geocode/json?%s' % params)
        response = json.loads(getRequest.read())
        contributor_locations[contributor] = response['results'][0]['geometry']['location']

    context = {
        'title': _(settings.STRINGS['article_center']['INTRODUCTION_TITLE']),
        'cohort': cohort,
        'contributor_locations': contributor_locations
    }
    return render(request, 'contributor-introduction.html', context)


# API Stuff below #/

def list_users(request, query):
    users_by_username = User.objects.filter(username__icontains=query)
    users_by_firstname = User.objects.filter(first_name__icontains=query)
    users_by_lastname = User.objects.filter(last_name__icontains=query)

    users = set(users_by_username)
    users = users.union(set(users_by_firstname))
    users = users.union(set(users_by_lastname))

    serializedUsers = map(_build_user_object, users)

    return HttpResponse(
        json.dumps(serializedUsers), 200, content_type="application/json"
    )


def _build_user_object(user):
    return {
        'id': user.id, 'name': user.get_full_name(), 'username': user.username
    }


def change_profile_picture(request, username):
    if request.method == "POST":
        # TODO(Varun): Get rid of this after setting the right form.
        from forms import UploadProfilePicture
        form = UploadProfilePicture(request.POST, request.FILES)

        if form.is_valid():
            user = User.objects.get(username=str(username))
            user_profile = user.get_profile()

            from django.core.files.base import ContentFile
            profile_pic = ContentFile(request.FILES['new_profile_picture'].read())  # write_pic(request.FILES['new_profile_picture'])
            user_profile.profile_pic.save(
                str(user.id) + '-profile.jpg', profile_pic)

    return redirect('user:user_profile', username=username)


def edit_headline(request, user_id):
    new_headline = request.POST.get('new_headline')

    # Lookup user using QuerySet API.
    user = User.objects.get(pk=user_id)
    user_profile = user.get_profile()

    try:
        # Set user headline as the one coming through the request, and save the user
        #     object.
        user_profile.headline = new_headline
        user_profile.save()

        status = {'status': 'true'}
        return HttpResponse(
            json.dumps(status), 200,
            content_type="application/json"
        )

    except:
        status = {'status': 'false'}
        return HttpResponse(
            json.dumps(status), 401,
            content_type="application/json"
        )


def dismiss_notifications(request, user_id):
    notification_ids = request.GET.get('ids').split(',')

    try:
        from user_account.models import Notification
        Notification.objects.filter(id__in=notification_ids).update(read=True)

        status = {'status': 'true'}
        return HttpResponse(
            json.dumps(status), 200,
            content_type="application/json"
        )

    except:
        status = {'status': 'false'}
        return HttpResponse(
            json.dumps(status), 401,
            content_type="application/json"
        )
