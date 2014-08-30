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


@app.task
def open_newsletter(user_id, campaign_id):
    try:
        from django.contrib.auth.models import User
        user = User.objects.get(pk=user_id)

        from user_account.models import Campaign
        campaign = Campaign.objects.get(pk=campaign_id)

    except:
        return

    from user_account.models import CampaignOpen
    user_profile = user.get_profile()

    try:
        CampaignOpen.objects.get(user=user_profile, campaign_id=campaign)

    except CampaignOpen.DoesNotExist:
        try:
            CampaignOpen(user=user_profile, campaign=campaign).save()
        except:
            pass


@app.task
def send_newsletter(email_message_html, subject, campaign_id, user_id):
    try:
        from django.contrib.auth.models import User
        user = User.objects.get(pk=user_id)

        from user_account.models import Campaign
        campaign = Campaign.objects.get(pk=campaign_id)
    except:
        return

    try:
        from django.utils.html import strip_tags
        email_message_text = strip_tags(email_message_html)
        email_message_html += '<img src="http://opencurriculum.org/user/newsletter/tracker.gif?uid=1&cid=%s"/>' % campaign.id

        from django.conf import settings
        from django.core.mail import EmailMultiAlternatives
        from_email, to = 'OpenCurriculum <%s>' % settings.NEWSLETTERS_EMAIL, [user.email]
        email = EmailMultiAlternatives(subject, email_message_text, from_email, to)
        email.attach_alternative(email_message_html, "text/html")
        email.send()

    except:
        return