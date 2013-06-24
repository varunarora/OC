from django.db import models

title_length = 60
description_length = 100

class Comment(models.Model):
    """Individual comment reply to a topic.
    
    Attributes:
        poster: User who posted this comment.
        content: Content of the comment.
        post_time: Time the commend was first posted.
        is_edited: Whether the comment has been edited (Boolean).
        edit_time: Time of latest edit to this comment.
        upvotes: Number of users who have upvoted this topic.
        downvotes: Number of users who have downvoted this topic.
    """

    poster = models.CharField(max_length=30)   #TODO
    post_time = models.DateTimeField(auto_now=False, auto_now_add=True)
    content = models.TextField()
    is_edited = models.BooleanField()
    edit_time = models.DateTimeField(auto_now=True, auto_now_add=False)
    upvotes = models.PositiveIntegerField()
    downvotes = models.PositiveIntegerField()
    
    def __unicode__(self):
        return self.text

class Topic(models.Model):
    """Class for topics. Includes text of topic.

    Treating original posts and comments differently. This allows for 
    more flexibility in content and searching.

    Attributes:
        poster: User who posted this topic.
        post_time: Time the commend was first posted.
        title: Title of topic.
        content: Content of topic.
        comments: All comments associated with this topic (Relationship).
        comment_count: Number of comments associated with this topic.
        is_edited: Whether the comment has been edited (Boolean).
        edit_time: Time of latest edit to this comment.
        upvotes: Number of users who have upvoted this topic.
        downvotes: Number of users who have downvoted this topic.
    """
    
    poster = models.CharField(max_length=30)   #TODO
    post_time = models.DateTimeField(auto_now=False, auto_now_add=True)
    title = models.CharField(max_length=title_length)
    content = models.TextField()
    comments = models.ManyToManyField(Comment)
    comment_count = models.PositiveIntegerField()
    is_edited = models.BooleanField()
    edit_time = models.DateTimeField(auto_now=True, auto_now_add=True)
    upvotes = models.PositiveIntegerField()
    downvotes = models.PositiveIntegerField()   
    
    def __unicode__(self):
        return self.title

class DiscussionBoard(models.Model):
    """Class for discussion boards. A discussion board has topics.

    Attributes:
        title: Title of this discussion board.
        description: For example, /r/bestof has the description "The very 
                     best reddit has to offer."
        topics: All topics on this discussion board (Relationship).
        topic_count: Number of topics associated with this discussion board.
    """

    title = models.CharField(max_length=title_length)
    description = models.CharField(max_length=description_length)
    topics = models.ManyToManyField(Topic)
    topic_count = models.PositiveIntegerField()
    
    def __unicode__(self):
        return self.title

