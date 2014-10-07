from oc_platform import settings
from django.core.management import setup_environ
setup_environ(settings)

import csv

from django.db.models.loading import get_models
get_models()

from curriculum.models import Objective

tags_raw = open('tfi-math-curriculum-objectives.csv', 'r')
tag_rows = csv.reader(tags_raw, delimiter=',')

for row in tag_rows:
    tag_raw = row
    raw_description = tag_raw[0].strip().replace('\'', '"')

    meta = {
        'methodology': None,
        'how': None,
        'wordwall': None,
        'prerequisites': None
    }

    objective = Objective(description=raw_description)
    objective.meta = meta
    objective.save()
