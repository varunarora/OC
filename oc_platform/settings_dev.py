# Django settings for oc_platform project.

DEBUG = True

STATIC_ROOT = 'static/'
"""
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql', # Add 'postgresql_psycopg2', 'mysql', 'sqlite3' or 'oracle'.
        'NAME': 'ocrootu',                      # Or path to database file if using sqlite3.
        'USER': 'ocrootu',                      # Not used with sqlite3.
        'PASSWORD': 'OCProD7!',                  # Not used with sqlite3.
        'HOST': 'ocrootu.db.8981201.hostedresource.com',                      # Set to empty string for localhost. Not used with sqlite3.
        'PORT': '',                      # Set to empty string for default. Not used with sqlite3.
    }
}
"""
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql', # Add 'postgresql_psycopg2', 'mysql', 'sqlite3' or 'oracle'.
        'NAME': 'ocrootu',                      # Or path to database file if using sqlite3.
        'USER': 'root',                      # Not used with sqlite3.
        'PASSWORD': 't@bloid',                  # Not used with sqlite3.
        'HOST': '',                      # Set to empty string for localhost. Not used with sqlite3.
        'PORT': '',                      # Set to empty string for default. Not used with sqlite3.
    }
}

import sys
if 'test' in sys.argv:
  DATABASES['default'] = {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'ocrootutesting',
        'USER': 'root',
        'PASSWORD': '',
        'HOST': 'localhost',    
        'PORT': '',    
  }


from memcacheify import memcacheify

CACHES = memcacheify()

"""
os.environ['MEMCACHE_SERVERS'] = os.environ.get('MEMCACHIER_SERVERS', 'dev1.ec2.memcachier.com:11211').replace(',', ';')
os.environ['MEMCACHE_USERNAME'] = os.environ.get('MEMCACHIER_USERNAME', '12d7b2')
os.environ['MEMCACHE_PASSWORD'] = os.environ.get('MEMCACHIER_PASSWORD', '78d0da6ae9bb1409dcde')

CACHES = {
  'default': {
    'BACKEND': 'django_pylibmc.memcached.PyLibMCCache',
    'LOCATION': os.environ.get('MEMCACHIER_SERVERS', 'dev1.ec2.memcachier.com:11211').replace(',', ';'),
    'TIMEOUT': 500,
    'BINARY': True,
  }
}
"""

INTERNAL_IPS = ('127.0.0.1',)

DEBUG_TOOLBAR_PANELS = (
    'debug_toolbar.panels.version.VersionDebugPanel',
    'debug_toolbar.panels.timer.TimerDebugPanel',
    'debug_toolbar.panels.settings_vars.SettingsVarsDebugPanel',
    'debug_toolbar.panels.headers.HeaderDebugPanel',
    'debug_toolbar.panels.request_vars.RequestVarsDebugPanel',
    'debug_toolbar.panels.template.TemplateDebugPanel',
    'debug_toolbar.panels.sql.SQLDebugPanel',
    'debug_toolbar.panels.signals.SignalDebugPanel',
    'debug_toolbar.panels.logger.LoggingPanel',
)
