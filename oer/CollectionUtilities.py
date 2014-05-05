from oer.models import Collection
from xml.etree import ElementTree
from django.core.urlresolvers import reverse
from django.conf import settings
import itertools


def get_collection_root(collection):
    if collection.host_type.name == 'unit':
        return get_collection_root(Collection.objects.get(units=collection.host))
    elif collection.host_type.name != 'collection':
        return (collection.host_type, collection.host)
    else:
        return get_collection_root(collection.host)


def get_root_private_collection(collection):
    if collection.visibility != 'collection':
        return collection
    else:
        return get_collection_root(collection.host)


def _get_child_collections(collection, get_units=False):
    # Get all the collections whose parent is the root collection.
    from django.contrib.contenttypes.models import ContentType
    collections_type = ContentType.objects.get_for_model(Collection)

    child_collections = Collection.objects.filter(
        host_id=collection.id, host_type=collections_type)

    if get_units:
        # Get the unit collections.
        child_unit_collections = _get_child_unit_collections(collection.units.all())
        return list(child_collections) + list(child_unit_collections)

    return list(child_collections)


def _get_child_unit_collections(units):
    from oer.models import Unit
    from django.contrib.contenttypes.models import ContentType
    unit_type = ContentType.objects.get_for_model(Unit)

    child_unit_collections = []
    for unit in units:
        child_unit_collections.append(Collection.objects.get(
            host_id=unit.id, host_type=unit_type))
    return child_unit_collections


def _get_child_collections_resources(collection):
    # Executes if the collection is actually a collection object and not a resource.
    try:
        child_resources = collection.resources.all()
        child_collections = _get_child_collections(collection)
        child_unit_collections = _get_child_unit_collections(collection.units.all())
        return list(child_collections) + list(child_unit_collections) + list(child_resources)

    except:
        pass

    return []

"""
def list_collection(collection_slug, root_collection):
    collection = Collection.objects.get(slug=collection_slug)
    root_assets = collection.resources

    child_collections = _get_child_collections(collection)

    (browse_tree, flattened_tree) = _get_browse_tree(root_collection)

    context = {
        'resources': root_assets.all(),
        'collections': child_collections,
        'browse_tree': browse_tree,
    }
    return context
"""

def _get_browse_tree(collection):
    return buildChildCollections({'root': [collection]}, [], True)


def _get_collections_browse_tree(collection):
    return buildChildCollections({'root': [collection]}, [], False)


def buildChildCollections(collectionModel, flattenedDescendants, include_resources=False):
    """Adapted from buildChildCategories() in articles.views"""
    # Get the child collections of this collection recursively
    if len(collectionModel) == 0:
        return (None, flattenedDescendants)
    else:
        # Get all child collections whose children need to be found
        colValues = collectionModel.values()

        # Chain all the contents of the values
        childCollections = list(itertools.chain.from_iterable(colValues))

        # Create a master list [] of all { parent : [child, child] } mapping
        children = map(_has_immediate_children, childCollections) if include_resources else map(
            _hasImmediateCollectionChildren, childCollections)

        # Flatten the {} objects in the master list into one new dict
        collectionModel = {}
        for child in children:
            try:
                for k, v in child.iteritems():
                    collectionModel[k] = v
            except:
                pass

        # Call this function recursively to obtain the current models'
        #     descendant child categories
        (descendantsTree, descendantsFlattened) = buildChildCollections(
            collectionModel, childCollections, include_resources
        )

        # Append "my" descendants to the descendants of "my" children
        flattenedDescendants += descendantsFlattened

        if descendantsTree is not None:
            # Iterate through all the dictionary keys, and replace the collection
            #     model items, and return the collection model
            for val in collectionModel.itervalues():
                for v in val:
                    for a, b in descendantsTree.iteritems():
                        if a == v:
                            val[val.index(v)] = {a: b}
            return (collectionModel, flattenedDescendants)
        else:
            return (collectionModel, flattenedDescendants)


def _has_immediate_children(collection):
    """Adapted from _hasImmediateChildren() in articles.views"""
    children = list(_get_child_collections_resources(collection))
    if len(children) > 0:
        return {collection: children}
    else:
        return None


def _hasImmediateCollectionChildren(collection):
    """Adapted from _hasImmediateChildren() in articles.views"""
    childCollections = list(_get_child_collections(collection, True))
    if len(childCollections) > 0:
        return {collection: childCollections}
    else:
        return None


def build_project_collection_navigation(browse_tree, user):
    root = ElementTree.Element('ul')

    # Get the project that owns the root collection
    root_collection = get_root_key(browse_tree)

    # HACK(Varun): If there are children
    if root_collection:
        from projects.models import Project
        project = Project.objects.get(collection=root_collection)

        projectRootElement = ElementTree.Element('li')

        projectHref = ElementTree.SubElement(projectRootElement, 'a')
        projectHref.set('href', _get_browse_url(project))
        projectHref.set('id', 'collection-' + str(root_collection.id))
        projectHref.text = project.title

        projectRootList = ElementTree.Element('ul')

        child_nodes = build_child_tree(
            browse_tree, project, _get_project_collection_url,
            _get_project_resource_url, user, 'project')
        for node in child_nodes:
            projectRootList.append(node)

        projectRootElement.append(projectRootList)
        root.append(projectRootElement)

        return ElementTree.tostring(root)
    else:
        return ''


def build_projects_collection_navigation(browse_trees, user):
    navigation_elements = ''

    for browse_tree in browse_trees:
        navigation_elements += build_project_collection_navigation(browse_tree, user)

    return navigation_elements


def build_user_collection_navigation(browse_tree, user):
    root = ElementTree.Element('ul')

    # Get the project that owns the root collection
    root_collection = get_root_key(browse_tree)

    # HACK(Varun): If there are children
    if root_collection:    
        from user_account.models import UserProfile
        user_profile = UserProfile.objects.get(collection=root_collection)
        
        userRootElement = ElementTree.Element('li')

        profileHref = ElementTree.SubElement(userRootElement, 'a')
        profileHref.set('href', _get_user_profile(user_profile))
        profileHref.set('id', 'collection-' + str(root_collection.id))
        profileHref.text = user_profile.user.get_full_name()

        userRootList = ElementTree.Element('ul')

        child_nodes = build_child_tree(
            browse_tree, user_profile, _get_user_collection_url,
            _get_user_resource_url, user, 'profile')
        for node in child_nodes:
            userRootList.append(node)

        userRootElement.append(userRootList)
        root.append(userRootElement)

        return ElementTree.tostring(root)
    else:
        return ''


def build_child_tree(root_node, collection_owner, collection_url_creator, resource_url_creator, user, host_type):
    # Get the list of child of this node.
    nodes = list(itertools.chain.from_iterable(root_node.values()))
    node_elements = []

    # Create <li> nodes for each.
    for node in nodes:
        node_element = ElementTree.Element('li')

        if type(node) is dict:
            current_node = get_root_key(node)
        else:
            current_node = node

        node_visibility = current_node.visibility

        # Determine whether the node is a resource or collection.
        try:
            node_creator = current_node.creator
            node_type = 'collection'
        except:
            node_creator = current_node.user
            node_type = 'resource'

        if host_type == 'profile':
            if node_visibility != 'public':
                if user not in current_node.collaborators.all() and user != node_creator:
                    continue

        if host_type == 'project':
            if node_visibility == 'project':
                if collection_owner.visibility != 'public':
                    if user not in collection_owner.confirmed_members:
                        continue

            if node_visibility == 'private':
                if user not in current_node.collaborators.all() and user != node_creator:
                    continue

        # If this child has other children, build child tree.
        # Has to be the case of our collection.
        if type(node) is dict:
            # Set a class to indicate that this element has child collections.
            node_element.set('class', 'parent-collection')

            node_toggler = ElementTree.SubElement(node_element, 'span')
            node_toggler.set('class', 'toggle-collection')
            node_toggler.text = ' '

            node_href = ElementTree.SubElement(node_element, 'a')

            node_href.set('href', collection_url_creator(collection_owner, current_node.slug))
            node_href.set('id', 'collection-' + str(current_node.id))
            node_href.text = current_node.title

            nodeList = ElementTree.SubElement(node_element, 'ul')

            child_nodes = build_child_tree(
                node, collection_owner, collection_url_creator, resource_url_creator, user, 'collection')
            for child_node in child_nodes:
                nodeList.append(child_node)

        # Otherwise, append a child <a> element as is.
        # Can be a resource or a collection.
        else:
            # Set a class to indicate that this element does not have child collections.
            node_element.set(
                'class', 'empty-collection' if node_type == 'collection' else 'empty-resource')

            node_toggler = ElementTree.SubElement(node_element, 'span')
            node_toggler.set(
                'class', 'toggle-collection' if node_type == 'collection' else 'toggle-resource')
            node_toggler.text = ' '

            node_href = ElementTree.SubElement(node_element, 'a')
            
            if node_type == 'collection':
                node_href.set('href', collection_url_creator(collection_owner, node.slug))
            else:
                node_href.set('href', resource_url_creator(collection_owner, node))

            node_href.set(
                'id', ('collection-' if node_type == 'collection' else 'resource-') + str(
                    node.id))
            node_href.text = node.title

        node_elements.append(node_element)

    return node_elements


def get_root_key(value):
    # NOTE(Varun): This function may be written better to only iterate through
    #     once and return the first value
    root_elements = []
    for root_element in value.keys():
        root_elements.append(root_element)

    try:
        return root_elements[0]
    except:
        return None


def _get_browse_url(project):
    return reverse(
        'projects:project_browse', kwargs={
            'project_slug': project.slug,
        }
    )    


def _get_project_collection_url(project, collection_slug):
    return reverse(
        'projects:list_collection', kwargs={
            'project_slug': project.slug,
            'collection_slug': collection_slug
        }
    )


def _get_user_collection_url(user_profile, collection_slug): 
    return reverse(
        'user:list_collection', kwargs={
            'username': user_profile.user.username,
            'collection_slug': collection_slug
        }
    )


def _get_user_resource_url(user_profile, resource):
    return reverse(
        'read', kwargs={
            'resource_id': resource.id,
            'resource_slug': resource.slug
        }
    )


def _get_project_resource_url(project, resource):
    return reverse(
        'projects:read_project_resource', kwargs={
            'project_slug': project.slug,
            'resource_id': resource.id,
            'resource_slug': resource.slug
        }
    )


def _get_user_profile(user_profile):
    return reverse(
        'user:user_files', kwargs={
            'username': user_profile.user.username,
        }
    )


def set_resources_type(resources):
    from django.contrib.contenttypes.models import ContentType
    from oer.models import Document, Link, Attachment
    document_content_type = ContentType.objects.get_for_model(Document)
    link_content_type = ContentType.objects.get_for_model(Link)
    attachment_content_type = ContentType.objects.get_for_model(Attachment)

    for resource in resources:
        if resource.revision.content_type == document_content_type:
            resource.type = "document"
        elif resource.revision.content_type == link_content_type:
            import ResourceUtilities as ru
            resource.type = ru.get_resource_type_from_url(resource)

        elif resource.revision.content_type == attachment_content_type:
            resource.type = "attachment"


def preprocess_collection_listings(resources):
    from oer.models import Link, Attachment
    from django.contrib.contenttypes.models import ContentType
    link_content_type = ContentType.objects.get_for_model(Link)
    attachment_content_type = ContentType.objects.get_for_model(Attachment)
    import oer.ResourceUtilities as ru
    from os.path import splitext

    for resource in resources:
        if resource.revision.content_type == link_content_type:
            (hostname, url_data) = ru.get_url_hostname(resource.revision.content.url)

            if ('docs' in hostname and 'google' in hostname) and (
                'document' in url_data.path):
                resource.open_url = resource.revision.content.url
                resource.type = 'gdoc'

            if ('docs' in hostname and 'google' in hostname) and (
                'presentation' in url_data.path):
                resource.type = 'gpres'

            elif 'dropbox' in hostname and 'sh' in url_data.path:
                resource.open_url = resource.revision.content.url
                resource.type = 'dropbox'

            elif ('drive' in hostname and 'google' in hostname) and (
                'folders' in url_data.fragment):
                resource.open_url = resource.revision.content.url
                resource.type = 'gfolder'
        
        elif resource.revision.content_type == attachment_content_type:
            name, resource.extension = splitext(resource.revision.content.file.name)

            document = [".doc", ".docx", ".rtf", "odt"]
            presentation = [".key", ".keynote", ".ppt", ".pptx", ".odp"]
            spreadsheet = [".xls", ".xlsx", ".ods", ".csv"]
            pdf = [".pdf"]
            image = [".jpg", ".jpeg", ".png", ".bmp", ".eps", ".ps", ".gif", ".tiff"]

            ext = str.lower(str(resource.extension))
            if ext in document:
                resource.type = 'document'
            elif ext in pdf:
                resource.type = 'pdf'
            elif ext in presentation:
                resource.type = 'presentation'
            elif ext in spreadsheet:
                resource.type = 'spreadsheet'
            elif ext in image:
                resource.type = 'image'
            else:
                resource.type = 'upload'


def build_projects_raw_tree(request, browse_trees):
    raw_tree = []
    for browse_tree in browse_trees:
        raw_tree.append(build_project_raw_tree(request, browse_tree))
    return raw_tree


def build_user_raw_tree(request, browse_tree):
    root = {}
    root_collection = get_root_key(browse_tree)

    if root_collection:
        root[root_collection.host.user.get_full_name()] = {
            'id': root_collection.id,
            'title': root_collection.title,
            'visibility': root_collection.visibility,
            'url': _get_user_collection_url(root_collection.host, root_collection),
            'user_url': reverse('user:user_profile', kwargs={
                'username': root_collection.creator.username }),
            'user': root_collection.creator.get_full_name(),
            'username': root_collection.creator.username,
            'thumbnail': 'http://' + request.get_host(
                ) + settings.STATIC_URL + 'images/folder-icon.png',
            'items': build_child_raw_tree(
                browse_tree, root_collection.host,
                _get_user_collection_url, _get_user_resource_url,
                request.user, 'profile', request.get_host()
            )
        }

        return root
    else:
        return {}


def build_child_raw_tree(root_node, collection_owner, collection_url_creator, resource_url_creator, user, host_type, host):
    # Get the list of child of this node.
    nodes = list(itertools.chain.from_iterable(root_node.values()))
    node_elements = []

    # Create <li> nodes for each.
    for node in nodes:
        node_element = {}

        if type(node) is dict:
            current_node = get_root_key(node)
        else:
            current_node = node

        node_visibility = current_node.visibility

        # Determine whether the node is a resource or collection.
        try:
            node_creator = current_node.creator
            node_type = 'collection'
        except:
            node_creator = current_node.user
            node_type = 'resource'

        if host_type == 'profile':
            if node_visibility != 'public':
                if user not in current_node.collaborators.all() and user != node_creator:
                    continue

        if host_type == 'project':
            if node_visibility == 'project':
                if collection_owner.visibility != 'public':
                    if user not in collection_owner.confirmed_members:
                        continue

            if node_visibility == 'private':
                if user not in current_node.collaborators.all() and user != node_creator:
                    continue

        # If this child has other children, build child tree.
        # Has to be the case of our collection.
        if type(node) is dict:
            node_element['type'] = 'collection'
            node_element['collection'] = {
                'id': current_node.id,
                'title': current_node.title,
                'visibility': current_node.visibility,
                'url': collection_url_creator(collection_owner, current_node),
                'user_url': reverse('user:user_profile', kwargs={
                    'username': current_node.creator.username }),
                'user': current_node.creator.get_full_name(),
                'username': current_node.creator.username,
                'thumbnail': 'http://' + host + settings.STATIC_URL + 'images/folder-icon.png',
                'items': build_child_raw_tree(
                    node, collection_owner, collection_url_creator, 
                    resource_url_creator, user, 'collection', host
                )
            }

        # Otherwise, append a child <a> element as is.
        # Can be a resource or a collection.
        else:
            node_element['type'] = 'collection' if node_type == 'collection' else 'resource'
            
            if node_type == 'collection':
                node_element['collection'] = {
                    'id': node.id,
                    'title': node.title,
                    'visibility': node.visibility,
                    'url': collection_url_creator(collection_owner, node),
                    'user_url': reverse('user:user_profile', kwargs={
                        'username': node.creator.username }),
                    'user': node.creator.get_full_name(),
                    'username': node.creator.username,
                    'thumbnail': 'http://' + host + settings.STATIC_URL + 'images/folder-icon.png',
                    'items': []
                }
            else:
                node_element['resource'] = {
                    'id': node.id,
                    'title': node.title,
                    'visibility': node.visibility,
                    'url': resource_url_creator(collection_owner, node),
                    'user_url': reverse('user:user_profile', kwargs={
                        'username': node.user.username }),
                    'user': node.user.get_full_name(),
                    'username': node.user.username,
                    'views': node.views,
                    'thumbnail': 'http://' + host + settings.MEDIA_URL + node.image.file.name,
                    'items': []
                }

        node_elements.append(node_element)

    return node_elements


def build_project_raw_tree(request, browse_tree):
    root = {}
    root_collection = get_root_key(browse_tree)

    if root_collection:
        root[root_collection.host.title] = {
            'id': root_collection.id,
            'title': root_collection.title,
            'visibility': root_collection.visibility,
            'url': _get_project_collection_url(root_collection.host, root_collection),
            'user_url': reverse('user:user_profile', kwargs={
                'username': root_collection.creator.username }),
            'user': root_collection.creator.get_full_name(),
            'username': root_collection.creator.username,
            'thumbnail': 'http://' + request.get_host(
                ) + settings.STATIC_URL + 'images/folder-icon.png',
            'items': build_child_raw_tree(
                browse_tree, root_collection.host,
                _get_project_collection_url, _get_project_resource_url,
                request.user, 'project', request.get_host()
            )
        }        

        return root
    else:
        return {}


def _get_fresh_collection_slug(title, flattened_tree):
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


def build_collection_breadcrumb(collection):
    # Get the root of this collection ('project' or 'user profile')
    (collection_root_type, collection_root) = get_collection_root(collection)

    # Create breadcrumb list
    breadcrumb = []

    while True:
        if collection.host_type.name == 'collection':
            breadcrumb.append(host_urlize(
                collection, collection_root, collection_root_type))
            collection = collection.host
        elif collection.host_type.name == 'unit':
            collection = Collection.objects.get(units=collection.host)
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
                'user:user_files', kwargs={
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
