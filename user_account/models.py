from django.contrib.auth.models import User
from meta.models import Tag
from django.db import models
from django.dispatch import receiver
from interactions.models import Comment


class UserProfile(models.Model):
    user = models.OneToOneField(User)
    headline = models.CharField(max_length=256, null=True, blank=True)
    dob = models.DateTimeField()
    gender = models.NullBooleanField()
    location = models.CharField(max_length=256)
    profession = models.CharField(max_length=256)
    profile_pic = models.ImageField(upload_to='images/users', blank=True)
    interests = models.ManyToManyField(Tag, null=True, blank=True)
    social_id = models.CharField(max_length=32, null=True, blank=True)
    collection = models.ForeignKey('oer.Collection')

    def __unicode__(self):
        return self.user.username


class Cohort(models.Model):
    members = models.ManyToManyField(User)


class Notification(models.Model):
    user = models.ForeignKey(User)
    url = models.URLField(blank=True)
    description = models.CharField(max_length=512)
    read = models.BooleanField(default=False)

    def __unicode__(self):
        return str(self.id)

    @receiver(Comment.comment_created)
    def add_comment_notification(sender, **kwargs):
        comment_id = kwargs.get('comment_id', None)

        # Get the commment.
        from interactions.models import Comment
        comment = Comment.objects.get(pk=comment_id)

        # Determine whether this is an ArticleRevision, resource, etc. and the
        #     user who created it.
        asset = comment.parent
        user_to_notify = asset.user

        notification = Notification()
        notification.user = user_to_notify

        from django.core.urlresolvers import reverse
        from articles import views
        breadcrumb = views.fetch_cached_breadcrumb(asset)
        category_slug = [x.slug for x in breadcrumb[1:]]

        notification.url = reverse(
            'articles:reader', kwargs={'category_slug': '/'.join(category_slug)}
        ) + "?q=%s&revision=%s" % (asset.article.slug, str(asset.id))

        notification.description = "%s commented on %s: \"%s\"" % (
            comment.user.get_full_name(), asset.title, comment.body_markdown[:100])
        notification.save()
