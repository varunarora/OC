from django.contrib.auth.models import User
from django.core.exceptions import MultipleObjectsReturned

class SocialModelBackend(object):

    def authenticate(self, social_id=None):
        try:
            from user_account.models import UserProfile
            user_profile = UserProfile.objects.get(social_id=social_id)
            return user_profile.user
        except MultipleObjectsReturned:
            return MultipleObjectsReturned
        except:
            return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except:
            return None


class ConfirmAccountBackend(object):

    def authenticate(self, username=None, confirm_account=True):
        try:
            from user_account.models import UserProfile
            user_profile = UserProfile.objects.get(user__username=username)
            return user_profile.user
        except:
            return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except:
            return None
