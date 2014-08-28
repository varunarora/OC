from meta.models import Category
import meta.CategoryUtilities as category_util
from django.core.exceptions import MultipleObjectsReturned
from django.http import Http404
from django.core.urlresolvers import reverse
from django.shortcuts import render
from oer.models import Resource, Collection
from meta.models import Tag, TagCategory
from meta.models import TagMapping
from collections import OrderedDict
from django.contrib.contenttypes.models import ContentType
from interactions.models import Review
from django.conf import settings
from oc_platform import APIUtilities
from interactions.models import Favorite
from django.core.cache import cache
import time


class Browse():
    is_common_core_hosted = True
    is_subject_home = False
    is_catalog = False

    category_slug = ''
    current_category = None
    current_category_id = None
    resource_count = 0
    selected_category = None
    return_url = ''
    breadcrumb = []
    request = {}

    # Shared objects across functions.
    users = {},
    categories = {},

    resource_type_tag_category = TagCategory.objects.get(
        title='Resource type')
    resources_category = TagCategory.objects.get(title='Resources')
    resource_ct = ContentType.objects.get_for_model(Resource)
    collection_ct = ContentType.objects.get_for_model(Collection)

    def __init__(self, request, category_slug=None):
        self.request = request

        self.users = {}
        self.categories = {}

        if category_slug:
            self.category_slug = category_slug
            self.process_category_slug()


    def process_category_slug(self):
        categories_slugs = self.category_slug.split('/')

        # Determine the depth to figure out what level of page needs to be displayed.
        try:
            host_category = Category.objects.get(slug=categories_slugs[0])
            if categories_slugs[0] != 'common-core':
                self.is_common_core_hosted = False
            else:
                self.is_common_core_hosted = True

            (host_browse_tree, host_flattened_tree) = category_util.build_child_categories(
                {'root': [host_category]}, [])

            # Assume that there is a unique pair of child/parent relationship in any
            #     host category. Breaks on the edge case where this pair is found twice.
            try:
                self.current_category = Category.objects.get(
                    slug=categories_slugs[-1], parent__slug=categories_slugs[-2])
            
            except IndexError:
                self.current_category = Category.objects.get(slug=categories_slugs[-1])
            
            except MultipleObjectsReturned:
                # Find the unique combinator inside the host tree.
                self.current_category = next(category for category in host_flattened_tree if(
                    category.slug == categories_slugs[-1] and category.parent.slug == categories_slugs[-2]))

            except Category.DoesNotExist:
                raise Http404

            
            for category in host_flattened_tree:
                if category == self.current_category:
                    self.selected_category = category

            if not self.selected_category:
                raise Http404

            if len(categories_slugs) == 1:
                self.return_url = None
            else:            
                return_category_slug = category_util.build_breadcrumb(self.selected_category.parent.parent)[0].url
                if return_category_slug != '':
                    self.return_url = reverse(
                        'browse', kwargs={
                            'category_slug': return_category_slug
                        }
                    )
                else:
                    self.return_url = reverse('browse_default')

            if len(categories_slugs) == 2:
                self.is_subject_home = True

            # Build the breadcrumb associated with this slug.
            self.build_breadcrumb()

        except""" Exception, e""":
            # from django.core.mail import mail_admins
            # mail_admins('Browse failed to render category', str(e) + category_slug)

            # Happens either when the slug is not found.
            raise Http404


        return {
            'host_category': host_category,
        }


    def browse(self):
        child_categories = list(Category.objects.filter(
            parent=self.selected_category).order_by('position'))
        parent_categories = list(Category.objects.filter(
            parent=self.selected_category.parent).order_by('position'))

        serialized_child_categories = []
        serialized_parent_categories = []

        for category in parent_categories:
            serialized_parent_categories.append(self.get_serialized_category(category))

        for category in child_categories:
            self.set_category_count(category)
            #category.count = self.get_serialized_category(category)['count']
            serialized_child_categories.append(self.get_serialized_category(category))

        if not self.is_subject_home:
            # Determine if this is a catalog page or not.
            if Category.objects.filter(parent=self.selected_category).order_by('position').count() > 0:
                self.is_catalog = True
            else:
                self.is_catalog = False

            if len(child_categories) == 0:
                (all_resources, all_collections, current_category_id) = self.get_category_tree_resources_collections_catalog([self.current_category])
            else:
                (all_resources, all_collections, current_category_id) = self.get_category_tree_resources_collections_catalog(child_categories)

            requests = []
            try:
                # Fetch all requests in the selected category.
                from projects.models import Project
                project_ct = ContentType.objects.get_for_model(Project)

                category_groups = settings.CATEGORY_GROUPS.iteritems()
                group_id = next(group for group, category in category_groups if self.selected_category.id in category)
                category_group = Project.objects.get(pk=group_id)

                from interactions.models import Comment
                raw_requests = Comment.objects.filter(
                    category__slug='requests', parent_id=category_group.id,
                    parent_type=project_ct.id
                )

                requests = []
                for raw_request in raw_requests:
                    raw_request_user = self.get_serialized_user(raw_request.user_id)

                    requests.append({
                        'id': raw_request.id,
                        'body': raw_request.body_markdown_html,
                        'user_name': raw_request_user['name'],
                        'user_thumbnail': raw_request_user['profile_pic'],
                        'project_slug': category_group.slug
                    })

            except KeyError:
                category_group = None
            except StopIteration:
                category_group = None

                # Get all the categories from the resources rendered, and then order.
            category_tags_unsorted = set()
            if not self.is_catalog:
                for resource in all_resources:
                    category_tags_unsorted |= set(resource.filtered_tags)

            category_tags = sorted(list(category_tags_unsorted), key=lambda c: c.title)

            child_categories_map = None

        else:
            all_resources = []
            all_collections = []
            category_tags = None
            requests = None
            category_group = None
            self.is_catalog = True
            current_category_id = self.current_category.id

            child_categories_map = {}
            for child_category in child_categories:
                child_category_children = Category.objects.filter(
                    parent=child_category).order_by('position')

                serialized_child_category_children = []
                for category in child_category_children:
                    serialized_child_category_children.append(self.get_serialized_category(category))

                child_categories_map[child_category.id] = serialized_child_category_children


        # Set the URL for the current page for redirect situations.
        self.selected_category.url = self.request.path

        context = {
            'title': 'Browse lessons, projects, activities, worksheets &amp; tests',
            'selected_category': self.selected_category,
            # 'browse_tree': browse_tree,
            'child_categories': serialized_child_categories,
            'parent_categories': serialized_parent_categories,
            'return_url': self.return_url,
            'items': list(all_resources) + list(all_collections),
            'requests': requests,
            'category_group': category_group,
            'is_catalog': self.is_catalog,
            'child_categories_map': child_categories_map,
            'category_tags': category_tags,
            'current_category_id': current_category_id,
            'breadcrumb': self.breadcrumb
        }
        return render(self.request, 'browse.html', context)



    def build_breadcrumb(self):
        # Build breadcrumb for selected category.
        breadcrumb = category_util.build_breadcrumb(self.selected_category)[1:-1]
        breadcrumb.reverse()

        for breadcrumb_category in breadcrumb:
            breadcrumb_category.url = reverse(
                'browse', kwargs={
                    'category_slug': breadcrumb_category.url
                }
            )

        self.breadcrumb = breadcrumb


    def suggestions(self):
        # Fetch the resources in the current category and everything nested within.
        (current_browse_tree, current_flattened_tree) = category_util.build_child_categories(
            {'root': [self.selected_category]}, [])

        from oer.models import Suggestion
        unfiltered_suggestions = Suggestion.objects.filter(category=self.current_category).order_by('-created')

        suggestions = []
        for unfiltered_suggestion in unfiltered_suggestions:
            for tag in unfiltered_suggestion.suggested.tags.all():
                if tag.category == self.resource_type_tag_category:
                    suggestions.append(unfiltered_suggestion)

        for suggestion in suggestions:
            # Set types on suggestions.
            if suggestion.suggested_type.name == 'collection':
                suggestion.suggested.type = 'Folder'
            else:
                suggestion.suggested.type = suggestion.suggested.tags.get(
                    category=self.resource_type_tag_category)
            
            if not hasattr(suggestion.suggested, 'filtered_tags'):
                suggestion.suggested.filtered_tags = suggestion.suggested.tags.exclude(
                    category=self.resource_type_tag_category).exclude(
                    category=self.resources_category)

        context = {
            'title': 'Review suggestions',
            'selected_category': self.selected_category,
            'child_categories': current_flattened_tree,
            'items': suggestions,
            'current_category': self.current_category,
            'is_catalog': False,
            'breadcrumb': self.breadcrumb,
            'return_url': self.return_url,
            'browse_mode': 'suggestions'
        }
        return render(self.request, 'browse.html', context)


    def get_category_tree_resources_collections_catalog(self, child_categories, is_common_core_hosted=None, is_catalog=None):
        if is_common_core_hosted is None:
            is_common_core_hosted = self.is_common_core_hosted

        if is_catalog is None:
            is_catalog = self.is_catalog

        all_resources_collections = []
        all_raw_resources_collections = []

        # Get the top 10 resources of each child category.
        for category in child_categories:
            category_resources_uncapped = Resource.objects.filter(categories=category, tags__in=Tag.objects.filter(
                category=self.resource_type_tag_category)).order_by('-created')
            category_resources = category_resources_uncapped[:6] if is_catalog else category_resources_uncapped

            category_resources_count = category_resources.count()

            if (is_catalog and category_resources_count < 6) or not is_catalog:
                """tagged_resources_uncapped = Resource.objects.filter(tags__in=category.tags.all(
                    )).filter(tags__in=Tag.objects.filter(category=self.resource_type_tag_category)).order_by('-created')
                tagged_resources = tagged_resources_uncapped[:6 - category_resources_count] if is_catalog else tagged_resources_uncapped"""
                category_collections_uncapped = Collection.objects.filter(categories=category, tags__in=Tag.objects.filter(
                    category=self.resource_type_tag_category)).order_by('-created')
                category_collections = category_collections_uncapped[:6] if is_catalog else category_collections_uncapped

                # If this is a category that support mapped resources, fetch mapped content.
                if is_common_core_hosted:
                    tag_mapped_resources = Resource.objects.none()
                else:
                    mapped_tags = Tag.objects.none()
                    tag_mappings = TagMapping.objects.none()
                    for category_tag in category.tags.all():
                        tag_mapping = TagMapping.objects.filter(from_node=category_tag)
                        tag_mappings |= tag_mapping

                        category_mapped_tags = tag_mapping.values('to_node')
                        mapped_tags |= category_mapped_tags  #map((lambda x: x.to_node), category_mapped_tags)

                    tag_mapped_resources_uncapped = Resource.objects.filter(tags__in=mapped_tags).filter(tags__in=Tag.objects.filter(category=TagCategory.objects.get(
                            title='Resource type'))).order_by('-created')[:6 - category_resources_count]
                    tag_mapped_resources = tag_mapped_resources_uncapped[:6 - (
                        category_resources_count)] if is_catalog else tag_mapped_resources_uncapped

                    for resource in tag_mapped_resources:
                        # For each tag, if there is a tag mapping, use - else ignore the tag.
                        filtered_tags = resource.tags.filter(
                            category=TagCategory.objects.get(title='Standards'))

                        resource.filtered_tags = [mapping.from_node for mapping in tag_mappings if (mapping.to_node in list(filtered_tags))]

                unordered_category_tagged_resources = list(set(list(category_resources) + list(category_collections) + list(tag_mapped_resources)))
     
                category_tagged_resources = sorted(
                    unordered_category_tagged_resources, key=lambda resource: resource.created, reverse=True)
            else:
                category_tagged_resources = category_resources

            def categorize_resource(r):
                r.category = category
                return r

            all_raw_resources_collections += map(categorize_resource, category_tagged_resources)

        # Setup each resource's favorites count and type.
        for resource_collection in all_raw_resources_collections:
            try:
                self.build_browse_resource(resource_collection)
                all_resources_collections.append(resource_collection)
            except Tag.DoesNotExist:
                pass

        return (all_resources_collections, [], self.current_category_id)


    def build_browse_resource(self, resource_collection):
        # TODO(Varun): Cache this call.
        resource_collection.type = resource_collection.tags.get(
            category=self.resource_type_tag_category)

        try:
            # resource.revision.user = resource.user
            resource_collection.favorites_count = Favorite.objects.filter(
                parent_id=resource_collection.id, parent_type=self.resource_ct).count()
            resource_collection.item_type = 'resource'

            resource_collection.favorited = Favorite.objects.get(
                parent_id=resource_collection.id, parent_type=self.resource_ct, user=self.request.user) != None
        except Favorite.DoesNotExist:
            if not hasattr(resource_collection, 'revision'):
                try:
                    resource_collection.favorited = Favorite.objects.get(
                        parent_id=resource_collection.id, parent_type=self.collection_ct, user=self.request.user) != None
                except Favorite.DoesNotExist:
                    resource_collection.favorited = False

                resource_collection.favorites_count = Favorite.objects.filter(
                    parent_id=resource_collection.id, parent_type=self.collection_ct).count()
                resource_collection.item_type = 'collection'

            else:
                resource_collection.favorited = False

        except:   # In the case the user is logged out.
            resource_collection.favorited = False

        if not hasattr(resource_collection, 'filtered_tags'):
            # TODO(Varun): Cache this call.

            raw_filtered_tags = resource_collection.tags.exclude(
                category=self.resource_type_tag_category).exclude(
                category=self.resources_category)

            resource_collection.filtered_tags = [tag.title for tag in raw_filtered_tags]

        try:
            resource_collection.objectives = resource_collection.meta.objectives
        except:
            resource_collection.objectives = None

        # TODO(Varun): Cache this call.
        from django.db.models import Avg
        review_average = Review.objects.filter(
            comment__parent_id=resource_collection.id, comment__classification='review').aggregate(Avg('rating'))['rating__avg']
        resource_collection.rating = review_average if review_average else 0
        resource_collection.review_count = Review.objects.filter(
            comment__parent_id=resource_collection.id, comment__classification='review').count()

        # Get the user associated with this resource, if not known already.

        try:
            resource_collection_revision = resource_collection.revision
            resource_collection.serialized_user = self.get_serialized_user(resource_collection_revision.user_id)
        except:
            resource_collection.serialized_user = self.get_serialized_user(resource_collection.creator_id)

        # Set the content type of the resource.
        try:
            resource_collection.content_type = resource_collection.revision.content_type.name
        except:
            pass


    def get_serialized_user(self, user_id):
        if user_id not in self.users:
            # Cache this call.
            user_cache_key = "user_" + str(user_id)
            self.users[user_id] = cache.get(user_cache_key)

            # If no breadcrumb found in cache, build it and store it in the cache.
            if not self.users[user_id]:
                from django.contrib.auth.models import User
                user = User.objects.get(pk=user_id)
                user_profile = user.get_profile()

                self.users[user.id] = {
                    'id': user.id,
                    'name': user.get_full_name(),
                    'username': user.username,
                    'profile_pic': user_profile.profile_pic.name
                }                

                # Set cache.
                cache.set(user_cache_key, self.users[user.id])
        
        return self.users[user_id]


    def get_serialized_category(self, category):
        # TODO(Varun): Cache this call.
        if category.id not in self.categories:
            breadcrumb = category_util.build_breadcrumb(category)
            self.categories[category.id] = {
                'id': category.id,
                'title': category.title,
                'slug': category.slug,
                'url': reverse(
                    'browse', kwargs={
                        'category_slug': breadcrumb[0].url
                    }
                )
            }

        return self.categories[category.id]


    def set_category_count(self, category):
        serialized_category = self.get_serialized_category(category)

        # TODO(Varun): Cache this call.
        serialized_category['count'] = Resource.objects.filter(categories=serialized_category['id'], tags__in=Tag.objects.filter(
            category=self.resource_type_tag_category)).order_by('-created').count() + Collection.objects.filter(categories=category, tags__in=Tag.objects.filter(
            category=self.resource_type_tag_category)).order_by('-created').count()


    # API stuff.

    def load(self):
        category = Category.objects.get(pk=self.current_category_id)

        all_raw_resources = []
        all_resources = []

        category_resources = Resource.objects.filter(categories=category).order_by('-created')
        tagged_resources = Resource.objects.filter(tags__in=category.tags.all()).filter(
            tags__in=Tag.objects.filter(category=self.resource_type_tag_category)).order_by('-created')
        category_resource_count = category_resources.count()

        def categorize_resource(r):
            r.category = category
            return r

        if self.resource_count <= category_resource_count:
            all_raw_resources += list(OrderedDict.fromkeys(
                category_resources[(self.resource_count):] | map(categorize_resource, tagged_resources)))
        else:
            all_raw_resources += map(categorize_resource, tagged_resources[int(self.resource_count) - category_resource_count:])

        for resource in all_raw_resources:
            try:
                self.build_browse_resource(resource)
                all_resources.append(resource)
            except Tag.DoesNotExist:
                pass

        serialized_resources = serialize(all_resources)

        context = {
            'resources': serialized_resources,
        }
        return APIUtilities._api_success(context)


    def search(self, query):
        from haystack.query import SearchQuerySet

        current_category = Category.objects.get(pk=self.current_category_id)
        (browse_tree, flattened_tree) = category_util.build_child_categories(
            {'root': [current_category]}, [])

        all_resources = []
        all_raw_resources = []

        child_categories = Category.objects.filter(parent=current_category)

        # Remove the current category as this a downward searchself.
        current_category_in_tree = next(current for current in flattened_tree if current.id == current_category.id)
        flattened_tree.remove(current_category_in_tree)
        
        categories = [category.title for category in flattened_tree]
        categories_tags = []
        for category in flattened_tree:
            categories_tags += category.tags.all()

        def set_child_category(resource, immediate_category):
            while True:
                if immediate_category in child_categories:
                    resource.category = immediate_category
                    return None
                else:
                    immediate_category = immediate_category.parent

        def get_child_category_from_resource_categories(resource):
            for resource_category in resource.object.categories.all():
                if resource_category in flattened_tree:
                    return resource_category

        def set_category_on_categorized_resource(resource):
            a = get_child_category_from_resource_categories(resource)
            set_child_category(resource.object, a)
            return resource

        def categorize_resource(searched_resource):
            # Find the child category this is a descendant in.
            filtered_tags = searched_resource.object.tags.exclude(
                category=self.resource_type_category).exclude(
                category=self.resources_category)

            for tag in filtered_tags:
                if tag in categories_tags:
                    for category in flattened_tree:
                        if tag in category.tags.all():
                            immediate_category = category
                            break

            set_child_category(searched_resource.object, immediate_category)

            return searched_resource

        # TODO(Varun): Rope in collection search.
        """if len(categories) > 0 and len(categories_tags) > 0:
            sqs = SearchQuerySet().filter(content_auto=query, visibility='public', categories__in=categories) | SearchQuerySet(
                ).filter(content_description=query, visibility='public', categories__in=categories)
            sqs_tags = SearchQuerySet().filter(content_auto=query, visibility='public', tags__in=categories_tags) | SearchQuerySet(
                ).filter(content_description=query, visibility='public', tags__in=categories_tags)

            all_raw_resources += sorted(
                set(map(set_category_on_categorized_resource, sqs) + map(
                    categorize_resource, sqs_tags)), key=lambda searched_resource: searched_resource.object.created, reverse=True)
        elif len(categories) > 0:
            sqs_tags = SearchQuerySet().filter(content_auto=query, visibility='public', tags__in=categories_tags) | SearchQuerySet(
                    ).filter(content_description=query, visibility='public', tags__in=categories_tags)
            all_raw_resources += map(set_category_on_categorized_resource, sqs_tags)
        elif len(categories_tags) > 0:"""
        sqs_title_categories = SearchQuerySet().filter(content_auto=query, visibility='public', categories__in=categories)
        sqs_description_categories = SearchQuerySet(
            ).filter(content_description=query, visibility='public', categories__in=categories)
        
        sqs = set()
        if len(sqs_title_categories) > 0:
            sqs |= set(sqs_title_categories)

        if len(sqs_description_categories) > 0:
            sqs |= set(sqs_description_categories)

        all_raw_resources += list(map(set_category_on_categorized_resource, sqs))

        # Setup each resource's favorites count and type.
        from meta.models import Tag
        for resource in all_raw_resources:
            try:
                self.build_browse_resource(resource.object)
                all_resources.append(resource)
            except Tag.DoesNotExist:
                pass

        unserialized_resources = []
        for resource in all_resources:
            unserialized_resources.append(resource.object)

        serialized_resources = serialize(unserialized_resources)

        context = {
            'resources': serialized_resources
        }
        return APIUtilities._api_success(context)


    def suggest(self):
        # Get all the resources associated with the tags of this resource.
        category_resources = Resource.objects.filter(tags__in=self.selected_category.tags.all(
            )).filter(tags__in=Tag.objects.filter(category=self.resource_type_tag_category)).order_by('-created')

        category_collections = Collection.objects.filter(tags__in=self.selected_category.tags.all(
            )).filter(tags__in=Tag.objects.filter(category=self.resource_type_tag_category)).order_by('-created')

        return (category_resources, category_collections)


    def calibrate(self):
        (resources, collections) = self.suggest()

        for resource in resources:
            # If resource does not have this category, add category to resource.
            resource.categories.add(self.current_category)

        for collection in collections:
            # If resource does not have this category, add category to collection.
            collection.categories.add(self.current_category)


def calibrate_resource(resource):
    # For each tag, find the set of categories who link to the tag.
    for tag in resource.tags.all():
        categories = Category.objects.filter(tags=tag)

        # Iterate through related categories, and add them to the resource categories.
        for category in categories:
            resource.categories.add(category)


def serialize(resources):
    serialized_resources = {}
    for resource in resources:
        filtered_tag_list = list(resource.filtered_tags)
        serialized_resources[resource.id] = {
            'id': resource.id,
            'url': reverse(
                'read', kwargs={
                    'resource_id': resource.id,
                    'resource_slug': resource.slug
                }
            ),
            'title': resource.title,
            'user': resource.user.get_full_name(),
            'user_id': resource.user.id,
            'user_thumbnail': settings.MEDIA_URL + resource.user.get_profile(
                ).profile_pic.name,
            'user_url': reverse('user:user_profile', kwargs={
                'username': resource.user.username }),
            'favorites': resource.favorites_count,
            'views': resource.views,
            'type': str(resource.type).upper(),
            'tags': [tag.title for tag in filtered_tag_list] if resource.filtered_tags else [],
            'description': resource.description,
            'objectives': resource.objectives if resource.objectives else [],            
            'thumbnail': settings.MEDIA_URL + resource.image.name,
            'favorited': resource.favorited,
            'created': int(time.mktime(resource.created.timetuple())),
            'stars': resource.rating,
            'category': resource.category.title,
            'review_count': resource.review_count
        }

    return serialized_resources
