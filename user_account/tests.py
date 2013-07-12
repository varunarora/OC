"""
This file demonstrates writing tests using the unittest module. These will pass
when you run "manage.py test".

Replace this with more appropriate tests for your application.
"""

from django.test import TestCase


class SimpleTest(TestCase):
    def test_basic_addition(self):
        """
        Tests that 1 + 1 always equals 2.
        """
        self.assertEqual(1 + 1, 2)

from interactions.models import Comment
from django.dispatch import Signal
from user_account.feeds import addFeedItem
from django.contrib.auth.models import User
sig = Signal(providing_args=['actor_id', "action", "target_id", "object_id"])
sig.connect(addFeedItem)


class Test(object):
    actor_id = '6'
    action = "comment"
    target_id = '3'

    def test(self):
        c = Comment()
        c.body_markdown = "Hi"
        c.user = User.objects.get(id='6')
        c.parent = c.user
        c.save()
        sig.send(sender=self, actor_id=self.actor_id, action=self.action,
                 target_id=self.target_id, object_id=c.id)


t = Test()
t.test()
