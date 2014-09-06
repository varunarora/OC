from oc_platform import settings
from django.core.management import setup_environ
setup_environ(settings)

from apiclient.discovery import build

import sys
import datetime
from rfc3339 import rfc3339
import httplib
import json
import pytz

from oer.models import Resource, ResourceRevision, Link, Collection
from license.models import License

from django.template.defaultfilters import slugify
import dateutil.parser

from meta.models import Tag, TagCategory
resource_type_tc = TagCategory.objects.get(title='Resource type')
activity = Tag.objects.get(title='Activity', category=resource_type_tc)
lecture = Tag.objects.get(title='Lecture', category=resource_type_tc)

class KhanAcademy:
    def fetch(self, since):
        channel='UC4a-Gbdw7vOaccHmFo40b9g'
        DEVELOPER_KEY = "AIzaSyCln8WLib8HxZ6OvBvybN1VB10ROMxkdzs"
        YOUTUBE_API_SERVICE_NAME = "youtube"
        YOUTUBE_API_VERSION = "v3"
        self.license = License.objects.get(title='CC-BY-NC-SA')
        self.youtube = build(YOUTUBE_API_SERVICE_NAME, YOUTUBE_API_VERSION,
            developerKey=DEVELOPER_KEY)
        
        video_resources = self.youtube_search(channel, since)
        activity_resources = self.get_activities(since)
        #print activity_resources

        #return activity_resources
        return video_resources + activity_resources


    def youtube_search(self, channel, since):
        search_response = self.youtube.search().list(channelId=channel,
            part="id,snippet", order='date',
            type='video', maxResults=50, publishedAfter=rfc3339(since)).execute()

        resources = []
        for video in search_response['items']:
            resources.append(self.build_resource(video))

        return resources


    def get_activities(self, since):
        # Get the exercises topic tree into the memory.
        req = httplib.HTTPConnection('www.khanacademy.org', 80)
        req.connect()

        req.request('GET', '/api/v1/topictree?kind=Exercise')
        response = req.getresponse()
        topictree = json.loads(response.read())

        """import os.path
        path = os.path.dirname(__file__)

        topictree_file = open(path + '/topictree-exercises.json')
        topictree_raw = topictree_file.read()

        topictree = json.loads(topictree_raw)"""

        exercises = []
        def build_topics(root):
            if root['kind'] == 'Exercise':

                exercise_creation = dateutil.parser.parse(root['creation_date'])
                if exercise_creation > since and not self.exercise_in_list(root['title'], exercises):
                    exercises.append(self.build_activity_resource(root, exercise_creation))

            if 'children' in root:
                for child in root['children']:
                    build_topics(child)

        build_topics(topictree)

        req.close()
        return exercises


    def build_resource(self, raw_video):
        new_video = Link(
            url='https://www.youtube.com/watch?v=' + raw_video['id']['videoId']
        )
        new_video.save()

        new_video_revision = ResourceRevision(
            content=new_video
        )

        new_video_resource = Resource(
            title=raw_video['snippet']['title'],
            license=self.license,
            description=raw_video['snippet']['description'],
            visibility='public',
            created=dateutil.parser.parse(raw_video['snippet']['publishedAt']),
            cost=0.0,
            source="YouTube.com/KhanAcademy",
            slug=slugify(raw_video['snippet']['title']),
        )

        return (new_video_resource, new_video_revision, lecture)


    def build_activity_resource(self, raw_exercise, created):
        new_activity = Link(
            url=raw_exercise['ka_url']
        )
        new_activity.save()

        new_activity_revision = ResourceRevision(
            content=new_activity,
            created=dateutil.parser.parse(raw_exercise['creation_date'])
        )

        description = raw_exercise['description_html']
        if description == '':
            if raw_exercise['author_name'] == '':
                description = 'A set of ' + str(len(
                    raw_exercise['author_name'])) + ' questions to enhance student understanding on the topic and make them assessment ready.'
            else:
                description = 'A set of ' +  str(len(
                    raw_exercise['author_name'])) + '+ questions created by Khan Academy\'s ' +  raw_exercise['author_name'] + '.'

        new_activity_resource = Resource(
            title=raw_exercise['title'],
            license=self.license,
            description=description,
            visibility='public',
            cost=0.0,
            created=created,
            source="KhanAcademy TopicTree API",
            slug=slugify(raw_exercise['title']),
        )

        return (new_activity_resource, new_activity_revision, activity)


    def exercise_in_list(title, exercises):
        for exercise in exercises:
            if exercise.title == title:
                return True

        return False


class ActivityBuilder:
    def __init__(self, username, since):
        self.username = username
        self.since = since

        """since_datetime = since.split('-')
        correct_since_datetime = []
        for since_datetime_item in since_datetime:
            correct_since_datetime.append(int(since_datetime_item))

        self.since= datetime.datetime(*correct_since_datetime, tzinfo=pytz.utc)"""


    def build(self):
        if self.username == 'khanacademy':
            publisher = KhanAcademy()

        from django.contrib.auth.models import User
        user = User.objects.get(username=self.username)
        user_profile = user.get_profile()

        resources_revisions = publisher.fetch(self.since)
        for resource_revision in resources_revisions:
            resource = resource_revision[0]
            revision = resource_revision[1]
            resource_type = resource_revision[2]

            revision.user = user
            revision.save()

            resource.user = user
            resource.revision = revision
            resource.save()

            resource.tags.add(resource_type)

            revision.resource = resource
            revision.save()

            # Add to collection.
            #Collection.objects.get(slug='khan-test').resources.add(resource)
            user_profile.collection.resources.add(resource)

            # Generate notifications / activities.
            Resource.resource_created.send(
                sender="Resources", resource=resource,
                context_type='user profile', context=user_profile
            )


#activity_builder = ActivityBuilder(sys.argv[1], sys.argv[2])
timezone = pytz.utc
starting_date = timezone.localize(datetime.datetime.now() - datetime.timedelta(weeks=9))

activity_builder = ActivityBuilder('khanacademy', starting_date)
activity_builder.build()
