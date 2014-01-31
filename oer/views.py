from django.http import HttpResponse, Http404
from django.shortcuts import render, redirect
from django.core.urlresolvers import reverse
from django.utils.translation import ugettext as _
from django.conf import settings
from django.core.exceptions import PermissionDenied
from oer.models import Resource, ResourceRevision, Collection, Document, Element, DocumentElement, Link, Attachment
from django.core.files import File
from oc_platform import APIUtilities
import json


def resource_center(request):
    # TODO(Varun): Build out the OER center
    return HttpResponse("Page under construction")


def view_resource_by_id(request, resource_id):
    from django.core.exceptions import ObjectDoesNotExist

    try:
        resource = Resource.objects.get(pk=resource_id)
        return redirect('read',
            resource_id=resource_id,
            resource_slug=resource.slug
        )
    except ObjectDoesNotExist:
        raise Http404


def view_resource(request, resource_id, resource_slug):
    """Builds a resource view page from its unique ID.

    Args:
        request: The HTTP request object, as passed by django.
        resource_id: The unique key of the resource.
        resource_id: The human readable and browser-URL friendly resource title.

    Returns:
        The HttpResponse resource page after preparing objects.

    Raises:
        ObjectDoesNotExist: Error when resource cannot be found in the database.
    """
    from django.core.exceptions import ObjectDoesNotExist

    try:
        # Fetch the resource from its ID using the QuerySet API.
        resource = Resource.objects.get(pk=resource_id)

        revision = None
        revision_id = request.GET.get('revision', None)

        if revision_id:
            try:
                revision = ResourceRevision.objects.get(pk=revision_id)
                resource.revision = revision
            except ObjectDoesNotExist:
                pass

        # TODO(Varun): Change this to actually get the top 5 best resources.
        related = Resource.objects.all()[:5]

        from django.contrib.contenttypes.models import ContentType
        resource_ct = ContentType.objects.get_for_model(Resource)
        
        from interactions.models import Comment
        comments_ct = ContentType.objects.get_for_model(Comment)

        document_content_type = ContentType.objects.get_for_model(Document)
        document_element_content_type = ContentType.objects.get_for_model(DocumentElement)

        link_content_type = ContentType.objects.get_for_model(Link)
        attachment_content_type = ContentType.objects.get_for_model(Attachment)

        if resource.revision.content_type == document_content_type:
            resource.data = build_document_view(resource.revision.content_id)
            resource_type = "document"

        elif resource.revision.content_type == link_content_type:
            import urlparse
            (hostname, url_data) = get_url_hostname(resource.revision.content.url)

            # If the resource is a video, determine whether or not it is a YouTube
            #     Vimeo video, and obtain the video ID (as determined by the
            #     service provider), so that it can be plugged into its player.

            # In either case, use an appropriate pattern matching to obtain the
            #     video #.
            resource_type = "video"
            if "youtube" in hostname:
                query = urlparse.parse_qs(url_data.query)
                video = query["v"][0]
                resource.video_tag = video
                resource.provider = "youtube"

            elif "vimeo" in hostname:
                resource.video_tag = url_data.path.split('/')[1]
                resource.provider = "vimeo"

            else:
                resource_type = "url"

        # If the resource is a kind of attachment, format its metadata.
        elif resource.revision.content_type == attachment_content_type:
            #TODO: Replace with |filesizeformat template tag
            filesize = resource.revision.content.file.size
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
            name, resource.extension = splitext(resource.revision.content.file.name)

            resource_type = "attachment"

        # Fetch the number of resources that have been uploaded by the user who
        #     has created this resource.
        user_resource_count = None
        if resource.revision.user:
            user_resource_count = resource.revision.user.get_profile().collection.resources.count()

        # Increment page views (always remains -1 based on current view).
        Resource.objects.filter(id=resource_id).update(views=resource.views+1)

        from django.core.exceptions import MultipleObjectsReturned
        # Build breadcrumb for the resource
        try:
            collection = Collection.objects.get(resources__id=resource.id)
        except MultipleObjectsReturned:
            # Try getting the meta referrer
            referrer = request.META.get('HTTP_REFERER');

            if referrer:
                import urlparse
                url_data = urlparse.urlparse(referrer)
                domain = url_data.hostname
                hostname = domain.split(".")[-1]

                # If the link is being referred from within the site.
                if request.META.get('SERVER_NAME').split(".")[-1] == hostname:
                    from django.core.urlresolvers import resolve
                    match = resolve(urlparse.urlparse(referrer)[2])

                    # If the referrer is a project, find the collection in the
                    # project collections
                    import oer.CollectionUtilities as cu

                    if match.namespace == 'projects' and match.url_name == 'project_browse':
                        from projects.models import Project
                        project = Project.objects.get(slug=match.kwargs['project_slug'])

                        (browse_tree, flattened_tree) = cu._get_collections_browse_tree(project.collection)

                        collection = project.collection

                    elif match.namespace == 'projects' and match.url_name == 'list_collection':
                        from projects.models import Project
                        project = Project.objects.get(slug=match.kwargs['project_slug'])

                        (browse_tree, flattened_tree) = cu._get_collections_browse_tree(project.collection)

                        collection = next(
                            tree_item for tree_item in flattened_tree if match.kwargs['collection_slug'] == tree_item.slug)

                    # If the referrer is a user, find the collection in the
                    # user collections
                    elif match.url_name == 'user_profile':
                        from user_account.models import UserProfile
                        user_profile = UserProfile.objects.get(user__username=match.kwargs['username'])
                        (browse_tree, flattened_tree) = cu._get_collections_browse_tree(user_profile.collection)

                        # Match based on first found resource in all of user profile tree.
                        collection = user_profile.collection

                    elif match.url_name == 'list_collection':
                        from user_account.models import UserProfile
                        user_profile = UserProfile.objects.get(user__username=match.kwargs['username'])
                        (browse_tree, flattened_tree) = cu._get_collections_browse_tree(user_profile.collection)

                        collection = next(
                            tree_item for tree_item in flattened_tree if match.kwargs['collection_slug'] == tree_item.slug)

                    else:
                        # Return the first collection.
                        collection = Collection.objects.filter(
                            resources__id=resource.id)[0]
                else:
                    # Else, return the first one.
                    collection = Collection.objects.filter(
                        resources__id=resource.id)[0]
            else:
                # Else, return the first one.
                collection = Collection.objects.filter(
                    resources__id=resource.id)[0]

        breadcrumb = build_collection_breadcrumb(collection)

        context = {
            'resource': resource,
            'resource_type': resource_type,
            'host_content_type': resource_ct,
            'comments_content_type': comments_ct,
            'document_element_content_type': document_element_content_type,
            'title': resource.title + " &lsaquo; OpenCurriculum",
            'revision_view': resource.revision == revision,
            'breadcrumb': breadcrumb,
            'resource_collection': collection,
            'related': related, "user_resource_count": user_resource_count,
            'current_path': 'http://' + request.get_host() + request.get_full_path(),  # request.get_host()
            'thumbnail': 'http://' + request.get_host() + settings.MEDIA_URL + resource.image.name
        }
        return render(request, 'resource.html', context)

    except ObjectDoesNotExist:
        raise Http404


def get_url_hostname(url):
    import urlparse
    url_data = urlparse.urlparse(url)

    # Figure out the entire domain the specific hostname (eg. "vimeo")
    domain = url_data.hostname

    return (domain.split(".")[:-1], url_data)


def build_document_view(document_id):
    document = Document.objects.get(pk=document_id)
    return DocumentElement.objects.filter(
        document=document).order_by('position')


def build_collection_breadcrumb(collection):
    # Get the root of this collection ('project' or 'user profile')
    import oer.CollectionUtilities as cu 
    (collection_root_type, collection_root) = cu.get_collection_root(collection)

    # Create breadcrumb list
    breadcrumb = []

    while True:
        if collection.host_type.name == 'collection':
            breadcrumb.append(host_urlize(
                collection, collection_root, collection_root_type))
            collection = collection.host
        else:
            breadcrumb.append(host_urlize(
                collection.host, collection_root, collection_root_type))
            break

    if collection_root_type.name == 'user profile':
        breadcrumb[-1].title = breadcrumb[-1].user.get_full_name() + '\'s profile'

    # Reverse breadcrumb and return
    breadcrumb.reverse()

    return breadcrumb


def host_urlize(host, collection_root, collection_root_type):
    if collection_root_type.name == 'user profile':
        # If this collection is a descendant of the user
        user = collection_root.user

        if host == collection_root:
            host.url = reverse(
                'user:user_profile', kwargs={
                    'username': user.username
                }
            )
        else:
            host.url = reverse(
                'user:list_collection', kwargs={
                    'username': user.username,
                    'collection_slug': host.slug
                }
            )

    elif collection_root_type.name == 'project':
        # If this collection is a descendant of a project
        project = collection_root

        if host == collection_root:
            host.url = reverse(
                'projects:project_home', kwargs={
                    'project_slug': project.slug
                }
            )
        else:
            host.url = reverse(
                'projects:list_collection', kwargs={
                    'project_slug': project.slug,
                    'collection_slug': host.slug
                }
            )            

    return host


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
    content_type = mime.from_file(resource.revision.content.file.path)

    # TODO(Varun): Security risk. Check file name for safeness
    response = HttpResponse(resource.revision.content.file, content_type)
    response['Content-Disposition'] = (
        'attachment; filename="%s"' % resource.revision.content.file.name)
    return response


def _prepare_add_resource_context(request):
    username = request.GET.get('user', None)
    project_slug = request.GET.get('project', None)
    collection_slug = request.GET.get('collection', None)

    import oer.CollectionUtilities as cu
    collection = None

    # Check if the project exists and if the user is allowed to submit anything
    #     project_slug the project
    if project_slug:
        from projects.models import Project
        project = Project.objects.get(slug=project_slug)
        if request.user not in project.members.all():
            raise PermissionDenied
        user = request.user
        host = 'project'

        if collection_slug:
            (browse_tree, flattened_tree) = cu._get_collections_browse_tree(project.collection)
            collection = next(
                tree_item for tree_item in flattened_tree if tree_item.slug == collection_slug)

    else:
        project = None
        host = 'user profile'

        if username:
            from django.contrib.auth.models import User
            user = User.objects.get(username=username)
            if request.user != user:
                raise PermissionDenied
        else:
            user = request.user

        if collection_slug:
            (browse_tree, flattened_tree) = cu._get_collections_browse_tree(
                user.get_profile().collection)
            collection = next(
                tree_item for tree_item in flattened_tree if tree_item.slug == collection_slug)

    # Get all licenses
    from license.models import License
    licenses = License.objects.all()

    title_extension = ''
    if project:
        title_extension = ' &lsaquo; ' + project.title

    return {
        'project': project,
        'user': user,
        'host': host,
        'collection': collection,
        'licenses': licenses,
        'title_extension': title_extension,
        'act': 'add'
    }


def build_return_resource_form_context(request, form, form_context):
    # Preserve field inputs from previous form submission.
    form_fields_to_return = [
        'title', 'url', 'visibility', 'body_markdown', 'tags', 'license',
        'project_id', 'collection_id', 'type', 'user', 'cost'
    ]

    import oc_platform.FormUtilities as fu
    form_context['original'] = fu._get_original_form_values(request, form_fields_to_return)

    # Clean for tags
    # HACK(Varun): The fu function returns a string if not a list
    try:
        from oc_platform.ModelUtilities import DummyM2M
        original_tags = form_context['original']['tags']
        if isinstance(original_tags, basestring):
            form_context['original']['tags'] = DummyM2M([original_tags])
        else:
            form_context['original']['tags'] = DummyM2M(original_tags)
    except:
        pass

    form_context['form'] = form


def add_video(request, submission_context=None):
    if not request.user.is_authenticated():
        return redirect('/?login=true&source=%s' % request.path)

    resource_context = _prepare_add_resource_context(request)

    form_context = {}
    if request.method == 'POST':
        user_id = request.POST.get('user', None)
        project_id = request.POST.get('project', None)
        collection_id = request.POST.get('collection', None)

        from oer import forms
        new_video = forms.NewVideoForm(request.POST, request.user)

        if new_video.is_valid():
            url = new_video.save()

            # Assign this URL to the revision created.
            url.revision.resource = url
            url.revision.save()

            # Add to the necessary collection.
            collection = get_collection(user_id, project_id, collection_id)

            # Add to the necessary collection.
            add_resource_to_collection(url, collection)

            return redirect_to_collection(user_id, project_id, collection_id)
        else:
            build_return_resource_form_context(request, new_video, form_context)

    context = dict({
        'title': _(settings.STRINGS['resources']['ADD_VIDEO_TITLE']) + resource_context['title_extension']
    }.items() + resource_context.items() + form_context.items())

    return render(request, 'add-video.html', context)


def add_url(request):
    if not request.user.is_authenticated():
        return redirect('/?login=true&source=%s' % request.path)

    resource_context = _prepare_add_resource_context(request)
    
    form_context = {}
    if request.method == 'POST':
        user_id = request.POST.get('user', None)
        project_id = request.POST.get('project', None)
        collection_id = request.POST.get('collection', None)

        from oer import forms
        new_url = forms.NewURLForm(request.POST, request.user)

        if new_url.is_valid():
            url = new_url.save()

            # Assign this URL to the revision created.
            url.revision.resource = url
            url.revision.save()

            # Add to the necessary collection.
            collection = get_collection(user_id, project_id, collection_id)

            # Add to the necessary collection.
            add_resource_to_collection(url, collection)

            return redirect_to_collection(user_id, project_id, collection_id)
        else:
            build_return_resource_form_context(request, new_url, form_context)

    context = dict({
        'title': _(settings.STRINGS['resources']['ADD_URL_TITLE']) + resource_context['title_extension']
    }.items() + resource_context.items() + form_context.items())

    return render(request, 'add-url.html', context)


def new_document(request):
    if not request.user.is_authenticated():
        return redirect('/?login=true&source=%s' % request.path)

    resource_context = _prepare_add_resource_context(request)

    form_context = {}
    if request.method == 'POST':
        user_id = request.POST.get('user', None)
        project_id = request.POST.get('project', None)
        collection_id = request.POST.get('collection', None)

        from oer import forms
        new_document = forms.NewDocumentForm(request.POST, request.user)

        if new_document.is_valid():
            document_resource = new_document.save()

            # Assign this document to the revision created.
            document_resource.revision.resource = document_resource
            document_resource.revision.save()

            create_document_elements(request.POST, document_resource)

            # Add to the necessary collection.
            collection = get_collection(user_id, project_id, collection_id)

            # Add to the necessary collection.
            add_resource_to_collection(document_resource, collection)

            return redirect_to_collection(user_id, project_id, collection_id)
        else:
            build_return_resource_form_context(request, new_document, form_context)

    context = dict({
        'title': _(settings.STRINGS['resources']['NEW_DOCUMENT_TITLE']) + resource_context['title_extension']
    }.items() + resource_context.items() + form_context.items())

    return render(request, 'document.html', context)


def create_document_elements(post_request, document_resource):
    # Unserialize the DocumentElement objects.
    serialized_document_elements = post_request.get('serialized-document-body');
    document_elements = json.loads(serialized_document_elements)

    for counter, element in enumerate(document_elements):
        # Create a new document element.
        new_document_element = DocumentElement()

        new_document_element.document = document_resource.revision.content
        
        new_element = Element(body=element)
        new_element.save()
        new_document_element.element = new_element

        # Add the document element based on its position to the Document.
        new_document_element.position = counter

        new_document_element.save()


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
    # Make a copy of the request.POST object, extract user and project IDs
    # And remove them from the copy.
    post_data = request.POST.copy()

    user_id = post_data['user']
    project_id = post_data.get('project', None)
    collection_id = post_data.get('collection', None)

    try:
        from django.contrib.auth.models import User
        user = User.objects.get(pk=int(user_id))
    except:
        return APIUtilities._api_failure()

    # Clear the meta data so that the request's POST object can be
    # deserialized as individual uploads. 
    del post_data['user']

    if project_id:
        del post_data['project']
    if collection_id:
        del post_data['collection']

    collection = get_collection(user_id, project_id, collection_id)

    # Fetch keys and filenames from post_data, and build a list of
    # (url, title) tuples.
    file_list = []

    for key_unicode in post_data:
        key = str(key_unicode)             # Unicode by default.
        title = str(post_data[key])
        file_list.append((key, title))     # Two parens because tuple.

    response = {}
    failure_list = []

    for (key, title) in file_list:
        try:
            # Create Resource objects for each file uploaded.
            # And generate the list for the response.
            file_path = settings.FILEPICKER_ROOT + key

            # Set readable permissions for the file just uploaded through Fp.
            import os
            import stat
            st = os.stat(file_path)
            os.chmod(file_path, st.st_mode | stat.S_IREAD)

            static_file = open(file_path)

            new_resource = create_resource(
                File(static_file), user, collection, title)

            response[new_resource.id] = new_resource.title
            static_file.close()

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

            from django.core.mail import mail_admins
            mail_admins('Filepicker S3 mounting failed', (
                'Apologize to ' + str(user.id) + ": " + user.get_full_name()))

            failure_list.append(title)

    if len(failure_list) > 0:
        response['failures'] = failure_list

    return HttpResponse(json.dumps(
        response), 200, content_type="application/json")


def file_upload_submit(request):
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
        user_id = request.POST.get('user', None)
        project_id = request.POST.get('project', None)
        collection_id = request.POST.get('collection', None)

        try:
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

            collection = get_collection(user_id, project_id, collection_id)

            if resource_formset.is_valid():
                for file_name, original_file in request.FILES.items():
                    create_resource(original_file, request.user, collection, file_name)

            ###########################################################
            # Now, handle name changes for pre-uploaded files

            from oer.models import Resource
            post_data = request.POST.copy()

            del post_data["csrfmiddlewaretoken"]
            del post_data['user']
            if project_id:
                del post_data['project']
            if collection_id:
                del post_data['collection']

            try:
                for id in post_data:
                    resource = Resource.objects.get(pk=id)
                    # If the title has changed, persist it
                    if (resource.id != post_data[id]):
                        resource.title = post_data[id]
                        resource.save()
            except:
                # TODO(Sri): Django message thingy
                k = True
                k = not k

        except:
            from django.contrib import messages
            messages.error(request, 'Files were unable to be uploaded. Please try again.')
        
        return redirect_to_collection(user_id, project_id, collection_id)

    else:
        return Http404


def create_resource(uploaded_file, user, collection, new_filename=None):
    DEFAULT_COST = 0

    title = new_filename if new_filename else uploaded_file.name

    from django.template.defaultfilters import slugify

    # Create a new resource
    new_resource = Resource(
        title=title,
        cost=DEFAULT_COST,
        user=user,
        slug=slugify(title),
        # TODO(Varun): Build a setting to choose visibility.
        visibility='public',
        description=''
    )

    new_attachment = Attachment()
    new_attachment.file = uploaded_file
    new_attachment.save()

    new_resource_revision = ResourceRevision()
    new_resource_revision.content = new_attachment
    new_resource_revision.user = user
    new_resource_revision.save()

    new_resource.revision = new_resource_revision
    new_resource.save()

    # Assign this resource to the revision created.
    new_resource.revision.resource = new_resource
    new_resource.revision.save()

    # Now add this resource to the collection it belongs to
    collection.resources.add(new_resource)
    collection.save()

    return new_resource


def add_resource_to_collection(resource, collection):
    collection.resources.add(resource)
    collection.save()


def get_collection(user_id, project_id, collection_id):
    if collection_id:
        from oer.models import Collection
        return Collection.objects.get(pk=int(collection_id))

    if project_id:
        from projects.models import Project
        project = Project.objects.get(pk=int(project_id))
        return project.collection

    else:
        from django.contrib.auth.models import User
        user = User.objects.get(pk=int(user_id))
        return user.get_profile().collection


def redirect_to_collection(user_id, project_id=None, collection_id=None):
    if collection_id:
        collection = Collection.objects.get(pk=int(collection_id))

    if project_id:
        from projects.models import Project
        project_slug = Project.objects.get(pk=int(project_id)).slug
        if collection_id:
            return redirect('projects:list_collection', project_slug=project_slug, collection_slug=collection.slug)
        else:
            return redirect('projects:project_browse', project_slug=project_slug)
    else:
        from django.contrib.auth.models import User
        username = User.objects.get(pk=int(user_id)).username 
        if collection_id:
            return redirect('user:list_collection', username=username, collection_slug=collection.slug)
        else:            
            return redirect('user:user_profile', username=username)


def edit_resource(request, resource_id):
    if not request.user.is_authenticated():
        return redirect('/?login=true&source=%s' % request.path)

    from django.core.exceptions import ObjectDoesNotExist

    try:
        # Fetch the resource from its ID using the QuerySet API.
        resource = Resource.objects.get(pk=resource_id)

        # Fetch collection where this resource was.
        collection_id = request.GET.get('collection', None)
        collection = Collection.objects.get(pk=int(collection_id))

        if request.user == resource.user or request.user in resource.collaborators.all():

            from django.contrib.contenttypes.models import ContentType
            document_content_type = ContentType.objects.get_for_model(Document)
            link_content_type = ContentType.objects.get_for_model(Link)
            attachment_content_type = ContentType.objects.get_for_model(Attachment)

            if resource.revision.content_type == document_content_type:
                return edit_document(request, resource, collection)

            elif resource.revision.content_type == link_content_type:
                (hostname, url_data) = get_url_hostname(resource.revision.content.url)

                if "youtube" in hostname or "vimeo" in hostname:
                    return edit_video(request, resource, collection)
                else:
                    return edit_url(request, resource, collection)

            elif resource.revision.content_type == attachment_content_type:
                return edit_attachment(request, resource, collection)

        else:
            raise PermissionDenied

    except ObjectDoesNotExist:
        raise Http404


def _prepare_edit_resource_context(resource, collection):
    # Get all licenses
    from license.models import License
    licenses = License.objects.all()

    import oer.CollectionUtilities as cu
    (host_type, host) = cu.get_collection_root(collection)

    return {
        'licenses': licenses,
        'host': host_type.name,
        'act': 'edit'
    }


def edit_url(request, resource, collection):
    edit_resource_context = _prepare_edit_resource_context(resource, collection)

    form_context = {}
    if request.method == 'POST':
        from oer import forms
        url_edit = forms.URLEditForm(request.POST, request.user, instance=resource)

        if url_edit.is_valid():
            url_edit.save()

            # Add Django message on success of save.
            from django.contrib import messages
            messages.success(request, 'Link was saved succesfully.')

            return redirect('read',
                resource_id=resource.id,
                resource_slug=resource.slug
            )

        else:
            build_return_resource_form_context(request, url_edit, form_context)
    else:
        form_context['resource'] = resource

    context = dict({
        'title': _(settings.STRINGS['resources']['EDIT_URL_TITLE'])}.items()
            + form_context.items() + edit_resource_context.items())

    return render(request, 'add-url.html', context)


def edit_video(request, resource, collection):
    edit_resource_context = _prepare_edit_resource_context(resource, collection)

    form_context = {}
    if request.method == 'POST':
        from oer import forms
        video_edit = forms.VideoEditForm(request.POST, request.user, instance=resource)

        if video_edit.is_valid():
            video_edit.save()

            # Add Django message on success of save.
            from django.contrib import messages
            messages.success(request, 'Video was saved succesfully.')

            return redirect('read',
                resource_id=resource.id,
                resource_slug=resource.slug
            )

        else:
            build_return_resource_form_context(request, video_edit, form_context)
    else:
        form_context['resource'] = resource

    context = dict({
        'title': _(settings.STRINGS['resources']['EDIT_VIDEO_TITLE'])}.items()
            + form_context.items() + edit_resource_context.items())

    return render(request, 'add-video.html', context)


def edit_document(request, resource, collection):
    edit_resource_context = _prepare_edit_resource_context(resource, collection)

    form_context = {}
    if request.method == 'POST':
        from oer import forms
        document_edit = forms.DocumentEditForm(request.POST, request.user, instance=resource)

        if document_edit.is_valid():
            saved_document = document_edit.save()

            create_document_elements(request.POST, saved_document)

            # Add Django message on success of save.
            from django.contrib import messages
            messages.success(request, 'Document was saved succesfully.')

            return redirect('read',
                resource_id=resource.id,
                resource_slug=resource.slug
            )

        else:
            build_return_resource_form_context(request, document_edit, form_context)
    else:
        resource.data = build_document_view(resource.revision.content_id)
        form_context['resource'] = resource

    context = dict({
        'title': _(settings.STRINGS['resources']['EDIT_DOCUMENT_TITLE'])}.items()
            + form_context.items() + edit_resource_context.items())

    return render(request, 'document.html', context)


def edit_attachment(request, resource, collection):
    edit_resource_context = _prepare_edit_resource_context(resource, collection)

    form_context = {}
    if request.method == 'POST':
        from oer import forms
        attachment_edit = forms.AttachmentEditForm(request.POST, request.user, instance=resource)

        if attachment_edit.is_valid():
            attachment_edit.save()

            # Add Django message on success of save.
            from django.contrib import messages
            messages.success(request, 'File resource was saved succesfully.')

            return redirect('read',
                resource_id=resource.id,
                resource_slug=resource.slug
            )

        else:
            build_return_resource_form_context(request, attachment_edit, form_context)
    else:
        form_context['resource'] = resource

    context = dict({
        'title': _(settings.STRINGS['resources']['EDIT_UPLOAD_TITLE'])}.items()
            + form_context.items() + edit_resource_context.items())

    return render(request, 'edit-attachment.html', context)


def delete_resource(request, resource_id, collection_id):
    try:
        resource = Resource.objects.get(pk=resource_id)
    except:
        return APIUtilities._api_not_found()

    if request.user != resource.user:
        return APIUtilities._api_unauthorized_failure()

    # If there are multiple collections where this resource is linked,
    # do not delete the resource. Remove the resource only from the current collection.
    from django.core.exceptions import MultipleObjectsReturned
    try:
        collection = Collection.objects.get(resources__id=resource.id)

    except MultipleObjectsReturned:
        collection = Collection.objects.get(pk=collection_id)
        collection.resources.remove(resource)
        return APIUtilities._api_success()
        
    try:
        delete_individual_resource(resource)
        return APIUtilities._api_success()

    except:
        return APIUtilities._api_failure()


def delete_individual_resource(resource):
    revisions = ResourceRevision.objects.filter(resource=resource)

    from django.contrib.contenttypes.models import ContentType

    document_content_type = ContentType.objects.get_for_model(Document)
    document_element_content_type = ContentType.objects.get_for_model(DocumentElement)
    link_content_type = ContentType.objects.get_for_model(Link)
    attachment_content_type = ContentType.objects.get_for_model(Attachment)

    resource_content_type = ContentType.objects.get_for_model(Resource)
    revision_content_type = ContentType.objects.get_for_model(ResourceRevision)

    from interactions.models import CommentReference, Comment

    for revision in revisions:
        if revision.content_type == document_content_type:
            document_elements = DocumentElement.objects.filter(
                document=revision.content
            )
            for element in document_elements:
                element.element.delete()
                element.delete()

            revision.content.delete()

        elif (revision.content_type == link_content_type or 
            revision.content_type == attachment_content_type):
                revision.content.delete()

        revision.delete()

        # Delete the comments & comment references on this revision.

        if revision.content_type == document_content_type:
            # Get all the document elements associated with this revision's document.
            document_elements = DocumentElement.objects.filter(
                document=revision.content)
            document_element_ids = map(lambda x: x.id, document_elements)

            comment_references = CommentReference.objects.filter(
                owner_type=document_element_content_type,
                owner_id__in=document_element_ids
            )

            for comment_reference in comment_references:
                comment_reference.delete()
                comment_reference.comment.delete()

        revision_comments = Comment.objects.filter(
            parent_type=revision_content_type, parent_id=revision.id
        )

        for revision_comment in revision_comments:
            revision_comment.delete()

    resource.delete()

    # Delete all the comments on this document.
    resource_comments = Comment.objects.filter(
        parent_type=resource_content_type, parent_id=resource.id
    )

    for resource_comment in resource_comments:
        resource_comment.delete()


def delete_collection(request, collection_id):
    try:
        collection = Collection.objects.get(pk=collection_id)

        import oer.CollectionUtilities as cu
        (collection_root_type, collection_root) = cu.get_collection_root(collection)

        if collection_root_type.name == 'project':
            from projects.models import Project
            project = Project.objects.get(pk=collection_root.id)

            if request.user not in project.admins.all() or request.user != collection.creator:
                return APIUtilities._api_unauthorized_failure()

        delete_individual_collection(collection)

        return APIUtilities._api_success()
    except:
        return APIUtilities._api_failure()


def delete_individual_collection(collection):
    # Delete all child collections & resources
    for resource in collection.resources.all():
        delete_individual_resource(resource)

    from django.contrib.contenttypes.models import ContentType
    collection_content_type = ContentType.objects.get_for_model(Collection)   
 
    child_collections = Collection.objects.filter(
        host_id=collection.id, host_type=collection_content_type)

    # Find all child collections of this collection.
    child_collections = Collection.objects.filter(
        host_id=collection.id, host_type=collection_content_type)

    for child in child_collections:
        delete_individual_collection(child)

    collection.delete()


def new_project_collection(request, project_slug):
    from projects.models import Project
    project = Project.objects.get(slug=project_slug)

    collection_slug = request.POST.get('parent_collection')

    # Find the current collection through the project collection tree.
    import oer.CollectionUtilities as cu
    (browse_tree, flattened_tree) = cu._get_collections_browse_tree(project.collection)
    collection = next(
        tree_item for tree_item in flattened_tree if tree_item.slug == collection_slug)

    new_collection = Collection()
    new_collection.title = request.POST.get('new_collection_name')

    new_collection.host = collection
    new_collection.visibility = request.POST.get('collection_visibility')
    new_collection.slug = _get_fresh_collection_slug(
        request.POST.get('new_collection_name'), collection, flattened_tree)
    new_collection.creator = request.user    
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
    from django.contrib.auth.models import User
    user = User.objects.get(username=username)

    collection_slug = request.POST.get('parent_collection', None)

    try:
        # Find the current collection through the project collection tree.
        import oer.CollectionUtilities as cu
        (browse_tree, flattened_tree) = cu._get_collections_browse_tree(user.get_profile().collection)
        collection = next(
            tree_item for tree_item in flattened_tree if tree_item.slug == collection_slug)

        new_collection = Collection()
        new_collection.title = request.POST.get('new_collection_name')

        new_collection.host = collection
        new_collection.visibility = request.POST.get('collection_visibility')
        new_collection.slug = _get_fresh_collection_slug(
            request.POST.get('new_collection_name'), collection, flattened_tree)
        new_collection.creator = user
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
    except:
        from django.contrib import messages
        messages.error(request,
            'Oops! We were unable to create the collection. Please try again.')
        return redirect(
                'user:user_profile',
                username=username,
            )


def _get_fresh_collection_slug(title, collection, flattened_tree):
    from django.template.defaultfilters import slugify
    slug = slugify(title)

    try:
        collection = next(
            tree_item for tree_item in flattened_tree if tree_item.slug == slug)

        if collection:
            slug = _apply_additional_collection_slug(
                slug, 1, collection, flattened_tree)
    except:
        return slug

    return slug


def _apply_additional_collection_slug(slug, depth, collection, flattened_tree):
    attempted_slug = slug + "-" + str(depth)
    collections = [col for col in flattened_tree if col.slug == attempted_slug]

    if len(collections) == 0:
        return attempted_slug
    else:
        return _apply_additional_collection_slug(slug, depth + 1, collection, flattened_tree)


def file_upload(request):
    if request.method == "POST":
        from forms import UploadResource
        form = UploadResource(request.POST, request.FILES)

        user_id = request.POST.get('user', None)
        project_id = request.POST.get('project', None)
        collection_id = request.POST.get('collection', None)

        collection = get_collection(user_id, project_id, collection_id)

        if form.is_valid():
            # Get the Project ID / User ID & Collection name from the URL / form
            new_resource = create_resource(request.FILES['file'], request.user, collection)

        return HttpResponse(json.dumps(
            {
                new_resource.id: new_resource.revision.content.file.name
            }
        ), 200, content_type="application/json")
    else:
        return HttpResponse(json.dumps(
            {'status': 'false'}), 401, content_type="application/json")


def article_center_registration(request):
    return render(request, 'article-center-registration.html', {})


def view_history(request, resource_id):
    from django.core.exceptions import ObjectDoesNotExist

    try:
        resource = Resource.objects.get(pk=resource_id)
    except ObjectDoesNotExist:
        raise Http404

    # Get all revisions of the resources.
    edits = ResourceRevision.objects.filter(resource=resource)
    for edit in edits:
        edit.flag = "edit"

    from oer.models import Forks
    forks = Forks.objects.filter(fork_of=resource)

    # Put both edits and forks in the same list.
    unsorted_revisions = list(edits) + list(forks)

    # Sort the list by created.
    resource.revisions = sorted(
        unsorted_revisions, key=lambda rev: rev.created)

    context = {
        'resource': resource,
        'title': _(settings.STRINGS['resources']['HISTORY_TITLE']) % (
            resource.title)
    }
    return render(request, 'resource-history.html', context)


# API Stuff

def add_user_to_collection(request, collection_id, user_id):
    try:
        collection = Collection.objects.get(pk=collection_id)

        from django.contrib.auth.models import User
        user = User.objects.get(pk=user_id)

        if request.user != collection.creator and request.user not in collection.collaborators.all():
            return APIUtilities._api_unauthorized_failure()

        collection.collaborators.add(user)

        # Notify user of being added to collection through a notification.
        Collection.collaborator_added.send(
            sender="Projects", collection=collection, user=user, request=request)        

        context = {
            'user': {
                'id': user.id,
                'name': user.get_full_name(),
                'username': user.username,
                'profile_pic': settings.MEDIA_URL + user.get_profile().profile_pic.name
            }
        }

        return APIUtilities._api_success(context)

    except:
        context = {
            'title': 'Could not add the user to the collection.',
            'message': 'We failed to add the user as a collaborator in the collection '
            + 'as we were unable to find the user or collection. Please contact us if '
            + 'the problem persists.'
        }
        return APIUtilities._api_failure(context)


def remove_user_from_collection(request, collection_id, user_id):
    try:
        collection = Collection.objects.get(pk=collection_id)

        from django.contrib.auth.models import User
        user = User.objects.get(pk=user_id)

        if request.user != collection.creator and request.user not in collection.collaborators.all():
            return APIUtilities._api_unauthorized_failure()

        collection.collaborators.remove(user)

        return APIUtilities._api_success()

    except:
        context = {
            'title': 'Could not remove the user from the collection.',
            'message': 'We failed to remove the user from this collection '
            + 'as we were unable to find the user or collection. Please contact us if '
            + 'the problem persists.'
        }
        return APIUtilities._api_failure(context)


def list_collection_collaborators(request, collection_id):
    try:
        collection = Collection.objects.get(pk=collection_id)

        # Get the project this collection belongs to, if that is the case.
        import oer.CollectionUtilities as cu 
        (collection_root_type, collection_root) = cu.get_collection_root(collection)

        # If this is a project.
        if collection_root_type.name == 'project':
            if (request.user != collection.creator and request.user not in collection.collaborators.all()) and (
                request.user not in collection_root.admins.all()):
                    return APIUtilities._api_unauthorized_failure()            

        else:
            if request.user != collection.creator and request.user not in collection.collaborators.all():
                return APIUtilities._api_unauthorized_failure()

        # Add the collection collaborators into a list.
        serialized_collaborators = []
        for collaborator in collection.collaborators.all():
            user = {}
            user['id'] = collaborator.id
            user['name'] = collaborator.get_full_name()
            user['username'] = collaborator.username
            user['profile_pic'] = settings.MEDIA_URL + collaborator.get_profile().profile_pic.name
            serialized_collaborators.append(user)

        # Add the collection creator to the list.
        serialized_collaborators.append({
            'id': collection.creator.id,
            'name': collection.creator.get_full_name(),
            'username': collection.creator.username,
            'profile_pic': settings.MEDIA_URL + collection.creator.get_profile().profile_pic.name
        })

        serialized_collaborators.reverse()

        return APIUtilities._api_success({'users': serialized_collaborators})

    except:
        context = {
            'title': 'Could not fetch the collaborators on this collection.',
            'message': 'We failed to fetch and construct a list of collaborators for '
            + 'this collection. Please contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)


def change_collection_visibility(request, collection_id, visibility):
    try:
        collection = Collection.objects.get(pk=collection_id)

        if request.user != collection.creator:
            return APIUtilities._api_unauthorized_failure()

        collection.visibility = visibility
        collection.save()

        return APIUtilities._api_success()

    except:
        context = {
            'title': 'Could not change the visibility of this collection.',
            'message': 'We failed to change the visibility of '
            + 'this collection. Please contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)


def add_user_to_resource(request, resource_id, user_id):
    try:
        resource = Resource.objects.get(pk=resource_id)

        from django.contrib.auth.models import User
        user = User.objects.get(pk=user_id)

        if request.user != resource.user and request.user not in resource.collaborators.all():
            return APIUtilities._api_unauthorized_failure()

        resource.collaborators.add(user)

        # Notify user of being added to collection through a notification.
        Resource.collaborator_added.send(
            sender="Projects", resource=resource, user=user)        

        context = {
            'user': {
                'id': user.id,
                'name': user.get_full_name(),
                'username': user.username,
                'profile_pic': settings.MEDIA_URL + user.get_profile().profile_pic.name
            }
        }

        return APIUtilities._api_success(context)

    except:
        context = {
            'title': 'Could not add the user to the resource.',
            'message': 'We failed to add the user as a collaborator to this resource '
            + 'as we were unable to find the user or resource. Please contact us if '
            + 'the problem persists.'
        }
        return APIUtilities._api_failure(context)


def remove_user_from_resource(request, resource_id, user_id):
    try:
        resource = Resource.objects.get(pk=resource_id)

        from django.contrib.auth.models import User
        user = User.objects.get(pk=user_id)

        if request.user != resource.user and request.user not in resource.collaborators.all():
            return APIUtilities._api_unauthorized_failure()

        resource.collaborators.remove(user)

        return APIUtilities._api_success()

    except:
        context = {
            'title': 'Could not remove the user from the resource.',
            'message': 'We failed to remove the user from this resource '
            + 'as we were unable to find the user or resource. Please contact us if '
            + 'the problem persists.'
        }
        return APIUtilities._api_failure(context)


def list_resource_collaborators(request, resource_id):
    try:
        resource = Resource.objects.get(pk=resource_id)

        if request.user != resource.user and request.user not in resource.collaborators.all():
            return APIUtilities._api_unauthorized_failure()

        # Add the resource collaborators into a list.
        serialized_collaborators = []
        for collaborator in resource.collaborators.all():
            user = {}
            user['id'] = collaborator.id
            user['name'] = collaborator.get_full_name()
            user['username'] = collaborator.username
            user['profile_pic'] = settings.MEDIA_URL + collaborator.get_profile().profile_pic.name
            serialized_collaborators.append(user)

        # Add the resource creator to the list.
        serialized_collaborators.append({
            'id': resource.user.id,
            'name': resource.user.get_full_name(),
            'username': resource.user.username,
            'profile_pic': settings.MEDIA_URL + resource.user.get_profile().profile_pic.name
        })

        serialized_collaborators.reverse()

        return APIUtilities._api_success({'users': serialized_collaborators})

    except:
        context = {
            'title': 'Could not fetch the collaborators on this resource.',
            'message': 'We failed to fetch and construct a list of collaborators for '
            + 'this resource. Please contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)


def change_resource_visibility(request, resource_id, visibility):
    try:
        resource = Resource.objects.get(pk=resource_id)

        if request.user != resource.user:
            return APIUtilities._api_unauthorized_failure()

        resource.visibility = visibility
        resource.save()

        return APIUtilities._api_success()

    except:
        context = {
            'title': 'Could not change the visibility of this resource.',
            'message': 'We failed to change the visibility of '
            + 'this resource. Please contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)


def move_resource_to_collection(request, resource_id, from_collection_id, to_collection_id):
    try:
        from_collection = Collection.objects.get(pk=from_collection_id)
        to_collection = Collection.objects.get(pk=to_collection_id)
        resource = Resource.objects.get(pk=resource_id)

        # Get the project this collection belongs to.
        import oer.CollectionUtilities as cu 
        (collection_root_type, collection_root) = cu.get_collection_root(to_collection)

        # If this is a project.
        if collection_root_type.name == 'project':
            # Break if the requestor is the administrator of the project.
            if request.user in collection_root.admins.all():
                pass

            # If this collection belongs to the project.
            elif to_collection.visibility == 'project':
                # If the resource hasn't been been created by the requestor, and the
                # requestor isn't a member of the project.
                if request.user not in collection_root.confirmed_members and request.user != resource.user:
                    return APIUtilities._api_unauthorized_failure()

            elif to_collection.visibility == 'private':
                # If the resource hasn't been been created by the requestor and requestor
                # isn't a collaborator on the collection.
                if request.user != resource.user and request.user not in to_collection.collaborators.all():
                    return APIUtilities._api_unauthorized_failure()

        to_collection.resources.add(resource)
        from_collection.resources.remove(resource)

        return APIUtilities._api_success()

    except:
        context = {
            'title': 'Could not change the move the resource.',
            'message': 'We failed to the resource into the new collection. '
            + 'Please contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)


def move_collection_to_collection(request, collection_id, from_collection_id, to_collection_id):
    if collection_id == to_collection_id:
        context = {
            'title': 'Could not move the collection into itself.',
            'message': 'We failed to move the collection into itself as this is not '
            + 'a valid request.'
        }
        return APIUtilities._api_failure(context)

    try:
        collection = Collection.objects.get(pk=collection_id)
        to_collection = Collection.objects.get(pk=to_collection_id)

        # Get the project this collection belongs to.
        import oer.CollectionUtilities as cu 
        (collection_root_type, collection_root) = cu.get_collection_root(to_collection)

        # If this is a project.
        if collection_root_type.name == 'project':
            # Break if the requestor is the administrator of the project.
            if request.user in collection_root.admins.all():
                pass

            # If this collection belongs to the project.
            elif to_collection.visibility == 'project':
                # If the requestor is not a member of the project and did not create the collection to be moved.
                if request.user not in collection_root.confirmed_members and request.user != collection.creator:
                    return APIUtilities._api_unauthorized_failure()

            elif to_collection.visibility == 'private':
                # If the collection hasn't been been created by the requestor and requestor
                # isn't a collaborator on the collection.
                if request.user != collection.creator and request.user not in to_collection.collaborators.all():
                    return APIUtilities._api_unauthorized_failure()

        collection.host = to_collection
        collection.save()

        return APIUtilities._api_success()

    except:
        context = {
            'title': 'Could not change the move the collection.',
            'message': 'We failed to the original collection into its new collection. '
            + 'Please contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)


def user_tree(request, ask, host):
    import oer.CollectionUtilities as cu
    tree = None

    if host == 'projects':
        from projects.models import Membership

        # Get all the "memberships" the user is belongs to.
        memberships = Membership.objects.filter(user=request.user, confirmed=True)

        browse_trees = []

        for membership in memberships:
            (browse_tree, flattened_tree) = cu._get_collections_browse_tree(
                membership.project.collection) if ask == 'collections' else cu._get_browse_tree(
                membership.project.collection)
            browse_trees.append(browse_tree)

        tree = cu.build_projects_collection_navigation(
            browse_trees, request.user)

    else:
        from user_account.models import UserProfile
        user_profile = UserProfile.objects.get(user__id=request.user.id)

        (browse_tree, flattened_tree) = cu._get_collections_browse_tree(
            user_profile.collection) if ask == 'collections' else cu._get_browse_tree(
            user_profile.collection)

        # If there are no collections associated with the host, return error.
        if len(browse_tree) == 0:
            context = {
                'title': 'Cannot add/move to another collection',
                'message': 'There is no other collection to where this resource or collection '
                + 'may be added/moved to. Kindly create a new collection before moving this.'
            }
            return APIUtilities._api_failure(context)

        else:
            tree =  cu.build_user_collection_navigation(browse_tree, request.user)

    context = { 'tree': tree }
    return APIUtilities._api_success(context)


def collection_tree(request, collection_id, ask, host):
    import oer.CollectionUtilities as cu
    tree = None

    current_collection = Collection.objects.get(pk=collection_id)
    (root_host_type, root) = cu.get_collection_root(current_collection)
    (browse_tree, flattened_tree) = cu._get_collections_browse_tree(
        root.collection) if ask == 'collections' else cu._get_browse_tree(
        root.collection)

    # If there are no collections associated with the host, return error.
    if len(browse_tree) == 0:
        context = {
            'title': 'Cannot move to another collection',
            'message': 'There is no other collection to where this resource or collection '
            + 'may be moved to. Kindly create a new collection before moving this.'
        }
        return APIUtilities._api_failure(context)

    else:
        tree = cu.build_project_collection_navigation(browse_tree, request.user)       

    context = { 'tree': tree }
    return APIUtilities._api_success(context)


def propagate_collection_visibility(request, collection_id):
    try:
        collection = Collection.objects.get(pk=collection_id)
    except:
        return APIUtilities._api_not_found()

    try:
        # Get all nested descendant collections and resources.
        import oer.CollectionUtilities as cu
        (descendantTree, descendantCollections) = cu._get_collections_browse_tree(collection)
        descendantCollections.remove(collection)

        # Set the visibility of all the descendant collections and resources to
        #     be 'collection'
        for child_collection in descendantCollections:
            child_collection.visibility = 'collection'
            for resource in child_collection.resources.all():
                resource.visibility = 'collection'

        return APIUtilities._api_success()

    except:
        context = {
            'title': 'Could not change the visibility of collections and resources.'
                + 'inside this collections',
            'message': 'We failed to change the access control on the collections and '
            + ' resources inside the collection whose visibility you changed. Please '
            + 'contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)


def copy_resource_to_collection(request, resource_id, from_collection_id, to_collection_id):
    try:
        resource = Resource.objects.get(pk=resource_id)
        from_collection = Collection.objects.get(pk=from_collection_id)
        to_collection = Collection.objects.get(pk=to_collection_id)
    except:
        return APIUtilities._api_not_found()

    try:
        # Get the root collection the to collection belongs to.
        import oer.CollectionUtilities as cu 
        (to_collection_root_type, to_collection_root) = cu.get_collection_root(to_collection)

        # If the "to collection" belongs to a project.
        if to_collection_root_type.name == 'project':
            # Break if the requestor is the administrator of the project.
            if request.user in to_collection_root.admins.all():
                pass

            elif to_collection.visibility == 'project':
                # If the requestor is not a member of the to-project-collection.
                if request.user not in to_collection_root.confirmed_members:
                    return APIUtilities._api_unauthorized_failure()

            elif to_collection.visibility == 'private':
                # If the requestor isn't a collaborator on the "to collection".
                if request.user not in to_collection.collaborators.all():
                    return APIUtilities._api_unauthorized_failure()

        # Get the root collection the from resource belongs to.
        import oer.CollectionUtilities as cu 
        (from_collection_root_type, from_collection_root) = cu.get_collection_root(from_collection)

        # If this collection has a visibility of collection, look up closest
        #     ancestor collection which is 'private' visibility.
        if resource.visibility == 'collection':
            parent_private_collection = cu.get_root_private_collection(from_collection)
            if request.user not in parent_private_collection.collaborators.all():
                APIUtilities._api_unauthorized_failure()

        if not request.user in resource.collaborators.all() or request.user != resource.creator:
            if from_collection_root_type.name == 'project':
                # Break if the requestor is the administrator of the project.
                if request.user in from_collection_root.admins.all():
                    pass

                elif from_collection.visibility == 'project':
                    # If the requestor is not a member of the project which hosts the collection.
                    if request.user not in from_collection_root.confirmed_members:
                        return APIUtilities._api_unauthorized_failure()

        (new_resource, new_resource_type) = get_resource_copy(
            resource, request.user, True)
        to_collection.resources.add(new_resource)

        # Add new resource to fork.

        import datetime
        context = {
            'resource': {
                'id': new_resource.id,
                'title': new_resource.title,
                'created': datetime.datetime.strftime(new_resource.created, '%b. %d, %Y, %I:%M %P'),
                'visibility': new_resource.visibility,
                'type': new_resource_type,
                'is_collaborator': request.user in new_resource.collaborators.all(),
                'url': reverse(
                    'read', kwargs={
                        'resource_id': new_resource.id,
                        'resource_slug': new_resource.slug
                    }
                ),
                'host': 'project' if from_collection_root_type.name == 'project' else 'profile',
            }
        }

        return APIUtilities._api_success(context)

    except:
        context = {
            'title': 'Could not copy the resource.',
            'message': 'We failed to make a copy of the resource. Please '
            + 'contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)


def link_resource_to_collection(request, resource_id, from_collection_id, to_collection_id):
    try:
        resource = Resource.objects.get(pk=resource_id)
        from_collection = Collection.objects.get(pk=from_collection_id)
        to_collection = Collection.objects.get(pk=to_collection_id)
    except:
        return APIUtilities._api_not_found()

    try:
        # Get the root collection the to collection belongs to.
        import oer.CollectionUtilities as cu 
        (to_collection_root_type, to_collection_root) = cu.get_collection_root(to_collection)

        # If the "to collection" belongs to a project.
        if to_collection_root_type.name == 'project':
            # Break if the requestor is the administrator of the project.
            if request.user in to_collection_root.admins.all():
                pass

            elif to_collection.visibility == 'project':
                # If the requestor is not a member of the to-project-collection.
                if request.user not in to_collection_root.confirmed_members:
                    return APIUtilities._api_unauthorized_failure()

            elif to_collection.visibility == 'private':
                # If the requestor isn't a collaborator on the "to collection".
                if request.user not in to_collection.collaborators.all():
                    return APIUtilities._api_unauthorized_failure()

        # Get the root collection the from resource belongs to.
        import oer.CollectionUtilities as cu 
        (from_collection_root_type, from_collection_root) = cu.get_collection_root(from_collection)

        # If this collection has a visibility of collection, look up closest
        #     ancestor collection which is 'private' visibility.
        if resource.visibility == 'collection':
            parent_private_collection = cu.get_root_private_collection(from_collection)
            if request.user not in parent_private_collection.collaborators.all():
                APIUtilities._api_unauthorized_failure()

        if not request.user in resource.collaborators.all() or request.user != resource.creator:
            if from_collection_root_type.name == 'project':
                # Break if the requestor is the administrator of the project.
                if request.user in from_collection_root.admins.all():
                    pass

                elif from_collection.visibility == 'project':
                    # If the requestor is not a member of the project which hosts the collection.
                    if request.user not in from_collection_root.confirmed_members:
                        return APIUtilities._api_unauthorized_failure()

        from django.core.exceptions import ObjectDoesNotExist
        try:
            to_collection.resources.get(pk=resource.id)
            context = {
                'title': 'Could not link the resource.',
                'message': 'We failed to make a link of the resource. The resource '
                + 'you are trying to link already exists in the destination collection.'
            }
            return APIUtilities._api_failure(context)


        except ObjectDoesNotExist:
            to_collection.resources.add(resource)

        import datetime
        context = {
            'resource': {
                'id': resource.id,
                'title': resource.title,
                'created': datetime.datetime.strftime(
                    datetime.datetime.now(), '%b. %d, %Y, %I:%M %P'),
                'visibility': resource.visibility,
                'is_collaborator': request.user in resource.collaborators.all(),
                'url': reverse(
                    'read', kwargs={
                        'resource_id': resource.id,
                        'resource_slug': resource.slug
                    }
                ),
                'host': 'project' if from_collection_root_type.name == 'project' else 'profile',
            }
        }

        return APIUtilities._api_success(context)

    except:
        context = {
            'title': 'Could not link the resource.',
            'message': 'We failed to make a link of the resource. Please '
            + 'contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)


def get_resource_copy(resource, user, new_name=False):
    title = resource.title if new_name else resource.title

    # Make a copy of the resource.
    resource_copy = Resource(
        title='Copy of ' + title,
        license=resource.license,
        description=resource.description,
        visibility=resource.visibility,
        cost=resource.cost,
        slug=resource.slug,
        user=user,
        image=resource.image,
        source=resource.source,
        category=resource.category
    )

    # Make a copy of the revision content.
    from django.contrib.contenttypes.models import ContentType
    document_content_type = ContentType.objects.get_for_model(Document)
    link_content_type = ContentType.objects.get_for_model(Link)
    attachment_content_type = ContentType.objects.get_for_model(Attachment)

    if resource.revision.content_type == document_content_type:
        content = Document()
        content.save()

        for element in resource.revision.content.elements.all():
            element_copy = Element(body=element.element.body)
            element_copy.save()

            document_element_copy = DocumentElement(
                document=content,
                element=element_copy,
                position=element.position
            )
            document_element_copy.save()

        resource_type = "document"

    elif resource.revision.content_type == link_content_type:
        content = Link(url=resource.revision.content.url)
        content.save()

        resource_type = "url"

    elif resource.revision.content_type == attachment_content_type:
        content = Attachment(file=resource.revision.content.file)
        content.save()

        resource_type = "attachment"

    # Create the new revision for the copied resource.
    resource_revision_copy = ResourceRevision(
        content=content,
        log=resource.revision.log,
        user=user
    )
    resource_revision_copy.save()

    resource_copy.revision = resource_revision_copy
    resource_copy.save()

    resource_copy.revision.resource = resource_copy
    resource_copy.save()

    # Copy all the tags of the resource.
    for tag in resource_copy.tags.all():
        resource_copy.tags.add(tag)

    # Add every collaborator to the new resource.
    for collaborator in resource.collaborators.all():
        resource_copy.collaborators.add(collaborator)
    resource_copy.save()

    return (resource_copy, resource_type)


def copy_collection(collection, to_collection, user):
    # Make a copy of the collection.
    collection_copy = Collection(
        title='Copy of ' + collection.title,
        host=to_collection,
        visibility=collection.visibility,
        slug=_get_fresh_collection_slug(collection.title, to_collection),
        creator=user
    )
    collection_copy.save()

    # Add every collaborator to the new collection.
    for collaborator in collection.collaborators.all():
        collection_copy.collaborators.add(collaborator)
    collection_copy.save()

    # Make a copy of all the resources in the collection.
    for resource in collection.resources.all():
        (new_resource, new_resource_type) = get_resource_copy(resource, user)
        collection_copy.resources.add(new_resource)

    # Copy all the collections inside this collection.
    from django.contrib.contenttypes.models import ContentType
    collection_content_type = ContentType.objects.get_for_model(Collection)   
 
    child_collections = Collection.objects.filter(
        host_id=collection.id, host_type=collection_content_type)

    for child in child_collections:
        copy_collection(child, collection_copy, user)

    return collection_copy


def copy_collection_to_collection(request, collection_id, to_collection_id):
    if collection_id == to_collection_id:
        context = {
            'title': 'Could not copy the collection into itself.',
            'message': 'We failed to copy the collection into itself as this is not '
            + 'a valid request.'
        }
        return APIUtilities._api_failure(context)

    try:
        collection = Collection.objects.get(pk=collection_id)
        to_collection = Collection.objects.get(pk=to_collection_id)
    except:
        return APIUtilities._api_not_found()

    try:
        # Get the root collection the "to collection" belongs to.
        import oer.CollectionUtilities as cu 
        (to_collection_root_type, to_collection_root) = cu.get_collection_root(to_collection)

        # If the "to collection" belongs to a project.
        if to_collection_root_type.name == 'project':
            # Break if the requestor is the administrator of the project.
            if request.user in to_collection_root.admins.all():
                pass

            elif to_collection.visibility == 'project':
                # If the requestor is not a member of the to-project-collection.
                if request.user not in to_collection_root.confirmed_members:
                    return APIUtilities._api_unauthorized_failure()

            elif to_collection.visibility == 'private':
                # If the requestor isn't a collaborator on the "to collection".
                if request.user not in to_collection.collaborators.all():
                    return APIUtilities._api_unauthorized_failure()

        # Get the root collection the collection to be copied belongs to.
        import oer.CollectionUtilities as cu 
        (collection_root_type, collection_root) = cu.get_collection_root(collection)

        # If the collection to be copied belongs to a project.
        if collection_root_type.name == 'project':
            # Break if the requestor is the administrator of the project.
            if request.user in to_collection_root.admins.all():
                pass

            elif collection.visibility == 'project':
                # If the requestor is not a member of the project which hosts the collection.
                if request.user not in collection_root.confirmed_members:
                    return APIUtilities._api_unauthorized_failure()

            elif collection.visibility == 'private':
                # If the requestor isn't a collaborator on the collection to be copied.
                if request.user not in collection.collaborators.all():
                    return APIUtilities._api_unauthorized_failure()

        new_collection = copy_collection(collection, to_collection, request.user)

        if collection_root_type.name == 'user profile':
            # If this collection is a descendant of the user
            user = collection_root.user

            url = reverse(
                'user:list_collection', kwargs={
                    'username': user.username,
                    'collection_slug': new_collection.slug
                }
            )

        elif collection_root_type.name == 'project':
            # If this collection is a descendant of a project
            project = collection_root

            url = reverse(
                'projects:list_collection', kwargs={
                    'project_slug': project.slug,
                    'collection_slug': new_collection.slug
                }
            )

        import datetime
        context = {
            'collection': {
                'id': new_collection.id,
                'title': new_collection.title,
                'created': datetime.datetime.strftime(
                    datetime.datetime.now(), '%b. %d, %Y, %I:%M %P'),
                'visibility': new_collection.visibility,
                'is_collaborator': request.user in new_collection.collaborators.all(),
                'url': url,
                'host': 'project' if to_collection_root_type.name == 'project' else 'profile',
            }
        }

        return APIUtilities._api_success(context)

    except:
        context = {
            'title': 'Could not copy the collection.',
            'message': 'We failed to make a copy of the collection. Please '
            + 'contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)


def get_document_element_comments(request, document_element_id):
    try:
        document_element = DocumentElement(pk=document_element_id)
    except:
        return APIUtilities._api_not_found()

    # TODO(Varun): Make this request secure.

    try:
        # Get all comments that have a parent type of DocumentElement.
        from django.contrib.contenttypes.models import ContentType
        document_element_content_type = ContentType.objects.get_for_model(DocumentElement)

        from interactions.models import CommentReference
        comment_references = CommentReference.objects.filter(
            owner_id=document_element.id, owner_type=document_element_content_type.id)

        serialized_comments = []

        import datetime
        for comment_reference in comment_references:
            serialized_comments.append({
                'reference': comment_reference.reference,
                'comment': {
                    'username': comment_reference.comment.user.username,
                    'name': comment_reference.comment.user.get_full_name(),
                    'created': datetime.datetime.strftime(comment_reference.comment.created, '%b. %d, %Y, %I:%M %P'),
                    'profile_pic': settings.MEDIA_URL + comment_reference.comment.user.get_profile().profile_pic.name,
                    'body': comment_reference.comment.body_markdown_html,
                    'id': comment_reference.comment.id
                }
            })

        context = {
            'comments': serialized_comments
        }

        return APIUtilities._api_success(context)

    except:
        context = {
            'title': 'Could not fetch the document comments.',
            'message': 'We failed to fetch some of the comments in elements of this document. '
            + 'Please contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)


def get_resource_comments(request, resource_id):
    try:
        resource = Resource.objects.get(pk=resource_id)
    except:
        return APIUtilities._api_not_found()

    from interactions.CommentUtilities import CommentsBuilder

    from django.contrib.contenttypes.models import ContentType
    resource_ct = ContentType.objects.get_for_model(Resource)

    try:
        comments_builder = CommentsBuilder(resource, resource_ct)
        (comments, flatted_post_descendants) = comments_builder.build_tree()

        from interactions.templatetags import comments_tags
        serialized_comments = comments_tags.nested_comment_tree(comments, request.user)

        context = {
            'comments': serialized_comments
        }

        return APIUtilities._api_success(context)

    except:
        context = {
            'title': 'Could not fetch the resource comments.',
            'message': 'We failed to fetch some of the comments of this resources. '
            + 'Please contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)        
