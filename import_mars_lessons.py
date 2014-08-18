from oc_platform import settings
from django.core.management import setup_environ
setup_environ(settings)

import json
from oer.models import Resource, ResourceRevision, Attachment, ResourceMeta
from django.core.files.images import ImageFile
from bs4 import BeautifulSoup

from meta.models import Tag, TagCategory, Category

from django.template.defaultfilters import slugify

import urllib2

import os
import os.path

from django.core.files import File

from django.contrib.auth.models import User
username = 'mars'
user = User.objects.get(username=username)

from license.models import License
license = License.objects.get(title='CC-BY-NC-ND')

mars_lessons_full_file = 'mars_lessons_contents_fixed.json'
lessons = json.loads(open(mars_lessons_full_file, 'r').read())

def get_attachment_as_url(attachment):
    return '<a href="http://opencurriculum.org/%s/" target="_blank">%s</a>' % (attachment.id, attachment.title)

for key, value in lessons.items():
    print key

    # Get all additional resources.
    attachments = []
    for resource in value['resources']:
        response = urllib2.urlopen(
            'http://map.mathshell.org/materials/' + resource)

        content_disposition = response.headers.get('Content-Disposition')
        filename = content_disposition[content_disposition.index('filename') + 10:-1]

        attachment_web = response.read()

        attachment_path = settings.MEDIA_ROOT + 'resources/tmp/' + filename
        local_attachment = open(attachment_path, 'w')
        local_attachment.write(attachment_web)
        local_attachment.close()

        created_local_attachment = open(attachment_path, 'r')

        attachment = Attachment(file=File(created_local_attachment))
        attachment.save()

        created_local_attachment.close()

        attachment_revision = ResourceRevision(
            content=attachment,
            user=user
        )
        attachment_revision.save()

        #(attachment_name, attachment_name) = os.path.split(attachment.file.name)
        attachment_resource = Resource(
            revision=attachment_revision,
            title=filename,
            license=license,
            user=user,
            description="",
            visibility='public',
            cost=0.0,
            slug=slugify(filename)
        )
        attachment_resource.save()

        attachment_revision.resource = attachment_resource
        attachment_revision.save()

        user.get_profile().collection.resources.add(attachment_resource)

        attachments.append(attachment_resource)
        os.remove(attachment_path)

    img_web = urllib2.urlopen(value['image_url']).read()

    resource_response = urllib2.urlopen(
        'http://map.mathshell.org/materials/' + value['lessons'][0])

    content_disposition = resource_response.headers.get('Content-Disposition')
    resource_filename = content_disposition[content_disposition.index('filename') + 10:-1]

    resource_web = resource_response.read()

    resource_path = settings.MEDIA_ROOT + 'resources/tmp/' + resource_filename
    local_resource = open(resource_path, 'w')
    local_resource.write(resource_web)
    local_resource.close()

    created_local_resource = open(resource_path, 'r')

    content = Attachment(file=File(created_local_resource))
    content.save()

    created_local_resource.close()

    revision = ResourceRevision(
        content=content,
        user=user
    )
    revision.save()

    resource = Resource(
        revision=revision,
        title=value['title'],
        license=license,
        user=user,
        description="",
        visibility='public',
        cost=0.0,
        source="http://map.mathshell.org/materials/lessons.php" + key,
        slug=slugify(value['title']),
        image=ImageFile(img_web)
    )
    resource.save()

    revision.resource = resource
    revision.save()

    # Add context, objectives and time to the resource meta.
    context = []
    context.append('In case you are trying the MARS MAP Classroom Challenges for the first time, ' +
        'it is recommended that you read the <a href="http://opencurriculum.org/9641/" target="_blank">Brief Guide for teachers and administrators</a> before you get started.')

    context_soup = BeautifulSoup(value['context'][0]).find_all('li')
    for li in context_soup:
        li_string = li.string

        if li_string:
            context.append(li.string)

    context.append('Additional resources for this lesson include: ' +
        ', '.join(map(get_attachment_as_url, attachments)))

    resource_meta = ResourceMeta(
        context=context,
        objectives=value['objectives'],
        time=value['time'][0]
    )
    resource_meta.save()

    resource.meta = resource_meta
    resource.save()

    # Add standards.
    content_standards_raw = value['standards']['content']
    for raw_standard_code, raw_standard_text in content_standards_raw.items():
        standard_category_guesses = Category.objects.filter(
            title__icontains=raw_standard_text[:-1])

        standard_category = None
        for guess in standard_category_guesses:
            if raw_standard_code[0] in guess.parent.parent.title:
                standard_category = guess

        for tag in standard_category.tags.all():
            resource.tags.add(tag)

    practice_standards_raw = value['standards']['practices']
    standards_tc = TagCategory.objects.get(title='Standards')
    for raw_standard in practice_standards_raw:
        standard_tag = Tag.objects.get(title='K-12.MP.' + raw_standard[2:])
        resource.tags.add(standard_tag)

    # Add the lesson tag.
    rt = TagCategory.objects.get(title='Resource type')
    lesson = Tag.objects.get(title='Lesson', category=rt)

    resource.tags.add(lesson)

    # Add everything to the collection.
    user.get_profile().collection.resources.add(resource)

    os.remove(resource_path)
