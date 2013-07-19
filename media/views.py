from media.models import Image
from django.contrib.auth.models import User
from django.http import HttpResponse
import json


def upload_image(request):
    if request.method == "POST":
        from forms import UploadImage
        form = UploadImage(request.POST, request.FILES)

        if form.is_valid():
            user_id = request.POST.get('user_id')
            user = User.objects.get(pk=int(user_id))

            new_image = Image(
                path=request.FILES['file'],
                title=request.FILES['file'].name,
                user=user
            )
            new_image.save()

            from django.conf import settings
            url = settings.STATIC_URL + new_image.path.name

            response = {
                'status': 'true',
                'url': url
            }

            return HttpResponse(json.dumps(
                response), 200, content_type="application/json")

        else:
            print form.errors
            return HttpResponse(json.dumps(
                {'status': 'false', 'error': form.errors}
            ), 401, content_type="application/json")

    else:
        return HttpResponse(json.dumps(
            {'status': 'false'}), 401, content_type="application/json")


def list_user_images(request, user_id):
    images = Image.objects.filter(user=user_id).order_by('-created')

    from django.conf import settings
    media_url = settings.MEDIA_URL

    serialized_images = []

    for image in images:
        i = {}
        i['path'] = media_url + image.path.name
        i['title'] = image.title
        i['info'] = image.info
        serialized_images.append(i)

    return HttpResponse(json.dumps(
        serialized_images), 200, content_type="application/json")
