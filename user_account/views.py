from django.shortcuts import render, HttpResponse
from django.contrib.auth.models import User
import json


def register_tmp(request):
    from django.contrib.auth.forms import UserCreationForm
    context = {'form': UserCreationForm().as_p()}
    return render(request, "registration-success.html", context)


# TODO: Make this more "function"al
def register(request):
    registration_template = 'register.html'
    page_context = {'title': 'Sign up for a new account &lsaquo; OpenCurriculum'}

    # Context objects which render the form
    fields_context = {}
    professions = ['Student', 'Teacher', 'School administrator', 'Publisher', 'Other']

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
    form_context = {'months': sorted(months.iteritems()), 'professions': professions}

    if request.method == "POST":
        # Capture only thse inputs from the original form that need to be returned in
        #     the case of an error with form validation
        form_fields_to_return = [
            'first_name', 'last_name', 'email', 'dob_month', 'dob_date', 'dob_year',
            'profile_pic', 'social_login', 'location', 'profession', 'username', 'gender']
        original_form_inputs = dict(
            (k, v) for k, v in request.POST.copy().iteritems() if k in form_fields_to_return)

        import NewUserForm
        user_form = NewUserForm.UserExtended()
        profile_form = NewUserForm.UserProfileExtended()

        # Try to create a date from the form inputs
        dob_success = _set_dob(request, profile_form)

        # Set recaptcha success defaults
        recaptcha_success = False
        password_match_success = False

        # Determine if social login was used or organic signup
        social_login = request.POST.get('social_login').lower() == "true"

        if social_login:
            # Ignore reCaptcha validation entirely
            recaptcha_success = True
            password_match_success = True

        else:
            # Check if the captcha entries were valid
            recaptcha_success = _check_recaptcha(request, profile_form)

            # Validate the match between both passwords
            # TODO: Remove this check, default check built into UserCreationForm
            password1 = request.POST.get('password')
            password2 = request.POST.get('password2')
            password_match_success = password1 == password2

        if not password_match_success:
            # If password mismatch, set appropriate error message
            user_form.password.errors = "The two passwords did not match"

        # Only if passwords match, reCaptcha is successful and DoB is created,
        #     move forward with creating a user and connected Profile model
        if password_match_success and recaptcha_success and dob_success:
            user_form = NewUserForm.NewUserForm(request.POST, social_login)

            if user_form.is_valid():
                _prepare_user_from_form(user_form)

                # TODO: Check for uniqueness of email address
                try:
                    # Save the user; this automatically sets is_active on the user as false
                    new_user = user_form.save()

                    # If a new user was created with success
                    if new_user:
                        profile_form = NewUserForm.NewUserProfileForm(
                            request.POST, social_login, new_user, profile_form.dob)

                        if profile_form.is_valid():
                            _prepare_profile_from_form(profile_form)

                            try:
                                # Need to pass the user to the profile_form before saving
                                profile = profile_form.save()

                                _set_profile_picture(profile, profile_form)

                                # Send confirmation email with confirmation code
                                confirmation_code = _generate_confirmation_code(new_user)
                                _send_email_confirmation(new_user, confirmation_code, request)

                                context = {
                                    'title': 'Congratulations! Now confirm your account',
                                    'new_user': new_user
                                }
                                return render(request, "registration-success.html", context)

                            except:
                                # TODO: Delete user and announce failure

                                # TODO: Create a django error notication
                                print "Profile object failed to be created"
                        else:
                            print profile_form.errors
                            # TODO: Delete user
                            pass
                except:
                    # TODO: Create a django error notication
                    print "User object failed to be created"
            else:
                print user_form.errors
                print "Failed to validate form"

        fields_context = {
            'user_form': user_form, 'profile_form': profile_form, 'form': original_form_inputs,
            'social_login': social_login
        }

    # Build the form from previous inputs to pre-populate form
    #registration_template += "?"
    from AuthHelper import AuthHelper
    context = dict(
        AuthHelper.generateGPlusContext(request).items() + page_context.items()
        + fields_context.items() + form_context.items())
    return render(request, registration_template, context)


def _generate_confirmation_code(user):
    import hashlib

    # Convert the DateField output from readable string to epoch timestamp
    from django.utils.dateformat import format
    date_joined = format(user.date_joined, u'U')

    # Create and return a hash of the username along with the timestamp of the user joining
    return hashlib.sha1(str(user.username + date_joined)).hexdigest()


def _send_email_confirmation(user, confirmation_code, request):
    from django.core.urlresolvers import reverse

    email_help = 'hello@theopencurriculum.org'
    # Append the host with the reverse() URL look up for confirming account with appropriate GET
    #     parameters
    # TODO: Replace with request.get_host() and test
    host = 'http://' + request.META.get('HTTP_HOST')
    confirm_account_url = host + str(reverse("confirm_account")) + (
        "?username=%s&confirmation_key=%s" % (user.username, confirmation_code))

    # Draft a message for the user as a welcome/account confirmation
    # TODO: Replace hard-coded email address to constant from settings.py
    # TODO: Throw a 2 hour confirmation time constraint
    confirmation_message = ("Dear %s,\n\nCongratulations for signing up for an account on "
                            "OpenCurriculum. We are delighted to welcome you to our community. "
                            "Our mascot, Moe, extends his warmest greetings! \n\n"
                            "To confirm your new account to use the website as a user, "
                            "click on the link below or copy the entire URL and paste and open "
                            "it in your favorite browser: \n\n%s\n\n"
                            "If you are experiencing any problems with confirming your account, "
                            "do not hesitate to get in touch with us by writing to us at %s. \n\n"
                            "Thank you,\nNew User team @ OpenCurriculum") % (
                                user.first_name, confirm_account_url, email_help)

    from django.core.mail import send_mail
    send_mail(
        'Confirm your new OpenCurriculum account', confirmation_message,
        'OpenCurriculum <info@theopencurriculum.org>', [user.email], fail_silently=False)


# TODO: Through a time constraint
def confirm_account(request):
    username = request.GET.get('username', None)
    confirmation_code = request.GET.get('confirmation_key', None)

    user = User.objects.get(username=username)

    # Generate a new confirmation code from user fields
    generated_confirmation_code = _generate_confirmation_code(user)

    if (generated_confirmation_code == confirmation_code):
        # Mark the user account as active
        user.is_active = True
        user.save()

        # TODO: Automatically authenticate the user at this stage

        # Return the user to their profile with the pop-up message that their account has
        #     been confirmed
        popup_message = "Congratulations! Your account is now active and ready to go!"
        context = {'popup_message': popup_message}
        return render(request, 'profile.html', context)
    else:
        # Set the appropriate failure message and return failed page to user
        failure_message = "either your username or your confirmation key were incorrect"
        context = {'failure_message': failure_message}
        return render(request, 'failed_confirmation.html', context)


def _set_dob(request, profile_form):
    # Create flag for successfully creating a Date of Birth
    setting_success = False

    # Set DoB and append to profile_form
    month = request.POST.get('dob_month')
    date = request.POST.get('dob_date')
    year = request.POST.get('dob_year')

    try:
        import datetime
        date_of_birth = datetime.date(int(year), int(month), int(date))

        if date_of_birth.year < 1900:
            profile_form.dob.errors = "The date of birth is out of range"
        else:
            profile_form.dob = date_of_birth
            setting_success = True
    except:
        profile_form.dob.errors = "The date of birth is incorrect"

    return setting_success


def _check_recaptcha(request, profile_form):
    recaptcha_success = False

    # Validate captcha
    try:
        recaptcha_challenge_field = request.POST.get('recaptcha_challenge_field')
        recaptcha_response_field = request.POST.get('recaptcha_response_field')
        recaptcha_success = _validate_captcha(
            request, recaptcha_challenge_field, recaptcha_response_field)
    except:
        recaptcha_success = False

    if not recaptcha_success:
        profile_form.recaptcha.errors = ("reCaptcha validation failed. Please try again "
                                         "or contact us for support")

    return recaptcha_success


def _prepare_user_from_form(user_form):
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
    dob = profile_form.cleaned_data['dob']
    location = profile_form.cleaned_data['location']
    profession = profile_form.cleaned_data['profession']
    profile_pic = profile_form.cleaned_data['profile_pic']

    profile_form.dob = dob
    profile_form.location = location
    profile_form.profession = profession
    profile_form.profile_pic = profile_pic


def _validate_captcha(request, challenge, response):
    from django.conf import settings
    import os
    os.environ['http_proxy'] = ''
    import urllib
    import urllib2
    params = urllib.urlencode(
        {
            'privatekey': settings.RECAPTCHA_PRIVATE_KEY, 'remoteip': request.get_host(),
            'challenge': challenge, 'response': response
        })
    headers = {"Content-type": "application/x-www-form-urlencoded", "Accept": "text/plain"}
    req = urllib2.Request('http://www.google.com/recaptcha/api/verify', params, headers)
    response = urllib2.urlopen(req).read()
    message = response.split('\n')
    captcha_success = message[0]
    if captcha_success.strip() == "true":
        return True
    else:
        return False


def _set_profile_picture(profile, profile_form):
    try:
        # Now set and save the profile image
        from django.core.files.base import ContentFile
        import os.path

        profile_pic_filename = os.path.basename(profile_form.profile_pic_tmp.name)
        profile.profile_pic.save(
            profile_pic_filename, ContentFile(profile_form.profile_pic_tmp.read()))
        profile.save()
    except:
        # TODO: Django notification for failure to create and assign profile picture
        print "User Profile picture failed to be created"


def authenticate(request):
    from django.contrib.auth import authenticate, login

    username = request.POST['username']
    password = request.POST['password']
    user = authenticate(username=username, password=password)

    if user is not None:
        if user.is_active:
            login(request, user)
            return HttpResponse('You logged in just fine, homie!')
        else:
            # TODO: Refine where added support for disabling of accounts
            return HttpResponse('Sorry this account is not active')
    else:
        return HttpResponse('Faulty login, bituch')


def logout_view(request):
    from django.contrib.auth import logout
    logout(request)

    return HttpResponse('You logged out all fine, son')


def googleplus_login(request):

    CLIENT_ID = json.loads(open('client_secrets.json', 'r').read())['web']['client_id']

    if request.POST.get('state') != request.session['state']:
        return HttpResponse(
            json.dumps('Invalid state parameter.'), 401, content_type="application/json")

    gplus_id = request.POST.get('gplus_id')
    code = request.POST.get('code')

    from oauth2client import client
    import httplib2

    try:
        # Upgrade the authorization code into a credentials object
        oauth_flow = client.flow_from_clientsecrets('client_secrets.json', scope='')
        oauth_flow.redirect_uri = 'postmessage'
        credentials = oauth_flow.step2_exchange(code)
    except client.FlowExchangeError:
        return HttpResponse(
            json.dumps('Failed to upgrade the authorization code.'),
            401, content_type="application/json")

    # Check that the access token is valid.
    access_token = credentials.access_token
    url = ('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=%s' % access_token)
    h = httplib2.Http()
    result = json.loads(h.request(url, 'GET')[1])

    # If there was an error in the access token info, abort.
    if result.get('error') is not None:
        return HttpResponse(json.dumps(result.get('error')), 500, content_type="application/json")

    # Verify that the access token is used for the intended user.
    if result['user_id'] != gplus_id:
        return HttpResponse(
            json.dumps("Token's user ID doesn't match given user ID."),
            401, content_type="application/json")

    # Verify that the access token is valid for this app.
    if result['issued_to'] != CLIENT_ID:
        return HttpResponse(
            json.dumps("Token's client ID does not match app's."),
            401, content_type="application/json")

    stored_credentials = request.session.get('credentials')
    stored_gplus_id = request.session.get('gplus_id')
    if stored_credentials is not None and gplus_id == stored_gplus_id:
        return HttpResponse(
            json.dumps('Current user is already connected.'), 200, content_type="application/json")

    # Store the access token in the session for later use.
    request.session['credentials'] = credentials
    request.session['gplus_id'] = gplus_id
    return HttpResponse(
        json.dumps('Successfully connected user.'), 200, content_type="application/json")


def user_profile(request, username):
    user = User.objects.get(username=username)
    from articles.models import ArticleRevision
    forks = ArticleRevision.objects.filter(user=user.id, flag="fork").order_by("-created")
    context = {
        'user_profile': user, 'edits': forks,
        'title': user.first_name + ' ' + user.last_name + " &lsaquo; OpenCurriculum"
    }
    return render(request, 'profile.html', context)
