from django.http import HttpResponse, Http404
from django.shortcuts import render, redirect
from django.utils.translation import ugettext as _
from django.conf import settings
from django.core.exceptions import PermissionDenied
from oer.models import Resource, Collection
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
            if filesize >= 1048576:
                resource.filesize = str(
                    _filesizeFormat(float(filesize) / 1048576)) + " MB"
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
            'current_path': 'http://' + request.get_host() + request.get_full_path(),  # request.get_host()
            'thumbnail': 'http://' + request.get_host() + settings.MEDIA_URL + resource.image.name
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


def _prepare_add_resource_context(request):
    username = request.GET.get('user', None)
    project_slug = request.GET.get('project', None)
    collection_slug = request.GET.get('collection', None)

    if collection_slug:
        collection = Collection.objects.get(slug=collection_slug)
        
    # Check if the project exists and if the user is allowed to submit anything
    #     project_slug the project
    if project_slug:
        from projects.models import Project
        project = Project.objects.get(slug=project_slug)
        if request.user not in project.members.all():
            raise PermissionDenied
        user = request.user
        if not collection_slug:
            from projects.models import Project
            project = Project.objects.get(slug=project_slug)
            collection = Collection.objects.get(pk=project.collection.id)
    elif username:
        from django.contrib.auth.models import User
        user = User.objects.get(username=username)
        if request.user != user:
            raise PermissionDenied
        if not collection_slug:
            collection = user.get_profile().collection
    else:
        project = None
        user = request.user
        if not collection_slug:
            collection = user.get_profile().collection

    # Get all licenses
    from license.models import License
    licenses = License.objects.all()

    title_extension = ''
    if project:
        title_extension = ' &lsaquo; ' + project.title

    return {
        'project': project,
        'user': user,
        'collection': collection,
        'licenses': licenses,
        'title_extension': title_extension
    }


def add_video(request):
    resource_context = _prepare_add_resource_context(request)

    context = dict({
        'title': _(settings.STRINGS['resources']['ADD_VIDEO_TITLE']) + resource_context['title_extension']
    }.items() + resource_context.items())

    return render(request, 'add-video.html', context)


def add_url(request):
    resource_context = _prepare_add_resource_context(request)

    context = dict({
        'title': _(settings.STRINGS['resources']['ADD_URL_TITLE']) + resource_context['title_extension']
    }.items() + resource_context.items())

    return render(request, 'add-url.html', context)


def new_document(request):
    resource_context = _prepare_add_resource_context(request)

    context = dict({
        'title': _(settings.STRINGS['resources']['NEW_DOCUMENT_TITLE']) + resource_context['title_extension']
    }.items() + resource_context.items())

    return render(request, 'editor.html', context)


def upload_page(request):
    """Renders the upload page, with user and project objects in context."""
    if not request.user.is_authenticated():
        return redirect('/?login=true&source=%s' % request.path)

    resource_context = _prepare_add_resource_context(request)

    context = dict({
        'title': _(settings.STRINGS['resources']['UPLOAD_TITLE']) + resource_context['title_extension']
    }.items() + resource_context.items())

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
        Request containing list of ResourceID-title pairs.

    Returns:
        Redirect to project slug.
    """
    if request.method == "POST":
        ###########################################################
        # First, handle all the manually uploaded files

        # Build a mapping from original file names to new file names
        file_names = {}
        for new_name, original_file in request.FILES.items():
            file_names[new_name] = original_file.name

        # Change file-naming to follow form-0-file format
        modified_request_files = request.FILES.copy()

        file_counter = 0
        for key, value in modified_request_files.items():
            modified_request_files['form-' + str(file_counter) + '-file'] = value
            del modified_request_files[key]
            file_counter += 1

        # Add management form data to process as a formset factory object
        modified_post_request = request.POST.copy()

        modified_post_request.setdefault('form-TOTAL_FORMS', unicode(file_counter))
        modified_post_request.setdefault('form-INITIAL_FORMS', u'0')
        modified_post_request.setdefault('form-NUM_FORMS', u'')

        from django.forms.formsets import formset_factory
        from forms import UploadResource
        UploadResourceSet = formset_factory(UploadResource)

        resource_formset = UploadResourceSet(modified_post_request, modified_request_files)

        (user, collection) = _get_user_collection(request)

        if resource_formset.is_valid():
            for file_name, original_file in request.FILES.items():
                create_resource(original_file, user, collection, file_name)

        ###########################################################
        # Now, handle name changes for pre-uploaded files

        from oer.models import Resource
        post_data = request.POST.copy()
        project_id = post_data['project_id']
        user_id = post_data['user_id']
        collection_id = post_data['collection_id']

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

        return redirect_to_collection(user_id, project_id, collection_id)            

    else:
        return Http404


def _get_user_collection(request):
    user_id = request.POST.get('user_id', None)
    project_id = request.POST.get('project_id', None)
    collection_id = request.POST.get('collection_id', None)

    from django.contrib.auth.models import User
    user = User.objects.get(pk=int(user_id))

    if project_id:
        if collection_id:
            collection = Collection.objects.get(pk=collection_id)
        else:
            from projects.models import Project
            project = Project.objects.get(collection=collection_id)
            collection = Collection.objects.get(pk=project.collection.id)
    else:
        from user_account.models import UserProfile
        collection = UserProfile.objects.get(
            user=request.user).collection

    return (user, collection)


def create_resource(uploaded_file, user, collection, new_filename=None):
    default_cost = 0

    # Create a new resource
    new_resource = Resource(
        title=new_filename if new_filename else uploaded_file.name,
        cost=default_cost,
        user=user,
        file=uploaded_file,
        type='attachment',
        body_markdown=''
    )

    new_resource.save()

    # Now add this resource to the collection it belongs to
    collection.resources.add(new_resource)
    collection.save()

    return new_resource


def create_video(request):
    from oer import forms
    new_video = forms.NewVideoForm(request.POST, request.user)
    video = new_video.save()

    project_id = request.POST.get('project_id')
    user_id = request.POST.get('user_id')
    collection_id = request.POST.get('collection_id')

    # Add to the necessary collection.
    add_resource_to_collection(video, collection_id)

    return redirect_to_collection(user_id, project_id, collection_id)


def create_url(request):
    from oer import forms
    new_url = forms.NewURLForm(request.POST, request.user)
    url = new_url.save()

    project_id = request.POST.get('project_id')
    user_id = request.POST.get('user_id')
    collection_id = request.POST.get('collection_id')

    # Add to the necessary collection.
    add_resource_to_collection(url, collection_id)

    return redirect_to_collection(user_id, project_id, collection_id)


def add_resource_to_collection(resource, collection_id):
    from oer.models import Collection
    collection = Collection.objects.get(pk=int(collection_id))
    collection.resources.add(resource)
    collection.save()


def redirect_to_collection(user_id, project_id=None, collection_id=None):
    if collection_id:
        from oer.models import Collection
        collection = Collection.objects.get(pk=int(collection_id))

    if project_id:
        from projects.models import Project
        project_slug = Project.objects.get(pk=int(project_id)).slug
        if collection:
            return redirect('projects:list_collection', project_slug=project_slug, collection_slug=collection.slug)
        else:
            return redirect('projects:project_browse', project_slug=project_slug)
    else:
        from django.contrib.auth.models import User
        username = User.objects.get(pk=int(user_id)).username 
        if collection:
            return redirect('user:list_collection', username=username, collection_slug=collection.slug)
        else:            
            return redirect('user:user_profile', username=username)


def delete_resource(request, resource_id):
    try:
        resource = Resource.objects.get(pk=resource_id)
        
        if request.user != resource.user:
            return HttpResponse(json.dumps(
                {'status': 'false'}), 403, content_type="application/json")
        
        resource.delete()
        return HttpResponse(json.dumps(
            {'status': 'true'}), 200, content_type="application/json")
    except:
        return HttpResponse(json.dumps(
            {'status': 'false'}), 401, content_type="application/json")


def new_project_collection(request, project_slug):
    collection_slug = request.POST.get('parent_collection')
    collection = Collection.objects.get(slug=collection_slug)

    from projects.models import Project
    project = Project.objects.get(slug=project_slug)

    new_collection = Collection()
    new_collection.title = request.POST.get('new_collection_name')

    from django.contrib.contenttypes.models import ContentType
    collection_content_type = ContentType.objects.get_for_model(Collection)

    new_collection.host = collection
    new_collection.visibility = request.POST.get('collection_visibility')
    new_collection.slug = _get_fresh_collection_slug(
        request.POST.get('new_collection_name'), collection, collection_content_type)
    new_collection.save()

    # TODO(Varun):Set Django message on creation of collection

    if project.collection == collection:
        return redirect(
            'projects:project_browse',
            project_slug=project.slug,
        )
    else:
        return redirect(
            'projects:list_collection',
            project_slug=project.slug,
            collection_slug=collection.slug
        )


def new_user_collection(request, username):
    from oer.models import Collection

    collection_slug = request.POST.get('parent_collection')
    collection = Collection.objects.get(slug=collection_slug)

    from django.contrib.auth.models import User
    user = User.objects.get(username=username)

    new_collection = Collection()
    new_collection.title = request.POST.get('new_collection_name')

    from django.contrib.contenttypes.models import ContentType
    collection_content_type = ContentType.objects.get_for_model(Collection)

    new_collection.host = collection
    new_collection.visibility = request.POST.get('collection_visibility')
    new_collection.slug = _get_fresh_collection_slug(
        request.POST.get('new_collection_name'), collection, collection_content_type)
    new_collection.save()

    # TODO(Varun):Set Django message on creation of collection

    if user.get_profile().collection == collection:
        return redirect(
            'user:user_profile',
            username=username,
        )
    else:
        return redirect(
            'user:list_collection',
            username=username,
            collection_slug=collection.slug
        )


def _get_fresh_collection_slug(title, collection, content_type):
    from django.template.defaultfilters import slugify
    slug = slugify(title)

    # Check if this slug has already been taken by another project
    collections_with_slug = Collection.objects.filter(
        slug=slug, host_id=collection.id, host_type=content_type
    )
    num_projects_with_slug = collections_with_slug.count()
    if num_projects_with_slug != 0:
        slug = _apply_additional_collection_slug(slug, 1, collection, content_type)

    return slug


def _apply_additional_collection_slug(slug, depth, collection, content_type):
    attempted_slug = slug + "-" + str(depth)
    collections = Collection.objects.filter(
        slug=slug + "-" + str(depth),
        host_id=collection.id,
        host_type=content_type
    )
    if collections.count() == 0:
        return attempted_slug
    else:
        return _apply_additional_collection_slug(slug, depth + 1, collection, content_type)


def file_upload(request):
    if request.method == "POST":
        from forms import UploadResource
        form = UploadResource(request.POST, request.FILES)

        (user, collection) = _get_user_collection(request)

        if form.is_valid():
            # Get the Project ID / User ID & Collection name from the URL / form

            new_resource = create_resource(request.FILES['file'], user, collection)

        return HttpResponse(json.dumps(
            {
                new_resource.id: new_resource.file.name
            }
        ), 200, content_type="application/json")
    else:
        return HttpResponse(json.dumps(
            {'status': 'false'}), 401, content_type="application/json")


def article_center_registration(request):
    return render(request, 'article-center-registration.html', {})
