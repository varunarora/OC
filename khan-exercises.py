import httplib
from oc_platform import settings
from django.core.management import setup_environ
setup_environ(settings)

from bs4 import BeautifulSoup
import json

req = httplib.HTTPConnection('www.khanacademy.org', 80)
req.connect()

grades_path = 'ka_grades.json'
exercises_path = 'ka_exercises.json'

""" STEP ONE
req.request('GET', '/commoncore/map')
response = req.getresponse()

soup = BeautifulSoup(response)
grades = soup.find_all('a', class_='grade-preview')

serialized_grades = []
for grade in grades:
    title = grade.find('div', class_='standard-skill-title')
    serialized_grades.append({
        'title': title.string,
        'href': grade['href']
    })

local_grades_path = open(grades_path, 'w')
local_grades_path.write(json.dumps(serialized_grades))
local_grades_path.close()"""

""" STEP TWO
def get_exercise_map(soup):
    unfiltered_standards = soup.find('div', class_='domain').children
    domain = soup.find(class_='third-tier').find(class_='tab-link active').string

    exercise_map = {}
    for standard in unfiltered_standards:
        if standard.name == 'div':
            tag = standard.find(class_="code").span.string

            exercise_map[tag] = []

            skills = standard.find(class_="standard-skills").find_all(class_='standard-preview')

            for skill in skills:
                exercise_map[tag].append({
                    'title': skill.find(class_='standard-skill-title').string,
                    'href': skill['href']
                })

    return (domain, exercise_map)

grades = json.loads(open(grades_path, 'r').read())

grade_map = {}
for grade in grades:
    req.request('GET', grade['href'])
    response = req.getresponse()

    req.close()

    exercise_maps = {}

    if response.status == 302:
        loc = response.getheader('Location')
        redirected_location = '/' + loc.split('/')[-2] + '/' + loc.split('/')[-1]

        req.connect()
        req.request('GET', redirected_location)
        response = req.getresponse()


    soup = BeautifulSoup(response)

    (key_domain, domain_exercise_map) = get_exercise_map(soup)
    exercise_maps[key_domain] = domain_exercise_map

    # Get the URLs to all other domains.
    level = soup.find(class_='tab-link active')
    all_domains = level.parent.ul.find_all('li')

    filtered_domains = [domain.a for domain in all_domains if domain.a['class'][0].strip(
        ) == 'tab-link' and domain.a['class'][1].strip() == '']

    for domain in filtered_domains:
        req.close()

        req.connect()
        req.request('GET', domain['href'])
        response = req.getresponse()

        soup = BeautifulSoup(response)
        (key_domain, domain_exercise_map) = get_exercise_map(soup)

        exercise_maps[key_domain] = domain_exercise_map

    grade_map[grade['title']] = exercise_maps

local_exercises_path = open(exercises_path, 'w')
local_exercises_path.write(json.dumps(grade_map))
local_exercises_path.close()"""

grades_map = json.loads(open(exercises_path, 'r').read())

import os
import dateutil.parser

from oer.models import Resource, Link, ResourceRevision
from meta.models import Tag, TagCategory

from django.contrib.auth.models import User
user = User.objects.get(username='khanacademy')

from license.models import License
license = License.objects.get(title='CC-BY-NC-SA')

from django.template.defaultfilters import slugify
import urllib2
from django.core.files.images import ImageFile

from django.contrib.contenttypes.models import ContentType
link_content_type = ContentType.objects.get_for_model(Link)

from os.path import splitext

def get_image(url):
    img_web = urllib2.urlopen(url).read()

    (filename, extension) = splitext(os.path.basename(url))

    # Write the image to disk.
    image_path = settings.MEDIA_ROOT + 'resource_thumbnail/tmp/' + filename[:200] + extension
    localImage = open(image_path, 'w')
    localImage.write(img_web)
    localImage.close()

    return image_path


def build_resource_from_exercise(exercise_raw, tag):
    exercise_name = os.path.basename(exercise_raw)

    api_url = '/api/v1/exercises/' + exercise_name

    req.connect()
    req.request('GET', api_url)
    response = req.getresponse()

    result = response.read()

    if result != '' and 'There is no' not in result:
        exercise = json.loads(result)
    else:
        return None

    # Fetch URL.
    number_of_items = 0
    for problem_types in exercise['problem_types']:
        number_of_items += len(problem_types['items'])

    final_image = get_image(exercise['image_url'])

    description = exercise['description_html']
    if description == '':
        if exercise['author_name'] == '':
            description = 'A set of ' + str(len(
                exercise['author_name'])) + ' questions to enhance student understanding on the topic and make them assessment ready.'
        else:
            description = 'A set of ' +  str(len(
                exercise['author_name'])) + '+ questions created by Khan Academy\'s ' +  exercise['author_name'] + '.'

    created = dateutil.parser.parse(exercise['creation_date'])
    resource = Resource(
        title=exercise['title'],
        cost=0,
        user=user,
        created=created,
        image=ImageFile(open(final_image)),
        license=license,
        description=description,
        slug=slugify(exercise['title']),
        visibility='public',
        source='KhanAcademy API'
    )

    url = Link(url=exercise['ka_url'])
    url.save()

    resource_revision = ResourceRevision()
    resource_revision.content = url
    resource_revision.created = created
    resource_revision.user = user
    resource_revision.save()

    resource.revision = resource_revision
    resource.save()

    user.get_profile().collection.resources.add(resource)
    user.get_profile().collection.save()

    # Delete the image from disk.
    os.remove(final_image)

    resource.tags.add(Tag.objects.get(title=(
        'Assessment' if exercise['is_quiz'] else 'Exercise'), category=TagCategory.objects.get(title='Resource type')))
    resource.tags.add(Tag.objects.filter(title=tag, category=TagCategory.objects.get(title='Standards'))[0])

    # CREATE A MOFO NOTIFICATION.
    Resource.resource_created.send(
        sender="Resources", resource=resource,
        context_type='user profile', context=user.get_profile()
    )

    req.close()

    # Create a video Resource from each of the video tags if doesn't exist
    for video_id in exercise['related_video_readable_ids']:
        video_url = '/api/v1/videos/' + video_id

        req.connect()
        req.request('GET', video_url)
        response = req.getresponse()

        video_response = json.loads(response.read())

        try:
            link = Link.objects.get(url__icontains=video_response['youtube_id'])
            video = Resource.objects.get(user__username='khanacademy',
                revision__content_id=link.id, revision__content_type=link_content_type.id)
        except:
            video_image = get_image(video_response['image_url'])
            
            date_added = dateutil.parser.parse(video_response['date_added'])
            
            req.close()

            if video_response['description']:
                description = video_response['description']
            else:
                description = ''

            video = Resource(
                title=video_response['title'],
                cost=0,
                user=user,
                created=date_added,
                image=ImageFile(open(video_image)),
                license=license,
                description=description,
                slug=slugify(video_response['title']),
                visibility='public'
            )

            url = Link(url='http://www.youtube.com/watch?v=' + video_response['youtube_id'])
            url.save()

            video_revision = ResourceRevision()
            video_revision.content = url
            resource_revision.created = created
            video_revision.user = user
            video_revision.save()

            video.revision = video_revision
            video.save()

            user.get_profile().collection.resources.add(video)
            user.get_profile().collection.save()

            # Delete the image from disk.
            os.remove(video_image)

        # Add tag to video.
        video.tags.add(Tag.objects.get(
            title='Lecture', category=TagCategory.objects.get(title='Resource type')))
        video.tags.add(Tag.objects.filter(title=tag, category=TagCategory.objects.get(title='Standards'))[0])

        # CREATE A MOFO NOTIFICATION.
        Resource.resource_created.send(
            sender="Resources", resource=video,
            context_type='user profile', context=user.get_profile()
        )


"""resource = build_resource_from_exercise(
    '/exercise/linear-models-of-bivariate-data', 'K.CC.A.1')"""

#import sys

counter = 0
standards_tc = TagCategory.objects.get(title='Standards')

for (grade, grade_domains) in grades_map.items():
    for (grade_domain_titles, grade_domain_exercises) in grade_domains.items():
        for (standard, exercises) in grade_domain_exercises.items():
            for exercise in exercises:
                r = Resource.objects.filter(
                    user__username='khanacademy', title=exercise['title']).count()

                if r == 0:
                    modified_standard = standard.replace('-', '.').upper()
                    try:
                        t = Tag.objects.get(
                            title=modified_standard,
                            category=standards_tc
                        )
                    except:
                        t = Tag(
                            title=modified_standard,
                            category=standards_tc
                        )
                        t.save()
                    
                    build_resource_from_exercise(exercise['href'], modified_standard)

                """counter += 1

                if counter > 100:
                    sys.exit()"""
