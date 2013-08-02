import logging
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
#from tastypie.utils import trailing_slash
#from django.conf.urls import url

logger = logging.getLogger(__name__)

# Uncomment to enable absolute URIs
#root_url = 'http://api.theopencurriculum.org'


class ArticleResource(ModelResource):
    most_recent_revision = fields.ForeignKey('oc_platform.api.RevisionResource', 'revision_id')
    category = fields.ForeignKey('oc_platform.api.CategoryResource', 'category_id')
    license = fields.ForeignKey('oc_platform.api.LicenseResource', 'license_id')
    revisions = fields.ToManyField('oc_platform.api.RevisionResource', 'articles')

    class Meta:
        queryset = Article.objects.all()
        resource_name = 'articles'
        allowed_methods = ['get']
        fields = ['id', 'most_recent_revision', 'category', 'language_id', 'created', 'changed', 'title', 'views', 'license', 'slug', 'difficulty', 'published', 'citation']
        ordering = ['id', 'most_recent_revision', 'category', 'language_id', 'created', 'changed', 'title', 'views', 'license', 'slug', 'difficulty', 'published', 'citation']
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
        fields = ['id', 'title', 'project', 'created', 'slug', 'parent']
        ordering = ['id', 'title', 'project', 'created', 'slug', 'parent']
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
        fields = ['id', 'title', 'created', 'owner_type_id', 'owner_id', 'visibility', 'changed', 'slug']
        ordering = ['id', 'title', 'created', 'owner_type_id', 'owner_id', 'visibility', 'changed', 'slug']
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
        fields = ['id', 'body_markdown', 'created', 'parent_type_id', 'parent_id', 'body_markdown_html']
        ordering = ['id', 'body_markdown', 'created', 'parent_type_id', 'parent_id', 'body_markdown_html']
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
        fields = ['id', 'title', 'description', 'custom']
        ordering = ['id', 'title', 'description', 'custom']
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
        fields = ['id', 'title', 'created', 'description', 'cover_pic', 'visibility', 'meta', 'slug']
        ordering = ['id', 'title', 'created', 'description', 'cover_pic', 'visibility', 'meta', 'slug']
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
        fields = ['id', 'title', 'type', 'license', 'url', 'body_markdown', 'created', 'cost', 'views', 'file', 'body_markdown_html']
        ordering = ['id', 'title', 'type', 'license', 'url', 'body_markdown', 'created', 'cost', 'views', 'file', 'body_markdown_html']
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
        fields = ['id', 'title', 'category', 'created', 'body_markdown', 'body_markdown_html', 'objectives', 'log', 'article', 'flag']
        ordering = ['id', 'title', 'category', 'created', 'body_markdown', 'body_markdown_html', 'objectives', 'log', 'article', 'flag']
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
    profile = fields.ToManyField('oc_platform.api.UserProfileResource', 'user', null=True)

    class Meta:
        queryset = User.objects.all()
        resource_name = 'users'
        allowed_methods = ['get']
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'is_staff', 'is_active', 'is_superuser', 'last_login', 'date_joined']
        excludes = ['password']
        ordering = ['id', 'username', 'first_name', 'last_name', 'email', 'is_staff', 'is_active', 'is_superuser', 'last_login', 'date_joined']
        serializer = CamelCaseJSONSerializer()

    def dehydrate_profile(self, bundle):
        # This is a hack. Fix profile to be a OneToOne field instead!
        if (len(bundle.data['profile']) == 0):
            return 'null'
        elif (len(bundle.data['profile']) == 1):
            return {'self': bundle.data['profile'][0]}
        else:
            logging.error('Too many profiles for user %s' % bundle.data['user_id'])
            return 'null'

    def dehydrate(self, bundle):
        # Uncomment to rename resourceUri to be href
        bundle.data['self'] = bundle.data['resource_uri']
        del bundle.data['resource_uri']
        return bundle


class UserProfileResource(ModelResource):
    user = fields.ForeignKey('oc_platform.api.UserResource', 'user_id')
    date_of_birth = fields.DateTimeField(attribute='dob')

    class Meta:
        queryset = UserProfile.objects.all()
        resource_name = 'userProfiles'
        allowed_methods = ['get']
        fields = ['id', 'location', 'profession', 'profile_pic', 'gender']
        ordering = ['id', 'location', 'profession', 'profile_pic', 'gender']
        serializer = CamelCaseJSONSerializer()

    def dehydrate_gender(self, bundle):
        if bundle.data['gender'] == 0:
            return 'Female'
        elif bundle.data['gender'] == 1:
            return 'Male'
        else:
            logging.error('Unknown gender for user %s' % bundle.data['user_id'])
            return 'Unknown'

    def dehydrate_user(self, bundle):
        return {'self': bundle.data['user']}

    def dehydrate(self, bundle):
        # Uncomment to rename resourceUri to be href
        bundle.data['self'] = bundle.data['resource_uri']
        del bundle.data['resource_uri']
        return bundle
