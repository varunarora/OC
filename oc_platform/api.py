from tastypie import fields
from tastypie.resources import ModelResource
from oc_platform.models import Article, Category, Collection, Comment, License, Project, Resource, Revision, User
from oc_platform.api_serializer import CamelCaseJSONSerializer

# Uncomment to enable absolute URIs
#root_url = 'http://api.theopencurriculum.org'


class ArticleResource(ModelResource):
    revision = fields.ForeignKey('oc_platform.api.RevisionResource', 'revision_id')
    category = fields.ForeignKey('oc_platform.api.CategoryResource', 'category_id')
    license = fields.ForeignKey('oc_platform.api.LicenseResource', 'license_id')

    class Meta:
        queryset = Article.objects.all()
        resource_name = 'articles'
        allowed_methods = ['get']
        fields = ['id', 'revision', 'category', 'language_id', 'created', 'changed', 'title', 'views', 'license', 'slug', 'difficulty', 'published', 'citation']
        ordering = ['id', 'revision', 'category', 'language_id', 'created', 'changed', 'title', 'views', 'license', 'slug', 'difficulty', 'published', 'citation']
        serializer = CamelCaseJSONSerializer()

    def dehydrate_revision(self, bundle):
        return {'resourceUri': bundle.data['revision']}

    def dehydrate_category(self, bundle):
        return {'resourceUri': bundle.data['category']}

    def dehydrate_license(self, bundle):
        return {'resourceUri': bundle.data['license']}


class CategoryResource(ModelResource):
    parent = fields.ForeignKey('oc_platform.api.CategoryResource', 'parent_id', null=True)
#    parent = fields.ForeignKey('oc_platform.api.CategoryResource', 'parent_id', null=True, full=True, full_detail=False)

    class Meta:
        queryset = Category.objects.all()
        resource_name = 'categories'
        allowed_methods = ['get']
        fields = ['id', 'title', 'project', 'created', 'slug', 'parent']
        ordering = ['id', 'title', 'project', 'created', 'slug', 'parent']
        serializer = CamelCaseJSONSerializer()

    def dehydrate_parent(self, bundle):
        return {'resourceUri': bundle.data['parent']}

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


class CommentResource(ModelResource):
    class Meta:
        queryset = Comment.objects.all()
        resource_name = 'comments'
        allowed_methods = ['get']
        fields = ['id', 'body_markdown', 'created', 'user_id', 'parent_type_id', 'parent_id', 'body_markdown_html']
        ordering = ['id', 'body_markdown', 'created', 'user_id', 'parent_type_id', 'parent_id', 'body_markdown_html']
        serializer = CamelCaseJSONSerializer()


class LicenseResource(ModelResource):
    class Meta:
        queryset = License.objects.all()
        resource_name = 'licenses'
        allowed_methods = ['get']
        fields = ['id', 'title', 'description', 'custom']
        ordering = ['id', 'title', 'description', 'custom']
        serializer = CamelCaseJSONSerializer()


class ProjectResource(ModelResource):
    class Meta:
        queryset = Project.objects.all()
        resource_name = 'projects'
        allowed_methods = ['get']
        fields = ['id', 'title', 'created', 'description', 'cover_pic', 'visibility', 'meta', 'slug']
        ordering = ['id', 'title', 'created', 'description', 'cover_pic', 'visibility', 'meta', 'slug']
        serializer = CamelCaseJSONSerializer()


class ResourceResource(ModelResource):
    license = fields.ForeignKey('oc_platform.api.LicenseResource', 'license_id')

    class Meta:
        queryset = Resource.objects.all()
        resource_name = 'resources'
        allowed_methods = ['get']
        fields = ['id', 'title', 'type', 'license', 'url', 'body_markdown', 'created', 'cost', 'views', 'user_id', 'file', 'body_markdown_html']
        ordering = ['id', 'title', 'type', 'license', 'url', 'body_markdown', 'created', 'cost', 'views', 'user_id', 'file', 'body_markdown_html']
        serializer = CamelCaseJSONSerializer()

    def dehydrate_license(self, bundle):
        return {'resourceUri': bundle.data['license']}


class RevisionResource(ModelResource):
    category = fields.ForeignKey('oc_platform.api.CategoryResource', 'category_id')

    class Meta:
        queryset = Revision.objects.all()
        resource_name = 'revisions'
        allowed_methods = ['get']
        fields = ['id', 'title', 'category', 'created', 'body_markdown', 'user_id', 'body_markdown_html', 'objectives', 'log', 'article_id', 'flag']
        ordering = ['id', 'title', 'category', 'created', 'body_markdown', 'user_id', 'body_markdown_html', 'objectives', 'log', 'article_id', 'flag']
        serializer = CamelCaseJSONSerializer()

    def dehydrate_category(self, bundle):
        return {'resourceUri': bundle.data['category']}


class UserResource(ModelResource):
    #date_of_birth = fields.DateTimeField('oc_platform.api.UserResource', 'dob')

    class Meta:
        queryset = User.objects.all()
        resource_name = 'users'
        allowed_methods = ['get']
        fields = ['id', 'user_id', 'location', 'profession', 'profile_pic', 'gender']
        ordering = ['id', 'user_id', 'location', 'profession', 'profile_pic', 'gender']
        serializer = CamelCaseJSONSerializer()
