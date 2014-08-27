from __future__ import absolute_import
from oc_platform.celery import app

@app.task
def subscribe(host, subscription_id):
    from user_account.models import Subscription
    subscription = Subscription.objects.get(pk=subscription_id)

    # Notify the user who has been subscribed to.
    Subscription.new_subscription.send(
        sender="UserProfile", subscription=subscription,
        host=host
    )

    prepopulate_feed(subscription)


def prepopulate_feed(subscription):
    # Fetch the past few activities of the subscribee where they created a resource.
    from django.contrib.contenttypes.models import ContentType
    from oer.models import Resource
    from user_account.models import Activity

    resource_type = ContentType.objects.get_for_model(Resource)

    activities = Activity.objects.filter(
        actor=subscription.subscribee.user, action_type=resource_type)[:10]

    for activity in activities:
        if activity.context_type.name == 'user profile' and activity.action.visibility == 'public':
            # Push into the feed of the subscriber.
            activity.recipients.add(subscription.subscriber.user)

