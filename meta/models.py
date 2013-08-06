from django.db import models

def get_default_tagcategory():
    return TagCategory.objects.get(pk=1)

class Category(models.Model):
    title = models.CharField(max_length=256)
    parent = models.ForeignKey('self')
    project = models.NullBooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True, editable=False)
    slug = models.SlugField(max_length=256, blank=True)

    def __unicode__(self):
        return self.title


class Tag(models.Model):
    title = models.CharField(max_length=256)
    description = models.TextField(blank=True)
    category = models.ForeignKey('meta.TagCategory', default=get_default_tagcategory)
    created = models.DateTimeField(auto_now_add=True, editable=False)

    def __unicode__(self):
        return self.title


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
