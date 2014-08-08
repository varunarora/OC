# Create your views here.
from oc_platform import APIUtilities
from license.models import License

def get_licenses(request):
    try:
        licenses = License.objects.all()

        serialized_licenses = []
        for license in licenses:
            serialized_license = {
                'id': license.id,
                'title': license.title,
                'description': license.description
            }
            serialized_licenses.append(serialized_license)

        context = {
            'licenses': serialized_licenses
        }
        return APIUtilities._api_success(context)

    except:
        context = {
            'title': 'Could not load the licenses list',
            'message': 'We failed to load the list of standards for you. '
            + 'Please contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)        
