from oc_platform import settings
from django.core.management import setup_environ
setup_environ(settings)

import re
import csv

from meta.models import Tag, TagCategory
category = TagCategory.objects.get(title='CCSS Mathematics')

tags_raw = open('ccss-math.csv', 'r')
tag_rows = csv.reader(tags_raw, delimiter=',')

for row in tag_rows:
    tag_raw = row
    standard = re.sub('\.\.', '.', '.'.join(tag_raw[:4])).upper()

    description = tag_raw[4].strip()
    
    if description[:2] == 'CC':
        description = description[description.find(' ') + 1:]

    try:
        tag = None
        if standard[:3] == 'HSF' or standard[:3] == 'HSN' or standard[:3] == 'HSA' or (
            standard[:3] == 'HSG' or standard[:3] == 'HSS'):
            tags = Tag.objects.filter(title__startswith=standard + '-')
            tag = tags[0]

        if not tag:
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
