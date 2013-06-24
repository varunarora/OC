from django.db import models

title_length = 60
description_length = 100

class Comment(models.Model):
    """Individual comment reply to a topic.
    
    Attributes:
        poster: Self-explanatory.
        text: Self-explanatory.
    """

    poster = models.charField(max_length=30)   #TODO
    text = models.TextField
    
    def __unicode__(self):
        return self.text

class Topic(models.Model):
    """Class for topics. Includes text of topic.

    Treating original posts and comments differently. This allows for 
    more flexibility in content and searching.

    Attributes:
        poster: Self-explanatory.
        title: Self-explanatory.
        text: Self-explanatory.
        comments: Self-explanatory.
    """
    
    poster = models.charField(max_length=30)   #TODO
    title = models.charField(max_length=title_length)
    text = models.TextField
    comments = models.ManyToManyField(Comment)
    
    def __unicode__(self):
        return self.title

class DiscussionBoard(models.Model):
    """Class for discussion boards. A discussion board has topics.

    Attributes:
        title: Self-explanatory.
        description: For example, /r/bestof has the description "The very 
                     best reddit has to offer."
        topics: Self-explanatory.
    """

    title = models.charField(max_length=title_length)
    description = models.charField(max_length=description_length)
    topics = models.ManyToManyField(Topic)
    
    def __unicode__(self):
        return self.title
