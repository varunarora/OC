from django.db import models

def get_default_tagcategory():
    return TagCategory.objects.get(pk=1)

class Category(models.Model):
    title = models.CharField(max_length=256)
    parent = models.ForeignKey('self')
    created = models.DateTimeField(auto_now_add=True, editable=False)
    slug = models.SlugField(max_length=256, blank=True)
    position = models.IntegerField(default=0, null=True, blank=True)
    tags = models.ManyToManyField('meta.Tag', null=True, blank=True, related_name='tags')

    def __unicode__(self):
        return self.title


class Tag(models.Model):
    title = models.CharField(max_length=256)
    description = models.TextField(null=True, blank=True)
    category = models.ForeignKey('meta.TagCategory', default=get_default_tagcategory)
    created = models.DateTimeField(auto_now_add=True, editable=False)
    position = models.IntegerField(default=0, null=True, blank=True)
    links = models.ManyToManyField(
        'self', blank=True, related_name='relatives', through='TagMapping', symmetrical=False)

    def __unicode__(self):
        return self.title


class TagMapping(models.Model):
    from_node = models.ForeignKey(Tag, related_name='origin')
    to_node = models.ForeignKey(Tag)
    deviation = models.TextField(null=True, blank=True)

    def __unicode__(self):
        return self.from_node.title + ':' + self.to_node.title


class TagCategory(models.Model):
    title = models.CharField(max_length=256)
    description = models.TextField(blank=True)
    parent = models.ForeignKey('self', null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True, editable=False)

    def __unicode__(self):
        return self.title


class TagLabel(models.Model):
    tag = models.ForeignKey(Tag)
    label = models.CharField(max_length=256)
    created = models.DateTimeField(auto_now_add=True, editable=False)

    def __unicode__(self):
        return self.title


class Language(models.Model):
    title = models.CharField(max_length=256)
    encoding = models.CharField(max_length=20, default='UTF-8')
    support = models.NullBooleanField(default=False)

    def __unicode__(self):
        return self.title


class City(models.Model):
    countryCode = models.CharField(max_length=2)
    country = models.CharField(max_length=64)
    city = models.CharField(max_length=64)
    accentCity = models.CharField(max_length=64)
    region = models.CharField(max_length=2)
    latitude = models.FloatField()
    longitude = models.FloatField()


class Topic(models.Model):
    title = models.CharField(max_length=256)
    description = models.TextField(null=True, blank=True)


class Concept(models.Model):
    topic = models.ForeignKey('meta.Topic')
    concept = models.CharField(max_length=256)
    categories = models.ManyToManyField('meta.Category', null=True, blank=True)
