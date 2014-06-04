from user_account.models import Notification


def notifications(request):
    try:
        user = request.user.id
        unread_notifications_count = Notification.objects.filter(user=user, read=False).count
        top_notifications = Notification.objects.filter(user=user).order_by('-id')[:10]

        context = {
            'notification_count': unread_notifications_count,
            'top_notifications': top_notifications
        }
        return context
    except:
        pass



def social_auth(request):
    from django.conf import settings
    context = {
        'FB_APP_ID': settings.FB_APP_ID,
        'PLUS_APP_ID': settings.PLUS_APP_ID
    }
    return context
