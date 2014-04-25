from django import forms
from projects.models import Project
from interactions.models import Comment
from django.template.defaultfilters import slugify
from django.conf import settings

class ProjectForm(forms.ModelForm):
    cover_pic_tmp = open(settings.MEDIA_ROOT + 'project/' + 'default-project.jpg')

    def __init__(self, request, user):
        newRequest = request.copy()
        title = request.get('title')

        newRequest.__setitem__('admins', user.id)

        newRequest.__setitem__('description', request.get('short_description'))

        # Set profile picture default position.
        from media.models import ImagePosition
        new_cover_image_position = ImagePosition(top=50, left=50)
        new_cover_image_position.save()

        newRequest.__setitem__('cover_pic_position', new_cover_image_position.id)

        slug = self._get_fresh_slug(title)
        newRequest.__setitem__('slug', slug)

        super(ProjectForm, self).__init__(newRequest)

    def _get_fresh_slug(self, title):
        slug = slugify(title)

        # Check if this slug has already been taken by another project
        projects_with_slug = Project.objects.filter(slug=slug)
        num_projects_with_slug = projects_with_slug.count()
        if num_projects_with_slug != 0:
            slug = self._apply_additional_slug(slug, 1)

        return slug

    def _apply_additional_slug(self, slug, depth):
        attempted_slug = slug + "-" + str(depth)
        projects = Project.objects.filter(slug=slug + "-" + str(depth))
        if projects.count() == 0:
            return attempted_slug
        else:
            return self._apply_additional_slug(slug, depth + 1)

    class Meta:
        model = Project
        exclude = ('members',)


class NewDiscussionPost(forms.ModelForm):
    def __init__(self, request, user):
        newRequest = request.copy()
        
        newRequest.__setitem__('user', user.id)

        from django.contrib.contenttypes.models import ContentType
        project_ct = ContentType.objects.get_for_model(Project)

        from oer.models import Resource, Collection
        resource_ct = ContentType.objects.get_for_model(Resource)
        collection_ct = ContentType.objects.get_for_model(Collection)

        newRequest.__setitem__('parent_type', project_ct.id)

        if newRequest.get('attachment_id', None):
            newRequest.__setitem__('attachment_type', resource_ct.id if request.get(
                'is_resource') == 'true' else collection_ct.id)

        super(NewDiscussionPost, self).__init__(newRequest)

    class Meta:
        model = Comment


class UploadCoverPicture(forms.Form):
    new_cover_picture = forms.ImageField()


class ProjectSettings(forms.ModelForm):
    def __init__(self, request, instance):
        new_request = request.copy()

        admins = []
        for admin in instance.admins.all():
            admins.append(str(admin.id))

        new_request.setlist('admins', admins)
        new_request.__setitem__('collection', instance.collection.id)
        new_request.__setitem__('slug', instance.slug)
        new_request.__setitem__('cover_pic_position', instance.cover_pic_position.id)

        super(ProjectSettings, self).__init__(new_request, instance=instance)

    class Meta:
        exclude = ('members',)
        model = Project


class ProjectDelete():
    def __init__(self, request, instance):
        # Delete all the project's collection (which deletes all the resources in it).
        from oer.views import delete_individual_collection
        delete_individual_collection(instance.collection)

        # Delete all the discussion comments (including posts) & votes.
        from interactions.views import delete_comment_tree

        from django.contrib.contenttypes.models import ContentType
        project_ct = ContentType.objects.get_for_model(Project)

        root_comments = Comment.objects.filter(
            parent_id=instance.id, parent_type=project_ct)
        for comment in root_comments:
            delete_comment_tree(comment)

        # Delete the project (deletes memberships and administration).
        instance.delete()
