from django.shortcuts import render, redirect, HttpResponse
from articles.models import Article
import json


def home(request):
    top_articles = Article.objects.order_by('title').order_by('-views')[:10]
    article_count = Article.objects.all().count()

    import SignupForm
    form = SignupForm.SignupForm()

    from user_account.AuthHelper import AuthHelper
    context = dict(AuthHelper.generateGPlusContext(request).items() + {
        'top_articles': top_articles, 'title': 'OpenCurriculum: A K-12 Learning Content Hub',
        'count': article_count, 'form': form}.items())
    return render(request, 'index.html', context)


def t404(request):
    top_articles = Article.objects.order_by('title')[:10]
    context = {'top_articles': top_articles, 'title': 'OpenCurriculum: A K-12 Learning Content Hub'}
    return render(request, '404.html', context)


def t505(request):
    top_articles = Article.objects.order_by('title')[:10]
    context = {'top_articles': top_articles, 'title': 'OpenCurriculum: A K-12 Learning Content Hub'}
    return render(request, '500.html', context)


def contact(request):
    top_articles = Article.objects.order_by('title')[:10]
    context = {'top_articles': top_articles, 'title': 'OpenCurriculum: A K-12 Learning Content Hub'}
    return render(request, 'contact.html', context)


def developers(request):
    top_articles = Article.objects.order_by('title')[:10]
    context = {'top_articles': top_articles, 'title': 'OpenCurriculum: A K-12 Textbook Hub'}
    return render(request, 'developers.html', context)


def about(request):
    context = {'title': 'About OpenCurriculum'}
    return render(request, 'about.html', context)


def team(request):
    context = {'title': 'OpenCurriculum\'s Team'}
    return render(request, 'team.html', context)


def press(request):
    context = {'title': 'Press &lsaquo; OpenCurriculum'}
    return render(request, 'press.html', context)


def help(request):
    return redirect('http://opencurriculum.uservoice.com')


def jobs(request):
    context = {'title': 'Jobs @ OpenCurriculum'}
    return render(request, 'jobs.html', context)


def terms(request):
    context = {'title': 'Terms of Use &lsaquo; OpenCurriculum'}
    return render(request, 'terms.html', context)


def privacy(request):
    context = {'title': 'Privacy Policy &lsaquo; OpenCurriculum'}
    return render(request, 'privacy.html', context)


def license(request):
    context = {'title': 'License &lsaquo; OpenCurriculum'}
    return render(request, 'license.html', context)


def signupinvite(request):
    response = {}
    import SignupForm
    if request.method == "POST":
        # TODO: Put a try here
        form = SignupForm.SignupForm(request.POST)
        if form.is_valid():
            name = form.cleaned_data['name']
            try:
                organization = form.cleaned_data['organization']
            except:
                organization = "NA"
            email = form.cleaned_data['email']
            purpose = form.cleaned_data['purpose']

            from django.conf import settings
            recipients = settings.SIGNUPS_ADMINS

            subject = "OC-Invite: " + purpose
            message = name + ", " + organization + ", " + email

            try:
                from django.core.mail import send_mail
                send_mail(subject, message, email, recipients)

                response['status'] = True
                response['message'] = ('Congratulations! We have successfully received your '
                                       'request submission.')

            except:
                response['status'] = False
                response['message'] = ('Unknown error occured. Try again or contact us at '
                                       'hello@ for a resolution.')

        else:
            response['status'] = False
            response['message'] = form.errors

    return HttpResponse(json.dumps(response), content_type="application/json")

# API Stuff below


def get_breadcrumb(request):
    category_id = request.GET.get('category_id', '')

    try:
        from meta.models import Category
        category = Category.objects.get(pk=category_id)

        from articles.ArticleUtilities import ArticleUtilities
        breadcrumb = ArticleUtilities.buildBreadcrumb(category)
        breadcrumb.reverse()

        serializableBreadcrumb = []

        for bc in breadcrumb:
            serializableBreadcrumb.append(bc.title)

        return HttpResponse(
            json.dumps(serializableBreadcrumb), 200, content_type="application/json")

    except:
        return HttpResponse(
            json.dumps('Failed to locate category'), 401, content_type="application/json")


def email_share(request):
    email_addresses = request.POST.get('email')
    message = request.POST.get('message')
    from_name = request.POST.get('from_name')
    # TODO: Do something with the user provided email address
    # from_address = request.POST.get('from_address')

    try:
        email_addresses = email_addresses.split(',')

        from django.core.mail import send_mail
        send_mail(
            from_name + ' shared an article with you', message,
            from_name + ' <info@theopencurriculum.org>', email_addresses, fail_silently=False)

        status = {'status': 'true'}

        return HttpResponse(
            json.dumps(status), 200, content_type="application/json")

    except:
        status = {'status': 'false'}

        return HttpResponse(
            json.dumps(status), 401, content_type="application/json")
