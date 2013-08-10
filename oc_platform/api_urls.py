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

v0_api = Api(api_name='v0')
v0_api.register(ArticleResource())
v0_api.register(CategoryResource())
v0_api.register(CollectionResource())
v0_api.register(CommentResource())
v0_api.register(LicenseResource())
v0_api.register(ProjectResource())
v0_api.register(ResourceResource())
v0_api.register(RevisionResource())
v0_api.register(UserResource())
v0_api.register(UserProfileResource())

urlpatterns = patterns(
    '',
    (r'^', include(v0_api.urls)),
)
