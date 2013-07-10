from django.dispatch import Signal
from user_account.models import FeedItem


def findRecipients(actor, action):
    """Given an actor and action (including its target), finds the users
    on whose feed this action would appear.

    Parameters:
        actor: a user object.
        action: An object containing the target and subject.

    Returns:
        a set of recipients.
    """
    recipients = set()

    # Build the set of recipients
    if (action.name == 'subscribe'):
        # I'm subscribed to Zuck, I'm also interested in similar cool people.
        # If Zuck subscribes to x, I might be interested in x's coolness.
        recipients.update(actor.subscribers)

        # Also, obviously x would want to know that Zuck is now stalking her.
        recipients.add(action.target.name)

        # TODO: news item stuff will be moved elsewhere, ignore it for now.
        # The item can then be used with whatever arguments later.
        # Example: print slice % ('Zuck', 'Arash')
        item = "%s is now subscribed to %s"

    elif (action.name == 'upload'):
        # No targets involved. Only subscribers need know.
        recipients.update(actor.subscribers)
        item = "%s uploaded: "

    elif (action.name == 'comment'):
        # Hmm, this guy I'm subscribed to commented about Zuck, interesting.
        recipients.update(actor.subscribers)

        # I revere Zuck. Who dare comment on what he does?
        recipients.update(action.target.subscribers)
        # If I'm the dude who commented on Zuck, don't tell me.
        recipients.discard(actor.name)  # Removes iff present.

        # Wow, someone finally commented on my stuff!! :excited:
        recipients.add(action.target.name)
        item = "%s commented on %s %s "  # on 'your' "asset in blah project"

    return recipients


def addFeedItem(sender, **kwargs):
    """Finds recipients, creates a FeedItem object, and returns it."""
    actor = kwargs['actor']
    action = kwargs['action']
    recipients = findRecipients(actor, action)
    item = FeedItem()
    item.actor = actor.name
    item.action = action.name
    item.target = action.target.name
    item.recipients = ', '.join(recipients)
    item.save()

sig = Signal(providing_args=["actor", "action"])
sig.connect(addFeedItem)


class Test(object):
    class Struct:
        pass
    target = Struct()
    target.name = "Something"
    action1 = Struct()
    action1.name = 'upload'
    action1.target = target
    actor1 = Struct()
    actor1.name = "Actor"
    actor1.subscribers = ['Dude1', 'Dude2', 'Dude3']

    def test_stuff(self):
        sig.send(sender=self, actor=self.actor1, action=self.action1)

t1 = Test()
