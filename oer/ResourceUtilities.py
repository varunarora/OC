from oer.models import Collection

def get_resource_root(resource):
    from django.core.exceptions import MultipleObjectsReturned
    try:
        collection = Collection.objects.get(resources__id=resource.id)
    except MultipleObjectsReturned:
        collection = Collection.objects.filter(
            resources__id=resource.id)[0]

    try:
        import oer.CollectionUtilities as cu
        return cu.get_collection_root(collection)
    except:
        return None