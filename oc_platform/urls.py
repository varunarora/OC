from django.conf.urls import patterns, include, url
from django.conf import settings

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    url(r'^$', 'oc_platform.views.home', name='home'),
    
    url(r'^search/', include('haystack.urls')),

	url(r'^articles/', include('articles.urls', namespace='articles')),
	
	url(r'^resources/', include('oer.urls', namespace='resource')),
	
	url(r'^contact/', 'oc_platform.views.contact', name='contact'),

	url(r'^404testing/', 'oc_platform.views.t404'),
	url(r'^500testing/', 'oc_platform.views.t505'),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    url(r'^admin/', include(admin.site.urls)),
)

if settings.DEBUG:
    urlpatterns += patterns('',
        (r'^media/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.MEDIA_ROOT}),
        (r'^static/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.STATIC_ROOT}),
    )
