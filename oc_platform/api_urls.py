from django.conf.urls.defaults import include, patterns
from tastypie.api import Api
from oc_platform.api import ArticleResource
from oc_platform.api import CategoryResource
from oc_platform.api import CollectionResource
from oc_platform.api import CommentResource
from oc_platform.api import LicenseResource
from oc_platform.api import ProjectResource
from oc_platform.api import ResourceResource
from oc_platform.api import RevisionResource
from oc_platform.api import UserResource
from oc_platform.api import UserProfileResource

v1_api = Api(api_name='v1')
v1_api.register(ArticleResource())
v1_api.register(CategoryResource())
v1_api.register(CollectionResource())
v1_api.register(CommentResource())
v1_api.register(LicenseResource())
v1_api.register(ProjectResource())
v1_api.register(ResourceResource())
v1_api.register(RevisionResource())
v1_api.register(UserResource())
v1_api.register(UserProfileResource())

urlpatterns = patterns(
    '',
    (r'^', include(v1_api.urls)),
)
