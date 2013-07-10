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


def testFindRecipients():
    class Struct:
        pass

    action1 = Struct()
    action1.name = 'upload'
    actor1 = Struct()
    actor1.subscribers = ['Dude1', 'Dude2', 'Dude3']
    print findRecipients(actor1, action1)

    actor2 = Struct()
    actor2.subscribers = ['Dude1', 'Dude2', 'Dude3']
    action2 = Struct()
    action2.name = 'subscribe'
    target = Struct()
    target.name = 'Dude2'
    action2.target = target
    print findRecipients(actor2, action2)

    actor3 = Struct()
    actor3.name = 'Dude1'
    actor3.subscribers = ['Dude2', 'Dude3', 'Dude4', 'Dude5']
    action3 = Struct()
    action3.name = 'comment'
    target = Struct()
    target.name = 'Dude3'
    target.subscribers = ['Dude1', 'Dude2', 'Dude4', 'Dude5']
    action3.target = target
    print findRecipients(actor3, action3)
