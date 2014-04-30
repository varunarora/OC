from oc_platform import settings
from django.core.management import setup_environ
setup_environ(settings)

from bs4 import BeautifulSoup
import json
import httplib
import re

def remove_class(tag):
    classies = tag.find_all(class_=True)
    for classy in classies:
        del classy['class']
    return tag


def remove_class_except(tag, exception_classes):
    def has_no_exception_class(tag):
        return tag.has_attr('class') and tag['class'] not in exception_classes

    classies = tag.find_all(has_no_exception_class)
    for classy in classies:
        del classy['class']
    return tag    

illustrations = json.loads(open('illustrations-full.json', 'r').read())

task_bodies = {}
for key, value in illustrations.items():
    key = int(key)
    if key >= 3 and key <= 3:
        request_url = "/illustrations/" + str(key)

        req = httplib.HTTPConnection('www.illustrativemathematics.org', 80)
        req.connect()

        req.request('GET', request_url)
        response = req.getresponse()

        # Compress illustation spacing.
        document = re.sub(r'\s+', ' ', response.read())

        task_bodies[key] = dict({
            'body': BeautifulSoup(document).find('div', class_='taskBody')
        }.items() + value.items())

from media.models import Image
from django.conf import settings
import urllib2

from django.contrib.auth.models import User
username = 'illustrativemathematics'
user = User.objects.get(username=username)

from license.models import License
license = License.objects.get(title='CC-BY-NC-SA')

from oer.models import Resource, Element, DocumentElement, Document, ResourceRevision
import json

from django.core.files.images import ImageFile
import os

from oc_platform import FormUtilities
from meta.models import TagCategory

#task_bodies = illustration_pages.find_all('div', class_="taskBody")
#for task_body in task_bodies:

for key, value in task_bodies.items():
    print key

    # Transform the solution header. Clear empty divs
    task = BeautifulSoup()
    task_body = value['body']

    # Now print image URL whenever found.
    images = task_body.find_all('img')

    for image in images:
        if image['alt'] != 'Page':
            # Download the image.
            img_web = urllib2.urlopen(image['src']).read()

            # Write the image to disk.
            # TODO(Varun): This variable gets a name.
            image_path = settings.MEDIA_ROOT + 'resource_thumbnail/tmp/' + str(key) + "-resource.jpg"
            localImage = open(image_path, 'w')
            localImage.write(img_web)
            localImage.close()

            final_image = ImageFile(open(image_path))

            # Upload new image as media item.
            new_image = Image(
                path=final_image,
                title=final_image.name,
                user=user
            )
            new_image.save()

            url = settings.MEDIA_URL + new_image.path.name
            image['src'] = url

            # Delete the image from disk.
            os.remove(image_path)

    contents = task_body.find('div', class_="taskContents")
    contents['class'] = 'task-contents'
    task.append(remove_class(contents))

    commentary = task_body.find('div', class_="taskCommentary")
    commentary['class'] = 'task-commentary'
    task.append(remove_class(commentary))
    
    resources = task_body.find('div', class_="taskResources")
    resources['class'] = 'task-resources'
    task.append(remove_class(resources))

    solutions_heading = task.new_tag('h3')
    solutions_heading.string = 'Solutions'

    task.append(solutions_heading)

    # Convert task region into article-example
    solutions = task_body.find_all('div', class_="solution")
    for solution in solutions:
        solution['class'] = 'article-block'

    solution_list = task_body.find('div', class_="solutionList")
    solution_list['class'] = 'solution-list'

    # Put a class bold on solution description
    try:
        descriptions = solution_list.find_all('span', class_="solutionDescription")
        for description in descriptions:
            description['class'] = 'bold'
    except TypeError:
        print 'No bold found'

    task.append(remove_class_except(solution_list, ['bold', 'article-block']))


    # Replace all non-escaped single $ marks with their closing $ (not on individual
    #      lines)
    # Do a resub of all \$.
    task = re.sub('(\\\)\$', '||', str(task))
    task = re.sub('(?<!\\\|\$)\$([^\$]+)(?<!\\\)\$', '\\\(\g<1>\\\)', task)
    task = re.sub('\|\|', '$', task)

    element = Element(body=json.loads('{"type": "textblock", "data": "' + task.replace(
        '\\', '\\\\').replace('\n', '\\n').replace('\r', '\\r').replace('\"', '\\"') + '"}'))
    element.save()

    content = Document()
    content.save()

    document_element = DocumentElement(
        document=content,
        element=element,
        position=1
    )
    document_element.save()

    revision = ResourceRevision(
        content=content,
        user=user
    )
    revision.save()

    tag_category = TagCategory.objects.get(title='Resources')

    from django.template.defaultfilters import slugify
    resource = Resource(
        revision=revision,
        title=value['title'],
        license=license,
        user=user,
        created=value['published'],
        description="",
        visibility='public',
        cost=0.0,
        source="IllustrativeMathematics.org" + value['url'],
        slug=slugify(value['title'])
    )
    resource.save()

    tags=FormUtilities.get_taglist(
                value['standards'], tag_category)
    for tag in tags:
        resource.tags.add(tag)

    revision.resource = resource
    revision.save()

    # Add the resource to a collection.
    user.get_profile().collection.resources.add(resource)

    print resource.id

    # Generate thumbnail image if not generated by default.

