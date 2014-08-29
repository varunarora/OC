from django.conf import settings
from django.core.mail import EmailMultiAlternatives


def notify_by_email(notification, host):
    email_message_text = 'You have a new notification: %s (%s)' % (
        notification.description, 'http://' + host + notification.url)
    email_message_html = 'You have a new notification: <a href="%s" target="_blank">%s</a>' % (
        'http://' + host + notification.url, notification.description)

    # Send the email with the fields prepared above.
    subject, from_email, to = notification.description, 'OpenCurriculum <%s>' % settings.NOTIFICATIONS_EMAIL, [notification.user.email]
    email = EmailMultiAlternatives(subject, email_message_text, from_email, to)
    email.attach_alternative(email_message_html, "text/html")
    email.send()


def notify_subscription_by_email(notification, host, actor):
    from django.template.loader import render_to_string
    context = {
        'preheader': notification.description,
        'url': 'http://' + host + notification.url,
        'actor_full_name': actor.get_full_name(),
        'actor_first_name': actor.first_name,
        'actor_thumbnail': settings.MEDIA_URL + actor.get_profile().profile_pic.name,
        'actor_email': actor.email,
        'actee_email': notification.user.email
    }
    template = render_to_string('notifications/notification.html', context)

    email_message_text = 'You have a new notification: %s (%s)' % (
        notification.description, 'http://' + host + notification.url)
    
    subject, from_email, to = notification.description + '!', '%s via OpenCurriculum <%s>' % (actor.get_full_name(), settings.NOTIFICATIONS_EMAIL), [notification.user.email]
    email = EmailMultiAlternatives(subject, email_message_text, from_email, to)
    email.attach_alternative(template, "text/html")
    email.send()


def test_trackable(template_name, subject, user, campaign, context):
    from user_account.tasks import send_newsletter
    from django.template.loader import render_to_string

    template = render_to_string('newsletters/%s.html' % template_name, context)
    send_newsletter.delay(template, subject, campaign.id, user.id)
