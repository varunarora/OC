from django.http import HttpResponse
from django.shortcuts import render
from meta.models import Tag, TagCategory
from oc_platform import APIUtilities
from xml.etree import ElementTree
import itertools


def get_standards_tree(request):
    tag_category = TagCategory.objects.get(title='Standards')

    try:
        (browse_tree, flattened_tree) = get_tag_browse_tree(tag_category)

        tree = build_tag_navigation(browse_tree)       

        context = { 'tree': tree }
        return APIUtilities._api_success(context)
    except:
        context = {
            'title': 'Could not load the standards list',
            'message': 'We failed to load the list of standards for you. '
            + 'Please contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)


def get_tag_browse_tree(tag_category):
    return build_child_tags({'root': [tag_category]}, [])



def build_child_tags(tags_model, flattened_descendants):
    """Adapted from buildChildCategories() in articles.views"""
    # Get the child tags of this tag categort recursively
    if len(tags_model) == 0:
        return (None, flattened_descendants)
    else:
        # Get all child categories whose children need to be found
        tag_values = tags_model.values()

        # Chain all the contents of the values
        child_tags = list(itertools.chain.from_iterable(tag_values))

        # Create a master list [] of all { parent : [child, child] } mapping
        children = map(_has_immediate_tag_children, child_tags)

        # Flatten the {} objects in the master list into one new dict
        tags_model = {}
        for child in children:
            try:
                for k, v in child.iteritems():
                    tags_model[k] = v
            except:
                pass

        # Call this function recursively to obtain the current models'
        #     descendant child categories
        (descendants_tree, descendants_flattened) = build_child_tags(
            tags_model, child_tags
        )

        # Append "my" descendants to the descendants of "my" children
        flattened_descendants += descendants_flattened

        if descendants_tree is not None:
            # Iterate through all the dictionary keys, and replace the category
            #     model items, and return the category model
            for val in tags_model.itervalues():
                for v in val:
                    for a, b in descendants_tree.iteritems():
                        if a == v:
                            val[val.index(v)] = {a: b}
            return (tags_model, flattened_descendants)
        else:
            return (tags_model, flattened_descendants)


def build_tag_navigation(browse_tree):
    root = ElementTree.Element('ul')
    standard = get_root_key(browse_tree)

    if standard:
        standardsRoot = ElementTree.Element('li')

        standardItem = ElementTree.SubElement(standardsRoot, 'a')
        standardItem.text = standard.title

        standardsRootList = ElementTree.Element('ul')

        child_nodes = build_child_tree(browse_tree)
        for node in child_nodes:
            standardsRootList.append(node)

        standardsRoot.append(standardsRootList)
        root.append(standardsRoot)

        return ElementTree.tostring(root)
    else:
        return ''


def build_child_tree(root_node):
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

        # If this child has other children, build child tree.
        # Has to be the case of our tag category.
        if type(node) is dict:
            # Set a class to indicate that this element has child collections.
            node_element.set('class', 'parent-tag-category')

            node_toggler = ElementTree.SubElement(node_element, 'span')
            node_toggler.set('class', 'toggle-tag-category')
            node_toggler.text = ' '

            node_href = ElementTree.SubElement(node_element, 'a')
            node_href.set('id', 'tag-category-' + str(current_node.id))            
            node_href.text = current_node.title

            nodeList = ElementTree.SubElement(node_element, 'ul')

            child_nodes = build_child_tree(node)
            for child_node in child_nodes:
                nodeList.append(child_node)

        # Otherwise, append a child <a> element as is.
        # Can be a tag category or a tag.
        else:
            # Set a class to indicate that this element does not have child collections.
            node_element.set('class', 'empty-category')

            node_toggler = ElementTree.SubElement(node_element, 'span')
            node_toggler.set('class', 'toggle-tag-tag-category')
            node_toggler.text = ' '

            node_href = ElementTree.SubElement(node_element, 'a')

            node_href.set('id', 'tag-' + str(current_node.id))
            node_href.text = node.title

        node_elements.append(node_element)

    return node_elements


def _has_immediate_tag_children(tag_category):
    """Adapted from _hasImmediateChildren() in articles.views"""
    children = list(_get_child_tags_categories(tag_category))
    if len(children) > 0:
        return {tag_category: children}
    else:
        return None    


def _get_child_tags_categories(tag_category):
    # Executes if the collection is actually a collection object and not a resource.
    try:
        child_tags = Tag.objects.filter(category=tag_category)
        child_categories = TagCategory.objects.filter(parent=tag_category)
        return list(child_tags) + list(child_categories)

    except:
        pass

    return []


def get_root_key(value):
    root_elements = []
    for root_element in value.keys():
        root_elements.append(root_element)

    try:
        return root_elements[0]
    except:
        return None
