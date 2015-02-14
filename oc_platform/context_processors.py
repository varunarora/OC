def secure_assets(request):
    if request.is_secure():
        return {
            'STATIC_URL': 'https://s3.amazonaws.com/assets.opencurriculum.org/',
            'MEDIA_URL': 'https://s3.amazonaws.com/media.opencurriculum.org/'
        }

    return {}
