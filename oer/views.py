from django.http import HttpResponse, Http404
from django.shortcuts import render, redirect
from oer.models import Resource
from django.core.files import File
import json


def resource_center(request):
    return HttpResponse("Page under construction")


def view_resource(request, resource_id):
    resource = Resource.objects.get(pk=resource_id)
    related = Resource.objects.all()[:5]

    if resource.type == "url":
        from BeautifulSoup import BeautifulSoup
        from urllib import urlopen

        try:
            source = urlopen(resource.url)
            soup = BeautifulSoup(source)

            resource.url_title = soup.find('title').text
            description = soup.findAll('meta', attrs={'name': "description"})[0]

            if description:
                resource.body = description['content']
        except:
            pass

    if resource.type == "attachment":
        #TODO: Replace with |filesizeformat template tag
        filesize = resource.file.size
        if filesize >= 104856:
            resource.filesize = str(_filesizeFormat(float(filesize) / 104856)) + " MB"
        elif filesize >= 1024:
            resource.filesize = str(_filesizeFormat(float(filesize) / 1024)) + " KB"
        else:
            resource.filesize = str(_filesizeFormat(float(filesize))) + " B"

        from os.path import splitext
        name, resource.extension = splitext(resource.file.name)

    if resource.type == "video":
        import urlparse
        url_data = urlparse.urlparse(resource.url)

        domain = url_data.hostname
        hostname = domain.split(".")[:-1]

        if "youtube" in hostname:
            query = urlparse.parse_qs(url_data.query)
            video = query["v"][0]
            resource.video_tag = video
            resource.provider = "youtube"

        elif "vimeo" in hostname:
            resource.video_tag = url_data.path.split('/')[1]
            resource.provider = "vimeo"

    userResourceCount = Resource.objects.filter(user=resource.user).count()

    # Increment page views (always remains -1 based on current view)
    Resource.objects.filter(id=resource_id).update(views=resource.views+1)

    context = {
        'resource': resource, 'title': resource.title + " &lsaquo; OpenCurriculum",
        'related': related, "user_resource_count": userResourceCount
    }
    return render(request, 'resource.html', context)


def _filesizeFormat(size):
    return '{0:.2f}'.format(float(size))


def download(request, resource_id):
    resource = Resource.objects.get(pk=resource_id)

    import magic
    mime = magic.Magic(mime=True)
    content_type = mime.from_file(resource.file.path)
    # TODO: Security risk. Check file name for safeness
    response = HttpResponse(resource.file, content_type)
    response['Content-Disposition'] = 'attachment; filename="' + resource.file.name + '"'
    return response


def upload_page(request):
    """Renders the upload page, with user and project objects in context."""

    context = {
        "user": request.user,
        "project": {"id": "7"}      # TODO
    }

    return render(request, 'upload.html', context)


def fp_upload(request):
    """Adds data from POST request at api/fpUpload/ to database.

    Parameters:
        Request containing user_id, project_id, and list of key-title pairs.

    Returns:
        Response containing JSON with ResourceID-title pairs.
    """
    import urllib2
    import os

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
    failure_list = []

    from oer.models import Resource

    for (key, title) in file_list:
        try:
            # For each file, download it to local.
            # Create Resource objects for each file uploaded.
            # And generate the list for the response.
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

        except Exception:
            # Delete this file from S3, and add it to the failure list
            from boto.s3.connection import S3Connection
            from boto.s3.bucket import Bucket
            from boto.s3.key import Key
            conn = S3Connection(settings.AWS_ACCESS_KEY, settings.AWS_SECRET_KEY)
            b = Bucket(conn, settings.S3_BUCKET_NAME)
            k = Key(b)
            k.key = key
            b.delete_key(k)
            failure_list.append(title)

    if len(failure_list) > 0:
        response_dict['failures'] = failure_list
    return HttpResponse(json.dumps(
        response_dict), 200, content_type="application/json")


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

    try:
        for id in post_data:
            resource = Resource.objects.get(pk=id)
            # If the title has changed, persist it
            if (resource.id != post_data[id]):
                resource.title = post_data[id]
                resource.save()
    except:
        # TODO: Django message thingy
        k = True
        k = not k

    from projects.views import project_home
    from projects.models import Project
    slug = Project.objects.get(pk=project_id).slug
    return redirect(project_home(request, slug))


def file_upload(request):
    return HttpResponse(json.dumps(
        {'400': 'cool_filename.jpg'}), 200, content_type="application/json")


def article_center_registration(request):
    return render(request, 'article-center-registration.html', {})
