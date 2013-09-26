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

    url(r'^project/', include('projects.urls', namespace='projects')),

    url(r'^user/', include('user_account.urls', namespace='user')),

    url(r'^resources/', include('oer.urls', namespace='resource')),

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

    # User stuff
    url(r'^signup-invite/', 'oc_platform.views.signup_invite', name='signupinvite'),
    url(r'^signup/', 'user_account.views.register', name='register'),
    url(r'^authenticate/', 'user_account.views.authenticate', name='authenticate'),
    url(r'^confirm-account/', 'user_account.views.confirm_account', name='confirm_account'),
    url(r'^logout/', 'user_account.views.logout_view', name='logout'),
    url(r'^gauth/', 'user_account.views.googleplus_login', name='gplus_login'),
    url(r'^glogin/', 'user_account.views.glogin', name='glogin'),
    url(r'^404testing/', 'oc_platform.views.t404'),
    url(r'^500testing/', 'oc_platform.views.t500'),

    # Initialize API stuff
    url(r'^api/getBreadcrumb/', 'oc_platform.views.get_breadcrumb', name='api-get-breadcrumb'),
    url(r'^api/emailShare/', 'oc_platform.views.email_share', name='api-email-share'),
    url(r'^api/fpUpload/', 'oer.views.fp_upload', name='api-fp-upload'),
    url(r'^api/file-upload/', 'oer.views.file_upload', name='api-file-upload'),
    url(r'^api/fpSubmit/', 'oer.views.fp_submit', name='api-fp-submit'),
    url(r'^api/image-upload/', 'media.views.upload_image', name='api-image-upload'),
    url(r'^api/list-user-images/(?P<user_id>\d+)/$', 'media.views.list_user_images', name='api-list-user-images'),

    # Labs stuff
    url(r'^labs/article-center/$', 'articles.views.article_center', name='article_center'),

    # Article Center Registration
    url(r'^contributor-registration/', 'user_account.views.contributor_registration', name='contributor_registration'),

    # Article Center Introduction
    url(r'^contributor-introduction/', 'user_account.views.contributor_introduction', name='contributor_introduction'),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    url(r'^admin/', include(admin.site.urls)),


)

if settings.DEBUG:
    urlpatterns += patterns(
        '',
        (r'^media/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.MEDIA_ROOT}),
        (r'^static/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.STATIC_ROOT}),

        url(r'^test/', 'oc_platform.views.jstests', name='jstests'),
    )
