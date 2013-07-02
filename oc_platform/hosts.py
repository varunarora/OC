from django.conf import settings
from django_hosts import patterns, host

host_patterns = patterns('',
    host(r'www', settings.ROOT_URLCONF, name='www'),
    host(r'api', 'oc_platform.api_urls', name='api'),
    host(r'developers', 'oc_platform.developers.urls', name='developers'),
)