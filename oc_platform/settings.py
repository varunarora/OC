DEBUG = False
TEMPLATE_DEBUG = DEBUG

ADMINS = (
    ('Varun Arora', 'varun@theopencurriculum.org'),
)

SIGNUPS_ADMINS = ['info@theopencurriculum.org']
CONTRIBUTOR_SIGNUPS_ADMINS = ['info@theopencurriculum.org', 'zeinab@theopencurriculum.org', 'duncan@theopencurriculum.org']
HELP_EMAIL = 'hello@theopencurriculum.org'

EMAIL_HOST = "smtp.sendgrid.net"
EMAIL_PORT = "587"
EMAIL_HOST_USER = ""  # This needs to filled in
EMAIL_HOST_PASSWORD = ""  # This needs to filled in
SERVER_EMAIL = "info@theopencurriculum.org"  # This needs to filled in
EMAIL_USE_TLS = True

MANAGERS = ADMINS

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',   # Add 'postgresql_psycopg2', 'mysql', 'sqlite3' or 'oracle'.
        'NAME': '',                      # Or path to database file if using sqlite3.
        'USER': '',                      # Not used with sqlite3.
        'PASSWORD': '',                  # Not used with sqlite3.
        'HOST': '',                      # Set to empty string for localhost. Not used with sqlite3.
        'PORT': '',                      # Set to empty string for default. Not used with sqlite3.
    }
}

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# In a Windows environment this must be set to your system time zone.
TIME_ZONE = 'America/New_York'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

# Location of AWS S3 bucket for static content
AWS_STATIC_BUCKET = str('http://ocfilepicker.s3.amazonaws.com/')
S3_BUCKET_NAME = str('ocfilepicker')
AWS_ACCESS_KEY = str('AKIAJNPJU26BJC5LW6MA')
AWS_SECRET_KEY = str('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')

HAYSTACK_SITECONF = 'search_sites'
HAYSTACK_SEARCH_ENGINE = 'solr'
HAYSTACK_SOLR_URL = 'http://54.235.197.234:8983/solr'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale.
USE_L10N = True

# If you set this to False, Django will not use timezone-aware datetimes.
USE_TZ = True


import os.path
TEMPLATE_DIR = os.path.dirname(__file__)
ABSOLUTE_PATH = lambda x: os.path.join(os.path.abspath(TEMPLATE_DIR), x)

PROJECT_PATH = '/home/django/OC/'

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
# Examples: "http://media.lawrence.com/media/", "http://example.com/media/"
MEDIA_URL = '/static/media/'

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/home/media/media.lawrence.com/static/"
STATIC_MOUNT_POINT = PROJECT_PATH + 'static/'

STATIC_ROOT = STATIC_MOUNT_POINT + 'assets/'

STATIC_ASSETS_ROOT = STATIC_ROOT

# Absolute filesystem path to the directory that will hold user-uploaded files.
# Example: "/home/media/media.lawrence.com/media/"
MEDIA_ROOT = STATIC_MOUNT_POINT + 'media/'

FILEPICKER_ROOT = STATIC_MOUNT_POINT + 'files/'

# URL prefix for static files.
# Example: "http://media.lawrence.com/static/"
STATIC_URL = '/static/assets/'

# Additional locations of static files
STATICFILES_DIRS = (
    os.path.join(TEMPLATE_DIR, 'assets'),
    # Put strings here, like "/home/html/static" or "C:/www/django/static".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
)

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
    # 'django.contrib.staticfiles.finders.DefaultStorageFinder',
)

# Make this unique, and don't share it with anybody.
SECRET_KEY = 'y2yz3rhi5i(z=b8e*o=rzz(@e*o6!m32dkk_t3re7mg1k@jxuj'

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
    # 'django.template.loaders.eggs.Loader',
)

TEMPLATE_CONTEXT_PROCESSORS = (
    'user_account.context_processors.notifications',
    'django.contrib.auth.context_processors.auth',
    'django.core.context_processors.debug',
    'django.core.context_processors.i18n',
    'django.core.context_processors.media',
    'django.core.context_processors.static',
    'django.contrib.messages.context_processors.messages'
)

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'debug_toolbar.middleware.DebugToolbarMiddleware',
    # Uncomment the next line for simple clickjacking protection:
    # 'django.middleware.clickjacking.XFrameOptionsMiddleware',
)

AUTHENTICATION_BACKENDS = (
    'user_account.backends.SocialModelBackend',
    'django.contrib.auth.backends.ModelBackend',
)

ROOT_URLCONF = 'oc_platform.urls'

# Python dotted path to the WSGI application used by Django's runserver.
WSGI_APPLICATION = 'oc_platform.wsgi.application'

TEMPLATE_DIRS = (
    os.path.join(TEMPLATE_DIR, 'templates'),
    # Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
)

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.markup',
    'meta',
    'license',
    'oer',
    'media',
    'articles',
    'haystack',
    'user_account',
    'discussions',
    'interactions',
    'projects',
    # Uncomment the next line to enable the admin:
    'django.contrib.admin',
    'debug_toolbar',
    # Uncomment the next line to enable admin documentation:
    # 'django.contrib.admindocs',
)

# A sample logging configuration. The only tangible logging
# performed by this configuration is to send an email to
# the site admins on every HTTP 500 error when DEBUG=False.
# See http://docs.djangoproject.com/en/dev/topics/logging for
# more details on how to customize your logging configuration.
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse'
        }
    },
    'handlers': {
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler'
        }
    },
    'loggers': {
        'django.request': {
            'handlers': ['mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
    }
}

AUTH_PROFILE_MODULE = 'user_account.UserProfile'

RECAPTCHA_PRIVATE_KEY = '6LeG_8USAAAAALqEAEupYoiLIsguhIruYa0QmIVK'

STRINGS = {
    'global': {
        'TITLE': 'OpenCurriculum: A K-12 Learning Content Hub',
        'invite': {
            'SUCCESS': 'Congratulations! We have successfully received your request submission.',
            'FAILURE': 'Unknown error occured. Try again or contact us at hello@ for a resolution.'
        }
    },
    'about': {
        'TITLE': 'About OpenCurriculum',
        'team': {
            'TITLE': 'Leadership &lsaquo; OpenCurriculum'
        },
        'press': {
            'TITLE': 'Press &lsaquo; OpenCurriculum'
        },
    },
    'jobs': {
        'TITLE': 'Jobs @ OpenCurriculum'
    },
    'terms': {
        'TITLE': 'Terms of Use &lsaquo; OpenCurriculum'
    },
    'privacy': {
        'TITLE': 'Privacy Policy &lsaquo; OpenCurriculum'
    },
    'license': {
        'TITLE': 'License &lsaquo; OpenCurriculum'
    },
    'meta': {
        'category': {
            'API_LOCATION_FAILURE': 'Failed to locate category'
        }
    },
    'share': {
        'SUBJECT_APPEND': 'shared an article with you'
    },
    'articles': {
        'CATALOG_TITLE': 'High-quality article catalog / OpenCurriculum',
        'HISTORY_TITLE': 'Edit history for %s &lsaquo; OpenCurriculum',
        'messages': {
            'SUBMIT_REVIEW': 'Your edits have been successfully submitted for review',
            'SAVE': 'Successfully saved edits at %s',
            'ANONYMOUS_EDITING': 'Editing as anonymous.'
        }
    },
    'user': {
        'REGISTER_TITLE': 'Sign up for a new account &lsaquo; OpenCurriculum',
        'CONTRIBUTOR_REGISTER_TITLE': 'Register as an Early contributor',
        'AUTHENTICATION_ERROR': 'Your username or password is incorrect. Please try again.',
        'INACTIVE_ACCOUNT_ERROR': 'You need to activate your account before you login.',
        'register': {
            'professions': {
                'STUDENT': 'Student',
                'TEACHER': 'Teacher',
                'ADMIN': 'School administrator',
                'PUBLISHER': 'Publisher',
                'OTHER': 'Other'
            },
            'ACCOUNT_CREATE_SUCCESS': 'Congratulations! Now confirm your account',
            'EMAIL_CONFIRMATION_MSG': (
                'Dear %s,\n\nCongratulations for signing up for an account on '
                'OpenCurriculum. We are delighted to welcome you to our community. '
                'Our mascot, Moe, extends his warmest greetings! \n\n'
                'To confirm your new account to use the website as a user, '
                'click on the link below or copy the entire URL and paste and open '
                'it in your favorite browser: \n\n%s\n\n'
                'If you are experiencing any problems with confirming your account, '
                'do not hesitate to get in touch with us by writing to us at %s. \n\n'
                'Thank you,\nNew User team @ OpenCurriculum'
            ),
            'EMAIL_CONFIRMATION_SUBJECT': 'Confirm your new OpenCurriculum account',
            'EMAIL_CONFIRMATION_SUCCESS': 'Congratulations! Your account is now active and ready to go!',
            'EMAIL_CONFIRMATION_FAILURE': 'Either your username or your confirmation key were incorrect',
            'form': {
                'DOB_OUT_OF_RANGE': 'The date of birth is out of range',
                'DOB_AFTER_TODAY': 'The date of birth cannot be later than today',
                'DOB_LESS_THAN_THIRTEEN': 'You need to be above 13 years of age to sign up',
                'DOB_INCORRECT': 'The date of birth is incorrect',
                'RECAPTCHA_VALIDATION_FAILURE': 'reCaptcha validation failed. Please try again or contact us for support',
                'PASSWORD_MISMATCH': 'The two passwords did not match',
                'USERNAME_VALIDATION_ERROR': 'Username should be all lowercase, and must only have letters and digits and/or underscores.',
                'PASSWORD_VALIDATION_ERROR': 'Password must contain at least 6 characters, with atleast one lowercase and one uppercase character and atleast one digit or symbol.',
                'NAME_VALIDATION_ERROR': 'This field must only have letters.'
            }
        },
        'reset_password': {
            'EMAIL_RESET_MSG': (
                'Dear %s,\n\nWe have received a message from our site to reset your '
                'password on your OpenCurriculum account. We have successfully reset the '
                'same. Your temporary login details are below: \n\n'
                'Username: %s\nPassword: %s\n\n'
                'To successfully reset and re-activate your account, open the link below:\n\n%s\n\n'
                'If you are experiencing any problems with resetting your password, '
                'do not hesitate to get in touch with us by writing to us at %s. \n\n'
                'Thank you,\nUser satisfaction team @ OpenCurriculum'
            ),
            'RESET_PASSWORD_REQUESTED': 'Reset your account password'
        }
    },
    'projects': {
        'TITLE': 'OpenCurriculum Projects: The easiest way to share your learning content',
        'NEW_PROJECT_TITLE': 'Create a new project',
        'MEMBERS_TITLE': 'Members',
        'ABOUT_TITLE': 'About',
        'BROWSE_TITLE': 'Browse...',
        'DISCUSSION_BOARD_TITLE': 'Discussion Board',
        'invite': {
            'SUCCESS_TITLE': 'Successfully received your projects invite',
            'FAILURE': 'Failed to submit form'
        }
    },
    'resources': {
        'UPLOAD_TITLE': 'Upload files',
        'ADD_VIDEO_TITLE': 'Add video',
        'ADD_URL_TITLE': 'Add website URL',
        'NEW_DOCUMENT_TITLE': 'New document',
        'EDIT_VIDEO_TITLE': 'Edit video',
        'EDIT_URL_TITLE': 'Edit website URL',
        'EDIT_DOCUMENT_TITLE': 'Edit document'
    },
    'article_center': {
        'INTRODUCTION_TITLE': 'Hi - nice to meet you!',
        'TITLE': 'Article Center: Your private guide into article contributions'
    }
}

try:
    from settings_dev import *
except ImportError:
    pass

try:
    from settings_prod import *
except ImportError:
    pass
