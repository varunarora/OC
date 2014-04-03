from django import template
from xml.etree import ElementTree
from django.core.urlresolvers import reverse
import itertools

register = template.Library()

@register.filter(is_safe=True)
def category_resource_navigation(value, selected_category):
    return build_category_resource_navigation(value, selected_category)


def build_category_resource_navigation(browse_tree, selected_category):
    root = ElementTree.Element('ul')

    # Get the category that owns the root child categories to be displayed.
    root_category = get_root_key(browse_tree)

    # HACK(Varun): If there are children
    if root_category:
        child_nodes = build_child_tree(
            browse_tree, _get_category_url, 0, selected_category)
        
        for node in child_nodes:
            root.append(node)

        return ElementTree.tostring(root)
    else:
        return ''


def build_child_tree(root_node, url_creator, level, selected_category):
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

        class_attribute = ''

        try:
            if current_node.id == selected_category.id:
               class_attribute = ' selected-category'
        except:  # Usually when this is a search query.
            pass

        # If this category has other children, build child tree.
        if type(node) is dict:
            # Set a class to indicate that this element has child collections.
            node_element.set('class', 'parent-category' + class_attribute)

            node_href = ElementTree.SubElement(node_element, 'a')
            node_href.set('href', url_creator(current_node))
            node_href.text = current_node.title

            if level < 1 and current_node.id == selected_category.id:
                node_list = ElementTree.SubElement(node_element, 'ul')

                child_nodes = build_child_tree(node, url_creator, level+1, selected_category)
                for child_node in child_nodes:
                    node_list.append(child_node)

        # Otherwise, append a child <a> element as is.
        else:
            # Set a class to indicate that this element does not have child categories.
            node_element.set('class', 'empty-category' + class_attribute)

            node_href = ElementTree.SubElement(node_element, 'a')
            node_href.set('href', url_creator(current_node))
            node_href.text = current_node.title

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


def _get_category_url(node):
    import meta.CategoryUtilities as catU
    breadcrumb = catU.build_breadcrumb(node)
    return reverse(
        'browse', kwargs={
            'category_slug': breadcrumb[0].url
        }
    )
