from django import template
from xml.etree import ElementTree
from django.core.urlresolvers import reverse
import itertools

register = template.Library()


@register.filter(is_safe=True)
def project_navigation_tree(value, user):
    import oer.CollectionUtilities as cu
    return cu.build_project_collection_navigation(value, user)


@register.filter(is_safe=True)
def user_navigation_tree(value, user):
    import oer.CollectionUtilities as cu
    return cu.build_user_collection_navigation(value, user)


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
            nodeHref = ElementTree.SubElement(nodeElement, 'a')
            root_node = get_root_key(node)

            nodeHref.set('href', urlCreator(collectionOwner, root_node.slug))
            nodeHref.text = root_node.title

            nodeList = ElementTree.SubElement(nodeElement, 'ul')

            child_nodes = build_child_tree(
                node, collectionOwner, urlCreator, user, 'collection')
            for child_node in child_nodes:
                nodeList.append(child_node)

        # Otherwise, append a child <a> element as is.
        else:
            nodeHref = ElementTree.SubElement(nodeElement, 'a')
            nodeHref.set('href', urlCreator(collectionOwner, node.slug))
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
