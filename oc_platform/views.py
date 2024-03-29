from django.shortcuts import render, redirect, HttpResponse
from django.utils.translation import ugettext as _
from django.conf import settings
from django.http import Http404
import json


def home(request):
    context = {
        'title': _(settings.STRINGS['global']['TITLE']),
    }

    if hasattr(request, 'organization'):
        if request.user.is_authenticated():
            return organization_home(request)
        else:
            return redirect('login')

    if request.user.is_authenticated():
        return render(request, 'home.html', context)

    return render(request, 'index.html', context)


def organization_home(request):
    from user_account.models import Activity
    feed = Activity.objects.filter(actor=request.user).order_by('-pk')[:10]
    feed_count = Activity.objects.filter(actor=request.user).count()

    suggestions = None
    if feed_count == 0:
        import copy
        from user_account.models import Subscription
        from django.contrib.auth.models import User

        if request.organization:
            suggestions = []
            org_members = request.organization.members.all().exclude(pk=request.user.id)

            for member in org_members:
                try:
                    Subscription.objects.get(
                        subscriber=request.user.get_profile(), subscribee__user=member)
                except:
                    suggestions.append(member)

        else:
            filtered_stars_raw = []
            stars_raw = copy.deepcopy(settings.STAR_USERS)
            try:
                stars_raw.remove(request.user.username)
            except:
                pass

            for star in stars_raw:
                try:
                    Subscription.objects.get(
                        subscriber=request.user.get_profile(), subscribee__user__username=star)
                except:
                    filtered_stars_raw.append(star)

            suggestions = User.objects.filter(username__in=filtered_stars_raw)

    context = {
        'user_profile': request.user,
        'organization': request.organization,
        'suggestions': suggestions,
        'feed': feed,
        'title':  request.organization.title + " &lsaquo; OpenCurriculum",
        'feed_count': feed_count,
        'page': 'home'
    }
    return render(request, 'new-profile.html', context)


def login(request, organization_slug=None):
    if request.user.is_authenticated():
        if hasattr(request, 'organization'):
            return organization_home(request)
        else:
            return redirect('user:user_profile', username=request.user.username)

    login_error_message = None
    source = None

    login_error = request.GET.get('error', False)
    if login_error == 'auth':
        login_error_message = _(settings.STRINGS['user']['AUTHENTICATION_ERROR'])
    elif login_error == 'inactive':
        login_error_message = _(settings.STRINGS['user']['INACTIVE_ACCOUNT_ERROR'])
    source = request.GET.get('source', False)

    # Get the sign-in form.
    import SignupForm
    form = SignupForm.SignupForm()

    # Fetch context variables by importing and invoking Google Plus function
    #     in AuthHelper library.
    from user_account.AuthHelper import AuthHelper
    context = dict(
        AuthHelper.generateGPlusContext(request).items() + {
            'form': form,
            'login': True if login else False,
            'login_error_message': login_error_message,
            'title': 'Log in to OpenCurriculum',
            'source': source
        }.items()
    )

    if hasattr(request, 'organization'):
        try:
            from user_account.models import Organization
            context['organization'] = Organization.objects.get(slug=request.organization.slug)
            return render(request, 'org-login.html', context)

        except:
            raise Http404

    return render(request, 'login.html', context)


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


def feedback(request):
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
    from_address = request.POST.get('from_address')

    try:
        # Build a list of email addresses, if multiple comma-separated values
        #     provided.
        email_addresses = email_addresses.split(',')

        from django.core.mail import send_mail
        send_mail(
            from_name + ' ' + _(settings.STRINGS['share']['SUBJECT_APPEND']),
            message, from_name + ' <%s>' % from_address.strip(),
            email_addresses, fail_silently=False
        )

        status = {'status': 'true'}

        return HttpResponse(
            json.dumps(status), 200, content_type="application/json")

    except:
        status = {'status': 'false'}

        return HttpResponse(
            json.dumps(status), 401, content_type="application/json")


def list_articles(request):
    limit = request.GET.get('limit', False)

    from articles.models import Article
    articles = Article.objects.filter(published=True).order_by('-views')[:limit]

    serialized_articles = {}
    for article in articles:
        serialized_articles[str(article.id)] = {
            'id': article.id,
            'title': article.title,
            'views': article.views,
            'slug': article.slug,
            'citation': article.citation
        }

    response = HttpResponse(
        json.dumps(serialized_articles), 401, content_type="application/json")

    response["Access-Control-Allow-Origin"] = "*"  
    response["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS"  
    response["Access-Control-Max-Age"] = "1000"  
    response["Access-Control-Allow-Headers"] = "*"

    return response


def mailpimp_home(request):
    context = {
        'title': 'Mailpimp, by OpenCurriculum'
    }
    return render(request, 'mailpimp.html', context)


def jstests(request):
    return render(request, 'testjs.html', {})


def worksheet(request):
    context = {
        'title': 'CBSE Math Clas 12 Sample paper maker'
    }
    return render(request, 'questions.html', context)


def newsletter(request):
    return render(request, 'newsletters/halloween.html', {})


def merge_tags(from_id, to_id):
    from meta.models import Tag, Category
    from oer.models import Resource

    from_tag = Tag.objects.get(pk=from_id)
    to_tag = Tag.objects.get(pk=to_id)
    try:
        ar = Resource.objects.filter(tags=from_tag)
        ac = Category.objects.filter(tags=from_tag)
        for r in ar:
            r.tags.add(to_tag)
            r.tags.remove(from_tag)
        for c in ac:
            c.tags.add(to_tag)
            c.tags.remove(from_tag)

        to_tag.delete()
    except Exception, e:
        print e
