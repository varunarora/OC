from django.http import HttpResponse, Http404
from django.shortcuts import render, redirect
from oer.models import Resource
from django.core.files import File
import json


def resource_center(request):
    # TODO(Varun): Build out the OER center
    return HttpResponse("Page under construction")


def view_resource(request, resource_id):
    """Builds a resource view page from its unique ID.

    Args:
        request: The HTTP request object, as passed by django.
        resource_id: The unique key of the resource.

    Returns:
        The HttpResponse resource page after preparing objects.

    Raises:
        ObjectDoesNotExist: Error when resource cannot be found in the database.
    """
    from django.core.exceptions import ObjectDoesNotExist
    try:
        # Fetch the resource from its ID using the QuerySet API.
        resource = Resource.objects.get(pk=resource_id)
        # TODO(Varun): Change this to actually get the top 5 best resources.
        related = Resource.objects.all()[:5]

        # If this resource is a URL, fetch its page by making Http requests
        #     using BeautifulSoup, and find meta tags in the DOM.
        if resource.type == "url":
            from BeautifulSoup import BeautifulSoup
            from urllib import urlopen

            try:
                # Open the resource and build its DOM into a BeautifulSoup
                #     object.
                source = urlopen(resource.url)
                soup = BeautifulSoup(source)

                # Extract the page title, and the description from its meta
                #     tags in <head>
                resource.url_title = soup.find('title').text
                description = soup.findAll(
                    'meta', attrs={'name': "description"}
                )[0]

                # If a description was found, set it on the resource.
                if description:
                    resource.body = description['content']
            except:
                pass

        # If the resource is a kind of attachment, format its metadata.
        if resource.type == "attachment":
            #TODO: Replace with |filesizeformat template tag
            filesize = resource.file.size
            if filesize >= 104856:
                resource.filesize = str(
                    _filesizeFormat(float(filesize) / 104856)) + " MB"
            elif filesize >= 1024:
                resource.filesize = str(
                    _filesizeFormat(float(filesize) / 1024)) + " KB"
            else:
                resource.filesize = str(
                    _filesizeFormat(float(filesize))) + " B"

            # Determine the extension of the attachment.
            from os.path import splitext
            name, resource.extension = splitext(resource.file.name)

        # If the resource is a video, determine whether or not it is a YouTube
        #     Vimeo video, and obtain the video ID (as determined by the
        #     service provider), so that it can be plugged into its player.
        if resource.type == "video":
            import urlparse
            url_data = urlparse.urlparse(resource.url)

            # Figure out the entire domain the specific hostname (eg. "vimeo")
            domain = url_data.hostname
            hostname = domain.split(".")[:-1]

            # In either case, use an appropriate pattern matching to obtain the
            #     video #.
            if "youtube" in hostname:
                query = urlparse.parse_qs(url_data.query)
                video = query["v"][0]
                resource.video_tag = video
                resource.provider = "youtube"

            elif "vimeo" in hostname:
                resource.video_tag = url_data.path.split('/')[1]
                resource.provider = "vimeo"

        # Fetch the number of resources that have been uploaded by the user who
        #     has created this resource.
        userResourceCount = Resource.objects.filter(user=resource.user).count()

        # Increment page views (always remains -1 based on current view).
        Resource.objects.filter(id=resource_id).update(views=resource.views+1)

        context = {
            'resource': resource,
            'title': resource.title + " &lsaquo; OpenCurriculum",
            'related': related, "user_resource_count": userResourceCount,
            'current_path': 'http://' + 'www.theopencurriculum.org' + request.get_full_path(),  # request.get_host()
            'thumbnail': 'http://' + 'www.theopencurriculum.org' + '/static/images/oer-thumbnails/' + str(resource.id) + '-thumb.jpg'
        }
        return render(request, 'resource.html', context)
    except ObjectDoesNotExist:
        raise Http404


def _filesizeFormat(size):
    return '{0:.2f}'.format(float(size))


def download(request, resource_id):
    """Push a download of an attachment resource, based on its ID

    Args:
        request: The HTTP request object, as passed by django.
        resource_id: The unique key of the resource that needs to be pushed for
            download.

    Returns:
        An HttpResponse file object using the Apache 'Content-Disposition'
            setting.
    """
    # TODO(Varun): Need to check whether the resource is of type "attachment"
    resource = Resource.objects.get(pk=resource_id)

    import magic
    mime = magic.Magic(mime=True)
    content_type = mime.from_file(resource.file.path)

    # TODO(Varun): Security risk. Check file name for safeness
    response = HttpResponse(resource.file, content_type)
    response['Content-Disposition'] = (
        'attachment; filename="%s"' % resource.file.name)
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
    import pdb
    pdb.set_trace()
    if request.method == "POST":
        from forms import UploadResource
        form = UploadResource(request.POST, request.FILES)

        if form.is_valid():
            # Get the Project ID / User ID & Collection name from the URL / form
            import pdb
            pdb.set_trace()

            return HttpResponse(json.dumps(
                {'400': 'cool_filename.jpg'}), 200, content_type="application/json")
            resource_owner = ''

            # Create a new resource
            from django.core.files.base import ContentFile
            resource = ContentFile(request.FILES['field_name'].read())  # write_pic(request.FILES['new_profile_picture'])

            new_resource = Resource()
            new_resource.title = title
            new_resource.cost = default_cost
            new_resource.user_id = user_id
            new_resource.file = resource
            new_resource.save()

        return HttpResponse(json.dumps(
            {'400': 'cool_filename.jpg'}), 200, content_type="application/json")
    else:
        return HttpResponse(json.dumps(
            {'status': 'false'}), 401, content_type="application/json")


def article_center_registration(request):
    return render(request, 'article-center-registration.html', {})
