from meta.models import Category, TagCategory
import itertools
from django.core.cache import cache

def build_child_categories(category_model, flattened_descendants):
    # Cache this call.
    cc_cache_key = "cc_" + str(category_model['root'][0].id)
    child_categories = cache.get(cc_cache_key)

    # If no cc found in cache, build it and store it in the cache.
    if not child_categories:
        child_categories = calibrate_child_categories(category_model, flattened_descendants)
        # Set cache.
        cache.set(cc_cache_key, child_categories)

    return child_categories


def calibrate_child_categories(category_model, flattened_descendants):
    """Given a category tree model and a flattened list of categories, build
    a flushed out tree model recursively downwards.

    This function recursively builds descendant trees and flattens them into
    lists at every stage.

    Args:
        category_model: A dictionary based data-structure that represents a
            tree. Comprises of keys mapped to lists or lists of dictionaries
        flattened_descendants: A flat list of all descendants to a category.

    Returns:
        A tuple of the category_model object and the flattened_descendants,
        after recursively adding all of the descendant categories.
    """
    if len(category_model) == 0:
        return (None, flattened_descendants)
    else:
        # Get all child categories whose children need to be found
        catValues = category_model.values()

        # Chain all the contents of the values
        child_categories = list(itertools.chain.from_iterable(catValues))

        # Create a master list [] of all { parent : [child, child] } mapping
        children = map(_has_immediate_category_children, child_categories)

        # Flatten the {} objects in the master list into one new dict
        category_model = {}
        for child in children:
            try:
                for k, v in child.iteritems():
                    category_model[k] = v
            except:
                pass

        # Call this function recursively to obtain the current models'
        #     descendant child categories

        (descendantsTree, descendantsFlattened) = calibrate_child_categories(
            category_model, child_categories
        )

        # Append "my" descendants to the descendants of "my" children
        flattened_descendants += descendantsFlattened

        if descendantsTree is not None:
            # Iterate through all the dictionary keys, and replace the category
            #     model items, and return the category model
            for val in category_model.itervalues():
                for v in val:
                    for a, b in descendantsTree.iteritems():
                        if a == v:
                            val[val.index(v)] = {a: b}
            return (category_model, flattened_descendants)
        else:
            return (category_model, flattened_descendants)


def _has_immediate_category_children(category):
    """Fetches and returns a list of categories who have a certain parent.

    Args:
        category: Parent category whose child categories are to be looked up.

    Returns:
        A single item dictionary with the parent as the key and child
        categories serialized as list as the value
    """
    child_categories = list(Category.objects.filter(
        parent=category).order_by('position'))
    if len(child_categories) > 0:
        return {category: child_categories}
    else:
        return None


def build_breadcrumb(category):
    # Cache this call.
    breadcrumb_cache_key = "bc_" + str(category.id)
    breadcrumb = cache.get(breadcrumb_cache_key)

    # If no breadcrumb found in cache, build it and store it in the cache.
    if not breadcrumb:
        breadcrumb = calibrate_breadcrumb(category)

        # Set cache.
        cache.set(breadcrumb_cache_key, breadcrumb)

    return breadcrumb 


def calibrate_breadcrumb(category):
    # Create breadcrumb list and add the current category as current node
    breadcrumb = []
    breadcrumb.append(category)

    while True:
        breadcrumb.append(category.parent)
        # HACK: Need to look for root object using something unique like PK
        if category.parent.title == "Standards" or category.parent.title == "OpenCurriculum":
            break
        else:
            category = category.parent

    # Returns a reverse breadcrumb
    return urlize(breadcrumb)


def urlize(breadcrumb):
    current_parent = ''

    for cat in reversed(breadcrumb):
        if cat.title == "OpenCurriculum":
            cat.url = 'opencurriculum'
        elif cat.title == "Standards":
            cat.url = '/'
        else:
            current_parent += cat.slug + '/'
            cat.url = current_parent

    # Remove the trailing slash at the end of every category URL
    for b in breadcrumb:
        if b.url[-1] == '/':
            b.url = b.url[:-1]

    return breadcrumb


class TreeBuilder():
    model = ''

    def __init__(self, model):
        self.model = model

    def build_tree(self, model, flattened_descendants):
        if len(model) == 0:
            return (None, flattened_descendants)
        else:
            # Get all child categories whose children need to be found
            catValues = model.values()

            # Chain all the contents of the values
            child_categories = list(itertools.chain.from_iterable(catValues))

            # Create a master list [] of all { parent : [child, child] } mapping
            children = map(self._has_immediate_children, child_categories)

            # Flatten the {} objects in the master list into one new dict
            model = {}
            for child in children:
                try:
                    for k, v in child.iteritems():
                        model[k] = v
                except:
                    pass

            # Call this function recursively to obtain the current models'
            #     descendant child categories

            (descendantsTree, descendantsFlattened) = self.build_tree(
                model, child_categories
            )

            # Append "my" descendants to the descendants of "my" children
            flattened_descendants += descendantsFlattened

            if descendantsTree is not None:
                # Iterate through all the dictionary keys, and replace the category
                #     model items, and return the category model
                for val in model.itervalues():
                    for v in val:
                        for a, b in descendantsTree.iteritems():
                            if a == v:
                                val[val.index(v)] = {a: b}
                return (model, flattened_descendants)
            else:
                return (model, flattened_descendants)


    def _has_immediate_children(self, node):
        if self.model == 'category':
            child_nodes = list(Category.objects.filter(
            parent=node).order_by('position'))
        elif self.model == 'tag_category':
            child_nodes = list(TagCategory.objects.filter(
            parent=node))
        elif self.model == 'category_tags':
            node_type = type(node).__name__.lower()

            if node_type == 'category':
                child_categories = Category.objects.filter(
                    parent=node).order_by('position')
                child_nodes = list(node.tags.all()) + list(child_categories)
            else:
                child_nodes = []

        if len(child_nodes) > 0:
            return {node: child_nodes}
        else:
            return None