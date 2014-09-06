from oc_platform import settings
from django.core.management import setup_environ
setup_environ(settings)

import datetime
import pytz

from django.contrib.auth.models import User
from user_account.models import Subscription, Activity

class ActivityNotifier:
    def __init__(self, since):
        self.since = since

    def notify_all(self):
        #users = User.objects.all()
        users = [User.objects.get(username='ocrootu')]

        for user in users:
            # Go through the subscriptions of each user.
            user_profile = user.get_profile()
            subscriptions = Subscription.objects.filter(subscriber=user_profile)

            activities = []
            raw_activities = Activity.objects.none()
            for subscription in subscriptions:
                raw_activities |= Activity.objects.filter(recipients=user)
                
            for ra in raw_activities:
                try:
                    created = ra.action.created
                except:
                    created = ra.action.joined

                if created >= self.since:
                    activities.append(ra)

            if len(activities) > 2:
                # Find all the resource creation activities.
                resource_activities = []
                for activity in activities:
                    if activity.action_type.name == 'resource' and activity.target_type.name == 'resource':
                        resource_activities.append(activity)

                if len(resource_activities) > 3:
                    self.send_digest(user, resource_activities)

    def send_digest(self, user, resource_activities):
        # Determine the most favorited / viewed resource.
        from interactions.models import Favorite

        resource_favorites = []
        for activity in resource_activities:
            activity.action.favorites = Favorite.objects.filter(parent_id=activity.action_id).count()
            activity.action.views = activity.action.views
            
            resource_favorites.append(activity.action)

        # Order by number of views.
        sorted_resources = sorted(resource_favorites, key=lambda rf: rf.views, reverse=True)
        primary_resource = self.prepare_resource(sorted_resources[0])

        # Find three activities from different publishers (actors).
        unique_publishers = self.get_unique_actors(sorted_resources)
        if len(unique_publishers) == 1:
            secondary_resources = [
            self.prepare_resource(sorted_resources[1]),
            self.prepare_resource(sorted_resources[2]),
            self.prepare_resource(sorted_resources[3])
        ]

        elif len(unique_publishers) == 2:
            secondary_resources = []

            second_resource = next(
                resource for resource in secondary_resources if resource.user != primary_resource.user)
            secondary_resources.append(self.prepare_resource(second_resource))

            third_resource = next(
                resource for resource in secondary_resources[1:] if resource != second_resource)
            fourth_resource = next(
                resource for resource in secondary_resources[1:] if resource != second_resource and resource != third_resource)

            secondary_resources.append(self.prepare_resource(third_resource))
            secondary_resources.append(self.prepare_resource(fourth_resource))

        elif len(unique_publishers) >= 3:
            secondary_resources = []

            second_resource = next(
                resource for resource in secondary_resources if resource.user != primary_resource.user)
            secondary_resources.append(self.prepare_resource(second_resource))

            third_resource = next(
                resource for resource in secondary_resources if resource.user != primary_resource.user and resource.user != second_resource.user)
            secondary_resources.append(self.prepare_resource(third_resource))

            fourth_resource = next(
                resource for resource in secondary_resources[1:] if resource != second_resource and resource != third_resource)
            secondary_resources.append(self.prepare_resource(fourth_resource))


        from django.template.loader import render_to_string
        from django.core.urlresolvers import reverse
        from django.core.mail import EmailMultiAlternatives

        host = 'http://opencurriculum.org'

        context = {
            'first_name': user.first_name,
            'preferences_url': host + reverse(
                'user:user_preferences'),

            'primary_resource_name': primary_resource.title,
            'primary_resource_url': host + reverse(
                'read', kwargs={
                    'resource_id': primary_resource.id,
                    'resource_slug': primary_resource.slug
                }
            ),
            'primary_resource_thumbnail': settings.MEDIA_URL + primary_resource.image.name,
            'primary_resource_type': primary_resource.type.lower(),

            'primary_resource_user': primary_resource.user.get_full_name(),
            'primary_resource_user_url': host + reverse(
                'user:user_profile', kwargs={ 'username': primary_resource.user.username }
            ),
            'primary_resource_user_thumbnail': settings.MEDIA_URL + primary_resource.user.get_profile().profile_pic.name,

            'secondary_resources': [
                {
                    'name': secondary_resources[0].title,
                    'type': secondary_resources[0].type.title,
                    'url': host + reverse(
                        'read', kwargs={
                            'resource_id': secondary_resources[0].id,
                            'resource_slug': secondary_resources[0].slug
                        }
                    ),
                    'thumbnail': settings.MEDIA_URL + secondary_resources[0].image.name,
                    'user': secondary_resources[0].user.get_full_name(),
                    'user_url': host + reverse(
                        'user:user_profile', kwargs={ 'username': secondary_resources[0].user.username }
                    )
                },
                {
                    'name': secondary_resources[1].title,
                    'type': secondary_resources[1].type.title,
                    'url': host + reverse(
                        'read', kwargs={
                            'resource_id': secondary_resources[1].id,
                            'resource_slug': secondary_resources[1].slug
                        }
                    ),
                    'thumbnail': settings.MEDIA_URL + secondary_resources[1].image.name,
                    'user': secondary_resources[1].user.get_full_name(),
                    'user_url': host + reverse(
                        'user:user_profile', kwargs={ 'username': secondary_resources[1].user.username }
                    )
                },
                {
                    'name': secondary_resources[2].title,
                    'type': secondary_resources[2].type.title,
                    'url': host + reverse(
                        'read', kwargs={
                            'resource_id': secondary_resources[2].id,
                            'resource_slug': secondary_resources[2].slug
                        }
                    ),
                    'thumbnail': settings.MEDIA_URL + secondary_resources[2].image.name,
                    'user': secondary_resources[2].user.get_full_name(),
                    'user_url': host + reverse(
                        'user:user_profile', kwargs={ 'username': secondary_resources[2].user.username }
                    )
                },

            ]
        }
        template = render_to_string('notifications/weekly_digest.html', context)

        from django.utils.html import strip_tags
        email_message_text = strip_tags(template)

        subject = '%s: %s' % (
            primary_resource.user.get_full_name(), primary_resource.title)
        
        from_email, to = 'OpenCurriculum <%s>' % settings.DIGESTS_EMAIL, [user.email]
        email = EmailMultiAlternatives(subject, email_message_text, from_email, to)
        email.attach_alternative(template, "text/html")
        email.send()


    def get_unique_actors(self, resources):
        unique_actors = set()
        for resource in resources:
            unique_actors.add(resource.user)

        return unique_actors


    def prepare_resource(self, resource):
        from meta.models import TagCategory
        resource_type_tc = TagCategory.objects.get(title='Resource type')

        try:
            resource.type = resource.tags.get(category=resource_type_tc).title
        except:
            resource.type = 'Resource'

        return resource


timezone = pytz.utc
starting_date = timezone.localize(datetime.datetime.now() - datetime.timedelta(weeks=1))

activity_notifier = ActivityNotifier(starting_date)
activity_notifier.notify_all()
