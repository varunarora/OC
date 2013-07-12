from django.dispatch import Signal
from django.contrib.auth.models import User
from user_account.models import FeedItem
from interactions.models import Comment


def findRecipients(**kwargs):
    """Given an actor and action (including its target), finds the users
    on whose feed this action would appear.

    Parameters:
        actor: a user object.
        action: a string (one word) about what the actor did.
        target: the user on whom the action is performed.

    Examples:
        [Varun] [subscribed] to [Zeenab]                        # no object
        [Varun] [uploaded] a new resource: [resource_name]     # no target
        [Varun] [commented] on [Zeenab]'s resource: [comment_text]

    Returns:
        a set of recipients.
    """
    recipients = set()
    actor = kwargs['actor']
    action = kwargs['action']

    # Build the set of recipients
    if (action == 'subscribe'):
        target = kwargs['target']
        # I'm subscribed to Zuck, I'm also interested in similar cool people.
        # If Zuck subscribes to x, I might be interested in x's coolness.
        ##### recipients.update(actor.getSubscribers())

        # Also, obviously x would want to know that Zuck is now stalking her.
        recipients.add(target)

    elif (action == 'upload'):
        # No targets involved. Only subscribers need know.
        ##### recipients.update(actor.getSubscribers())
        recipients.update(actor)    # temp

    elif (action == 'comment'):
        target = kwargs['target']
        # Hmm, this guy I'm subscribed to commented about Zuck, interesting.
        ##### recipients.update(actor.getSubscribers())

        # I revere Zuck. Who dare comment on what he does?
        ##### recipients.update(target.getSubscribers())
        # If I'm the dude who commented on Zuck, don't tell me.
        recipients.discard(actor)      # Removes iff present.

        # Wow, someone finally commented on my stuff!! :excited:
        recipients.add(target)

    return recipients


def addFeedItem(sender, **kwargs):
    """Finds recipients, creates a FeedItem object, and returns it.

    Parameters:
        actor_id: id to a user object.
        action: a string (one word) about what the actor did.
        target_id: id to the user on whom the action is performed.
        object_id: id to the resource involved if any.

    Examples:
        [Varun] [subscribed] to [Zeenab]                        # no object
        [Varun] [uploaded] a new resource: [resource_name]     # no target
        [Varun] [commented] on [Zeenab]'s resource: [comment_text]
    """
    args_dict = dict()
    args_dict['actor'] = User.objects.get(id=kwargs['actor_id'])
    args_dict['action'] = kwargs['action']
    args_dict['target'] = User.objects.get(id=kwargs['target_id'])
    action_object = Comment.objects.get(id=kwargs['object_id'])
    recipients = findRecipients(**args_dict)
    item = FeedItem()
    item.actor = args_dict['actor']
    item.action = args_dict['action']
    item.target = args_dict['target']
    item.action_object = action_object
    item.save()
    item.recipients.add(*recipients)
    item.save()
    print item.action

sig = Signal(providing_args=['actor_id', "action", "target_id", "object_id"])
sig.connect(addFeedItem)
