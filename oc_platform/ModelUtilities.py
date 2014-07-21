class DummyM2M():
    objects = []

    def __init__(self, objects):
        self.objects = objects

    def all(self):
        return self.objects


def get_file_storage():
    from django.conf import settings
    if settings.DEBUG:
        from django.core.files.storage import FileSystemStorage
        return FileSystemStorage()
    else:
        from storages.backends.s3boto import S3BotoStorage
        return S3BotoStorage()