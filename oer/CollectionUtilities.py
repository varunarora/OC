from oer.models import Collection
from xml.etree import ElementTree
from django.core.urlresolvers import reverse
import itertools


def get_collection_root(collection):
    if collection.host_type.name != 'collection':
        return (collection.host_type, collection.host)
    else:
        return get_collection_root(collection.host)


def _get_child_collections(collection):
    # Get all the collections whose parent is the root collection.
    from django.contrib.contenttypes.models import ContentType
    collections_type = ContentType.objects.get_for_model(Collection)
    child_collections = Collection.objects.filter(
        host_id=collection.id, host_type=collections_type)

    return child_collections

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
    return buildChildCollections({'root': [collection]}, [])


def buildChildCollections(collectionModel, flattenedDescendants):
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
        children = map(_hasImmediateChildren, childCollections)

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
            collectionModel, childCollections
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


def _hasImmediateChildren(collection):
    """Adapted from _hasImmediateChildren() in articles.views"""
    childCollections = list(_get_child_collections(collection))
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
            browse_tree, project, _get_project_url, user, 'project')
        for node in child_nodes:
            projectRootList.append(node)

        projectRootElement.append(projectRootList)
        root.append(projectRootElement)

        return ElementTree.tostring(root)
    else:
        return ''


def build_user_collection_navigation(browse_tree, user):
    root = ElementTree.Element('ul')

    # Get the project that owns the root collection
    root_collection = get_root_key(browse_tree)

    from user_account.models import UserProfile
    user_profile = UserProfile.objects.get(collection=root_collection)

    # HACK(Varun): If there are children
    if root_collection:
        userRootElement = ElementTree.Element('li')

        profileHref = ElementTree.SubElement(userRootElement, 'a')
        profileHref.set('href', _get_user_profile(user))
        profileHref.set('id', 'collection-' + str(root_collection.id))
        profileHref.text = user.get_full_name()

        userRootList = ElementTree.Element('ul')

        child_nodes = build_child_tree(
            browse_tree, user_profile, _get_user_url, user, 'user')
        for node in child_nodes:
            userRootList.append(node)

        userRootElement.append(userRootList)
        root.append(userRootElement)

        return ElementTree.tostring(root)
    else:
        return ''


def build_child_tree(root_node, collectionOwner, urlCreator, user, host_type):
    # Get the list of child of this node.
    nodes = list(itertools.chain.from_iterable(root_node.values()))
    nodeElements = []

    # Create <li> nodes for each.
    for node in nodes:
        nodeElement = ElementTree.Element('li')

        if host_type == 'project':
            if type(node) is dict:
                node_visibility = get_root_key(node).visibility          
            else:
                node_visibility = node.visibility

            # Get the root project
            if node_visibility != 'public' and user not in collectionOwner.confirmed_members:
                continue

        # If this child has other children, build child tree.
        if type(node) is dict:
            # Set a class to indicate that this element has child collections.
            nodeElement.set('class', 'parent-collection')

            nodeToggler = ElementTree.SubElement(nodeElement, 'span')
            nodeToggler.set('class', 'toggle-collection')
            nodeToggler.text = ' '

            nodeHref = ElementTree.SubElement(nodeElement, 'a')
            root_node = get_root_key(node)

            nodeHref.set('href', urlCreator(collectionOwner, root_node.slug))
            nodeHref.set('id', 'collection-' + str(root_node.id))
            nodeHref.text = root_node.title

            nodeList = ElementTree.SubElement(nodeElement, 'ul')

            child_nodes = build_child_tree(
                node, collectionOwner, urlCreator, user, 'collection')
            for child_node in child_nodes:
                nodeList.append(child_node)

        # Otherwise, append a child <a> element as is.
        else:
            # Set a class to indicate that this element does not have child collections.
            nodeElement.set('class', 'empty-collection')

            nodeToggler = ElementTree.SubElement(nodeElement, 'span')
            nodeToggler.set('class', 'toggle-collection')
            nodeToggler.text = ' '

            nodeHref = ElementTree.SubElement(nodeElement, 'a')
            nodeHref.set('href', urlCreator(collectionOwner, node.slug))
            nodeHref.set('id', 'collection-' + str(node.id))
            nodeHref.text = node.title

        nodeElements.append(nodeElement)

    return nodeElements


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


def _get_project_url(project, collection_slug):
    return reverse(
        'projects:list_collection', kwargs={
            'project_slug': project.slug,
            'collection_slug': collection_slug
        }
    )


def _get_user_url(user_profile, collection_slug): 
    return reverse(
        'user:list_collection', kwargs={
            'username': user_profile.user.username,
            'collection_slug': collection_slug
        }
    )


def _get_user_profile(user):
    return reverse(
        'user:user_profile', kwargs={
            'username': user.username,
        }
    )    
