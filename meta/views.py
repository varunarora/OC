from meta.models import Tag, TagCategory, Category, Topic, Concept
from django.http import Http404, HttpResponse
from django.shortcuts import render
from django.core.urlresolvers import reverse
from oc_platform import APIUtilities
from xml.etree import ElementTree
import meta.CategoryUtilities as catU
import itertools


def get_standards_tree(request):
    try:
        standards_category = Category.objects.get(title='Standards')

        from meta.CategoryUtilities import TreeBuilder
        category_builder = TreeBuilder('category_tags')
        (browse_tree, flattened_tree) = category_builder.build_tree(
            {'root': [standards_category]}, [])

        tree = build_standards_navigation(browse_tree)

        context = { 'tree': tree }
        return APIUtilities._api_success(context)
    except:
        context = {
            'title': 'Could not load the standards list',
            'message': 'We failed to load the list of standards for you. '
            + 'Please contact us if the problem persists.'
        }
        return APIUtilities._api_failure(context)


def build_standards_navigation(browse_tree):
    root = ElementTree.Element('ul')
    standard = get_root_key(browse_tree)

    if standard:
        standardsRoot = ElementTree.Element('li')

        standardItem = ElementTree.SubElement(standardsRoot, 'a')
        standardItem.text = standard.title

        standardsRootList = ElementTree.Element('ul')

        child_nodes = build_child_tree(browse_tree)
        for node in child_nodes:
            standardsRootList.append(node)

        standardsRoot.append(standardsRootList)
        root.append(standardsRoot)

        return ElementTree.tostring(root)
    else:
        return ''


def build_child_tree(root_node):
    # Get the list of child of this node.
    nodes = list(itertools.chain.from_iterable(root_node.values()))
    node_elements = []

    # Create <li> nodes for each.
    for node in nodes:
        node_element = ElementTree.Element('li')

        if type(node) is dict:
            current_node = get_root_key(node)
        else:
            current_node = node

        # Determine whether the node is a tag or category.
        if type(current_node).__name__.lower() == 'category':
            node_type = 'category'
        else:
            node_type = 'tag'

        # If this child has other children, build child tree.
        # Has to be the case of our tag category.
        if type(node) is dict:
            # Set a class to indicate that this element has child collections.
            node_element.set('class', 'parent-category')

            node_toggler = ElementTree.SubElement(node_element, 'span')
            node_toggler.set('class', 'toggle-category')
            node_toggler.text = ' '

            node_href = ElementTree.SubElement(node_element, 'a')
    
            node_href.set('href', reverse('browse', kwargs={
                    'category_slug': catU.build_breadcrumb(current_node)[0].url }))
            node_href.set('id', 'category-' + str(current_node.id))            
            node_href.text = current_node.title

            nodeList = ElementTree.SubElement(node_element, 'ul')

            child_nodes = build_child_tree(node)
            for child_node in child_nodes:
                nodeList.append(child_node)

        # Otherwise, append a child <a> element as is.
        # Can be a tag category or a tag.
        else:
            # Set a class to indicate that this element does not have child collections.
            node_element.set('class', 'empty-category' if node_type == 'category' else 'empty-tag')

            node_toggler = ElementTree.SubElement(node_element, 'span')
            node_toggler.set(
                'class', 'toggle-category' if node_type == 'category' else 'toggle-tag')
            node_toggler.text = ' '

            node_href = ElementTree.SubElement(node_element, 'a')

            if node_type == 'category':
                node_href.set('href', reverse('browse', kwargs={
                    'category_slug': catU.build_breadcrumb(current_node)[0].url }))
            else:
                node_href.set('href', reverse('meta:standard', kwargs={
                    'tag_title': current_node.title }))

            node_href.set(
                'id', ('category-' if node_type == 'category' else 'tag-') + str(current_node.id))
            node_href.text = current_node.title if node_type == 'category' else (
                current_node.title + ': ' + (current_node.description if current_node.description else ''))

        node_elements.append(node_element)

    return node_elements


def _has_immediate_tag_children(tag_category):
    """Adapted from _hasImmediateChildren() in articles.views"""
    children = list(_get_child_tags_categories(tag_category))
    if len(children) > 0:
        return {tag_category: children}
    else:
        return None    


def _get_child_tags_categories(tag_category):
    # Executes if the collection is actually a collection object and not a resource.
    try:
        child_tags = Tag.objects.filter(category=tag_category)
        child_categories = TagCategory.objects.filter(parent=tag_category)
        return list(child_tags) + list(child_categories)

    except:
        pass

    return []


def get_root_key(value):
    root_elements = []
    for root_element in value.keys():
        root_elements.append(root_element)

    try:
        return root_elements[0]
    except:
        return None


def play(request):
    standards = Category.objects.filter(parent__title='Standards')
    
    standard_slug = request.GET.get('q', None)

    if standard_slug:
        current_standard = Category.objects.get(slug=standard_slug)
    else:
        current_standard = Category.objects.get(title='Common Core')

    # Get all categories in this standard.
    current_standard_categories = Category.objects.filter(parent=current_standard)

    # Get all the subcategories in the currently selected subject.
    subcategories = Category.objects.filter(
        parent=current_standard_categories[0]).order_by('position')

    context = {
        'standards': standards,
        'current_standard': current_standard,
        'current_standard_categories': current_standard_categories,
        'subcategories': subcategories,
        'title': 'Play &lsaquo; OpenCurriculum'
    }
    return render(request, 'standards-play.html', context)



def get_standards(request):
    from meta.models import Category
    root_category = Category.objects.get(title='Standards')

    # Get all categories whose parent is root_category.
    child_categories = Category.objects.filter(parent=root_category).order_by(
        'position')

    serialized_standards = {}
    for standard in child_categories:
        serialized_standards[standard.id] = {
            'id': standard.id,
            'title': standard.title,
            'slug': standard.slug,
            'position': standard.position
        }
        subjects = Category.objects.filter(parent=standard).order_by('position')

        serialized_subjects = {}
        for subject in subjects:
            serialized_subjects[subject.id] = {
                'id': subject.id,
                'title': subject.title,
                'slug': subject.slug,
                'position': subject.position
            }
        serialized_standards[standard.id]['subjects'] = serialized_subjects

    context = {
        'standards': serialized_standards
    }
    return APIUtilities._api_success(context)


def get_child_tags_from_category(request, category_id):
    from meta.models import Category, TagCategory
    category = Category.objects.get(pk=category_id)

    # Get all tags in order that belong to this category.
    from meta.CategoryUtilities import TreeBuilder
    tag_category_builder = TreeBuilder('tag_category')
    (browse_tree, flattened_tree) = tag_category_builder.build_tree(
        {'root': [TagCategory.objects.get(title='Standards')]}, [])

    tags = category.tags.filter(category__in=flattened_tree).order_by('position')

    serialized_tags = {}
    for tag in tags:
        serialized_tags[tag.id] = {
            'id': tag.id,
            'title': tag.title,
            'description': tag.description,            
            'position': tag.position,
            'url': reverse(
                'meta:standard', kwargs={
                    'tag_title': tag.title
            })
        }

    context = {
        'tags': serialized_tags
    }
    return APIUtilities._api_success(context)


def get_nested_child_tags_from_category(request, category_id):
    from meta.models import Category, TagCategory
    category = Category.objects.get(pk=category_id)

    import meta.CategoryUtilities as catU
    (browse_tree, flattened_tree) = catU.build_child_categories(
        {'root': [category]}, [])

    tags = {}
    standards_categories = TagCategory.objects.filter(title__in=['Standards', 'Objectives'])

    for descendant_category in flattened_tree:
        descendant_category_tags = descendant_category.tags.filter(category__in=standards_categories).order_by('position')
        if descendant_category_tags.count() > 0:
            if descendant_category.parent == category:
                tags[descendant_category] = descendant_category_tags
            else:
                if descendant_category.parent not in tags:
                    tags[descendant_category.parent] = descendant_category_tags
                else:
                    tags[descendant_category.parent] |= descendant_category_tags

    serialized_tags = []
    for tag_category, tag_set in tags.items():
        for tag in tag_set:
            serialized_tags.append({
                'id': tag.id,
                'title': tag.title,
                'domain': tag_category.title,
                'description': tag.description,
                'position': tag.position,
                'url': reverse(
                    'meta:standard', kwargs={
                        'tag_title': tag.title
                })
            })

    context = {
        'tags': serialized_tags
    }
    return APIUtilities._api_success(context)


def get_standard(request, category_id):
    from meta.models import Category
    category = Category.objects.get(pk=category_id)

    # Get all categories in this standard.
    subjects = Category.objects.filter(parent=category)

    # Get all the subcategories in the currently selected subject.
    grades = Category.objects.filter(parent=subjects[0]).order_by('position')

    context = {
        'subjects': [],
        'grades': [],
    }

    for subject in subjects:
        context['subjects'].append({
            'title': subject.title,
            'id': subject.id
        })

    for grade in grades:
        context['grades'].append({
            'title': grade.title,
            'id': grade.id
        })

    return APIUtilities._api_success(context)


def standard(request, tag_title):
    # Get the tag.
    try:
        tag = Tag.objects.get(title=tag_title)
    except:
        raise Http404

    # Get public resources associated with the tag.
    from oer.models import Resource
    resources = Resource.objects.filter(tags=tag)[:20]

    category = Category.objects.filter(tags=tag)[0]

    breadcrumb = catU.build_breadcrumb(category)
    breadcrumb_urlized = []
    for breadcrumb_category in breadcrumb:
        if breadcrumb_category.parent.slug == 'standards':
            break

        try:
            breadcrumb_urlized.append(standard_urlize(breadcrumb_category.parent))
        
        # HACK(Varun): For practice standards whose parent has been ripped away.
        except:
            breadcrumb_category.url = ''    
            breadcrumb_urlized.append(breadcrumb_category)

    breadcrumb_urlized.reverse()

    context = {
        'tag': tag,
        'resources': resources,
        'breadcrumb': breadcrumb_urlized,
        'title': tag.title + " &lsaquo; OpenCurriculum"
    }
    return render(request, 'standard.html', context)


def standard_urlize(category):
    category.url = reverse(
        'browse', kwargs={
            'category_slug': category.url
        }
    )
    return category


def autocomplete_topic(request, query):
    topics = Topic.objects.filter(title__contains=query)

    result_set = set()
    for topic in topics:
        result_set.add(topic.title)

    import json
    return HttpResponse(
        json.dumps(list(result_set)), 200, content_type="application/json")


def autocomplete_concept(request, query):
    concepts = Concept.objects.filter(concept__contains=query)

    result_set = set()
    for concept in concepts:
        result_set.add(concept.concept)

    import json
    return HttpResponse(
        json.dumps(list(result_set)), 200, content_type="application/json")


def autocomplete_standard(request, query):
    standards = Tag.objects.filter(
        title__icontains=query, category=TagCategory.objects.get(title='Standards'))
    limit = request.GET.get('limit', None)

    result_set = set()

    if limit:
        for standard in standards[:int(limit)]:
            result_set.add(standard.title)
    else:
        for standard in standards:
            result_set.add(standard.title)

    import json
    return HttpResponse(
        json.dumps(list(result_set)), 200, content_type="application/json")
