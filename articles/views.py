from django.http import Http404
from django.shortcuts import render, redirect
from django.core.urlresolvers import reverse
from articles.models import Article, ArticleRevision
from meta.models import Category
from oer.models import Resource
from interactions.models import Comment
from django.core.cache import cache
from ArticleUtilities import ArticleUtilities
from django.utils.translation import ugettext as _
from django.conf import settings
import itertools


def reader(request, category_slug):
    """Deconstructs a URL request for a category/article and calls necessary
    processing function to serve either the article or category page.

    Reads the GET parameters on a request for either a category page or a
    specific article, and invokes the necessary processing functions.

    Args:
        request: The HTTP request object, as passed by django.
        category_slug: The entire URL substring specific to articles.

    Returns:
        The HttpResponse object as rendered by the functions invoked.

    Raises:
        DoesNotExist error: A 404 page is returned when no object is not found.
    """
    # Fetch the article slug, view mode and revision GET parameters, if they
    #     exist.
    articleSlug = request.GET.get('q', '')
    view = request.GET.get('view', 'read')
    revision = request.GET.get('revision', None)

    # Fetch diff-specific GET parameters
    compare = request.GET.get('compare', None)
    to = request.GET.get('to', None)

    # If an article is requested using the GET parameter
    if articleSlug != '':
        # Look up article from slug, if article name provided
        try:
            article = Article.objects.filter(slug=articleSlug)
            articleCount = article.count()

            # If a unique article was found
            if articleCount == 1:
                # TODO(Varun): Due to this rather trivial code, the category is
                #     not even looked up is a unique child is found. This ought
                #     to be fixed to avoid misleading. Ideally, a lookup table
                #     of URLs to category/article pages

                # If the compare argument has a value, perform a diff on the
                #     revisions
                if compare:
                    return diff_revisions(request, article[0], compare, to)

                # Process article / article-revision
                return process_article(request, article[0], view, revision)
            elif articleCount == 0:
                raise Http404
            else:
                # If non-unique article name, call an article URL resolver
                #     function
                return articleURLResolver(category_slug, articleSlug)

        except Article.DoesNotExist:
            raise Http404

    # Else, this is a category page request, and thus, return the category
    #     page, based on the URL slug(s)
    else:
        # Split the category slug delimited by '/' and resolve the list
        categories_slugs = category_slug.split('/')
        return categoryURLResolver(request, categories_slugs, -1)


def process_article(request, article, view, revision):
    """Based on the view mode of the article/revision, call necessary view
    processor.

    Args:
        article: Article object as obtained from QuerySet API
        view: View mode as a string, either 'edit', 'history' or absent
        revision: Revision number, or absent

    Returns:
        The HttpResponse object as rendered by specific processing functions
        invoked
    """
    if view == "edit":
        return edit_article(request, article, revision)
    elif view == "history":
        return view_article_history(request, article)
    else:
        if revision:
            return read_article_revision(request, revision)
        return read_article(request, article)


def diff_revisions(request, article, from_id, to_id):
    """Performs a diff on two article revisions and returns a well formatted
    result.

    Fetches the two revisions that need be compared, from the database, and
    compares the two using the Python difflib.

    Args:
        request: The HTTP request object, as passed by django.
        article: Article whose revisions are to be "diff"-ed
        from_id: The revision against which the diff is to be created.
        to_id: The revision which is to be compared to an original revision.

    Returns:
        An HttpResponse page containing a formatted table of the diff
    """
    # Fetch the cached article revision view and breadcrumb.
    ar = build_article_revision_view(article, article.revision)
    breadcrumb = fetch_cached_breadcrumb(article.revision)

    # Get rid of self in the breadcrumb.
    breadcrumb.reverse()
    breadcrumb.pop()

    # Set the diff line length to a number which can fit on half the page.
    LINE_LENGTH = 60
    revision_compare = True

    try:
        # Fetch "from" revision
        from_revision_object = ArticleRevision.objects.get(id=from_id)
    except:
        raise Http404

    from_revision = fetch_cached_article_revision(from_revision_object)
    from_revision_html = split_len(
        from_revision.body_markdown_html, LINE_LENGTH
    )

    # If there is a 'to_id' parameter provided, fetch the specific revision.
    if to_id:
        try:
            # Fetch "to" revision
            to_revision_object = ArticleRevision.objects.get(id=to_id)
        except:
            raise Http404

        to_revision = fetch_cached_article_revision(to_revision_object)
        to_revision_html = split_len(
            to_revision.body_markdown_html, LINE_LENGTH
        )

    # Else, diff against the current published revision of the article.
    else:
        # Fetch current revision.
        to_revision_object = ArticleRevision.objects.get(
            id=article.revision.id)
        to_revision = fetch_cached_article_revision(to_revision_object)
        to_revision_html = split_len(
            to_revision.body_markdown_html, LINE_LENGTH
        )
        revision_compare = False

    # Using the HtmlDiff class of the difflib library, build a diff between the
    #     two revisions considered.
    from difflib import HtmlDiff
    d = HtmlDiff()
    diff_table = d.make_table(from_revision_html, to_revision_html)

    context = {
        'article': ar, 'diff_table': diff_table, 'breadcrumb': breadcrumb,
        'from': from_revision, 'to': to_revision,
        'revision_compare': revision_compare
    }
    return render(request, 'diff.html', context)


def split_len(seq, length):
    """Takes a sequence of characters and splits in chunks of length 'length'
    and returns a list of the sub-sequences."""
    return [seq[i:i+length] for i in range(0, len(seq), length)]


def fetch_cached_article_revision(articleRevision):
    """Fetch and return the cached version of the article revision view.

    Args:
        articleRevision: ArticleRevision object whose view is to be fetched and
            returned.

    Returns:
        A fully built ArticleRevision object.
    """
    # Look for articleRevision value in cache.
    ar_cache_key = "ar_" + str(articleRevision.id)
    ar = cache.get(ar_cache_key)

    # If no articleRevision found in cache, build it and store it in the cache.
    if not ar:
        ar = build_article_revision_view(
            articleRevision.article, articleRevision)
        # Set caches.
        cache.set(ar_cache_key, ar)

    return ar


def fetch_cached_breadcrumb(articleRevision):
    """Fetch and return the cached version of the breadcrumb.

    Args:
        articleRevision: ArticleRevision object whose breadcrumb is to be
            fetched and returned.

    Returns:
        A breadcrumb list object.
    """
    # Look for breadcrumb value in cache.
    bc_cache_key = "bc_" + str(articleRevision.id)
    breadcrumb = cache.get(bc_cache_key)

    # If no breadcrumb found in cache, build it and store it in the cache.
    if not breadcrumb:
        breadcrumb = ArticleUtilities.buildBreadcrumb(articleRevision.category)
        # Set cache.
        cache.set(bc_cache_key, breadcrumb)

    return breadcrumb


def read_article(request, article):
    """Builds the reader page for the current revisiion of an article and its
    resources.

    Args:
        request: The HTTP request object, as passed by django.
        article: The article requested to be viewed.

    Returns:
        The article's HttpResponse page with breadcrumbs, resources, and
        navigate-able sibling articles.
    """
    # Get the built (and hopefully cached) article revision object.
    articleRevision = fetch_cached_article_revision(article.revision)
    breadcrumb = fetch_cached_breadcrumb(article.revision)

    # Generate the title of the page from the breadcrumb.
    title = _get_title_from_breadcrumb(breadcrumb, article)

    breadcrumb.reverse()

    # Get sibling articles of current article.
    siblings = Article.objects.filter(category=article.category)

    # Limit the body size of all resources descriptions to 200 chars.
    for resource in articleRevision.resources.all():
        resource.body_markdown_html = resource.description[0:200]

    # Increment page views (always remains -1 based on current view).
    Article.objects.filter(id=article.id).update(views=article.views+1)

    # TODO(Varun): Pass URLs for siblings and cache list

    context = {
        'article': articleRevision, 'breadcrumb': breadcrumb, 'title': title,
        'siblings': siblings,
        'current_path': 'http://' + request.get_host() + request.get_full_path(),  # request.get_host()
        'thumbnail': 'http://' + request.get_host() + settings.MEDIA_URL + article.image.name
    }
    return render(request, 'article.html', context)


def edit_article(request, article, revision_id):
    """Builds editor page and also responds to revision saves/submissions.

    In the case of a POST request, accepts the fields and determines whether
    the submission was a save or a submission. It creates new revisions
    accordingly and invokes the necessary follow-up functions to complete
    specific tasks.

    Args:
        request: The HTTP request object, as passed by django, which may or may
            not be a POST request.
        article: The article which is requested to be edited.

    Returns:
        The editor HttpResponse page with the article fields populated.
    """
    if not revision_id:
        # Edit the current revision of the article.
        articleRevision = build_article_revision_view(article, article.revision)
    else:
        try:
            # Edit the revision of the article that has been provided.
            revision = ArticleRevision.objects.get(pk=revision_id)
            articleRevision = build_article_revision_view(article, revision)
        except ArticleRevision.DoesNotExist:
            raise Http404

    # Build editor specific context.
    context = _prepare_edit_context(articleRevision, article)

    # If a submission/save was made to this article, perform the necessary.
    if request.method == "POST":
        action = request.POST.get('action')
        owner = request.POST.get('owner')

        flag = action if action == "submit" else "fork"

        import forms
        # TODO(Varun): Comment the rest of this function, after testing fork
        # TODO(Varun): If this article revision edit is previously forked, we
        #     do not need to create a new revision, but rather overwrite this
        #     existing revision - until we support revisioning on forked
        #     content
        if flag == "fork" and int(owner) == request.user.id:
            original_revision = ArticleRevision.objects.get(
                pk=int(request.POST.get('revision')))
            article_form = forms.EditArticleRevisionForm(
                request.POST, instance=original_revision)
        else:
            article_form = forms.NewArticleRevision(
                request.POST, request.user, article, flag
            )

        if article_form.is_valid():
            new_revision = article_form.save(commit=False)

            if action == "save" or action == "submit":

                # Create a new article revision from submission
                new_revision.save()

                if action == "save":
                    return save_article(request, new_revision, article)
                elif action == "submit":
                    return submit_article(
                        request, new_revision, article, context['breadcrumb']
                    )

            elif action == "preview":
                return preview_article(request, article_form, article)
        else:
            from django.http import HttpResponseBadRequest
            return HttpResponseBadRequest()

    if not request.user.is_authenticated():
        context['message'] = _(settings.STRINGS['articles']['messages']['ANONYMOUS_EDITING'])

    return render(request, 'editor.html', context)


def _get_title_from_breadcrumb(breadcrumb, article):
    """Builds a page title from a breadcrumb.

    Args:
        breadcrumb: A list of categories ordered as a breadcrumb.
        article: The article whose title needs to be created.

    Returns:
        A string title of the page.
    """
    # Make a deep copy of the original breadcrumb, and get rid of root
    #     category.
    breadcrumbTitle = breadcrumb[:]
    breadcrumbTitle.pop()

    # Begin by appending the delimiter to the title of the article.
    title = article.title + " &lsaquo; "

    # Iterate through the breadcrumb, appending the category titles, and
    #     separated by the delimiters.
    for category in breadcrumbTitle:
        title += category.title + " &lsaquo; "
    title += "OpenCurriculum"

    return title


def _prepare_edit_context(articleRevision, article):
    """Sets up the context for serving the editor page with the categories, the
    breadcrumb, a couple of revisions and the title.

    Args:
        articleRevision: The revision which is to be edited.
        article: The article whose revision is to be edited.

    Returns:
        A context dictionary with the article revision, breadcrumb, categories
        and title.
    """
    # Get a list of all categories.
    categories = Category.objects.all()

    # Get the article breadcrumb based on the category.
    breadcrumb = get_breadcrumb(article.category)

    # Create a title based on the breadcrumb.
    title = _get_title_from_breadcrumb(breadcrumb, article)

    # Get all article revisions with the article ID.
    revisions = ArticleRevision.objects.filter(article=article).order_by('-created')

    # HACK(Varun): For now, pass only 2 revisions, until JavaScript support for
    #     condensed view.
    articleRevision.revisions = revisions[:2]

    context = {
        'article': articleRevision,
        'breadcrumb': breadcrumb,
        'categories':  categories,
        'title': title
    }

    return context


def save_article(request, new_revision, article):
    """Creates a new article revision and marks it as a fork.

    Args:
        new_revision: ArticleRevision object newly created upon submission.
        article: The article whose revision has been created.

    Returns:
        The HttpResponse editor page with appropriate save message.
    """
    # Mark all saves as forks by default
    new_revision.flag = "fork"
    new_revision.save()

    # Create a message with a timestamp to be returned.
    from datetime import datetime
    now = datetime.now()

    # Build editor specific context.
    context = _prepare_edit_context(new_revision, article)

    context['message'] = _(settings.STRINGS['articles']['messages']['SAVE']) % (
        now.strftime("%I:%M%p").lower())

    return render(request, 'editor.html', context)


def preview_article(request, submission, article):
    # TODO(Varun): Convert the submission objects into an article object and
    #     return with a "preview" flag to editor.html
    context = {}
    return render(request, 'editor.html', context)


def submit_article(request, new_revision, article, breadcrumb):
    """Creates a new article revision and marks as submission for review.

    Args:
        new_revision: ArticleRevision object newly created upon submission.
        article: The article whose revision has been created.
        breadcrumb: Breadcrumb from the editor context to be used in
            constructing the category slug.

    Returns:
        An HttpResponse page of the revision just just created upon submission.
    """
    # Mark all saves as forks by default
    new_revision.flag = "submit"
    new_revision.save()

    # Construct category slug from breadcrumb
    category_slug = [x.slug for x in breadcrumb[1:]]

    # Set message
    from django.contrib import messages
    messages.success(
        request, _(settings.STRINGS['articles']['messages']['SUBMIT_REVIEW'])
    )

    return redirect(
        reverse(
            'articles:reader', kwargs={'category_slug': '/'.join(category_slug)}
        ) + "?q=%s&revision=%s" % (article.slug, str(new_revision.id))
    )


def view_article_history(request, article):
    """Builds the article revision history page.

    Args:
        article: Article object whose revisions are to be displayed.

    Returns:
        An HttpResponse object with a list of all revisions in the database.
    """
    breadcrumb = get_breadcrumb(article.category)

    # Fetch all revisions with this article as 'article'
    article.revisions = ArticleRevision.objects.filter(
        article=article).order_by('-created')

    title = _(settings.STRINGS['articles']['HISTORY_TITLE']) % article.title

    context = {'article': article, 'breadcrumb': breadcrumb, 'title': title}
    return render(request, 'history.html', context)


def read_article_revision(request, revision):
    """Constucts and returns an article revision page to a user.

    Fetches the revision and builds a flushed object around it. Also creates a
    breadcrumb and fetches the comments associated with the revision to
    eventually pass to the template.

    Args:
        request: The HTTP request object, as passed by django.
        revision: The article revision ID.

    Returns:
        An HttpResponse object which can render the flushed article revision
        along with its comments.
    """
    try:
        # Fetch the unique article revision with this ID as its primary key.
        articleRevision = ArticleRevision.objects.get(pk=revision)

        # Fetch cached revision view and breadcrumb
        ar = fetch_cached_article_revision(articleRevision)
        breadcrumb = fetch_cached_breadcrumb(articleRevision)

        # Construct the page tiel from the breadcrumb
        title = _get_title_from_breadcrumb(breadcrumb, articleRevision)

        breadcrumb.reverse()
        breadcrumb.pop()

        # Fetch all the comments associated with this articlle revision, and sort
        #     them in reverse order of their creation timestan[]
        from django.contrib.contenttypes.models import ContentType
        articleRevision_ct = ContentType.objects.get_for_model(ArticleRevision)
        comments = Comment.objects.filter(
            parent_id=ar.id, parent_type=articleRevision_ct).order_by('-created')

        context = {
            'article': ar, 'breadcrumb': breadcrumb,
            'title': '[#' + str(ar.id) + '] ' + title,
            'comments': comments, 'content_type': articleRevision_ct,
            'current_path': 'http://' + request.get_host() + request.get_full_path(),
            'thumbnail': 'http://' + request.get_host() + settings.MEDIA_URL + articleRevision.article.image.name
        }
        return render(request, 'article-revision.html', context)
    except:
        raise Http404


def get_breadcrumb(category):
    """Builds and returns the breadcrumb after eliminating itself.

    Args:
        category: Category whose breadcrumb is needed.

    Returns:
        The entire breadcrumb of the category as a list, after removing the
        category itself from the list.
    """
    breadcrumb = ArticleUtilities.buildBreadcrumb(category)

    # TODO(Varun): This is redundant fluff code from article_revision_view.
    #      Find a way to eliminate it
    breadcrumb.reverse()
    breadcrumb.pop()

    return breadcrumb


def build_article_revision_view(article, articleRevision):
    """Append attributes of the article object to the revision

    Args:
        article: The article object whose page is revision is being requested
        articleRevision: The article revision being requested

    Returns:
        An article revision object with the attributes of "title", "citation",
        "difficulty", "resources" and "slug" of the article object attached to
        it.
    """
    # Fetch the current revision associated with the article
    articleRevision.title = article.title
    # articleRevision.article_id = article.id
    # articleRevision = article.revision
    articleRevision.citation = article.citation

    # Store other article fields in the revision object to be passed to
    #     the view
    articleRevision.difficulty = article.difficulty
    articleRevision.resources = article.resources
    articleRevision.slug = article.slug

    return articleRevision


def category_catalog(request, category):
    """Builds the catalog page, given a category.

    Using a category, this function fetches the breadcrumb of the category,
    which it uses to fetch all of the descendant elements to the category,
    alongwith the top articles and resources in its descendants.

    Args:
        request: The HTTP request object, as passed by django.
        category: The category whose catalog page is to be built.

    Returns:
        An rendered HttpResponse with the top articles, breadcrumbs, descendant
        category sets and counts, and resources of the descendant articles.
    """
    # Build the breadcrumb
    breadcrumb = ArticleUtilities.buildBreadcrumb(category)

    # To construct the page title, make a deep copy of the breadcrumb and get
    #     rid of the last category (OpenCurriculum, in most cases).
    breadcrumbTitle = breadcrumb[:]
    breadcrumbTitle.pop()

    # Build the page title by iterating through the breadcrumb categories.
    title = ""
    for bc_category in breadcrumbTitle:
        title += bc_category.title + " / "

    # And in the end, appending the site name.
    title += "OpenCurriculum"

    # Look for childCategories and flatCategories in cache.
    try:
        cc_cache_key = "cc_" + str(category.id)
        (childCategories, flatCategories) = cache.get(cc_cache_key)
    except:
        # If the child category tree and its flattened list structure isn't
        #     present in the cache, construct it again.
        # TODO(Varun): This operation is very slow. Need to optimize.
        (childCategories, flatCategories) = buildChildCategories(
            {'root': [category]}, [])
        cache.set(cc_cache_key, (childCategories, flatCategories))

    # Get the non-unpublished articles in all of the flattened descendant
    #     categories to the category whose catalog is requested, in descending
    #     order
    top_articles = Article.objects.filter(
        category__in=flatCategories).exclude(published=False).order_by('views')

    # To build the breadcrumb, reverse and get rid of the current category
    #     whose catalog is to be displayed.
    breadcrumb.reverse()
    breadcrumb.pop()

    top_resources = []

    # Get all resources in the top articles and build a master list that does
    #     include duplicates
    # TODO(Varun): Doing an n^2 look-up every single time is going to be time
    #      consuming, this needs to either be cached using a smart way or
    #      assigned to a background task
    # TODO(Varun): Sort the resources by popularity/relevance, etc.
    for article in top_articles:
        for resource in article.resources.all():
            if resource not in top_resources:
                top_resources.append(resource)
            else:
                index = top_resources.index(resource)
                top_resources.index(index).count += 1

    # Build a dictionary of immediate child categories mapped to the number of
    #     articles in their entire descendant nodes.
    setCounts = {}
    if len(childCategories) > 0:
        for article in top_articles:
            if article.category in flatCategories:
                # Find parent category among children
                immediateChildren = list(
                    itertools.chain.from_iterable(childCategories.values()))
                immediateChildrenFiltered = map(
                    _flattenChildren, immediateChildren
                )
                immediateChildrenFlattened = list(
                    itertools.chain.from_iterable(immediateChildrenFiltered)
                )
                if article.category == category:
                    parentCategory = category
                else:
                    parentCategory = _getParentSet(
                        article.category, immediateChildrenFlattened)
                # Based on where the category has been added as key before or
                #      not to the ancestor category (that is an immediate child)
                #      to the category whose catalog is request, increment the
                #      set count.
                if parentCategory in setCounts:
                    setCounts[parentCategory].append(article)
                else:
                    setCounts[parentCategory] = [article]
    else:
        setCounts[category] = []
        for article in top_articles:
            setCounts[category].append(article)

    # Build the URL slugs for the breadcrumb categories
    for key, value in setCounts.items():
        setBreadcrumb = ArticleUtilities.buildBreadcrumb(key)

        # HACK(Varun): This will break when doing projects. Needs to be fixed
        #     to resolve properly.
        setBreadcrumb.pop()
        setBreadcrumb.reverse()

        # Iterate through the reversed breadcrumb. and append the category slug
        # HACK(Varun): So dirty. So hackish. This is not good
        newSlug = ""
        for bc_category in setBreadcrumb:
            newSlug += bc_category.slug
            # If this is not the last category, append "/"
            newSlug += "/" if setBreadcrumb.index(bc_category) != (
                len(setBreadcrumb)-1) else ""

        key.slug = newSlug

    context = {
        'articles': top_articles, 'breadcrumb': breadcrumb, 'title': title,
        'category': category, 'resources': top_resources, 'sets': setCounts
    }
    return render(request, 'category.html', context)


def _getParentSet(needle, parents):
    """Recursively locates and returns a parent category in a ancestoral set.
    Args:
        needle: A category object whose parent set is to be found.
        parents: A list of parent categories, which serve as a starting point
            in finding the category.

    Returns:
        The parent category of the needle from the parents and their
        descendants.
    """
    # TODO: Implement this method as a recursive lookup from a tree, and all
    #     calling methods to pass a real tree object, and not these fuzzy
    #     relationships
    try:
        try:
            # Find this needle in parent set.
            parentPosition = parents.index(needle)
        except:
            # Or find the parent the needle in the parent set.
            parentPosition = parents.index(needle.parent)

        return parents[parentPosition]
    except:
        # If still not found, call this same function with the parent of the
        #     needle now being the new needle, in order to go one level above.
        return _getParentSet(needle.parent, parents)


def _flattenChildren(child):
    """Constructs a list of either the keys or the list itself"""
    if type(child) is dict:
        return child.keys()
    else:
        return [child]


def catalog(request):
    """Fetches articles and counts from specific subjects to be displayed on
    the catalog page"""
    # Get all categories with the parent category of OpenCurriculum.
    root_category = Category.objects.get(title='OpenCurriculum')

    page_categories = Category.objects.filter(
        parent=root_category).exclude(pk=root_category.id)

    articles = CatalogCategorySet()
    articles.categories = []
    articles.resources = Resource.objects.filter(
        visibility='public').order_by('-views')[:8]

    for category in page_categories:
        catalog_category = CatalogCategory()
        (childCategories, flatCategories) = buildChildCategories(
            {'root': [category]}, []
        )
        categoryArticles = Article.objects.filter(
            category__in=flatCategories).exclude(
                published=False).order_by('views')
        catalog_category.articlesView = categoryArticles.order_by('views')[:4]
        catalog_category.count = categoryArticles.count()
        catalog_category.countMore = (
            catalog_category.count - 4) if catalog_category.count >= 4 else 0
        catalog_category.title = category.title
        catalog_category.slug = category.slug
        articles.categories.append(catalog_category)

    context = {
        'articles': articles,
        'title': _(settings.STRINGS['articles']['CATALOG_TITLE'])
    }
    return render(request, 'catalog.html', context)


def buildChildCategories(categoryModel, flattenedDescendants):
    """Given a category tree model and a flattened list of categories, build
    a flushed out tree model recursively downwards.

    This function recursively builds descendant trees and flattens them into
    lists at every stage.

    Args:
        categoryModel: A dictionary based data-structure that represents a
            tree. Comprises of keys mapped to lists or lists of dictionaries
        flattenedDescendants: A flat list of all descendants to a category.

    Returns:
        A tuple of the categoryModel object and the flattenedDescendants,
        after recursively adding all of the descendant categories.
    """
    if len(categoryModel) == 0:
        return (None, flattenedDescendants)
    else:
        # Get all child categories whose children need to be found
        catValues = categoryModel.values()

        # Chain all the contents of the values
        childCategories = list(itertools.chain.from_iterable(catValues))

        # Create a master list [] of all { parent : [child, child] } mapping
        children = map(_hasImmediateChildren, childCategories)

        # Flatten the {} objects in the master list into one new dict
        categoryModel = {}
        for child in children:
            try:
                for k, v in child.iteritems():
                    categoryModel[k] = v
            except:
                pass

        # Call this function recursively to obtain the current models'
        #     descendant child categories

        (descendantsTree, descendantsFlattened) = buildChildCategories(
            categoryModel, childCategories
        )

        # Append "my" descendants to the descendants of "my" children
        flattenedDescendants += descendantsFlattened

        if descendantsTree is not None:
            # Iterate through all the dictionary keys, and replace the category
            #     model items, and return the category model
            for val in categoryModel.itervalues():
                for v in val:
                    for a, b in descendantsTree.iteritems():
                        if a == v:
                            val[val.index(v)] = {a: b}
            return (categoryModel, flattenedDescendants)
        else:
            return (categoryModel, flattenedDescendants)


def _replaceValues(model, key, newValue):
    model[key] = newValue
    return model


def _hasImmediateChildren(category):
    """Fetches and returns a list of categories who have a certain parent.

    Args:
        category: Parent category whose child categories are to be looked up.

    Returns:
        A single item dictionary with the parent as the key and child
        categories serialized as list as the value
    """
    childCategories = list(Category.objects.filter(parent=category))
    if len(childCategories) > 0:
        return {category: childCategories}
    else:
        return None


def categoryURLResolver(request, categories_slugs, n):
    """Based on category slug provided, determines and returns correct
    category catalog page.

    Recursively calls self to determine the match against the correct category.

    Args:
        categories_slugs: Target category tree as list.
        n: Iterator from reverse to use when introspecting the list.

    Returns:
        In the case it resolves to one category, returns the HttpResponse
        object as rendered by the functions invoked. Else, recursively calls
        self to determine unique category/category tree.
    """
    # Get the category object of the parent of the request.
    childCategorySlug = categories_slugs[n]

    # If the parent category of the request is "opencurriculum", redirect to
    #     main catalog.
    # TODO(Varun): This does not belong to this function, design wise. Move it
    #     out and may be create a hook of sorts or place in URLConf.
    if childCategorySlug == "opencurriculum":
        return redirect('articles:catalog')

    # Fetch the parent category using a simple QuerySet lookup using the slug.
    category = Category.objects.filter(slug=childCategorySlug)

    # If the category slug is unique, return the only object filtered.
    if category.count() == 1:
        return category_catalog(request, category.all()[0])
    else:
        # If parent/child category pair unique, return child category page
        #     (through correct function).
        truePairs = [cat for cat in category if _testCategoryUniqueness(
            cat, categories_slugs[n])]
        if len(truePairs) == 1:
            # HACK(Varun): For some reason, when a child is not found, the
            #     nearest parent is rendered. This surprisingly works in terms
            #     of usability in future, but in future there should be a
            # 	  redirection to the parent page or a 404 should be raised.
            return category_catalog(request, truePairs[0][-1])
        else:
            # Try/except in the cases of poorly created URL.
            #     Simply return a 404.
            try:
                # Else recursively call function with parent as child.
                return categoryURLResolver(request, categories_slugs, n-1)
            except IndexError:
                raise Http404


def _testCategoryUniqueness(category, parent_slug):
    if category.parent.slug == parent_slug:
        return True


def articleURLResolver():
    # TODO(Varun): Write this function!
    pass


def _getContributorFromRevisions(revision):
    return revision.user


def article_center(request):
    if not request.user.is_authenticated():
        return redirect('/?login=true&source=%s' % request.path)

    category_slug = request.GET.get('category', None)

    from articles.models import SuggestedArticle

    if category_slug:
        # Get all unpublished articles whose ancestor category is the slug
        # category
        category = Category.objects.get(slug=category_slug)
        suggested_articles = SuggestedArticle.objects.filter(article__category=category)
    else:
        suggested_articles = SuggestedArticle.objects.all()

    for article in suggested_articles:
        revisions = ArticleRevision.objects.filter(
            article=article.article)
        article.contributors = map(_getContributorFromRevisions, revisions)
        category_breadcrumb = ArticleUtilities.buildBreadcrumb(article.article.category)

        # The category of the first breadcrumb category is the article category
        article.breadcrumb = category_breadcrumb[0]

        if request.user in article.suggested_users.all():
            article.suggested = True
        else:
            article.suggested = False

    context = {
        'articles': suggested_articles,
        'category': category_slug,
        'title': _(settings.STRINGS['article_center']['TITLE'])
    }
    return render(request, 'article_center.html', context)


class CatalogCategory():
    """Bogus class used to instantiate arbitrary category objects"""
    pass


class CatalogCategorySet():
    """Bogus class used to instantiate arbitrary category set objects"""
    pass
