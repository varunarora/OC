class DummyM2M():
    objects = []

    def __init__(self, objects):
        self.objects = objects

    def all(self):
        return self.objects
