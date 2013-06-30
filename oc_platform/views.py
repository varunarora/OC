from django.shortcuts import render, redirect, HttpResponse
from django.utils.translation import ugettext as _
from django.core.files import File
from django.template import loader, Context
from django.conf import settings
from articles.models import Article
import json
import urllib2
import os


def home(request):
    """Fetches the top articles, a count and the sign-in form"""
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
            'form': form
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


def upload_page(request):
    """Renders the upload page to the client.

    Also has userId and projectId in the context.
    """

    c = Context({
        "userId": request.user.id,
        "projectId": "7"
    })

    return render(request, 'upload.html', c)


def fp_upload(request):
    """Adds data from POST request at api/fpUpload/ to database.

    Parameters:
        Request containing user_id, project_id, and list of key-title pairs.

    Returns:
        Response containing JSON with ResourceID-title pairs.
    """

    # Constants
    from django.conf import settings
    s3_main_addr = settings.AWS_STATIC_BUCKET
    default_cost = 0

    # Make a copy of the request.POST object, extract user and project IDs
    # And remove them from the copy.
    post_data = request.POST.copy()

    user_id = post_data['user_id']
    project_id = post_data['project_id']
    del post_data['user_id']
    del post_data['project_id']

    # Fetch keys and filenames from post_data, and build a list of
    # (url, title) tuples.
    file_list = []

    for key_unicode in post_data:
        key = str(key_unicode)             # Unicode by default.
        title = str(post_data[key])
        file_list.append((key, title))     # Two parens because tuple.

    response_dict = dict()
    from oer.models import Resource

    # For each file, download it to local.
    # Create Resource objects for each file uploaded.
    # And generate the list for the response.
    for (key, title) in file_list:
        s3_file = urllib2.urlopen(s3_main_addr + key)

        fname = key.rsplit('/', 1)[-1]      # fname can't have slashes
        static_file = open(fname, 'w+')
        static_file.write(s3_file.read())

        new_resource = Resource()
        new_resource.title = title
        new_resource.url = s3_main_addr + key
        new_resource.cost = default_cost
        new_resource.user_id = user_id
        new_resource.file = File(static_file)
        new_resource.save()
        response_dict[new_resource.id] = new_resource.title
        static_file.close()
        os.remove(fname)

    return HttpResponse(
        json.dumps(response_dict), 200, content_type="application/json")


def fp_submit(request):
    """Accepts final file titles from client and persists any changed titles.

    Before database operations, the project_id is extracted from post_data,
    which is a copy of request.POST. Also, any fields not related to files
    are removed from post_data.

    Then, any changed titles in post_data are persisted.

    Parameters:
        Request contaiing list of ResourceID-title pairs.

    Returns:
        Redirect to project slug.
    """
    from oer.models import Resource
    post_data = request.POST.copy()
    project_id = post_data['project_id']
    del post_data["csrfmiddlewaretoken"]
    del post_data['user_id']
    del post_data['project_id']

    for id in post_data:
        resource = Resource.objects.get(pk=id)
        # If the title has changed, persist it
        if (resource.id != post_data[id]):
            resource.title = post_data[id]
            resource.save()

    from projects.views import project_home
    from projects.models import Project
    slug = Project.objects.get(pk=project_id).slug
    return redirect(project_home(request, slug))


def article_center_registration(request):
    return render(request, 'article-center-registration.html', {})
