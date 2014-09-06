from django.shortcuts import render, HttpResponse, redirect, Http404
from django.contrib.auth.models import User
from django.utils.translation import ugettext as _
from django.conf import settings
from oc_platform import APIUtilities

import json


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
    expedite = request.GET.get('expedite', None)

    page_context = {
        'title': _(settings.STRINGS['user']['REGISTER_TITLE']),
        'expedite': expedite
    }

    form_context = _prepare_registration_form_context()

    # Context objects which render the form.
    fields_context = {}

    if request.method == "POST":
        is_asynchronous = request.POST.get('view', None) == 'asynchronous'

        # Capture only thse inputs from the original form that need to be
        #     returned in the case of an error with form validation.
        form_fields_to_return = [
            'first_name', 'last_name', 'email', 'dob_month', 'dob_date',
            'dob_year', 'profile_pic', 'social_login', 'location',
            'profession', 'username', 'gender', 'social_id', 'social_service'
        ]
        # TODO(Varun): Turn this into a non-short statement.
        original_form_inputs = _get_original_form_values(
            request, form_fields_to_return)

        # Returns context if form registration fails, else redirects response.
        (fields_context, user_creation_success) = _create_user(request)

        if user_creation_success:
            # Add message to confirm account.
            #from django.contrib import messages
            #messages.success(request, _(
            #    settings.STRINGS['user']['register']['ACCOUNT_CREATE_SUCCESS']))
        
            from django.contrib.auth import authenticate, login
            new_user = fields_context['new_user']

            social_login = request.POST.get('social_login').lower() == "true"
            if social_login:
                authenticated_user = authenticate(social_id=int(
                    request.POST.get('social_id')), social_service=request.POST.get('social_service'))
                login(request, authenticated_user)
            else:
                authenticated_user = authenticate(
                    username=new_user.username, password=request.POST.get('password'))
                login(request, authenticated_user)

            if is_asynchronous:
                context = {
                    'id': new_user.id,
                    'name': new_user.get_full_name(),
                    'username': new_user.username
                }
                return APIUtilities._api_success(context)
            else:
                from django.core.urlresolvers import reverse
                return redirect(
                    reverse(
                        'user:user_files', kwargs={
                            'username': fields_context['new_user'].username
                        }
                    ) + '?new_user=true'
                )

        fields_context['form'] = original_form_inputs

    # Build the form from previous inputs and Google+ login data to
    #     pre-populate form.
    from AuthHelper import AuthHelper
    context = dict(
        AuthHelper.generateGPlusContext(request).items() + page_context.items()
        + fields_context.items() + form_context.items())
    return render(request, registration_template, context)


def get_registration_context(request):
    form_context = _prepare_registration_form_context()

    from AuthHelper import AuthHelper
    context = dict(
        AuthHelper.generateGPlusContext(request).items() + form_context.items())

    return APIUtilities._api_success(context)


def register_asynchronously(request):
    request_post_copy = request.POST.copy()
    request_post_copy.__setitem__('view', 'asynchronous')

    request.POST = request_post_copy

    return register(request)


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

    else:
        if not recaptcha_success:
            # Check if the captcha entries were valid.
            recaptcha_success = _check_recaptcha(request, profile_form)

    # If social login, get social ID, service.
    social_id = request.POST.get('social_id') if social_login else None
    social_service = request.POST.get('social_service') if social_login else None

    # Only if passwords match, reCaptcha is successful and DoB is created,
    #     move forward with creating a user and connected Profile model.
    user_creation_failure = None
    if recaptcha_success and dob_success:
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
                        new_user, profile_form.dob,
                        social_id, social_service
                    )

                    if profile_form.is_valid():
                        # Call a function to process cleaned form fields.
                        _prepare_profile_from_form(profile_form)

                        try:
                            # Need to pass the user to the profile_form
                            #    before saving.
                            profile = profile_form.save()

                            # Give the user a profile pic and a root collection.
                            _set_profile_picture(profile, profile_form)
                            _set_profile_collection(profile)

                            profile.save()

                            # Send confirmation email with confirmation
                            #     code.
                            confirmation_code = _generate_confirmation_code(
                                new_user)
                            _send_email_confirmation(
                                new_user, confirmation_code, request
                            )

                            # Setup user social interactoin.
                            _setup_user_social(new_user)

                            return ({
                                'title': _(
                                    settings.STRINGS['user']['register']['ACCOUNT_CREATE_SUCCESS']),
                                'new_user': new_user
                            }, True)

                        except Exception:
                            # TODO(Varun): Delete user and announce failure.
                            try:
                                new_user.delete()
                                profile.delete()
                            except:
                                pass

                            user_creation_failure = profile_form.errors

                    else:
                        try:
                            new_user.delete()
                            profile.delete()
                        except:
                            pass

                        user_creation_failure = profile_form.errors

            except:
                try:
                    new_user.delete()
                    profile.delete()
                except:
                    pass

                user_creation_failure = user_form.errors

        else:
            user_creation_failure = user_form.errors

    if user_creation_failure:
        from django.core.mail import mail_admins
        mail_admins('Failed to create user', str(user_creation_failure) + '\n\n' + str(request.POST))

    return ({
        'user_form': user_form, 'profile_form': profile_form,
        'social_login': social_login,
        'social_id': social_id,
        'social_service': social_service
    }, False)


def _check_password(request, user_form):
    password1 = request.POST.get('password')
    password2 = request.POST.get('password2')

    if _check_password_regex(password1) is None:
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


def _check_password_regex(password):
    # If the password does not match the simple regex pattern of only
    #     atleast letters, numbers, and special characters from the list,
    #     @#$%^&+=, raise validation error.
    import re
    return re.match(r'^.*(?=.{6,})(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W]).*$', password)


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
        _(settings.STRINGS['user']['register']['ACCOUNT_CONFIRMATION_EMAIL_SUBJECT']),
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

    user_found = True
    try:
        # Fetch the user that exists but isn't activated, from the database.
        user = User.objects.get(username=username)

        # Generate a new confirmation code from user fields.
        generated_confirmation_code = _generate_confirmation_code(user)

    except:
        user_found = False
        generated_confirmation_code = None

    # TODO(Varun); Account for case where account is already active.

    if (generated_confirmation_code == confirmation_code and user_found):
        # Mark the user account as active.
        user.is_active = True
        user.save()

        # TODO(Varun): Automatically authenticate the user at this stage.

        # Return the user to their profile with the pop-up message that their
        #     account has been confirmed.
        confirmation_message = _(
            settings.STRINGS['user']['register']['EMAIL_CONFIRMATION_SUCCESS'])

        from django.contrib import messages
        messages.success(request, confirmation_message)

        from django.contrib.auth import authenticate, login
        authenticated_user = authenticate(
            username=user.username, confirm_account=True)
        login(request, authenticated_user)

        return redirect('user:user_profile', username=user.username)

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
    password = user_form.cleaned_data['password']
    email = user_form.cleaned_data['email']

    user_form.first_name = first_name
    user_form.last_name = last_name
    user_form.username = username
    user_form.password = password
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
        profile_pic_file = ContentFile(profile_form.profile_pic_tmp.read())
        profile_pic_file.name = profile_pic_filename
        profile.profile_pic = profile_pic_file
    except:
        # TODO(Varun): Django notification for failure to create and assign
        #     profile picture.
        print "User Profile picture failed to be created"


def _set_profile_collection(profile):
    from oer.models import Collection
    # Create a new root collection for the user
    root_collection = Collection(
        title=profile.user.username + "_root",
        host=profile,
        visibility='public',
        slug=profile.user.username,
        creator=profile.user
    )
    root_collection.save()

    profile.collection = root_collection
    profile.save()

    return root_collection


def authenticate(request):
    """Authenticates the user and redirects to previous page being surfed"""
    # Determine redirect-to path, if any
    redirect_to = request.POST.get('redirect_to', None)
    if redirect_to == 'False':
        redirect_to = False

    from django.contrib.auth import authenticate, login
    
    try:
        username = request.POST['username']
        password = request.POST['password']
    except:
        from django.http import HttpResponseBadRequest
        return HttpResponseBadRequest()

    if '@' in username:
        try:
            user_object = User.objects.get(email=username)
            user = authenticate(username=user_object.username, password=password)
        except:
            user = None
    else:
        user = authenticate(username=username, password=password)

    if user:
        if user.is_active:
            login(request, user)
            if redirect_to:
                return redirect(redirect_to)
            else:
                return redirect('user:user_profile', username=user.username)
        else:
            # HACK(Varun): These GET parameters need to be moved to settings
            redirect_url = '/login?error=inactive'
            if redirect_to:
                return redirect(redirect_url + ('&source=%s' % redirect_to))
            return redirect(redirect_url)
    else:
        redirect_url = '/login?error=auth'
        if redirect_to:
            return redirect(redirect_url + ('&source=%s' % redirect_to))
        return redirect(redirect_url)


def logout_view(request):
    """Logs the user out of their site session"""
    from django.contrib.auth import logout
    logout(request)

    try:
        return redirect(request.META.get('HTTP_REFERER'))
    except:
        return redirect('home')

def _setup_user_social(user):
    # Add user to the default website project, generating a notification.
    from projects.models import Project
    handbook_project = Project.objects.get(pk=settings.DEFAULT_PROJECT_KEY)

    from projects.views import add_user_to_project
    add_user_to_project(user, handbook_project)


def dashboard_view(request):
    context = {
        'title': 'My curriculum dashboard'
    }
    return render(request, 'dashboard.html', context)


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
        open(settings.TEMPLATE_DIR + '/' + 'client_secrets.json', 'r').read())['web']['client_id']

    try:
        # If the state isn't the same as the one set when loading the page, return
        # failure message.
        if request.POST.get('state') != request.session['state']:
            return HttpResponse(
                json.dumps('Invalid state parameter.'), 401,
                content_type="application/json"
            )
    except KeyError:
        return HttpResponse(
            json.dumps('Failed to retrieve your Google ID state'),
            401, content_type="application/json")        

    gplus_id = request.POST.get('gplus_id')
    code = request.POST.get('code')

    from oauth2client import client
    import httplib2

    try:
        # Upgrade the authorization code into a credentials object.
        oauth_flow = client.flow_from_clientsecrets(
            settings.TEMPLATE_DIR + '/' + 'client_secrets.json', scope='')
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
        from django.contrib.auth import authenticate, login
        auth_user = authenticate(
            social_id=int(google_id), social_service='plus')
        login(request, auth_user)

        response = {"status": "true"}
        return HttpResponse(json.dumps(
            response), 200, content_type="application/json"
        )

    except:
        response = {"status": "false"}
        return HttpResponse(json.dumps(
            response), 401, content_type="application/json"
        )


def fb_login(request):
    facebook_id = request.POST.get('facebook_id')

    try:
        # Look for Google ID in the user profiles.
        from django.contrib.auth import authenticate, login
        auth_user = authenticate(
            social_id=int(facebook_id), social_service='facebook')
        login(request, auth_user)

        return APIUtilities._api_success()

    except:
        return APIUtilities._api_not_found()

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
    except User.DoesNotExist:
        raise Http404

    from user_account.models import Activity
    # Get user profile.
    user_profile = user.get_profile()

    user_context = _prepare_user_context(request, user, user_profile)

    from user_account.models import Subscription
    if request.user == user:
        # Get users who have the most have the most subscribers.
        # Subscription.objects.all().order_by('')[:10]
        filtered_stars_raw = []
        import copy
        stars_raw = copy.deepcopy(settings.STAR_USERS)
        try:
            stars_raw.remove(user.username)
        except:
            pass

        # Remove the suggested person name if the user has already subscribed to the star.
        for star in stars_raw:
            try:
                Subscription.objects.get(
                    subscriber=user_profile, subscribee__user__username=star)
            except:
                filtered_stars_raw.append(star)

        stars = User.objects.filter(username__in=filtered_stars_raw)

        feed = Activity.objects.filter(recipients=user).order_by('-pk')[:10]
        feed_count = Activity.objects.filter(recipients=user).count()

    else:
        # Get the people who this person follows.
        subscribees = Subscription.objects.filter(
            subscriber=user_profile)
        subscribee_usernames = map((lambda s: s.subscribee.user.username), subscribees)

        try:
            subscribee_usernames.remove(request.user.username)
        except:
            pass

        stars = User.objects.filter(username__in=subscribee_usernames)
        feed = Activity.objects.filter(actor=user).order_by('-pk')[:10]
        feed_count = Activity.objects.filter(actor=user).count()

    # Do all kinds of feed preprocessing.
    _preprocess_feed(feed)

    context = dict({
        'user_profile': user,
        'feed': feed,
        'feed_count': feed_count,
        'collection': user_profile.collection,
        'stars': stars,
        'page': 'home',
        'title': user.first_name + ' ' + user.last_name + " &lsaquo; OpenCurriculum"
    }.items() + user_context.items())
    return render(request, 'profile.html', context)


def _preprocess_feed(feed):
    import oer.CollectionUtilities as cu
    
    resources = []
    for item in feed:
        if item.target_type.name == 'resource':
            resources.append(item.target)

    cu.set_resources_type(resources)


def _prepare_user_context(request, user, user_profile):
    user_subscribed = _get_user_subscribed(user_profile, request.user)
    
    from user_account.models import Subscription
    subscriber_count = Subscription.objects.filter(subscribee=user_profile).count()
    subscription_count = Subscription.objects.filter(subscriber=user_profile).count()

    from forms import UploadProfilePicture
    form = UploadProfilePicture(request.POST, request.FILES)
    
    context = {
        'form': form,
        'user_subscribed': user_subscribed,
        'subscriber_count': subscriber_count,
        'subscription_count': subscription_count
    }

    return context



def user_favorites(request, username):
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        raise Http404

    # Get all the resources the user has favorited.
    from interactions.models import Favorite
    favorites = Favorite.objects.filter(user=user)

    # Get user profile.
    user_profile = user.get_profile()
    user_subscribed = _get_user_subscribed(user_profile, request.user)

    user_context = _prepare_user_context(request, user, user_profile)

    context = dict({
        'user_profile': user,
        'favorites': favorites,
        'collection': user_profile.collection,
        'user_subscribed': user_subscribed,
        'title': user.get_full_name() + " &lsaquo; OpenCurriculum",
        'page': 'favorites'
    }.items() + user_context.items())
    return render(request, 'profile.html', context)


def user_files(request, username):
    return list_collection(request, username, None)


def list_collection(request, username, collection_slug):
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        raise Http404

    user_profile = user.get_profile()

    user_context = _prepare_user_context(request, user, user_profile)

    import oer.CollectionUtilities as cu
    (browse_tree, flattened_tree) = cu._get_collections_browse_tree(
        user_profile.collection)

    if not collection_slug:
        collection = user_profile.collection
        title = 'Files' + ' &lsaquo; ' + user.get_full_name()
        collection_in_unit = False
    else:
        from oer.models import Collection
        match_collections = Collection.objects.filter(slug=collection_slug)

        if match_collections.count() == 0:
            raise Http404

        # Get user collection.
        collection = next(
            tree_item for tree_item in flattened_tree if tree_item.slug == collection_slug)

        # Determine if this collection is owned by a unit.
        from oer.models import Unit
        from django.contrib.contenttypes.models import ContentType
        unit_type = ContentType.objects.get_for_model(Unit)
        if collection.host_type == unit_type:
            unit = collection.host
            collection_in_unit = True

        else:
            collection_in_unit = False
        
        title = collection.title + ' &lsaquo; ' + user.get_full_name()

    root_assets = collection.resources
    child_collections = cu._get_child_collections(collection)
    child_units = cu._get_child_unit_collections(collection.units.all())

    # TODO(Varun): Fix temporary hack of only listing top 20 files for loading sake.
    resources = root_assets.all()[:20]
    resource_count = root_assets.count()
    cu.set_resources_type(resources)
    cu.preprocess_collection_listings(resources)
    
    breadcrumb = cu.build_collection_breadcrumb(collection)
    breadcrumb[0].title = 'Home'

    if collection_in_unit:
        context = dict({
            'user_profile': user,
            'collection': collection,
            'title': title,
            'browse_tree': browse_tree,
            'resources': resources,
            'collections': child_collections,
            'unit': unit,
            'units': child_units,
            'breadcrumb': breadcrumb,
            'resource_count': resource_count
        }.items() + user_context.items())
        return render(request, 'unit.html', context)

    else:
        context = dict({
            'user_profile': user,
            'collection': collection,
            'title': title,
            'browse_tree': browse_tree,
            'resources': resources,
            'collections': child_collections,
            'units': child_units,
            'breadcrumb': breadcrumb,
            'page': 'files',
            'resource_count': resource_count
        }.items() + user_context.items())
        return render(request, 'profile.html', context)


def user_groups(request, username):
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        raise Http404

    user_profile = user.get_profile()

    user_context = _prepare_user_context(request, user, user_profile)

    # Get all the projects that the user is a part of.
    from projects.models import Project
    projects = Project.objects.filter(membership__user__id=user.id)

    context = dict({
        'user_profile': user,
        'collection': user_profile.collection,
        'title': user.get_full_name() + " &lsaquo; OpenCurriculum",
        'projects': projects,
        'page': 'groups'
    }.items() + user_context.items())
    return render(request, 'profile.html', context)


def user_subscribers(request, username):
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        raise Http404

    user_profile = user.get_profile()
    user_context = _prepare_user_context(request, user, user_profile)

    from user_account.models import Subscription
    subscribers = Subscription.objects.filter(subscribee=user_profile)

    context = dict({
        'user_profile': user,
        'collection': user_profile.collection,
        'title': user.get_full_name() + " &lsaquo; OpenCurriculum",
        'subscribers': subscribers,
        'page': 'subscribers'
    }.items() + user_context.items())
    return render(request, 'profile.html', context)


def user_subscriptions(request, username):
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        raise Http404

    user_profile = user.get_profile()
    user_context = _prepare_user_context(request, user, user_profile)

    from user_account.models import Subscription
    subscriptions = Subscription.objects.filter(subscriber=user_profile)

    context = dict({
        'user_profile': user,
        'collection': user_profile.collection,
        'title': user.get_full_name() + " &lsaquo; OpenCurriculum",
        'subscriptions': subscriptions,
        'page': 'subscriptions'
    }.items() + user_context.items())
    return render(request, 'profile.html', context)



def _get_user_subscribed(user_profile, visitor):
    user_subscribed = False
    if visitor != user_profile.user:
        from user_account.models import UserProfile, Subscription
        try:
            requester_profile = UserProfile.objects.get(user=visitor.id)
            Subscription.objects.get(
                subscriber=requester_profile, subscribee=user_profile)
            user_subscribed = True
        except:
            pass

    return user_subscribed


def user_preferences(request):
    try:
        user = User.objects.get(username=request.user.username)
    except User.DoesNotExist:
        if not request.user.is_authenticated():
            return redirect('/?login=true&source=%s' % request.path)
        else:
            raise Http404

    from django.core.exceptions import PermissionDenied
    if request.user != user:
        raise PermissionDenied

    user_profile = user.get_profile()
    user_context = _prepare_user_context(request, user, user_profile)

    submit_context = {}
    if request.method == "POST":
        from forms import UserPreferences
        preferences_form = UserPreferences(request.POST, user)

        if preferences_form.is_valid():
            preferences_form.save()
            user_profile.location = request.POST.get('location', None)
            user_profile.save()

            submit_context = {
                'success': 'Successfully saved your preferences.'
            }            
        else:
            submit_context = {
                'error': 'Yikes! Profile and preferences failed to save.'
            }
            print preferences_form.errors

    context = dict({
        'user_profile': user,
        'title': 'Preferences for ' + user.get_full_name() + " &lsaquo; OpenCurriculum",
        'page': 'preferences',
    }.items() + user_context.items() + submit_context.items())
    return render(request, 'profile.html', context)


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

    if cohort:
        contributor_locations = {}
        for contributor in cohort.members.all():
            params = urllib.urlencode(
                {'address': contributor.get_profile().location, 'sensor': 'true'})
            getRequest = urllib2.urlopen(
                'http://maps.googleapis.com/maps/api/geocode/json?%s' % params)
            response = json.loads(getRequest.read())
            try:
                contributor_locations[contributor] = response['results'][0]['geometry']['location']
            except IndexError:
                contributor_locations[contributor] = {
                    'lat': 0.0,
                    'lng': 0.0
                }

        context = {
            'title': _(settings.STRINGS['article_center']['INTRODUCTION_TITLE']),
            'cohort': cohort,
            'contributor_locations': contributor_locations
        }
        return render(request, 'contributor-introduction.html', context)
    else:
        raise Http404


def reset_password(request):
    from django.contrib import messages
    try:    
        email = request.POST.get('email', None)

        # Get the user.
        user = User.objects.get(email=email)
        temporary_password = User.objects.make_random_password()
        user.set_password(temporary_password)

        # Make the user inactive.
        user.is_active = False

        user.save()

        try:
            # Send an email to the user with the temporary password.

            from django.core.urlresolvers import reverse
            host = 'http://' + request.META.get('HTTP_HOST')
            reset_password_url = host + str(reverse(
                'user:reset_password_set', kwargs={
                    'username': user.username
                }
            ))

            reset_message = _(
                settings.STRINGS['user']['reset_password']['EMAIL_RESET_MSG']) % (
                    user.first_name, 
                    user.username,
                    temporary_password,
                    reset_password_url,
                    settings.HELP_EMAIL
                )

            # Send the email with the fields prepared above.
            from django.core.mail import send_mail
            send_mail(
                _(settings.STRINGS['user']['reset_password']['RESET_PASSWORD_REQUESTED']),
                reset_message, 'OpenCurriculum <%s>' % settings.SERVER_EMAIL,
                [user.email], fail_silently=False
            )
            # Set Django message of email sending.
            messages.success(request, 'Successfully sent password reset email.')

        except:
            messages.error(request, 'Failed to send password reset email.')

    except:
        # Set Django message of failed ability to find user
        messages.error(request, 'Could not find user with that email address')

    # Redirect to login page
    return redirect('/?login=true')


def change_password(request):
    from django.contrib import messages
    try:
        current_password = request.POST.get('current_password', None)
        new_password = request.POST.get('new_password', None)

        from django.contrib.auth import authenticate
        authenticated_user = authenticate(
            username=request.user.username, password=current_password)

        if not authenticated_user:
            messages.error(request, 'Oops! You entered the wrong current password.')

        else:
            request.user.set_password(new_password)
            request.user.save()
            messages.success(request, 'Hurray! Changed to your password to the ultra-secure new one.')

    except:
        messages.error(request, 'Dang it! Something went wrong. Couldn\'t change the password')

    # Redirect to login page
    from django.core.urlresolvers import reverse
    return redirect(reverse('user:user_preferences'))


def reset_password_set(request, username):
    user = User.objects.get(username=username)
    errors = []

    if request.method == 'POST':
        temporary_password = request.POST.get('temporary_password', None)
        new_password = request.POST.get('new_password', None)
        repeat_password = request.POST.get('repeat_password', None)

        if temporary_password and new_password and repeat_password:
            if not user.check_password(temporary_password):
                errors.append('The temporary password you entered is incorrect')

            if new_password != repeat_password:
                errors.append('The two passwords did not match')

            if not _check_password_regex(new_password):
                errors.append(_(settings.STRINGS['user']['register']['form']['PASSWORD_VALIDATION_ERROR']))

            # If there are no errors in the list.
            if not errors:
                try:
                    # Set the new password & activate user
                    user.set_password(new_password)
                    user.is_active = True
                    user.save()

                    from django.contrib.auth import authenticate, login

                    logged_in_user = authenticate(username=username, password=new_password)
                    if logged_in_user.is_active:
                        login(request, logged_in_user)
                    
                    from django.contrib import messages
                    messages.success(request, 'Successfully set new password.')

                    return redirect('user:user_profile', username=username)
                except:
                    errors.append('Something went wrong. Try again or contact us.')
        else:
            errors.append('Please fill out all fields')

    context = {
        'title': 'Reset your password',
        'errors': errors
    }
    return render(request, 'reset-password.html', context)


def unsubscribe(request, user_id, service):
    try:
        user = User.objects.get(pk=user_id)
    except:
        raise Http404

    user_profile = user.get_profile()
    user_digests = user_profile.digests
    user_digests['newsletter'] = False
    
    user_profile.digests = user_digests
    user_profile.save()

    context = {
        'title': 'You have successully unsubscribed',
        'user': user,
        'service': 'newsletter'
    }
    return render(request, 'unsubscribe.html', context)    


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

            # Reset profile picture position.
            user_profile.profile_pic_position.top = 50
            user_profile.profile_pic_position.left = 50
            user_profile.profile_pic_position.save()

            from django.core.files.images import ImageFile
            local_profile_pic_path = settings.MEDIA_ROOT + 'images/users/tmp/' + str(user.id) + '-profile.jpg'

            local_profile_pic = open(local_profile_pic_path, 'w+')
            f = request.FILES['new_profile_picture']
            for chunk in f.chunks():
                    local_profile_pic.write(chunk)
            local_profile_pic.close()

            from os.path import splitext
            import os

            resized_image_path = resize_user_image(user_profile, 300, local_profile_pic_path)
            (filename, extension) = splitext(os.path.basename(f.name))

            user_profile.profile_pic.save(
                str(user_profile.user.id) + '-profile' + '300x300' + filename [:50] + '.jpg',
                ImageFile(open(resized_image_path)))

            os.remove(local_profile_pic_path)
            os.remove(resized_image_path)

            from django.contrib import messages
            messages.success(request, 'New picture uploaded. Drag and save for your ideal fit.')

    return redirect('user:user_profile', username=username)


def resize_user_image(user_profile, widthHeight, local_profile_pic_path):
    # Now resize the image and resave
    from PIL import Image
    image = Image.open(local_profile_pic_path)
    (original_width, original_height) = image.size

    if original_width > original_height:
        new_height = widthHeight
        new_width = (original_width / float(original_height)) * widthHeight
    else:
        new_height = (original_height / float(original_width)) * widthHeight
        new_width = widthHeight

    if image.mode == 'P':
        image = image.convert('RGB')

    imagefit = image.resize((int(new_width), int(new_height)), Image.ANTIALIAS)
    resized_image_path = (settings.MEDIA_ROOT + 'profile/' + str(widthHeight) + 'x' +
        str(widthHeight) + '/' + str(user_profile.user.id) + '-profile' + str(widthHeight) + 'x' +
        str(widthHeight) + '.jpg')

    try:
        # Throw a white background in the case of a transparent image.
        background = Image.new("RGBA", imagefit.size, (255, 255, 255))
        background.paste(imagefit, None, imagefit.split()[-1])
    except:
        pass

    imagefit.save(resized_image_path, 'JPEG', quality=90)
    
    return resized_image_path


def reposition_profile_picture(request, username):
    try:
        user = User.objects.get(username=username)
    except:
        raise Http404

    if request.user != user:
        return APIUtilities._api_unauthorized_failure()
    
    left = request.GET.get('left', None)
    top = request.GET.get('top', None)

    user_profile = user.get_profile()

    try:
        user_profile.profile_pic_position.top = int(top)
        user_profile.profile_pic_position.left = int(left)
        user_profile.profile_pic_position.save()

        return APIUtilities._api_success()
    except:
        context = {
            'title': 'Cannot reposition your profile picture.',
            'message': 'We failed to reposition your profile picture. Please ' +
                'contact us if this problem persists.'
        }
        return APIUtilities._api_failure(context)


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

        return APIUtilities._api_success()
    except:
        return APIUtilities._api_failure()


def dismiss_notifications(request, user_id):
    try:
        notification_ids = request.GET.get('ids').split(',')
    except:
        return APIUtilities._api_not_found()

    try:
        from user_account.models import Notification
        Notification.objects.filter(id__in=notification_ids).update(read=True)

        return APIUtilities._api_success()
    except:
        return APIUtilities._api_failure()


def subscribe(request, user_id):
    from user_account.models import Subscription, UserProfile
    try:
        subscribee = UserProfile.objects.get(user=user_id)
        subscriber = UserProfile.objects.get(user=request.user)
    except:
        return APIUtilities._api_not_found()

    # Check if a previous subscription exists, and if it does, unsubscribe,
    #     if not, subscribe.
    try:
        previous_subscription = Subscription.objects.get(
            subscriber=subscriber, subscribee=subscribee)
        previous_subscription.delete()

        return APIUtilities._api_success()
    except Subscription.DoesNotExist:
        new_subscription = Subscription(
            subscriber = subscriber,
            subscribee = subscribee
        )
        new_subscription.save()

        from user_account.tasks import subscribe as subscribe_task
        subscription_task = subscribe_task.delay(request.get_host(), new_subscription.id)

        return APIUtilities._api_success()
    except:
        return APIUtilities._api_failure()


def get_subscribe_state(request):
    from user_account.models import Subscription, UserProfile
    try:
        subscriber = UserProfile.objects.get(user=request.user)
    except:
        return APIUtilities._api_not_found()

    try:
        users = map(lambda x: int(x),
            request.GET.get('ids', None).split(','))

        subscriptions = Subscription.objects.filter(
            subscriber=subscriber, subscribee__user__in=users)

        subscription_states = {}
        for user in users:
            subscription_states[user] = subscriptions.filter(
                subscribee__user=user).exists()

        context = {
            'subscription_states': subscription_states
        }
        return APIUtilities._api_success(context)

    except:
        return APIUtilities._api_failure()


def username_availability(request, username):
    try:
        User.objects.get(username=username)
        return APIUtilities._api_failure()

    except User.DoesNotExist:
        return APIUtilities._api_success()


def social_availability(request, service, social_id):
    try:

        from django.contrib.auth import authenticate, login
        authenticated_user = authenticate(social_id=social_id, social_service=service)
        login(request, authenticated_user)

        context = {
            'id': authenticated_user.id,
            'username': authenticated_user.username,
            'name': authenticated_user.get_full_name()
        }
        return APIUtilities._api_failure(context)

    except:
        return APIUtilities._api_success()


def onboard(request, tour, version_id):
    from user_account.models import UserProfile
    try:
        user_profile = UserProfile.objects.get(user=request.user)
    except:
        return APIUtilities._api_not_found()

    try:
        onboarding = user_profile.onboarding        
        user_profile.onboarding = dict(onboarding.items() + {tour : 
            {'status': True, 'version': version_id }}.items())

        user_profile.save()

        return APIUtilities._api_success()
    except:
        return APIUtilities._api_failure()


def _filesizeFormat(size):
    return '{0:.2f}'.format(float(size))


def load_feed(request, user_id, feed_count):
    try:
        from django.contrib.auth.models import User
        user = User.objects.get(pk=user_id)
    except:
        return APIUtilities._api_not_found()

    def format_filesize(original_filesize):
        if original_filesize >= 1048576:
            filesize = str(
                _filesizeFormat(float(original_filesize) / 1048576)) + " MB"
        elif original_filesize >= 1024:
            filesize = str(
                _filesizeFormat(float(original_filesize) / 1024)) + " KB"
        else:
            filesize = str(
                _filesizeFormat(float(original_filesize))) + " B"

        return filesize

    from user_account.models import Activity
    feed = Activity.objects.filter(recipients=user).order_by('-pk')[(int(feed_count) + 1):(
        int(feed_count) + 20)]

    from django.core.urlresolvers import reverse

    serialized_feed = {}
    import oer.CollectionUtilities as cu

    for feed_item in feed:
        serialized_feed[feed_item.id] = {
            'id': feed_item.id,
            'actor_name': feed_item.actor.get_full_name(),
            'actor_thumbnail': settings.MEDIA_URL + feed_item.actor.get_profile().profile_pic.name,
            'actor_url': reverse(
                'user:user_profile', kwargs={ 'username': feed_item.actor.username }),
            'action_id': feed_item.action.id,
            'action_type': feed_item.action_type.name,
            'target_id': feed_item.target.id,
            'target_type': feed_item.target_type.name,
            #'target_created': datetime.datetime.strftime(feed_item.target.created, '%b. %d, %Y, %I:%M %P'),
            'target_created': feed_item.target.created.isoformat(),
        }

        # Determine the type of the resource.
        if serialized_feed[feed_item.id]['action_type'] == 'resource' or (
            serialized_feed[feed_item.id]['action_type'] == 'favorite'):
            cu.set_resources_type([feed_item.target])
            serialized_feed[feed_item.id]['target_type'] = feed_item.target.type

        # If this is a new resource creation activity.
        if serialized_feed[feed_item.id]['action_type'] == 'resource':
            serialized_feed[feed_item.id]['target_user'] = feed_item.target.user.get_full_name()
            serialized_feed[feed_item.id]['target_user_url'] = reverse(
                'user:user_profile', kwargs={ 'username': feed_item.target.user.username }),
            serialized_feed[feed_item.id]['target'] = feed_item.target.title
            serialized_feed[feed_item.id]['target_thumbnail'] = settings.MEDIA_URL + feed_item.target.image.name
            serialized_feed[feed_item.id]['target_license'] = feed_item.target.license.title
            serialized_feed[feed_item.id]['target_url'] = reverse(
                'read', kwargs={
                    'resource_id': feed_item.target.id,
                    'resource_slug': feed_item.target.slug
                })

            if feed_item.target.type == 'url':
                serialized_feed[feed_item.id]['target_direct_url'] = feed_item.target.revision.content.url

            if feed_item.target.type == 'video':
                serialized_feed[feed_item.id]['target_provider'] = feed_item.target.provider
                serialized_feed[feed_item.id]['target_video_tag'] = feed_item.target.video_tag

            if feed_item.target.type == 'attachment':
                serialized_feed[feed_item.id]['target_download_url'] = reverse(
                'resource:download', kwargs={ 'resource_id': feed_item.target.id }),
                serialized_feed[feed_item.id]['target_size'] = format_filesize(
                    feed_item.target.revision.content.file.size)

        # If this is a new comment creation activity.
        if serialized_feed[feed_item.id]['action_type'] == 'comment':
            serialized_feed[feed_item.id]['action'] = feed_item.action.body_markdown_html

            # If its on a resource.
            if serialized_feed[feed_item.id]['target_type'] == 'resource':
                serialized_feed[feed_item.id]['target_url'] = reverse(
                    'read', kwargs={
                        'resource_id': feed_item.target.id,
                        'resource_slug': feed_item.target.slug
                    })

            # Assuming it is in either on a project or in response to another comment.
            else:
                serialized_feed[feed_item.id]['context'] = feed_item.context.title
                serialized_feed[feed_item.id]['target'] = feed_item.target.body_markdown_html
                serialized_feed[feed_item.id]['target_url'] = reverse(
                    'projects:project_discussion', kwargs={
                        'project_slug': feed_item.context.slug,
                        'discussion_id': feed_item.target.id
                    }
                )
                serialized_feed[feed_item.id]['context_url'] = reverse(
                    'projects:project_home', kwargs={
                        'project_slug': feed_item.context.slug })
                
                # Its NOT a new discussion post, mostly a response to an existing one.
                if serialized_feed[feed_item.id]['action_id'] != serialized_feed[feed_item.id]['target_id']:
                    serialized_feed[feed_item.id]['target_user'] = feed_item.target.user.get_full_name()
                    serialized_feed[feed_item.id]['target_user_url'] = reverse(
                        'user:user_profile', kwargs={ 'username': feed_item.target.user.username }),
                    serialized_feed[feed_item.id]['target_user_thumbnail'] = settings.MEDIA_URL + feed_item.target.user.get_profile().profile_pic.name

        # If this is a group joining activity.
        if serialized_feed[feed_item.id]['action_type'] == 'membership':
            serialized_feed[feed_item.id]['target_url'] = reverse(
                'projects:project_home', kwargs={
                    'project_slug': feed_item.target.slug })
            serialized_feed[feed_item.id]['target'] = feed_item.target.title
            serialized_feed[feed_item.id]['target_description'] = feed_item.target.description
            serialized_feed[feed_item.id]['target_thumbnail'] = settings.MEDIA_URL + feed_item.target.cover_pic.name
            serialized_feed[feed_item.id]['target_thumbnail_position'] = [settings.MEDIA_URL + (
                feed_item.target.cover_pic_position.left), settings.MEDIA_URL + (
                feed_item.target.cover_pic_position.top)]

        # If this is a new group creation activity.
        if serialized_feed[feed_item.id]['action_type'] == 'project':
            serialized_feed[feed_item.id]['action_url'] = reverse(
                'projects:project_home', kwargs={
                    'project_slug': feed_item.action.slug })
            serialized_feed[feed_item.id]['action'] = feed_item.action.title
            serialized_feed[feed_item.id]['action_description'] = feed_item.target.description
            serialized_feed[feed_item.id]['action_thumbnail'] = settings.MEDIA_URL + (
                feed_item.action.cover_pic)
            serialized_feed[feed_item.id]['action_thumbnail_position'] = [settings.MEDIA_URL + (
                feed_item.action.cover_pic_position.left), settings.MEDIA_URL + (
                feed_item.action.cover_pic_position.top)]

        # If this is a favoriting on a resource (or a collection) activity.
        if serialized_feed[feed_item.id]['action_type'] == 'favorite':
            serialized_feed[feed_item.id]['target_user'] = feed_item.target.user.get_full_name()
            serialized_feed[feed_item.id]['target_user_url'] = reverse(
                'user:user_profile', kwargs={ 'username': feed_item.target.user.username }),
            serialized_feed[feed_item.id]['target'] = feed_item.target.title
            serialized_feed[feed_item.id]['target_thumbnail'] = settings.MEDIA_URL + feed_item.target.image.name
            serialized_feed[feed_item.id]['target_url'] = reverse(
                'read', kwargs={
                    'resource_id': feed_item.target.id,
                    'resource_slug': feed_item.target.slug
                })
        
            if feed_item.target.type == 'url':
                serialized_feed[feed_item.id]['target_direct_url'] = feed_item.target.revision.content.url

            if feed_item.target.type == 'video':
                serialized_feed[feed_item.id]['target_provider'] = feed_item.target.provider
                serialized_feed[feed_item.id]['target_video_tag'] = feed_item.target.video_tag

            if feed_item.target.type == 'attachment':
                serialized_feed[feed_item.id]['target_download_url'] = reverse(
                'resource:download', kwargs={ 'resource_id': feed_item.target.id }),
                serialized_feed[feed_item.id]['target_size'] = format_filesize(
                    feed_item.target.revision.content.file.size)

        # If this is a folder creation activity.
        if serialized_feed[feed_item.id]['action_type'] == 'collection':
            serialized_feed[feed_item.id]['target_url'] = reverse(
                'user:list_collection', kwargs={
                    'username': feed_item.context.user.username,
                    'collection_slug': feed_item.target.slug
                }
            )            

    context = {
        'feeds': serialized_feed
    }
    return APIUtilities._api_success(context)


def api_get_profile(request, username):
    try:
        user = User.objects.get(username=username)
    except:
        return APIUtilities._api_not_found()

    try:
        context = {
            'user': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'name': user.get_full_name(),
                'last_name': user.last_name,
                'picture': settings.MEDIA_URL + user.get_profile().profile_pic.name
            }
        }
        return APIUtilities._api_success(context)

    except:
        return APIUtilities._api_failure()


def api_resubscribe(request, user_id, service):
    try:
        user = User.objects.get(pk=user_id)
    except:
        return APIUtilities._api_not_found()

    try:
        user_profile = user.get_profile()
        user_digests = user_profile.digests
        user_digests['newsletter'] = True
        
        user_profile.digests = user_digests
        user_profile.save()

        return APIUtilities._api_success()

    except:
        return APIUtilities._api_failure()


# Non-view non API.

def newsletter_tracker(request):
    from user_account.tasks import open_newsletter
    open_newsletter.delay(
        request.GET.get('uid', None), request.GET.get('cid', None))

    response = HttpResponse(
        'R0lGODlhAQABAIAAAP///////yH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='.decode('base64'),
        mimetype='image/gif')
    return response
