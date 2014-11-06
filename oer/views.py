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


def browse(request, category_slug):
    from oer.Browse import Browse
    browse = Browse(request, category_slug)

    return browse.browse()


def browse_suggestions(request, category_slug):
    from oer.Browse import Browse
    browse = Browse(request, category_slug)

    return browse.suggestions()


def browse_default(request):
    # For now, default browse without a category to Common Core.
    return redirect('browse',
        category_slug='common-core'
    )


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
        (resource, resource_type, revision) = render_resource(resource_id, request)

        from django.contrib.contenttypes.models import ContentType
        resource_ct = ContentType.objects.get_for_model(Resource)
        
        from interactions.models import Comment
        comments_ct = ContentType.objects.get_for_model(Comment)

        document_element_content_type = ContentType.objects.get_for_model(DocumentElement)

        # Fetch the number of resources that have been uploaded by the user who
        #     has created this resource.
        user_resource_count = None
        if resource.revision.user:
            user_resource_count = resource.revision.user.get_profile().collection.resources.count()

        # Increment page views (always remains -1 based on current view).
        Resource.objects.filter(id=resource_id).update(views=resource.views+1)

        import oer.CollectionUtilities as cu

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

        breadcrumb = cu.build_collection_breadcrumb(collection)

        document_type = None
        from meta.models import TagCategory, Tag
        if resource_type == 'document':
            try:
                document_type = resource.tags.get(
                    category=TagCategory.objects.get(title='Resource type'))
            except:
                document_type = Tag.objects.get(title='Document')

        # Get standards associated with this resource.
        standards = resource.tags.filter(
            category=TagCategory.objects.get(title='Standards'))

        # Get resource reviews.
        from interactions.models import Review
        reviews = Review.objects.filter(comment__parent_id=resource.id, comment__classification='review')
        for review in reviews:
            review.rating = range(review.rating)

        context = {
            'resource': resource,
            'resource_type': resource_type,
            'document_type': document_type,
            'standards': standards,
            'host_content_type': resource_ct,
            'comments_content_type': comments_ct,
            'document_element_content_type': document_element_content_type,
            'title': resource.title + " &lsaquo; OpenCurriculum",
            'revision_view': resource.revision == revision,
            'breadcrumb': breadcrumb,
            'resource_collection': collection,
            'reviews': reviews,
            "user_resource_count": user_resource_count,
            'current_path': 'http://' + request.get_host() + request.get_full_path(),  # request.get_host()
            'thumbnail': 'http://' + request.get_host() + settings.MEDIA_URL + resource.image.name
        }
        return render(request, 'resource.html', context)

    except ObjectDoesNotExist:
        raise Http404


def render_resource(resource_id, request=None):
    from django.core.exceptions import ObjectDoesNotExist
    from django.contrib.contenttypes.models import ContentType
    document_content_type = ContentType.objects.get_for_model(Document)

    # Fetch the resource from its ID using the QuerySet API.
    resource = Resource.objects.get(pk=resource_id)

    revision = None
    if request:
        revision_id = request.GET.get('revision', None)

        if revision_id:
            try:
                revision = ResourceRevision.objects.get(pk=revision_id)
                resource.revision = revision
            except ObjectDoesNotExist:
                pass
            except ValueError:
                raise Http404

    link_content_type = ContentType.objects.get_for_model(Link)
    attachment_content_type = ContentType.objects.get_for_model(Attachment)

    from curriculum.models import Reference
    reference_content_type = ContentType.objects.get_for_model(Reference)

    if resource.revision.content_type == document_content_type:
        resource.data = build_document_view(resource.revision.content_id)

        try:
            resource.tags.get(title='Lesson')
            resource.document_type = 'lesson'
        except:
            resource.document_type = 'document'

        resource_type = "document"

    elif resource.revision.content_type == link_content_type:
        if resource.revision.content.rendered_url:
            resource.data = build_document_view(
                resource.revision.content.rendered_url_id)

        import ResourceUtilities as ru
        resource_type = ru.get_resource_type_from_url(resource)

    # If the resource is a kind of attachment, format its metadata.
    elif resource.revision.content_type == attachment_content_type:
        #TODO: Replace with |filesizeformat template tag
        filesize = resource.revision.content.file.size
        if filesize >= 1048576:
            resource.filesize = str(
                '{0:.2f}'.format(float(float(filesize) / 1048576))) + " MB"
        elif filesize >= 1024:
            resource.filesize = str(
                '{0:.2f}'.format(float(float(filesize) / 1024))) + " KB"
        else:
            resource.filesize = str(
                '{0:.2f}'.format(float(filesize))) + " B"

        # Determine the extension of the attachment.
        from os.path import splitext
        name, resource.extension = splitext(resource.revision.content.file.name)

        resource_type = "attachment"

    elif resource.revision.content_type == reference_content_type:
        resource_type = "reference"

    return (resource, resource_type, revision)


def build_document_view(document_id):
    document = Document.objects.get(pk=document_id)
    document_elements = DocumentElement.objects.filter(
        document=document).order_by('position')

    from django.template import Template, Context
    template = Template(open(
        settings.TEMPLATE_DIR + '/templates/partials/foreign-document-element.html', 'r').read())
    
    from oer.BeautifulSoup import BeautifulSoup

    # Replace embedded resource references with resource contents.
    for document_element in document_elements:
        try:
            soup = BeautifulSoup(document_element.element.body['data'])

            document_resources = soup.findAll('div', 'foreign-document-element')
            for document_resource in document_resources:
                resource_id = document_resource['id']
                
                (rendered_resource, resource_type, revision) = render_resource(resource_id)
                context = Context({
                    'resource': rendered_resource,
                    'MEDIA_URL': settings.MEDIA_URL
                })
                document_resource.replaceWith(BeautifulSoup(template.render(context)))

            document_element.element.body['data'] = str(soup)
        except:
            pass

    return document_elements


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
    try:
        resource = Resource.objects.get(pk=resource_id)
    except:
        raise Http404
    
    from django.contrib.contenttypes.models import ContentType
    link_content_type = ContentType.objects.get_for_model(Link)
    attachment_content_type = ContentType.objects.get_for_model(Attachment)

    if resource.revision.content_type == attachment_content_type:
        file = resource.revision.content.file
    elif resource.revision.content_type == link_content_type:
        try:
            file = resource.revision.content.attachment.file
        except:
            raise Http404
    else:
        raise Http404


    try:
        import magic
        mime = magic.Magic(mime=True)
        content_type = mime.from_file(file.path)
    except:
        from boto.s3.connection import S3Connection
        from boto.s3.bucket import Bucket
        connection = S3Connection(settings.AWS_ACCESS_KEY_ID, settings.AWS_SECRET_ACCESS_KEY)
        bucket = Bucket(connection, settings.AWS_STORAGE_BUCKET_NAME)
        key = bucket.get_key(file.name)
        content_type = key.content_type

    try:
        # TODO(Varun): Security risk. Check file name for safeness
        response = HttpResponse(resource.revision.content.file, content_type)
        response['Content-Disposition'] = (
            'attachment; filename="%s"' % file.name)
        return response
    except:
        raise Http404


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
            try:
                collection = next(
                    tree_item for tree_item in flattened_tree if tree_item.slug == collection_slug)
            except:
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
    form_context['resource'] = fu._get_original_form_values(request, form_fields_to_return)

    # Clean for tags
    # HACK(Varun): The fu function returns a string if not a list
    try:
        from oc_platform.ModelUtilities import DummyM2M
        original_tags = form_context['original']['tags']
        if isinstance(original_tags, basestring):
            form_context['resource']['tags'] = DummyM2M([original_tags])
        else:
            form_context['resource']['tags'] = DummyM2M(original_tags)
    except:
        pass

    form_context['form'] = form


def add_video(request, submission_context=None):
    if not request.user.is_authenticated():
        return redirect('/login/?source=%s' % request.path)

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

            # Push a signal for new resource created.
            import oer.CollectionUtilities as cu
            from oer.models import Resource
            (collection_host_type, collection_host) = cu.get_collection_root(collection)
            Resource.resource_created.send(
                sender="Resources", resource=url,
                context_type=collection_host_type.name, context=collection_host
            )

            return redirect_to_collection(user_id, project_id, collection_id)
        else:
            build_return_resource_form_context(request, new_video, form_context)

    context = dict({
        'title': _(settings.STRINGS['resources']['ADD_VIDEO_TITLE']) + resource_context['title_extension']
    }.items() + resource_context.items() + form_context.items())

    return render(request, 'add-video.html', context)


def add_url(request):
    if not request.user.is_authenticated():
        return redirect('/login/?source=%s' % request.path)

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

            # Push a signal for new resource created.
            import oer.CollectionUtilities as cu
            from oer.models import Resource
            (collection_host_type, collection_host) = cu.get_collection_root(collection)
            
            Resource.resource_created.send(
                sender="Resources", resource=url,
                context_type=collection_host_type.name, context=collection_host
            )

            return redirect_to_collection(user_id, project_id, collection_id)
        else:
            build_return_resource_form_context(request, new_url, form_context)

    context = dict({
        'title': _(settings.STRINGS['resources']['ADD_URL_TITLE']) + resource_context['title_extension']
    }.items() + resource_context.items() + form_context.items())

    return render(request, 'add-url.html', context)


def new_document(request):
    return render_editor(request, 'document')


def new_lesson(request):
    return render_editor(request, 'lesson')


def new_unit(request):
    if request.method == 'POST':
        try:
            project_id = request.POST.get('project', None)
            collection_id = request.POST.get('collection', None)

            from oer import forms
            new_unit = forms.UnitForm(request.POST, request.user)

            if new_unit.is_valid():
                unit = new_unit.save()

                parent_collection = Collection.objects.get(
                    pk=int(request.POST.get('collection')))

                import oer.CollectionUtilities as cu
                (browse_tree, flattened_tree) = cu._get_collections_browse_tree(
                    parent_collection)
                title = request.POST.get('title', None)
        
                from django.template.defaultfilters import slugify
                new_unit_suggested_slug = slugify(request.POST.get('title'))

                slug = cu._get_fresh_collection_slug(
                   title if new_unit_suggested_slug != '' else 'Untitled Unit', flattened_tree)

                # Create and save the unit colleciton.
                new_collection = Collection(
                    title=title if title != '' else 'Untitled Unit',
                    host=unit,
                    visibility='private',
                    slug=slug,
                    creator=request.user
                )
                new_collection.save()

                # Add unit to the necessary collection.
                collection = get_collection(request.user.id, project_id, collection_id)
                add_unit_to_collection(unit, collection)

                return redirect(
                    'user:list_collection', username=new_collection.creator.username, collection_slug=new_collection.slug
                )
        except:
            try:
                return redirect('user:user_profile', username=request.user.username)
            except:
                raise Http404

    else:
        raise Http404


def edit_unit(request, unit_id, unit_slug):
    from oer.models import Unit
    from django.contrib.contenttypes.models import ContentType
    unit_type = ContentType.objects.get_for_model(Unit)

    try:
        unit = Unit.objects.get(pk=unit_id)
    except:
        raise Http404

    collection = Collection.objects.get(
        host_id=unit.id, host_type=unit_type)

    if request.method == 'POST':
        from oer import forms
        edited_unit = forms.EditUnitForm(request.POST, request.user, collection, unit)

        if edited_unit.is_valid():
            edited_unit.save()

            from django.contrib import messages
            messages.success(request, 'Unit \'%s\' saved succesfully.' % collection.title)

            return redirect(
                'user:list_collection', username=collection.creator.username, collection_slug=collection.slug
            )

    context = {
        'collection': collection,
        'unit': unit,
        'title': 'Edit \'' + collection.title + '\' &lsaquo; ' + collection.creator.get_full_name()
    }
    return render(request, 'edit-unit.html', context)


def render_editor(request, document_type):
    if not request.user.is_authenticated():
        return redirect('/login/?source=%s' % request.path)

    resource_context = _prepare_add_resource_context(request)

    form_context = {}
    if request.method == 'POST':
        (document, document_creation_success) = create_document_resource(request)

        if document_creation_success:
            return view_resource(request, document.id, document.slug)
        else:
            from django.core.mail import mail_admins
            mail_admins('Document failed to be created', 
                '%s struggled with saving doc' % (request.user.username + ':' +
                request.user.email))

            build_return_resource_form_context(request, document, form_context)

    form_context['resource'] = {}

    # Setup remix if remix requested.
    remix = request.GET.get('remix', None)
    if remix:
        resource_to_remix = Resource.objects.get(pk=int(remix))
        form_context['resource']['data'] = build_document_view(resource_to_remix.revision.content_id)
        form_context['act'] = 'remix'

    # Add tag for resource type.
    from meta.models import Tag, TagCategory

    from oc_platform.ModelUtilities import DummyM2M
    if document_type == 'lesson':
        form_context['resource']['tags'] = DummyM2M([Tag.objects.get(
            title='Lesson', category=TagCategory.objects.get(title='Resource type'))])
    else:
        form_context['resource']['tags'] = DummyM2M([Tag.objects.get(
            title='Document', category=TagCategory.objects.get(title='Resource type'))])

    context = dict({
        'title': _(settings.STRINGS['resources']['NEW_DOCUMENT_TITLE']) + resource_context['title_extension'],
        'document_type': document_type,

    }.items() + resource_context.items() + form_context.items())

    return render(request, document_type + '.html', context)


def create_document_resource(request):
    user_id = request.POST.get('user', None)
    project_id = request.POST.get('project', None)
    collection_id = request.POST.get('collection', None)

    from oer import forms
    # Create and save new Document.
    content = Document()
    content.save()

    new_resource_revision = ResourceRevision()
    new_resource_revision.content = content
    new_resource_revision.user = request.user
    new_resource_revision.save()

    new_document = forms.NewDocumentForm(request.POST, request.user, new_resource_revision.id)

    if new_document.is_valid():
        create_document_elements(request.POST, content)

        document_resource = new_document.save()

        # Assign this document to the revision created.
        document_resource.revision.resource = document_resource
        document_resource.revision.save()

        # Add to the necessary collection.
        collection = get_collection(user_id, project_id, collection_id)

        # Add to the necessary collection.
        add_resource_to_collection(document_resource, collection)

        # Push a signal for new resource created.
        import oer.CollectionUtilities as cu
        (collection_host_type, collection_host) = cu.get_collection_root(collection)
        Resource.resource_created.send(
            sender="Resources", resource=document_resource,
            context_type=collection_host_type.name, context=collection_host
        )

        return (document_resource, True)
    else:
        new_resource_revision.delete()
        return (new_document, False)


def create_document_elements(post_request, content):
    # Unserialize the DocumentElement objects.
    serialized_document_elements = post_request.get('serialized-document-body', None);
    if serialized_document_elements:
        document_elements = json.loads(serialized_document_elements)
    else:
        document_elements = {}

    for counter, element in enumerate(document_elements):
        # Create a new document element.
        new_document_element = DocumentElement()

        new_document_element.document = content
        
        new_element = Element(body=element)
        new_element.save()
        new_document_element.element = new_element

        # Add the document element based on its position to the Document.
        new_document_element.position = counter

        new_document_element.save()


def upload_page(request):
    """Renders the upload page, with user and project objects in context."""
    if not request.user.is_authenticated():
        return redirect('/login/?source=%s' % request.path)

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
        key = str(key_unicode.encode('utf-8'))             # Unicode by default.
        title = str(post_data[key].encode('utf-8'))
        file_list.append((key, title))     # Two parens because tuple.

    response = {}
    failure_list = []

    from boto.s3.connection import S3Connection
    from boto.s3.bucket import Bucket
    from boto.s3.key import Key
    conn = S3Connection(settings.AWS_ACCESS_KEY, settings.AWS_SECRET_KEY)
    b = Bucket(conn, settings.S3_BUCKET_NAME)
    k = Key(b)

    import os
    destination_dir = Attachment._meta.get_field('file').upload_to

    for (key, title) in file_list:
        k.key = key

        try:
            # Create Resource objects for each file uploaded.
            # And generate the list for the response.
            #file_path = settings.FILEPICKER_ROOT + key
            #k.get_contents_to_filename(file_path)
            #os.chmod(file_path, stat.S_IRWXG)


            temp_file_destination = settings.MEDIA_ROOT + destination_dir + '/temp'
            temporary = open(temp_file_destination, 'w+')
            temporary.write('')
            temporary.close()

            temporary_opened = open(temp_file_destination + '/temp')

            new_resource = create_resource(File(temporary_opened), user, collection, title)
            temporary_opened.close()

            new_resource.revision.content.file.name = destination_dir + '/' + key
            new_resource.revision.content.save()

            response[new_resource.id] = new_resource.title

            b.delete_key('temp')
            os.remove(temporary)

        except Exception, e:          
            # Delete this file from S3, and add it to the failure list
            b.delete_key(k)

            from django.core.mail import mail_admins
            mail_admins('Filepicker S3 mounting failed', (
                'Apologize to ' + str(user.id) + ": " + user.get_full_name(
                ) + '\n\n' + str(e)))

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
        from django.template.defaultfilters import slugify

        user_id = request.POST.get('user', None)
        project_id = request.POST.get('project', None)
        collection_id = request.POST.get('collection', None)
        is_post = request.POST.get('post', None) == 'true'
        resource_type = request.POST.get('type', None)
        category_id = request.POST.get('category_id', None)

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
                    new_resource = create_resource(original_file, request.user, collection, file_name)

                    # Add the necessary tags to the resource if this is a post upload.
                    if is_post:
                        suggest_resource_in_category(request, new_resource, category_id, resource_type, request.user)

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

            post_keys_to_delete = [
                'post', 'key', 'upload_service', 'type'
                'category_id', 'MAX_FILE_SIZE', 'filename',
                'submit', 'file', 'standard'
            ]
            for key_to_delete in post_keys_to_delete:
                try:
                    del post_data[key_to_delete]
                except:
                    pass

            for id in post_data:
                try:
                    resource = Resource.objects.get(pk=id)
                    # If the title has changed, persist it
                    if (resource.id != post_data[id]):
                        resource.title = post_data[id]
                        resource.slug = slugify(post_data[id])
                        resource.save()

                    # Add the necessary tags to the resource if this is a post upload.
                    if is_post:
                        suggest_resource_in_category(request, resource, category_id, resource_type, request.user)

                except:
                    pass

        except:
            from django.contrib import messages
            messages.error(request, 'Files were unable to be uploaded. Please try again.')
        
        # If this is a sent from a POST page, redirect to the same referrer, else to collection.
        if is_post:
            return redirect(request.META.get('HTTP_REFERER') + '?posted=success')
        else:
            return redirect_to_collection(user_id, project_id, collection_id)

    else:
        return Http404


def suggest_resource_in_category(request, resource, category_id, resource_type, user):
    # First add resource type on this.
    from meta.models import TagCategory, Category, Tag
    resource_type = Tag.objects.get(title__iexact=resource_type,
        category=TagCategory.objects.get(title='Resource type'))

    resource.tags.add(resource_type)

    standards = request.POST.getlist('standard', None)

    standards_tag_category = TagCategory.objects.get(title='Standards')
    for standard in standards:
        try:
            standard_tag = Tag.objects.get(
                title__iexact=standard, category=standards_tag_category)
            resource.tags.add(standard_tag)
        except:
            pass

    category = Category.objects.get(pk=int(category_id))
    create_new_suggestion(resource, category, user)


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

    # Push a signal for new resource created.     
    import oer.CollectionUtilities as cu
    (collection_host_type, collection_host) = cu.get_collection_root(collection)
    Resource.resource_created.send(
        sender="Resources", resource=new_resource,
        context_type=collection_host_type.name, context=collection_host
    )

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


def add_unit_to_collection(unit, collection):
    collection.units.add(unit)
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
            return redirect('user:user_files', username=username)


def edit_resource(request, resource_id):
    if not request.user.is_authenticated():
        return redirect('/login/?source=%s' % request.path)

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
                import oer.ResourceUtilities as ru
                (hostname, url_data) = ru.get_url_hostname(
                    resource.revision.content.url)

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

            create_document_elements(request.POST, saved_document.revision.content)

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

    try:
        resource.tags.get(title='Lesson')
        document_type = 'lesson'
    except:
        document_type = 'document'

    context = dict({
        'title': _(settings.STRINGS['resources']['EDIT_DOCUMENT_TITLE']),
        'document_type': document_type
    }.items() + form_context.items() + edit_resource_context.items())

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

        context = {
            'resourceID': resource_id
        }
        return APIUtilities._api_success(context)

    except:
        context = {
            'title': 'Could not delete the resource.',
            'message': 'The resource could not be deleted. Sorry! '
            + 'Please contact us if the problem persists.'
        }
        return APIUtilities._api_failure()


def delete_resources(request, collection_id):
    try:
        if not request.user.is_authenticated():
            return APIUtilities._api_unauthorized_failure()

        resources_ids = map(lambda x: int(x),
            request.GET.get('ids', None).split(','))

        resources = Resource.objects.filter(pk__in=resources_ids)

        resources_deleted = []
        for resource in resources:
            if request.user == resource.user:
                # If there are multiple collections where this resource is linked,
                # do not delete the resource. Remove the resource only from the current collection.
                from django.core.exceptions import MultipleObjectsReturned
                try:
                    collection = Collection.objects.get(resources__id=resource.id)
                
                except MultipleObjectsReturned:
                    collection = Collection.objects.get(pk=collection_id)
                    collection.resources.remove(resource)
                    continue

                resources_deleted.append(resource.id)
                delete_individual_resource(resource)

        context = {
            'resourceIDs': resources_deleted
        }

        return APIUtilities._api_success(context)

    except Exception, e:
        print e
        context = {
            'title': 'Could not delete the files.',
            'message': 'The files could not be deleted. Sorry! '
            + 'Please contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)


def delete_individual_resource(resource):
    revisions = ResourceRevision.objects.filter(resource=resource)

    from django.contrib.contenttypes.models import ContentType

    document_content_type = ContentType.objects.get_for_model(Document)
    document_element_content_type = ContentType.objects.get_for_model(DocumentElement)
    link_content_type = ContentType.objects.get_for_model(Link)
    attachment_content_type = ContentType.objects.get_for_model(Attachment)

    resource_content_type = ContentType.objects.get_for_model(Resource)
    revision_content_type = ContentType.objects.get_for_model(ResourceRevision)

    from interactions.models import CommentReference, Comment, Favorite

    for revision in revisions[:]:
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

        revision.delete()


    # Delete all the comments on this document.
    resource_comments = Comment.objects.filter(
        parent_type=resource_content_type, parent_id=resource.id
    )

    for resource_comment in resource_comments:
        resource_comment.delete()

    # Delete all favorites associated with this resource.
    resource_favorites = Favorite.objects.filter(
        parent_type=resource_content_type, parent_id=resource.id)
    for resource_favorite in resource_favorites:
        resource_favorite.delete()

    # Delete all the activity associated with this resource.
    from user_account.models import Activity
    resource_actions = Activity.objects.filter(
        action_type=resource_content_type, action_id=resource.id)

    resource_targets = Activity.objects.filter(
        target_type=resource_content_type, target_id=resource.id)

    resource_activities = resource_actions | resource_targets

    for activity in resource_activities:
        activity.delete()

    resource.delete()


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

        context = {
            'collectionID': collection_id
        }

        return APIUtilities._api_success(context)
    except:
        context = {
            'title': 'Could not delete the folder.',
            'message': 'The folder could not be deleted. Sorry! '
            + 'Please contact us if the problem persists.'
        }
        return APIUtilities._api_failure()


def delete_collections(request):
    try:
        if not request.user.is_authenticated():
            return APIUtilities._api_unauthorized_failure()

        collection_ids = map(lambda x: int(x),
            request.GET.get('ids', None).split(','))

        collections = Collection.objects.filter(pk__in=collection_ids)

        collections_deleted = []
        for collection in collections:
            if request.user == collection.creator:
                collections_deleted(collection.id)
                delete_individual_collection(collection)

        context = {
            'collectionIDs': collections_deleted
        }

        return APIUtilities._api_success(context)
    except:
        context = {
            'title': 'Could not delete the folders.',
            'message': 'The folders could not be deleted. Sorry! '
            + 'Please contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)


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

    # Delete all the activity associated with this folder.
    from user_account.models import Activity
    collection_actions = Activity.objects.filter(
        action_type=collection_content_type, action_id=collection.id)

    collection_targets = Activity.objects.filter(
        target_type=collection_content_type, target_id=collection.id)

    collection_activities = collection_actions | collection_targets

    for activity in collection_activities:
        activity.delete()

    for child in child_collections:
        delete_individual_collection(child)

    # If this a unit's collection, delete the unit too.
    from oer.models import Unit
    from django.contrib.contenttypes.models import ContentType
    unit_type = ContentType.objects.get_for_model(Unit)

    if collection.host_type == unit_type:
        collection.host.delete()

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
    new_collection.slug = cu._get_fresh_collection_slug(
        request.POST.get('new_collection_name'), flattened_tree)
    new_collection.creator = request.user    
    new_collection.save()

    # TODO(Varun):Set Django message on creation of collection

    Collection.new_collection_created.send(
        sender='Resources', collection=new_collection,
        collection_host=project, collection_host_type='project')

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
        
        from django.template.defaultfilters import slugify
        new_collection_suggested_slug = slugify(request.POST.get('new_collection_name'))

        if new_collection_suggested_slug != '':
            new_collection.slug = cu._get_fresh_collection_slug(
                request.POST.get('new_collection_name'), flattened_tree)
        else:
            new_collection.slug = cu._get_fresh_collection_slug(
                'untitled', flattened_tree)

        new_collection.creator = user
        new_collection.save()

        # TODO(Varun):Set Django message on creation of collection

        Collection.new_collection_created.send(
            sender='Resources', collection=new_collection,
            collection_host=user.get_profile(), collection_host_type='user profile')

        if user.get_profile().collection == collection:
            return redirect(
                'user:user_files',
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


def file_upload(request):
    if request.method == "POST":
        from forms import UploadResource
        form = UploadResource(request.POST, request.FILES)

        user_id = request.POST.get('user', None)
        project_id = request.POST.get('project', None)
        collection_id = request.POST.get('collection', None)

        collection = get_collection(user_id, project_id, collection_id)

        if form.is_valid():
            try:
                name = request.FILES['file'].name[:request.FILES['file'].name.rfind('.')]
            except:
                name = request.FILES['file'].name

            # Get the Project ID / User ID & Collection name from the URL / form
            new_resource = create_resource(request.FILES['file'], request.user, collection, name)

        return HttpResponse(json.dumps(
            {
                new_resource.id: {
                    'id': new_resource.id,
                    'title': new_resource.title,
                    'url': reverse(
                        'read', kwargs={
                            'resource_id': new_resource.id,
                            'resource_slug': new_resource.slug
                        }
                    )
                }
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


def edit_resource_meta_category(request, category_id, resource_id):
    return edit_resource_meta(request, resource_id, reverse('resource:play_category', kwargs={
                'category_id': category_id
            }
        )
    )


def edit_resource_meta_collection(request, collection_id, resource_id):
    return edit_resource_meta(request, resource_id, reverse('resource:play_collection', kwargs={
                'collection_id': collection_id
            }
        )
    )


def edit_resource_meta(request, resource_id, redirect_to):
    try:
        resource = Resource.objects.get(pk=resource_id)
    except:
        raise Http404

    from meta.models import TagCategory, Tag

    try:
        resource.objectives = resource.meta.objectives
        resource.prior = resource.meta.prior
        resource.materials = resource.meta.materials
        resource.context = resource.meta.context
        resource.time = resource.meta.time

    except:
        resource.objectives = {}
        resource.prior = {}
        resource.materials = {}
        resource.context = {}
        resource.time = {}
        resource.standards = {}

    resource.standards = resource.tags.filter(
        category=TagCategory.objects.get(title='Standards'))

    if request.method == 'POST':
        description = request.POST.get('description', None)
        objectives = request.POST.get('objectives', None)
        prior = request.POST.get('priors', None)
        materials = request.POST.get('materials', None)
        context = request.POST.get('contexts', None)
        time = request.POST.get('time', None)
        raw_standards = request.POST.get('standards', None)
        
        from meta.models import Concept, Topic

        # Create the prior concept and assign object.
        concepts = []
        for topic_concept in json.loads(prior):
            # Attempt to find topic and topic/concept pairs.
            topic = Topic.objects.filter(title=topic_concept['topic'])
            if topic.count() == 0:
                topic = Topic(title=topic_concept['topic'])
                topic.save()
            else:
                topic = topic[0]

            concept = Concept.objects.filter(topic=topic, concept=topic_concept['concept'])
            if concept.count() == 0:
                concept = Concept(
                    topic=topic,
                    concept=topic_concept['concept']
                )
                concept.save()
                concepts.append(concept)
            else:
                concepts.append(concept[0])

        standards = []
        for standard in json.loads(raw_standards):
            try:
                existing_standard = Tag.objects.get(title=standard, category=TagCategory.objects.get(title='Standards'))
                standards.append(existing_standard)
            except:
                new_standard = Tag(
                    title=standard,
                    category=TagCategory.objects.get(title='Standards')
                )
                new_standard.save()
                standards.append(new_standard)

        if resource.meta:
            resource.meta.objectives = json.loads(objectives)
            resource.meta.materials = json.loads(materials)
            resource.meta.context = json.loads(context)
            resource.meta.time = time

            resource.meta.prior.clear()
            resource.meta.prior.add(*concepts)

            resource.meta.save()

        else:
            from oer.models import ResourceMeta
            
            resource_meta = ResourceMeta(
                objectives=json.loads(objectives),
                time=time,
                materials=json.loads(materials),
                context=json.loads(context)
            )
            resource_meta.save()
            resource_meta.prior.add(*concepts)

            resource.meta = resource_meta  

        resource.description = description
        resource.tags.add(*standards)

        resource.save()
        from django.contrib import messages

        messages.success(request, 'Successfully edited \'%s\'.' % (
            resource.title))

        return redirect(request.POST.get('redirect-to', None))

    context = {
        'resource': resource,
        'redirect_to': redirect_to,
        'title': 'Edit resource meta'
    }
    return render(request, 'edit-resource-meta.html', context)


def play_category(request, category_id):
    # Get the top 30 resources that do not have meta in a certain category.
    from meta.models import Category
    import meta.CategoryUtilities as catU
    category = Category.objects.get(pk=category_id)
    (current_browse_tree, current_flattened_tree) = catU.build_child_categories(
        {'root': [category]}, [])

    from oer.Browse import Browse
    browse = Browse(request)
    browse.current_category_id = category_id

    (all_resources, all_collections, current_category_id) = browse.get_category_tree_resources_collections_catalog(
        current_flattened_tree, is_common_core_hosted=True, is_catalog=False)

    filtered_resources = []
    for resource in all_resources:
        if not resource.meta:
            filtered_resources.append(resource)

    context = {
        'resources': filtered_resources,
        'category': category,
        'title': 'Play: the easy way to volunteer for K-12 education'
    }
    return render(request, 'play.html', context)


def play_collection(request, collection_id):
    collection = Collection.objects.get(pk=collection_id)

    filtered_resources = []
    for resource in collection.resources.all():
        filtered_resources.append(resource)

    context = {
        'resources': filtered_resources,
        'collection': collection,
        'title': 'Play: the easy way to volunteer for K-12 education'
    }
    return render(request, 'play.html', context)


def feed_importer_home(request):
    from license.models import License
    licenses = License.objects.all()
    
    context = {
        'title': 'Feed importer',
        'licenses': licenses
    }
    return render(request, 'internal/feed-importer.html', context)


def create_document(body, user, selector=None):
    new_document = Document()
    new_document.save()

    new_document_element = DocumentElement()
    new_document_element.document = new_document
    
    from media.models import Image
    from django.conf import settings
    import urllib2
    from django.core.files.images import ImageFile
    import os
    
    from oer.BeautifulSoup import BeautifulSoup
    soup = BeautifulSoup(body)

    images = soup.findAll('img')
    
    for image in images:
        # Download the image.
        img_web = urllib2.urlopen(image['src']).read()

        # Write the image to disk.
        # TODO(Varun): This variable gets a name.
        image_path = settings.MEDIA_ROOT + 'resource_thumbnail/tmp/' + os.path.basename(image['src'])
        localImage = open(image_path, 'w')
        localImage.write(img_web)
        localImage.close()

        final_image = ImageFile(open(image_path))

        # Upload new image as media item.
        new_image = Image(
            path=final_image,
            title=final_image.name,
            user=user
        )
        new_image.save()

        url = settings.MEDIA_URL + new_image.path.name
        image['src'] = url

        # Delete the image from disk.
        os.remove(image_path)

    # Remove all 'onclick' attributes from <a>s
    onClickAnchors = soup.findAll(onclick=True)
    for anchor in onClickAnchors:
        del(anchor['onclick'])

    new_element = Element(body=json.loads('{"type": "textblock", "data": "' + str(soup).replace(
        '\\', '\\\\').replace('\n', '\\n').replace('\r', '\\r').replace('\"', '\\"') + '"}'))
    new_element.save()

    new_document_element.element = new_element
    new_document_element.position = 0
    new_document_element.save()

    return new_document


def create_url_resource(title, username, description, link, tags, body, license_id, collection_id):
    DEFAULT_COST = 0

    try:
        from django.contrib.auth.models import User
        from license.models import License

        title = title if title else 'Untitled website'
        user = User.objects.get(username=username)
        license = License.objects.get(pk=license_id)

        from django.template.defaultfilters import slugify

        # Create a new resource
        new_resource = Resource(
            title=title,
            cost=DEFAULT_COST,
            user=user,
            slug=slugify(title),
            visibility='public',
            description=description,
            license=license
        )

        new_url = Link(url=link, rendered_url=create_document(body, user) if body else None)
        new_url.save()

        new_resource_revision = ResourceRevision()
        new_resource_revision.content = new_url
        new_resource_revision.user = user
        new_resource_revision.save()

        new_resource.revision = new_resource_revision
        new_resource.save()

        from meta.models import Tag

        for raw_tag in tags:
            try:
                tag = Tag.objects.get(title=raw_tag)
            except:
                tag = Tag(title=raw_tag)
                tag.save()

            new_resource.tags.add(tag)

        # Assign this resource to the revision created.
        new_resource.revision.resource = new_resource
        new_resource.revision.save()

        # Now add this resource to the collection it belongs to
        to_add_to = Collection.objects.get(pk=int(collection_id))
        to_add_to.resources.add(new_resource)
        to_add_to.save()

        return new_resource.id
    except Exception, e:
        print e


def feed_importer_list(request):
    import feedparser
    import urlparse

    if request.method == 'POST':
        current_url = request.POST.get('url', None)
        username = request.POST.get('username', None)
        license_id = request.POST.get('license_id', None)
        collection_id = request.POST.get('collection_id', None)
        selector = request.POST.get('selector', None)
        tag_selector = request.POST.get('tag_selector', None)

        if selector:
            import httplib

            parsed_url = urlparse.urlparse(current_url)

            req = httplib.HTTPConnection(parsed_url.netloc, 80)
            req.connect()

            req.request('GET', parsed_url.path)
            response = req.getresponse().read()
    
            from oer.BeautifulSoup import BeautifulSoup
            soup = BeautifulSoup(response)

            # Determine title of page.
            title = soup.find('title').string

            # Determine tags.
            import re
            tags_elements = soup.findAll(True, {'class': re.compile(r'\b%s\b' % tag_selector)})
            tags = [tag.string for tag in tags_elements]

            create_url_resource(
                title,
                username,
                '',
                current_url,
                tags,
                str(soup.find(id=selector)),
                license_id,
                collection_id
            )
            req.close()

            from license.models import License
            licenses = License.objects.all()

            context = {
                'username': username,
                'selector': selector,
                'tag_selector': tag_selector,
                'license_id': license_id,
                'collection_id': collection_id,
                'title': 'Feed importer',
                'licenses': licenses
            }
            return render(request, 'internal/feed-importer.html', context)

        else:
            if not current_url:
                url = request.POST.get('current_url', None)

                # Process submission.
                current_feed = feedparser.parse(url)

                approved_posts = request.POST.getlist('post', None)

                for ap in approved_posts:
                    for entry in current_feed.entries:
                        if entry.link == ap:
                            tags = [tag.label for tag in entry.tags if tag.label]
                            create_url_resource(
                                entry.title,
                                username,
                                entry.summary,
                                entry.link,
                                tags,
                                entry.content[0].value,
                                license_id,
                                collection_id
                            )

                current_url = request.POST.get('next_url', None)

            feed = feedparser.parse(current_url)

            if 'wordpress' in feed['feed']['generator'] or 'Blogger' in feed['feed']['generator']:
                if 'wordpress' in feed['feed']['generator']:
                    parsed_url = urlparse.urlparse(current_url)
                    
                    new_query = []
                    queries = parsed_url.query.split('&')

                    if 'paged' in parsed_url.query:
                        for query in queries:
                            if 'paged' in query:
                                current_page_id = int(query[query.index(
                                    'paged') + 6:])
                                next_page_id = current_page_id + 1
                                query = 'paged=' + str(next_page_id)
                            
                            new_query.append(query)
                    else:
                        query = 'paged=2'
                        new_query.append(query)

                elif 'Blogger' in feed['feed']['generator']:
                    parsed_url = urlparse.urlparse(current_url)
                    
                    new_query = []
                    queries = parsed_url.query.split('&')

                    if 'start-index' in parsed_url.query:
                        for query in queries:
                            if 'start-index' in query:
                                current_index = int(query[query.index(
                                    'start-index') + 12:])
                                next_index = current_index + len(feed.entries) + 1
                                query = 'start-index=' + str(next_index)
                            
                            new_query.append(query)
                    else:
                        query = 'start-index=' + str(len(feed.entries) + 1)
                        new_query.append(query)

                try:
                    next_url = current_url[:current_url.index('?') + 1] + '&'.join(new_query)
                except:
                    next_url = current_url + '?' + '&'.join(new_query)

            feed_title = feed['feed']['title']
            posts = feed.entries

        context = {
            'title': 'Feed list',
            'blog_title': feed_title,
            'current_url': current_url,
            'next_url': next_url,
            'posts': posts,
            'username': username,
            'next_url': next_url,
            'license_id': license_id,
            'collection_id': collection_id
        }
        return render(request, 'internal/feed-list.html', context)


def play_rename_collection(request, collection_id):
    collection = Collection.objects.get(pk=collection_id)
    collection_resources = collection.resources.all()

    if request.method == 'POST':
        post_copy = request.POST.copy()
        post_copy.pop('csrfmiddlewaretoken')

        # Iterate, check for changes and save.
        resource_names = post_copy.dict().items()

        for resource_id, resource_name in resource_names:
            original_resource = collection_resources.get(pk=resource_id)
            if original_resource.title != resource_name:
                original_resource.title = resource_name
                original_resource.save()

    context = {
        'resources': collection_resources,
        'collection': collection,
        'title': 'Play: the easy way to volunteer for K-12 education'
    }
    return render(request, 'internal/rename.html', context)


# API Stuff

def delete_resource_prior(request, concept_id, resource_id):
    try:
        resource = Resource.objects.get(pk=resource_id)

        from meta.models import Concept
        concept = Concept.objects.get(pk=concept_id)
    except:
        raise Http404

    # Remove this concept from the resource.
    resource.meta.prior.remove(concept)

    # Remove topic if its unique.
    topic_resources = Resource.objects.filter(meta__prior__topic=concept.topic)
    if topic_resources.count() == 0:
        concept.topic.delete()

    # Remove concept if its unique.
    concept_resources = Resource.objects.filter(meta__prior=concept)
    if concept_resources.count() == 0:
        concept.delete()

    return APIUtilities._api_success()


def delete_resource_tag(request, tag_id, resource_id):
    try:
        resource = Resource.objects.get(pk=resource_id)

        from meta.models import Tag
        tag = Tag.objects.get(pk=tag_id)
    except:
        raise Http404

    # Remove this concept from the resource.
    resource.tags.remove(tag)

    return APIUtilities._api_success()


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


def rename_resource(request, resource_id, new_title):
    try:
        resource = Resource.objects.get(pk=resource_id)
    except:
        return APIUtilities._api_not_found()

    if request.user != resource.user:
        context = {
            'title': 'Cannot change the name of this file.',
            'message': 'You can only rename files you own and created. '
            + 'Please contact the file owner to rename it.'
        }
        return APIUtilities._api_unauthorized_failure()

    try:
        from django.template.defaultfilters import slugify

        resource.title = new_title
        resource.slug = slugify(new_title)
        resource.save()

        context = {
            'resourceID': str(resource.id),
            'title': resource.title
        }
        return APIUtilities._api_success(context)

    except:
        context = {
            'title': 'Could not change the rename the file.',
            'message': 'We failed to rename this file. '
            + 'Please contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)


def rename_collection(request, collection_id, new_title):
    try:
        collection = Collection.objects.get(pk=collection_id)
    except:
        return APIUtilities._api_not_found()

    if request.user != collection.creator:
        context = {
            'title': 'Cannot change the name of this folder.',
            'message': 'You can only rename folders you own and created. '
            + 'Please contact the folder owner to rename it.'
        }
        return APIUtilities._api_unauthorized_failure()

    try:
        import oer.CollectionUtilities as cu
        import urllib
        (collection_root_type, collection_root) = cu.get_collection_root(collection)
        (browse_tree, flattened_tree) = cu._get_collections_browse_tree(
            collection_root.collection)

        decoded_url = urllib.unquote_plus(new_title)

        collection.title = decoded_url
        collection.slug = cu._get_fresh_collection_slug(
            decoded_url, flattened_tree)
        collection.save()

        context = {
            'collectionID': str(collection.id),
            'title': collection.title
        }
        return APIUtilities._api_success(context)

    except Exception, e:
        print e
        context = {
            'title': 'Could not change the rename the folder.',
            'message': 'We failed to rename this folder. '
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


def raw_user_collection_tree(request, ask, host):
    import oer.CollectionUtilities as cu
    tree = None

    if host == 'projects':
        from projects.models import Membership
        memberships = Membership.objects.filter(user=request.user, confirmed=True)

        browse_trees = []
        for membership in memberships:
            (browse_tree, flattened_tree) = cu._get_collections_browse_tree(
                membership.project.collection) if ask == 'collections' else cu._get_browse_tree(
                membership.project.collection)
            browse_trees.append(browse_tree)

        tree = cu.build_projects_raw_tree(request, browse_trees)
    else:
        from user_account.models import UserProfile
        user_profile = UserProfile.objects.get(user__id=request.user.id)

        (browse_tree, flattened_tree) = cu._get_collections_browse_tree(
            user_profile.collection) if ask == 'collections' else cu._get_browse_tree(
            user_profile.collection)
        tree = cu.build_user_raw_tree(request, browse_tree)

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

        (visibility_classes, visibility_title) = get_resource_visibility(
            request, resource, from_collection_root)

        context = {
            'resource': serialize_collection_resource(
                new_resource, visibility_classes, visibility_title)
        }

        return APIUtilities._api_success(context)

    except:
        context = {
            'title': 'Could not copy the resource.',
            'message': 'We failed to make a copy of the resource. Please '
            + 'contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)


def serialize_collection_resource(resource, visibility_classes, visibility_title):
    import oer.CollectionUtilities as cu
    cu.set_resources_type([resource])
    cu.preprocess_collection_listings([resource])

    serialized_resource = {
        'id': resource.id,
        'title': resource.title,
        'category': 'resource',
        'thumbnail': settings.MEDIA_URL + resource.image.name,
        'type': resource.type,
        'visibility': resource.visibility,
        'modified':  resource.created.isoformat(),
        'url': resource.open_url if hasattr(resource, 'open_url') else reverse(
            'read', kwargs={
                'resource_id': resource.id,
                'resource_slug': resource.slug
            }
        ),
        'host': 'profile',
        'open_url': resource.open_url if hasattr(resource, 'open_url') else None,
        'visibility_classes': visibility_classes,
        'visibility_title': visibility_title
    }

    return serialized_resource


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
        source=resource.source
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

    for category in resource.categories.all():
        resource_copy.categories.add(category)

    # Copy all the tags of the resource.
    for tag in resource.tags.all():
        resource_copy.tags.add(tag)

    # Add every collaborator to the new resource.
    for collaborator in resource.collaborators.all():
        resource_copy.collaborators.add(collaborator)
    resource_copy.save()

    return (resource_copy, resource_type)


def copy_collection(collection, to_collection, user, flattened_tree, visibility_transform):
    import oer.CollectionUtilities as cu 

    # Make a copy of the collection.
    collection_copy = Collection(
        title='Copy of ' + collection.title,
        host=to_collection,
        visibility=visibility_transform if visibility_transform else collection.visibility,
        slug=cu._get_fresh_collection_slug(collection.title, flattened_tree),
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
            if request.user in collection_root.admins.all():
                pass

            elif collection.visibility == 'project':
                # If the requestor is not a member of the project which hosts the collection.
                if request.user not in collection_root.confirmed_members:
                    return APIUtilities._api_unauthorized_failure()

            elif collection.visibility == 'private':
                # If the requestor isn't a collaborator on the collection to be copied.
                if request.user not in collection.collaborators.all():
                    return APIUtilities._api_unauthorized_failure()

        visibility_transform = False
        if collection_root_type.name == 'project' and to_collection_root_type.name == 'user profile':
            if collection.visibility == 'project':
                if collection_root.visibility == 'public':
                    visibility_transform = 'public'
                elif collection_root.visibility == 'private' or collection_root.visibility == 'collection':
                    visibility_transform = 'public'

        (browse_tree, flattened_tree) = cu._get_collections_browse_tree(to_collection)
        
        new_collection = copy_collection(
            collection, to_collection, request.user, flattened_tree, visibility_transform)

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


def build_export_document(request, resource_id):
    # Fetch the resource.
    try:
        resource = Resource.objects.get(pk=resource_id)
    except:
        return APIUtilities._api_not_found()

    # Return failure message if the resource is not a document.
    from django.contrib.contenttypes.models import ContentType
    document_content_type = ContentType.objects.get_for_model(Document)
    
    if resource.revision.content_type != document_content_type:
        return APIUtilities._api_failure()

    # Fetch all elements of the resource in order.
    document = build_document_view(resource.revision.content.id)

    # Build a {} of HTML'ized document elements.
    serialized_document_elements = {}

    for element in document:
        element_type = element.element.body['type']

        if element_type == 'table':
            from django.template import Template, Context
            from django.conf import settings
            table_template = Template(open(
                settings.TEMPLATE_DIR + '/templates/partials/table.html', 'r').read())
            table_context = Context({
                'table': element.element.body['data']
            })
            table_template_html = table_template.render(table_context)

            # Clean the raw template HTML produced and save.
            serialized_document_elements[element_type] = table_template_html.replace(
                '\n', '').replace('  ', '')
        elif element_type == 'textblock':
            serialized_document_elements[element_type] = element.element.body['data']

    response = {
        'title': resource.title,
        'elements': serialized_document_elements
    }

    context = {
        'document': response
    }
    return APIUtilities._api_success(context)


def autocomplete_search(request, query):
    from haystack.query import SearchQuerySet

    sqs = SearchQuerySet().autocomplete(
        content_auto=query).filter(visibility='public')[:10]

    result_set = set()
    for resource in sqs:
        result_set.add(resource.object.title)

    serialized_resources = list(result_set)

    return HttpResponse(
        json.dumps(serialized_resources), 200, content_type="application/json")


def editor_autocomplete_search(request, query):
    from haystack.query import SearchQuerySet

    sqs = SearchQuerySet().autocomplete(
        content_auto=query).filter(visibility='public')[:10]

    serialized_resources = list()
    for resource in sqs:
        serialized_resources.append({
            'id': resource.object.id,
            'user_url': reverse('user:user_profile', kwargs={
                'username': resource.object.user.username }),
            'url': reverse(
                'read', kwargs={
                    'resource_id': resource.object.id,
                    'resource_slug': resource.object.slug
                }),
            'title': resource.object.title,
            'user': resource.object.user.get_full_name(),
            'username': resource.object.user.username,
            'views': resource.object.views,
            'thumbnail': 'http://' + request.get_host(
                ) + settings.MEDIA_URL + resource.object.image.name
        })

    return HttpResponse(
        json.dumps(serialized_resources), 200, content_type="application/json")


def get_collection_from_resource(request, resource_id):
    from django.core.exceptions import MultipleObjectsReturned
    try:
        collection = Collection.objects.get(resources__id=resource_id)
    except MultipleObjectsReturned:
        collection = Collection.objects.filter(resources__id=resource_id)[0]

    context = {
        'collectionID': collection.id
    }
    return APIUtilities._api_success(context)


def get_parent_collection_from_collection(request, collection_id):
    try:
        collection = Collection.objects.get(pk=collection_id)
    except Collection.ObjectDoesNotExist:
        return APIUtilities._api_not_found()

    if collection.host_type.name == 'collection':
        context = {
            'collectionID': collection.host_id
        }
    else:
        context = {
            'collectionID': None
        }

    return APIUtilities._api_success(context)


# Templates.
def template_five_step_lesson_plan(request):
    from django.template.loader import render_to_string
    template = render_to_string('partials/five-step-lesson-plan.html')

    return HttpResponse(
        template, 200,
        content_type="text/html"
    )


def template_three_act_lesson(request):
    from django.template.loader import render_to_string
    template = render_to_string('partials/three-act-lesson.html')

    return HttpResponse(
        template, 200,
        content_type="text/html"
    )


def template_understanding_by_design_lesson_plan(request):
    from django.template.loader import render_to_string
    template = render_to_string('partials/understanding-by-design-lesson.html')

    return HttpResponse(
        template, 200,
        content_type="text/html"
    )


def template_weekly_lesson_plan(request):
    from django.template.loader import render_to_string
    template = render_to_string('partials/weekly-lesson.html')

    return HttpResponse(
        template, 200,
        content_type="text/html"
    )


def template_simple_lesson_plan(request):
    from django.template.loader import render_to_string
    template = render_to_string('partials/simple-lesson.html')

    return HttpResponse(
        template, 200,
        content_type="text/html"
    )


def post_existing_resource_collection(request):
    from django.contrib import messages
    try:
        is_resource = request.POST.get('is_resource', None) == 'true'
        resource_collection_id = request.POST.get('resource_collection_ID', None)
        standards = request.POST.getlist('standard', None)

        if is_resource and resource_collection_id:
            resource_collection = Resource.objects.get(pk=resource_collection_id)
        else:
            resource_collection = Collection.objects.get(pk=resource_collection_id)

        from meta.models import TagCategory, Tag
        tag = Tag.objects.get(title__iexact=request.POST.get(
            'type', None), category=TagCategory.objects.get(title='Resource type'))
    except:
        messages.success(request, 'Oops! Something went wrong')
        try:
            return redirect(request.META.get('HTTP_REFERER'))
        except:
            raise Http404

    try:
        from meta.models import Category
        category = Category.objects.get(pk=request.POST.get('category_id', None))

        # If there is an original resource type tag, remove.
        try:
            # Remove the original resource type tag to avoid conflicts. 
            resource_collection.tags.remove(resource_collection.tags.get(
                category=TagCategory.objects.get(title='Resource type')))
        except:
            pass

        resource_collection.save()

        resource_collection.tags.add(tag)

        standards_tag_category = TagCategory.objects.get(title='Standards')
        for standard in standards:
            try:
                standard_tag = Tag.objects.get(
                    title__iexact=standard, category=standards_tag_category)
                resource_collection.tags.add(standard_tag)
            except:
                pass

        create_new_suggestion(resource_collection, category, request.user)

        return redirect(request.META.get('HTTP_REFERER') + '?posted=success')

    except:
        messages.success(request, 'Oops! Something went wrong')
        return redirect(request.META.get('HTTP_REFERER'))


def create_new_suggestion(resource_collection, category, user):
    from oer.models import Suggestion
    new_suggestion = Suggestion(
        suggested=resource_collection,
        user=user,
        category=category
    )
    new_suggestion.save()

    from django.core.mail import mail_admins
    mail_admins('Suggestion in %s' % category.title, 
        '%s suggested %s in %s' % (user.username + ':' +
            user.email, str(resource_collection.id) + ':' + resource_collection.title,
            str(category.id) + ':' + category.title ))


def new_url_from_form(user, title, url, resource_type=None, standards=None):
    DEFAULT_COST = 0

    from meta.models import TagCategory, Tag
    
    title = title if title else 'Untitled website'

    from django.template.defaultfilters import slugify

    # Create a new resource
    new_resource = Resource(
        title=title,
        cost=DEFAULT_COST,
        user=user,
        slug=slugify(title),
        visibility='public',
        description='',
    )

    from oer.forms import sanitize_url
    new_url = Link(url=sanitize_url(url))
    new_url.save()

    new_resource_revision = ResourceRevision()
    new_resource_revision.content = new_url
    new_resource_revision.user = user
    new_resource_revision.save()

    new_resource.revision = new_resource_revision
    new_resource.save()

    if resource_type:
        tag = Tag.objects.get(title__iexact=resource_type, category=TagCategory.objects.get(title='Resource type'))
        new_resource.tags.add(tag)

    if standards:
        standards_tag_category = TagCategory.objects.get(title='Standards')
        for standard in standards:
            try:
                standard_tag = Tag.objects.get(
                    title__iexact=standard, category=standards_tag_category)
                new_resource.tags.add(standard_tag)
            except:
                pass

    # Push a signal for new resource created.     
    import oer.CollectionUtilities as cu
    (collection_host_type, collection_host) = cu.get_collection_root(
        user.get_profile().collection)
    Resource.resource_created.send(
        sender="Resources", resource=new_resource,
        context_type='user profile', context=user.get_profile()
    )

    # Assign this resource to the revision created.
    new_resource.revision.resource = new_resource
    new_resource.revision.save()

    # Now add this resource to the collection it belongs to.
    user.get_profile().collection.resources.add(new_resource)
    user.get_profile().collection.save()

    return new_resource


def post_url(request):
    try:
        from meta.models import Category
        category_id = request.POST.get('category_id', None)
        resource_type = request.POST.get('type', None)
        standards = request.POST.getlist('standard', None)

        new_resource = new_url_from_form(
            request.user, request.POST.get('title', None),
            request.POST.get('url', None),
            resource_type, standards)

        category = Category.objects.get(pk=category_id)
        create_new_suggestion(new_resource, category, request.user)

        return APIUtilities.success({
            'resource': {
                'id': new_resource.id,
                'title': new_resource.title
            }
        })

    except:
        context = {
            'title': 'Could not complete that request.',
            'message': 'We failed to share this URL, and our apologies for that'
            + 'We are working on fixing the issue. Please contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)


def load_resources(request, collection_id, resource_count):
    try:
        collection = Collection.objects.get(pk=collection_id)
    except:
        return APIUtilities._api_not_found()

    resource_list = collection.resources.all()[(int(resource_count)):(
        int(resource_count) + 20)]

    serialized_resources = {}

    import oer.CollectionUtilities as cu
    cu.set_resources_type(resource_list)
    cu.preprocess_collection_listings(resource_list)

    (collection_root_host_type, collection_root) = cu.get_collection_root(
        collection)

    for resource in resource_list:
        # Run through general visibility filter
        if resource.visibility != 'public':
            if request.user != collection_root.user and request.user not in resource.collaborators.all():
                continue

        (visibility_classes, visibility_title) = get_resource_visibility(
            request, resource, collection_root)

        serialized_resources[resource.id] = serialize_collection_resource(
            resource, visibility_classes, visibility_title)

    context = {
        'resources': serialized_resources
    }
    return APIUtilities._api_success(context)


def get_resource_visibility(request, resource, collection_root):
    visibility_classes = ''
    if request.user == collection_root:
        visibility_classes += ' profile-collection is-owner'
    elif request.user == resource.user:
        visibility_classes += ' is-owner'
    elif resource.visibility == 'private' and request.user in resource.collaborators.all():
        visibility_classes += ' is-collaborator'

    if request.user != resource.user:
        visibility_classes += 'unclickable'
    elif resource.visibility == 'private' and request.user not in resource.collaborators.all(
        ) and request.user != resource.user:
        visibility_classes += 'unclickable'

    # TODO(Varun): Merge this into the upper logic block.
    if resource.visibility == 'public':
        visibility_title = 'Public'
        visibility_classes += ' publicly-shared-icon'
    elif resource.user != request.user and resource.visibility == 'private':
            visibility_title = 'Shared with me'
            visibility_classes += ' Shared-with-me-icon'
    else:
        if resource.visibility == 'private':
            if len(resource.collaborators.all()) == 0:
                visibility_title = 'Only me'
                visibility_classes += ' personal-shared-icon'
            else:
                visibility_title = 'Shared'
                visibility_classes += ' private-shared-icon'

    return (visibility_classes, visibility_title)


def load_category_resources(request, category_id, resource_count):
    from oer.Browse import Browse
    browse = Browse(request)
    browse.current_category_id = category_id
    browse.resource_count = resource_count

    return browse.load()


def get_serialized_resources(resources):
    from oer.Browse import Browse
    return Browse.serialize(resources)


def search_category(request, category_id, query):
    from oer.Browse import Browse
    browse = Browse(request)
    browse.current_category_id = category_id

    return browse.search(query)


def get_child_categories(request, category_id):
    from meta.models import Category
    root_category = Category.objects.get(pk=category_id)

    # Get all categories whose parent is root_category.
    child_categories = Category.objects.filter(parent=root_category).order_by(
        'position')

    serialized_categories = []
    for category in child_categories:
        serialized_categories.append({
            'id': category.id,
            'title': category.title,
            'slug': category.slug,
            'position': category.position
        })

    context = {
        'categories': serialized_categories
    }
    return APIUtilities._api_success(context)


def request_for_information(request, resource_id):
    try:
        resource = Resource.objects.get(pk=resource_id)
    except:
        return APIUtilities._api_not_found()

    try:
        from django.core.mail import mail_admins
        mail_admins('Request for information', 
            '%s wants info on %s' % (request.user.username + ':' +
                request.user.email, str(resource.id) + ':' + resource.title))

        return APIUtilities._api_success()

    except:
        context = {
            'title': 'Could not complete that request.',
            'message': 'We failed to request for information on this resource, '
            + 'and our apologies for that. Please contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)


def auto_save_document(request):
    try:
        (document, document_creation_success) = create_document_resource(request)
    except:
        return APIUtilities._api_not_found()

    if document_creation_success:
        context = {
            'resource': {
                'id': document.id
            }
        }

        return APIUtilities._api_success(context)
    else:
        context = {
            'title': 'Could not auto-save the document.',
            'message': 'We failed to save the document, and our apologies for that. '
            + 'Please contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)


def approve_suggestion(request, suggestion_id):
    from oer.models import Suggestion
    try:
        suggestion = Suggestion.objects.get(pk=suggestion_id)
    except:
        return APIUtilities._api_not_found()

    try:
        suggestion.suggested.categories.add(suggestion.category)
        send_suggestion_message(request, suggestion, 'Your submission has been ACCEPTED! more below')
        suggestion.delete()

        return APIUtilities._api_success()

    except:
        context = {
            'title': 'Could not approve the suggestion.',
            'message': 'We failed approve this suggestion and add it to the listings. '
            + 'Please contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)


def reject_suggestion(request, suggestion_id):
    from oer.models import Suggestion
    try:
        suggestion = Suggestion.objects.get(pk=suggestion_id)
    except:
        return APIUtilities._api_not_found()

    try:
        send_suggestion_message(request, suggestion, 'Your submission has been rejected; here\'s why')
        suggestion.delete()

        return APIUtilities._api_success()

    except:
        context = {
            'title': 'Could not approve the suggestion.',
            'message': 'We failed approve this suggestion and add it to the listings. '
            + 'Please contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)


def send_suggestion_message(request, suggestion, subject):
    from django.core.mail import EmailMultiAlternatives

    email_message_text = 'Message from the moderator about your suggestion \'%s\':\n\n%s' % (
        suggestion.suggested.title, request.POST.get('message'))
    email_message_html = '<strong>Message from the moderator about your suggestion \'%s\'</strong>:<br/><br/>%s' % (
        suggestion.suggested.title, request.POST.get('message').replace('\\n', '<br/>'))

    # Send the email with the fields prepared above.
    subject, from_email, to = subject, '%s via OpenCurriculum <%s>' % (request.user.get_full_name(), request.user.email), [suggestion.user.email]
    email = EmailMultiAlternatives(subject, email_message_text, from_email, to)
    email.attach_alternative(email_message_html, "text/html")
    email.send()