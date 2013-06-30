from django.db import models

title_length = 60
description_length = 100


class DiscussionBoard(models.Model):
    """Class for discussion boards. A discussion board has topics.

    Attributes:
        title: Title of this discussion board.
        description: For example, /r/bestof has the description "The very
                     best reddit has to offer."
    """
    title = models.CharField(max_length=title_length)
    description = models.CharField(max_length=description_length)

    def __unicode__(self):
        return self.title


class Topic(models.Model):
    """Class for topics. Text of topic can be edited.

    Treating original posts and comments differently. This allows for
    more flexibility in content and searching.

    Attributes:
        discussion_board: Board this topic belongs to.
        poster: User who posted this topic.
        post_time: Time the commend was first posted.
        title: Title of topic.
        content: Content of topic.
        is_edited: Whether the comment has been edited (Boolean).
        edit_time: Time of latest edit to this comment.
        upvotes: Number of users who have upvoted this topic.
        downvotes: Number of users who have downvoted this topic.
    """
    discussion_board = models.ForeignKey('DiscussionBoard')
    poster = models.CharField(max_length=30)   # TODO
    post_time = models.DateTimeField(auto_now=False, auto_now_add=True)
    title = models.CharField(max_length=title_length)
    content = models.TextField()
    is_edited = models.BooleanField(default=False)
    edit_time = models.DateTimeField(auto_now=True, auto_now_add=True)
    upvotes = models.PositiveIntegerField(default=0)
    downvotes = models.PositiveIntegerField(default=0)

    def __unicode__(self):
        return self.title


class Comment(models.Model):
    """Individual comment reply to a topic. Comments cannot be edited.

    Attributes:
        topic: Topic this comment belongs to.
        poster: User who posted this comment.
        content: Content of the comment.
        post_time: Time the commend was first posted.
        upvotes: Number of users who have upvoted this topic.
        downvotes: Number of users who have downvoted this topic.
    """
    topic = models.ForeignKey('Topic')
    poster = models.CharField(max_length=30)   # TODO
    post_time = models.DateTimeField(auto_now=False, auto_now_add=True)
    content = models.TextField()
    upvotes = models.PositiveIntegerField(default=0)
    downvotes = models.PositiveIntegerField(default=0)

    def __unicode__(self):
        return self.content
