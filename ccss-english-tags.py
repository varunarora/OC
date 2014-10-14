from oc_platform import settings
from django.core.management import setup_environ
setup_environ(settings)

import re
import csv

from meta.models import Tag, TagCategory
category = TagCategory.objects.get(title='Standards')

tags_raw = open('ccss-english.csv', 'r')
tag_rows = csv.reader(tags_raw, delimiter=',')

for row in tag_rows:
    tag_raw = row

    tag_parts = tag_raw[:3]
    tag_parts[1] = tag_parts[1].replace('.', '')
    tag_parts[2] = tag_parts[2].replace('.', '')

    standard = re.sub('\.\.', '.', '.'.join(tag_parts)).upper()

    description = tag_raw[3].strip()
    
    if description[:2] == 'CC':
        description = description[description.find(' ') + 1:]

    try:
        tag = Tag.objects.get(title=standard)

        tag.category = category
        tag.save()

    except:
        tag = Tag(
            title=standard,
            description=description,
            category = category
        )

        tag.save()
