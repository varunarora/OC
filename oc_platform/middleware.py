class SubdomainMiddleware():
    def process_request(self, request):

        # If this is a request for TFI.
        if 'curriculum.teachforindia.org' in request.META.get('HTTP_HOST'):
            # If the user is logged in, redirect to 
            from user_account.models import Organization
            request.organization = Organization.objects.get(slug='tfi')

        return None