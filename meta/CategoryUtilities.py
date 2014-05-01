from meta.models import Category
import itertools

def build_child_categories(category_model, flattened_descendants):
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
        children = map(_has_immediate_children, child_categories)

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

        (descendantsTree, descendantsFlattened) = build_child_categories(
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


def _has_immediate_children(category):
    """Fetches and returns a list of categories who have a certain parent.

    Args:
        category: Parent category whose child categories are to be looked up.

    Returns:
        A single item dictionary with the parent as the key and child
        categories serialized as list as the value
    """
    child_categories = list(Category.objects.filter(
        parent=category).order_by('-position'))
    if len(child_categories) > 0:
        return {category: child_categories}
    else:
        return None


def build_breadcrumb(category):
    # Create breadcrumb list and add the current category as current node
    breadcrumb = []
    breadcrumb.append(category)

    while True:
        breadcrumb.append(category.parent)
        # HACK: Need to look for root object using something unique like PK
        if category.parent.title == "OpenCurriculum":
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
        else:
            current_parent += cat.slug + '/'
            cat.url = current_parent

    # Remove the trailing slash at the end of every category URL
    for b in breadcrumb:
        if b.url[-1] == '/':
            b.url = b.url[:-1]

    return breadcrumb

