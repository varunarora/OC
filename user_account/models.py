from django.contrib.auth.models import User
from meta.models import Tag
from django.db import models
from django.dispatch import receiver
from interactions.models import Comment, Vote, Favorite
from projects.models import Project, Membership
from oer.models import Collection
from django.core.urlresolvers import reverse

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


def add_to_mailing_list(sender, instance, created, raw, **kwargs):
    if created:
        import mailchimp
        from django.conf import settings
        mailchimp = mailchimp.Mailchimp(settings.MAILCHIMP_API_KEY)
        mailchimp.lists.subscribe(
            settings.MAILCHIMP_MASTER_LIST_ID,
            {'email': instance.user.email },
            None, None,
            False
        )

from django.db.models.signals import post_save
post_save.connect(add_to_mailing_list, sender=UserProfile)


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
        parent_type = kwargs.get('parent_type', None)

        # Get the commment.
        from interactions.models import Comment
        comment = Comment.objects.get(pk=comment_id)

        # Determine whether this is an ArticleRevision, resource, etc. and the
        #     user who created it.
        asset = comment.parent
        user_to_notify = asset.user

        # If the commentor is not the same as the creator of the original post
        if user_to_notify != comment.user:
            notification = Notification()
            notification.user = user_to_notify

            # Get the type of the parent of the comment
            from django.contrib.contenttypes.models import ContentType
            parent_ct = ContentType.objects.get(pk=parent_type)

            # If this is the child of a comment 
            if parent_ct.name == 'comment':
                # Get root parent of the comment
                from interactions.CommentUtilities import CommentUtilities
                (root_parent_type, root_parent, root_comment) = CommentUtilities.get_comment_root(comment)
            else:
                root_parent = comment.parent
                root_parent_type = parent_ct
                root_comment = comment

            if root_parent_type.name == 'article revision':

                from articles import views
                breadcrumb = views.fetch_cached_breadcrumb(asset)
                category_slug = [x.slug for x in breadcrumb[1:]]

                notification.url = reverse(
                    'articles:reader', kwargs={'category_slug': '/'.join(category_slug)}
                ) + "?q=%s&revision=%s" % (asset.article.slug, str(asset.id))

                notification.description = "%s commented on %s: \"%s\"" % (
                    comment.user.get_full_name(), asset.title, comment.body_markdown[:100])

            elif root_parent_type.name == 'project':

                notification.url = reverse(
                    'projects:project_discussion', kwargs={
                        'project_slug': root_parent.slug,
                        'discussion_id': root_comment.id
                    }
                )

                notification.description = "%s commented on your post in %s: \"%s\"" % (
                    comment.user.get_full_name(), root_parent.title, comment.body_markdown[:100])

            notification.save()


    @receiver(Project.discussion_post_created)
    def add_discussion_post_notification(sender, **kwargs):
        comment_id = kwargs.get('comment_id', None)

        # Get the discussion post.
        from interactions.models import Comment
        comment = Comment.objects.get(pk=comment_id)        

        project_members = comment.parent.members.all().exclude(pk=comment.user.id)

        for member in project_members:
            notification = Notification()
            notification.user = member

            notification.url = reverse(
                'projects:project_discussion', kwargs={
                    'project_slug': comment.parent.slug,
                    'discussion_id': comment.id
                }
            )

            notification.description = "%s wrote a new post in %s: \"%s\"" % (
                comment.user.get_full_name(), comment.parent.title, comment.body_markdown[:100])

            notification.save()


    @receiver(Membership.new_invite_request)
    def add_project_invite_notification(sender, **kwargs):
        membership_id = kwargs.get('membership_id', None)

        membership_request = Membership.objects.get(pk=int(membership_id))
        project = membership_request.project

        for admin in project.admins.all():
            notification = Notification()
            notification.user = admin

            notification.url = reverse(
                'projects:project_requests', kwargs={
                    'project_slug': project.slug,
                }
            )

            notification.description = "%s has requested to join %s" % (
                membership_request.user.get_full_name(), project.title)

            notification.save()


    @receiver(Membership.invite_request_accepted)
    def accept_project_invite_notification(sender, **kwargs):
        membership_id = kwargs.get('membership_id', None)

        membership_request = Membership.objects.get(pk=int(membership_id))
        project = membership_request.project

        notification = Notification()
        notification.user = membership_request.user

        notification.url = reverse(
            'projects:project_home', kwargs={
                'project_slug': project.slug,
            }
        )

        notification.description = "Your request to join %s has been accepted!" % (
            project.title)

        notification.save()


    @receiver(Membership.new_member_added)
    def add_new_member_notification(sender, **kwargs):
        membership_id = kwargs.get('membership_id', None)

        membership_request = Membership.objects.get(pk=int(membership_id))
        project = membership_request.project

        notification = Notification()
        notification.user = membership_request.user

        notification.url = reverse(
            'projects:project_home', kwargs={
                'project_slug': project.slug,
            }
        )

        notification.description = "You have been added to %s as a member" % (
            project.title)

        notification.save()


    @receiver(Membership.member_turned_admin)
    def turn_member_into_admin_notification(sender, **kwargs):
        project = kwargs.get('project', None)
        user = kwargs.get('user', None)

        notification = Notification()
        notification.user = user

        notification.url = reverse(
            'projects:project_home', kwargs={
                'project_slug': project.slug,
            }
        )

        notification.description = "You have been assigned as an administrator in %s" % (
            project.title)

        notification.save()


    @receiver(Vote.vote_casted)
    def project_comment_vote_notification(sender, **kwargs):
        vote = kwargs.get('vote', None)

        notification = Notification()
        notification.user = vote.parent.user

        # Get the discussion post.
        from interactions.CommentUtilities import CommentUtilities
        (host_type, host, discussion) = CommentUtilities.get_comment_root(vote.parent)

        # TODO(Varun): Don't notify if the parent creator and vote creator are the same.

        notification.url = reverse(
            'projects:project_discussion', kwargs={
                'project_slug': host.slug,
                'discussion_id': discussion.id
            }
        )

        from oer.BeautifulSoup import BeautifulSoup
        soup = BeautifulSoup(vote.parent.body_markdown)
        comment_body = soup.text[:50] + "..." if len(soup.text) >= 50 else soup.text

        notification.description = "%s just upvoted your comment \"%s\" in %s" % (
            vote.user.get_full_name(), comment_body, host.title)

        notification.save()


    @receiver(Collection.collaborator_added)
    def collaborator_add_notification(sender, **kwargs):
        collection = kwargs.get('collection', None)
        user = kwargs.get('user', None)

        notification = Notification()
        notification.user = user

        # Get root host of the collection.
        import oer.CollectionUtilities as cu 
        (collection_root_type, collection_root) = cu.get_collection_root(collection)

        if collection_root_type.name == 'project':
            notification.url = reverse(
                'projects:list_collection', kwargs={
                    'project_slug': collection_root.slug,
                    'collection_slug': collection.slug
                }
            )

        notification.description = 'You have been added as a collaborator on the collection "%s"' % (
            collection.title)

        notification.save()


    @receiver(Favorite.resource_favorited)
    def my_resource_favorited_notification(sender, **kwargs):
        favorite = kwargs.get('favorite', None)

        notification = Notification()
        notification.user = favorite.resource.user
        notification.url = reverse(
            'resource:read', kwargs={
                'resource_id': favorite.resource.id
            }
        )

        notification.description = '%s favorited your resource "%s"' % (
            favorite.user.get_full_name(), favorite.resource.title)

        notification.save()


    @receiver(Vote.resource_vote_casted)
    def my_resource_upvoted_notification(sender, **kwargs):
        vote = kwargs.get('vote', None)

        notification = Notification()
        notification.user = vote.parent.user
        notification.url = reverse(
            'resource:read', kwargs={
                'resource_id': vote.parent.id
            }
        )

        notification.description = '%s upvoted your resource "%s"' % (
            vote.user.get_full_name(), vote.parent.title)

        notification.save()
