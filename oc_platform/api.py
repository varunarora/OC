import logging
from django.conf import settings
from tastypie import fields
from tastypie.resources import ModelResource
from oc_platform.models import Article
from oc_platform.models import Category
from oc_platform.models import Collection
from oc_platform.models import Comment
from oc_platform.models import License
from oc_platform.models import Project
from oc_platform.models import Resource
from oc_platform.models import Revision
from oc_platform.models import User
from oc_platform.models import UserProfile
from oc_platform.api_serializer import CamelCaseJSONSerializer

logger = logging.getLogger(__name__)

# Uncomment to enable absolute URIs
#root_url = 'http://api.theopencurriculum.org'


class ArticleResource(ModelResource):
    most_recent_revision = fields.ForeignKey('oc_platform.api.RevisionResource', 'revision_id')
    category = fields.ForeignKey('oc_platform.api.CategoryResource', 'category_id')
    license = fields.ForeignKey('oc_platform.api.LicenseResource', 'license_id')
    revisions = fields.ToManyField('oc_platform.api.RevisionResource', 'articles')

    class Meta:
        queryset = Article.objects.filter(published=True)
        resource_name = 'articles'
        allowed_methods = ['get']
        fields = ['most_recent_revision', 'category', 'language_id', 'created', 'changed', 'title', 'license', 'slug', 'difficulty', 'citation']
        ordering = ['most_recent_revision', 'category', 'language_id', 'created', 'changed', 'title', 'license', 'slug', 'difficulty', 'citation']
        serializer = CamelCaseJSONSerializer()

    def dehydrate_most_recent_revision(self, bundle):
        return {'self': bundle.data['most_recent_revision']}

    def dehydrate_category(self, bundle):
        return {'self': bundle.data['category']}

    def dehydrate_license(self, bundle):
        return {'self': bundle.data['license']}

    def dehydrate(self, bundle):
        # Uncomment to rename resourceUri to be href
        bundle.data['self'] = bundle.data['resource_uri']
        del bundle.data['resource_uri']
        return bundle


class CategoryResource(ModelResource):
    parent = fields.ForeignKey('oc_platform.api.CategoryResource', 'parent_id', null=True)

    class Meta:
        queryset = Category.objects.all()
        resource_name = 'categories'
        allowed_methods = ['get']
        fields = ['title', 'project', 'created', 'slug', 'parent']
        ordering = ['title', 'project', 'created', 'slug', 'parent']
        serializer = CamelCaseJSONSerializer()

    def dehydrate_parent(self, bundle):
        return {'self': bundle.data['parent']}

    def dehydrate(self, bundle):
        # Uncomment to rename resourceUri to be href
        bundle.data['self'] = bundle.data['resource_uri']
        del bundle.data['resource_uri']
        return bundle

    # Uncomment to remove parent in the case where parent = self
    # def dehydrate(self, bundle):
    #     if bundle.data['resource_uri'] == bundle.data['parent']['resourceUri']:
    #         bundle.data['parent'] = 'null'
    #     return bundle

# Uncomment to enable absolute URIs
#    def dehydrate_resource_uri(self, bundle):
#        path = super(CategoryResource, self).dehydrate_resource_uri(bundle)
#        return "%s%s" % (root_url, path)
#
#    def dehydrate_parent(self, bundle):
#        return "%s%s" % (root_url, bundle.data['parent'])


class CollectionResource(ModelResource):
    class Meta:
        queryset = Collection.objects.all()
        resource_name = 'collections'
        allowed_methods = ['get']
        fields = ['title', 'created', 'owner_type_id', 'owner_id', 'visibility', 'changed', 'slug']
        ordering = ['title', 'created', 'owner_type_id', 'owner_id', 'visibility', 'changed', 'slug']
        serializer = CamelCaseJSONSerializer()

    def dehydrate(self, bundle):
        # Uncomment to rename resourceUri to be href
        bundle.data['self'] = bundle.data['resource_uri']
        del bundle.data['resource_uri']
        return bundle


class CommentResource(ModelResource):
    user = fields.ForeignKey('oc_platform.api.UserResource', 'user_id')

    class Meta:
        queryset = Comment.objects.all()
        resource_name = 'comments'
        allowed_methods = ['get']
        fields = ['body_markdown', 'created', 'parent_type_id', 'parent_id', 'body_markdown_html']
        ordering = ['body_markdown', 'created', 'parent_type_id', 'parent_id', 'body_markdown_html']
        serializer = CamelCaseJSONSerializer()

    def dehydrate_user(self, bundle):
        return {'self': bundle.data['user']}

    def dehydrate(self, bundle):
        # Uncomment to rename resourceUri to be href
        bundle.data['self'] = bundle.data['resource_uri']
        del bundle.data['resource_uri']
        return bundle


class LicenseResource(ModelResource):
    class Meta:
        queryset = License.objects.all()
        resource_name = 'licenses'
        allowed_methods = ['get']
        fields = ['title', 'description', 'custom']
        ordering = ['title', 'description', 'custom']
        serializer = CamelCaseJSONSerializer()

    def dehydrate(self, bundle):
        # Uncomment to rename resourceUri to be href
        bundle.data['self'] = bundle.data['resource_uri']
        del bundle.data['resource_uri']
        return bundle


class ProjectResource(ModelResource):
    class Meta:
        queryset = Project.objects.all()
        resource_name = 'projects'
        allowed_methods = ['get']
        fields = ['title', 'created', 'description', 'cover_pic', 'visibility', 'meta', 'slug']
        ordering = ['title', 'created', 'description', 'cover_pic', 'visibility', 'meta', 'slug']
        serializer = CamelCaseJSONSerializer()

    def dehydrate(self, bundle):
        # Uncomment to rename resourceUri to be href
        bundle.data['self'] = bundle.data['resource_uri']
        del bundle.data['resource_uri']
        return bundle


class ResourceResource(ModelResource):
    license = fields.ForeignKey('oc_platform.api.LicenseResource', 'license_id')
    user = fields.ForeignKey('oc_platform.api.UserResource', 'user_id')

    class Meta:
        queryset = Resource.objects.all()
        resource_name = 'resources'
        allowed_methods = ['get']
        fields = ['title', 'type', 'license', 'url', 'body_markdown', 'created', 'cost', 'file', 'body_markdown_html']
        ordering = ['title', 'type', 'license', 'url', 'body_markdown', 'created', 'cost', 'file', 'body_markdown_html']
        serializer = CamelCaseJSONSerializer()

    def dehydrate_license(self, bundle):
        return {'self': bundle.data['license']}

    def dehydrate_user(self, bundle):
        return {'self': bundle.data['user']}

    def dehydrate(self, bundle):
        # Uncomment to rename resourceUri to be href
        bundle.data['self'] = bundle.data['resource_uri']
        del bundle.data['resource_uri']
        return bundle


class RevisionResource(ModelResource):
    category = fields.ForeignKey('oc_platform.api.CategoryResource', 'category_id')
    article = fields.ForeignKey('oc_platform.api.ArticleResource', 'article_id')
    user = fields.ForeignKey('oc_platform.api.UserResource', 'user_id')

    class Meta:
        queryset = Revision.objects.all()
        resource_name = 'revisions'
        allowed_methods = ['get']
        fields = ['title', 'category', 'created', 'body_markdown', 'body_markdown_html', 'objectives', 'log', 'article', 'flag']
        ordering = ['title', 'category', 'created', 'body_markdown', 'body_markdown_html', 'objectives', 'log', 'article', 'flag']
        serializer = CamelCaseJSONSerializer()

    def dehydrate_category(self, bundle):
        return {'self': bundle.data['category']}

    def dehydrate_article(self, bundle):
        return {'self': bundle.data['article']}

    def dehydrate_user(self, bundle):
        return {'self': bundle.data['user']}

    def dehydrate(self, bundle):
        # Uncomment to rename resourceUri to be href
        bundle.data['self'] = bundle.data['resource_uri']
        del bundle.data['resource_uri']
        return bundle


class UserResource(ModelResource):
    #Uncomment this line to embed the profile as a resource
    profile = fields.ToOneField('oc_platform.api.UserProfileResource', 'profile', null=True, full=True)
    #Uncomment these lines to embed individual profile values. The profile must exist!
    #try
    #location = fields.CharField('profile__location', null=True)
    #profession = fields.CharField('profile__profession', null=True)
    #profile_pic = fields.CharField('profile__profile_pic', null=True)
    #except ???

    class Meta:
        queryset = User.objects.all()
        resource_name = 'users'
        allowed_methods = ['get']
        fields = ['username', 'first_name', 'last_name']
        ordering = ['username', 'first_name', 'last_name']
        serializer = CamelCaseJSONSerializer()

    def dehydrate(self, bundle):
        bundle.data['self'] = bundle.data['resource_uri']
        del bundle.data['resource_uri']
        return bundle


class UserProfileResource(ModelResource):
    user = fields.ToOneField('oc_platform.api.UserResource', 'user')

    class Meta:
        queryset = UserProfile.objects.all()
        resource_name = 'userProfiles'
        allowed_methods = ['get']
        fields = ['location', 'profession', 'profile_pic']
        ordering = ['location', 'profession', 'profile_pic']
        serializer = CamelCaseJSONSerializer()

    def dehydrate_profile_pic(self, bundle):
        if bundle.data['profile_pic'] == '':
            return ''
        return '%s%s' % (settings.MEDIA_URL, bundle.data['profile_pic'])

    def dehydrate_user(self, bundle):
        return {'self': bundle.data['user']}

    def dehydrate(self, bundle):
        bundle.data['self'] = bundle.data['resource_uri']
        del bundle.data['resource_uri']
        return bundle
