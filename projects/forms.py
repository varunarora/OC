from django.forms import ModelForm
from projects.models import Project
from oer.models import Collection
from django.template.defaultfilters import slugify


class ProjectForm(ModelForm):
    cover_pic_tmp = open('static/images/tmp/default-project.jpg')

    def __init__(self, request, user):
        newRequest = request.copy()
        title = request.get('title')

        # Create a new root collection for the project
        root_collection = Collection(
            title=title + "_root",
            owner=user,
            visibility=request.get('visibility'),
            slug=slugify(title)
        )
        root_collection.save()

        newRequest.__setitem__('admins', user.id)
        newRequest.__setitem__('members', user.id)

        slug = self._get_fresh_slug(title)
        newRequest.__setitem__('slug', slug)

        newRequest.__setitem__('collection', root_collection.id)

        super(ModelForm, self).__init__(newRequest)

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
