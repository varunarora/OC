from django.dispatch import Signal

new_subscription = Signal(providing_args=['actor_id', "action", "target_id"])
new_upload = Signal(providing_args=['actor_id', "action", "object_id"])

from user_account.views import add_activity
new_subscription.connect(add_activity)
new_upload.connect(add_activity)
