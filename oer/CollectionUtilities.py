from oer.models import Collection
import itertools

def _get_child_collections(collection):
    # Get all the collections whose parent is the root collection.
    from django.contrib.contenttypes.models import ContentType
    collections_type = ContentType.objects.get_for_model(Collection)
    child_collections = Collection.objects.filter(
        host_id=collection.id, host_type=collections_type)

    return child_collections


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