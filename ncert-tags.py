from oc_platform import settings
from django.core.management import setup_environ
setup_environ(settings)

import csv

from meta.models import Tag, TagCategory
category = TagCategory.objects.get(title='Standards')

tags_raw = open('ncert-math.csv', 'r')
tag_rows = csv.reader(tags_raw, delimiter=',')

for row in tag_rows:
    tag_raw = row
    standard = '.'.join(tag_raw[:5]).upper()
    description = tag_raw[5].strip()
    
    try:
        tag = Tag.objects.get(title=standard)
        tag.category = category
        tag.save()

    except:
        print standard
        tag = Tag(
            title=standard,
            description=description,
            category=category
        )
        tag.save()
