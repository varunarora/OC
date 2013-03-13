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
	
	url(r'^developers/', 'oc_platform.views.developers', name='developers'),

	url(r'^about/team/', 'oc_platform.views.team', name='team'),
	url(r'^about/press/', 'oc_platform.views.press', name='press'),	
	url(r'^about/', 'oc_platform.views.about', name='about'),
	
	url(r'^help/', 'oc_platform.views.help', name='help'),
	
	url(r'^jobs/', 'oc_platform.views.jobs', name='jobs'),
	
	url(r'^terms/', 'oc_platform.views.terms', name='terms'),
	
	url(r'^privacy/', 'oc_platform.views.privacy', name='privacy'),
	
	url(r'^license/', 'oc_platform.views.license', name='license'),

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
