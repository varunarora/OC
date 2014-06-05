from oc_platform import settings
from django.core.management import setup_environ
setup_environ(settings)

import re
import csv

from meta.models import Tag, TagCategory
standards_category = TagCategory.objects.get(title='Standards')
assessment_anchor_category = TagCategory.objects.get(title='Assessment Anchor')
anchor_descriptor_category = TagCategory.objects.get(title='Anchor Descriptor')
eligible_content_category = TagCategory.objects.get(title='Eligible Content')

tags_raw = open('pa-math.csv', 'r')
tag_rows = csv.reader(tags_raw, delimiter=',')

for row in tag_rows:

    tag_raw = row

    if 'CC' in tag_raw[0]:
        category = standards_category
        standard = re.sub('\.\.', '.', '.'.join(tag_raw[:5])).upper()
    elif 'M0' in tag_raw[0]:
        if tag_raw[4] == '':
            category = assessment_anchor_category
            standard = '.'.join(tag_raw[:4]).upper()
        else:
            sub_standard = '-'.join(['.'.join(tag_raw[:2]), tag_raw[2]])
            if tag_raw[5] == '':
                category = anchor_descriptor_category
                standard = (sub_standard + '.' + '.'.join(tag_raw[3:5])).upper()
            else:
                category = eligible_content_category
                standard = (sub_standard + '.' + '.'.join(tag_raw[3:6])).upper()

    description = tag_raw[6].strip()

    try:
        tag = None
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
