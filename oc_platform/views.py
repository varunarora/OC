from django.shortcuts import render, redirect, HttpResponse
from django.utils.translation import ugettext as _
from django.conf import settings
from articles.models import Article
import json


def home(request):
    """Display either the homepage or the user home based on login status.

    If not logged in, fetch the top articles, count, and sign-in form.
    """
    if request.user.is_authenticated():
        from user_account.views import user_home
        return user_home(request, request.user.id)

    login = request.GET.get('login', False)
    login_error_message = None
    source = None
    
    if login:
        login_error = request.GET.get('error', False)
        if login_error == 'auth':
            login_error_message = _(settings.STRINGS['user']['AUTHENTICATION_ERROR'])
        elif login_error == 'inactive':
            login_error_message = _(settings.STRINGS['user']['INACTIVE_ACCOUNT_ERROR'])
        source = request.GET.get('source', False)

    # Get the top 10 articles ordered in descending order of views.
    top_articles = Article.objects.order_by('title').order_by('-views')[:10]

    # Get the count of the total number of articles in the database.
    article_count = Article.objects.all().count()

    # Get the sign-in form.
    import SignupForm
    form = SignupForm.SignupForm()

    # Fetch context variables by importing and invoking Google Plus function
    #     in AuthHelper library.
    from user_account.AuthHelper import AuthHelper

    context = dict(
        AuthHelper.generateGPlusContext(request).items() + {
            'top_articles': top_articles,
            'title': _(settings.STRINGS['global']['TITLE']),
            'count': article_count,
            'form': form,
            'login': True if login else False,
            'login_error_message': login_error_message,
            'source': source
        }.items()
    )
    return render(request, 'index.html', context)


def t404(request):
    """Fetches and returns the 404 template for testing purposes"""
    context = {'title': _(settings.STRINGS['global']['TITLE'])}
    return render(request, '404.html', context)


def t500(request):
    """Fetches and returns the 500 template for testing purposes"""
    context = {'title': _(settings.STRINGS['global']['TITLE'])}
    return render(request, '500.html', context)


def contact(request):
    context = {'title': _(settings.STRINGS['global']['TITLE'])}
    return render(request, 'contact.html', context)


def developers(request):
    context = {'title': _(settings.STRINGS['global']['TITLE'])}
    return render(request, 'developers.html', context)


def about(request):
    context = {'title': _(settings.STRINGS['about']['TITLE'])}
    return render(request, 'about.html', context)


def team(request):
    context = {'title': _(settings.STRINGS['about']['team']['TITLE'])}
    return render(request, 'team.html', context)


def press(request):
    context = {'title': _(settings.STRINGS['about']['press']['TITLE'])}
    return render(request, 'press.html', context)


def help(request):
    return redirect('http://opencurriculum.uservoice.com')


def jobs(request):
    context = {'title': _(settings.STRINGS['jobs']['TITLE'])}
    return render(request, 'jobs.html', context)


def terms(request):
    context = {'title': _(settings.STRINGS['terms']['TITLE'])}
    return render(request, 'terms.html', context)


def privacy(request):
    context = {'title': _(settings.STRINGS['privacy']['TITLE'])}
    return render(request, 'privacy.html', context)


def license(request):
    context = {'title': _(settings.STRINGS['license']['TITLE'])}
    return render(request, 'license.html', context)


def signup_invite(request):
    """Sends sign-up invite request email to administrator(s)

    Processes form input from POST dictionary objects, and if the data
    validates, fetches the cleaned data from each of the fields. It then
    contructs and dispatches the emails, and returns the success state of the
    entire process

    Returns:
        JSON object response with 'status' and 'message' variables, with
        'status' being a boolean and 'message' providing further information.
        If validation failure, form error messages object based on the field
        will be passed as 'message'
    """
    # Set up an empty dictionary response object.
    response = {}

    import SignupForm

    if request.method == "POST":
        # TODO(Varun): Put a try here.
        form = SignupForm.SignupForm(request.POST)

        # If form validates, proceed with performing tasks.
        if form.is_valid():
            # Fetch cleaned fields
            name = form.cleaned_data['name']
            email = form.cleaned_data['email']
            purpose = form.cleaned_data['purpose']

            # If the form requested an organization, assign, else set default.
            try:
                organization = form.cleaned_data['organization']
            except:
                organization = "NA"

            # Fetch the sign-up administrator emails from settings.
            recipients = settings.SIGNUPS_ADMINS

            # Set simple subject line and message capturing cleaned fields.
            subject = "OC-Invite: " + purpose
            message = name + ", " + organization + ", " + email

            try:
                from django.core.mail import send_mail
                send_mail(subject, message, email, recipients)

                response['status'] = True
                response['message'] = _(
                    settings.STRINGS['global']['invite']['SUCCESS']
                )

            except:
                response['status'] = False
                response['message'] = _(
                    settings.STRINGS['global']['invite']['FAILURE']
                )

        # If form did not validate, return errors.
        else:
            response['status'] = False
            response['message'] = form.errors

    return HttpResponse(json.dumps(response), content_type="application/json")


# API Stuff below.

def get_breadcrumb(request):
    """Builds and returns the breadcrumb of a category from its ID

    Returns:
        Serialized category breadcrumb as a JSON object. If category cannot be
        located, a simple string message reporting the failure
    """
    category_id = request.GET.get('category_id', '')

    try:
        # Fetch the category from the ID provided in the GET request.
        from meta.models import Category
        category = Category.objects.get(pk=category_id)

        # Build the breadcrumb by using the appropriate class.
        from articles.ArticleUtilities import ArticleUtilities
        breadcrumb = ArticleUtilities.buildBreadcrumb(category)
        # Reverse it to begin with root element.
        breadcrumb.reverse()

        # Manually serialize the breadcrumb by iterating through it.
        serializableBreadcrumb = []
        for bc in breadcrumb:
            serializableBreadcrumb.append(bc.title)

        return HttpResponse(
            json.dumps(serializableBreadcrumb), 200,
            content_type="application/json"
        )

    except:
        return HttpResponse(
            json.dumps(
                _(settings.STRINGS['meta']['category']['API_LOCATION_FAILURE'])
            ), 401,
            content_type="application/json"
        )


def email_share(request):
    """Dispatched a 'share' email to an email address

    Returns:
        JSON object with a key of 'status' with JavaScript boolean
        representation of success of operation
    """
    # Fetch POST fields.
    email_addresses = request.POST.get('email')
    message = request.POST.get('message')
    from_name = request.POST.get('from_name')

    # TODO(Varun): Do something with the user provided email address.
    # from_address = request.POST.get('from_address')

    try:
        # Build a list of email addresses, if multiple comma-separated values
        #     provided.
        email_addresses = email_addresses.split(',')

        from django.core.mail import send_mail
        send_mail(
            from_name + ' ' + _(settings.STRINGS['share']['SUBJECT_APPEND']),
            message, from_name + ' <%s>' % settings.SERVER_EMAIL,
            email_addresses, fail_silently=False
        )

        status = {'status': 'true'}

        return HttpResponse(
            json.dumps(status), 200, content_type="application/json")

    except:
        status = {'status': 'false'}

        return HttpResponse(
            json.dumps(status), 401, content_type="application/json")

