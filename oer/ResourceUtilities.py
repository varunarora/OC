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


def get_resource_type_from_url(resource):
    import urlparse
    (hostname, url_data) = get_url_hostname(resource.revision.content.url)

    # If the resource is a video, determine whether or not it is a YouTube
    #     Vimeo video, and obtain the video ID (as determined by the
    #     service provider), so that it can be plugged into its player.

    # In either case, use an appropriate pattern matching to obtain the
    #     video #.
    if "youtube" in hostname:
        query = urlparse.parse_qs(url_data.query)
        video = query["v"][0]
        resource.video_tag = video
        resource.provider = "youtube"
        resource_type = "video"

    elif "vimeo" in hostname:
        resource.video_tag = url_data.path.split('/')[1]
        resource.provider = "vimeo"
        resource_type = "video"

    elif ('docs' in hostname and 'google' in hostname) and (
        'presentation' in url_data.path):
        resource.revision.content.url = resource.revision.content.url.replace(
            'pub', 'embed')
        resource_type = 'gpres'

    else:
        resource_type = "url"

    return resource_type


def get_url_hostname(url):
    import urlparse
    url_data = urlparse.urlparse(url)

    # Figure out the entire domain the specific hostname (eg. "vimeo")
    domain = url_data.hostname

    return (domain.split(".")[:-1], url_data)