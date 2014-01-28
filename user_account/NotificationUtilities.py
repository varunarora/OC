from django.conf import settings


def notify_by_email(notification, host):
    email_message_text = 'You have a new notification: %s (%s)' % (
        notification.description, 'http://' + host + notification.url)
    email_message_html = 'You have a new notification: <a href="%s" target="_blank">%s</a>' % (
        'http://' + host + notification.url, notification.description)

    # Send the email with the fields prepared above.
    from django.core.mail import EmailMultiAlternatives
    subject, from_email, to = notification.description, 'OpenCurriculum <%s>' % settings.NOTIFICATIONS_EMAIL, [notification.user.email]
    email = EmailMultiAlternatives(subject, email_message_text, from_email, to)
    email.attach_alternative(email_message_html, "text/html")
    email.send()