from django.conf.urls import patterns, include, url
from django.conf import settings

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns(
    '',
    # Examples:
    url(r'^$', 'oc_platform.views.home', name='home'),

    url(r'^search/', include('haystack.urls')),

    url(r'^articles/', include('articles.urls', namespace='articles')),

    url(r'^group/', include('projects.urls', namespace='projects')),

    url(r'^user/', include('user_account.urls', namespace='user')),

    url(r'^resources/', include('oer.urls', namespace='resource')),

    url(r'^meta/', include('meta.urls', namespace='meta')),


    # Interactions
    url(r'^interactions/', include('interactions.urls', namespace='interactions')),

    url(r'^contact/', 'oc_platform.views.contact', name='contact'),

    url(r'^developers/', 'oc_platform.views.developers', name='developers'),

    url(r'^about/team/', 'oc_platform.views.team', name='team'),
    url(r'^about/press/', 'oc_platform.views.press', name='press'),
    url(r'^press/', 'oc_platform.views.press', name='press_duplicate'),
    url(r'^about/', 'oc_platform.views.about', name='about'),

    url(r'^feedback/', 'oc_platform.views.feedback', name='feedback'),

    url(r'^jobs/', 'oc_platform.views.jobs', name='jobs'),

    url(r'^terms/', 'oc_platform.views.terms', name='terms'),

    url(r'^privacy/', 'oc_platform.views.privacy', name='privacy'),

    url(r'^license/', 'oc_platform.views.license', name='license'),

    url(r'^upload/', 'oer.views.upload_page', name='upload'),

    url(r'^browse/(?P<category_slug>.+)/$', 'oer.views.browse', name='browse'),

    url(r'^browse/$', 'oer.views.browse_default', name='browse_default'),


    # User stuff
    url(r'^signup-invite/', 'oc_platform.views.signup_invite', name='signupinvite'),
    url(r'^signup/', 'user_account.views.register', name='register'),
    url(r'^login/', 'oc_platform.views.login', name='login'),
    url(r'^authenticate/', 'user_account.views.authenticate', name='authenticate'),
    url(r'^confirm-account/', 'user_account.views.confirm_account', name='confirm_account'),
    url(r'^logout/', 'user_account.views.logout_view', name='logout'),
    url(r'^dashboard/', 'user_account.views.dashboard_view', name='dashboard'),
    url(r'^gauth/', 'user_account.views.googleplus_login', name='gplus_login'),
    url(r'^glogin/', 'user_account.views.glogin', name='glogin'),
    url(r'^fblogin/', 'user_account.views.fb_login', name='fb_login'),
    url(r'^404testing/', 'oc_platform.views.t404'),
    url(r'^500testing/', 'oc_platform.views.t500'),

    # Initialize API stuff
    url(r'^api/getBreadcrumb/', 'oc_platform.views.get_breadcrumb', name='api-get-breadcrumb'),
    url(r'^api/emailShare/', 'oc_platform.views.email_share', name='api-email-share'),
    url(r'^api/filepicker-upload/', 'oer.views.fp_upload', name='api-fp-upload'),
    url(r'^api/file-upload/', 'oer.views.file_upload', name='api-file-upload'),
    url(r'^api/file-upload-submit/', 'oer.views.file_upload_submit', name='api-file-upload-submit'),
    url(r'^api/image-upload/', 'media.views.upload_image', name='api-image-upload'),
    url(r'^api/list-user-images/(?P<user_id>\d+)/$', 'media.views.list_user_images', name='api-list-user-images'),

    url(r'^api/articles/list/$', 'oc_platform.views.list_articles', name='list_articles'),

    # Labs stuff
    url(r'^labs/article-center/$', 'articles.views.article_center', name='article_center'),

    # Article Center Registration
    url(r'^contributor-registration/', 'user_account.views.contributor_registration', name='contributor_registration'),

    # Article Center Introduction
    url(r'^contributor-introduction/', 'user_account.views.contributor_introduction', name='contributor_introduction'),

    url(r'^(?P<resource_id>\d+)/$', 'oer.views.view_resource_by_id', name='read_by_id'),
    url(r'^(?P<resource_id>\d+)/(?P<resource_slug>.+)/$', 'oer.views.view_resource', name='read'),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    url(r'^admin/', include(admin.site.urls)),

    url(r'^cbse-sample-paper-maker/', 'oc_platform.views.worksheet'),
)

if settings.DEBUG:
    urlpatterns += patterns(
        '',
        (r'^media/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.MEDIA_ROOT}),
        (r'^static/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.STATIC_ROOT}),

        url(r'^test/', 'oc_platform.views.jstests', name='jstests'),
    )
