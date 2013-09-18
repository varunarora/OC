"""
Tests for functionality in Project views and utility classes.
"""

from django.test import TestCase
from oer.models import Collection
from interactions.models import Comment
from projects.models import Project
from django.contrib.auth.models import User


class Projects(TestCase):
    fixtures = ['auth.json', 'user_account.json', 'collection.json', 'projects.json']

    def setUp(self):
        self.add_collections_to_project()
        self.add_discussion_posts_to_project()

        # Log the user in
        self.client.login(username='ocrootu', password='OCProD7!')


    def add_collections_to_project(self):
        """
        Add multiple collections to the root collection of the test project, and add a
        collection to one of those collections
        """
        test_project = Project.objects.get(slug='pps-got-magic')
        root_user = User.objects.get(pk=1)

        new_collection_1 = Collection(
            title='Test collection one', host=test_project.collection,
            visibility='public', slug='test-collection-one', creator=root_user
        )
        new_collection_1.save()

        new_collection_2 = Collection(
            title='Test collection two', host=test_project.collection,
            visibility='project', slug='test-collection-two', creator=root_user
        )
        new_collection_2.save()

        new_collection_3 = Collection(
            title='Test collection three', host=test_project.collection,
            visibility='project', slug='test-collection-three', creator=root_user
        )
        new_collection_3.save()

        # Now add a child collection to new_collection_3
        child_collection = Collection(
            title='Child of test collection three', host=new_collection_3,
            visibility='project', slug='collection-three-child', creator=root_user
        )
        child_collection.save()


    def add_discussion_posts_to_project(self):
        test_project = Project.objects.get(slug='pps-got-magic')
        root_user = User.objects.get(pk=1)

        new_discussion_1 = Comment(
            body_markdown='This is my first post!', user=root_user,
            parent=test_project
        )
        new_discussion_1.save()

        new_discussion_2 = Comment(
            body_markdown='This is my second post', user=root_user,
            parent=test_project
        )
        new_discussion_2.save()

        # Add a commment onto the first post
        discussion_1_response = Comment(
            body_markdown='This is my response to the first post', user=root_user,
            parent=new_discussion_1
        )
        discussion_1_response.save()


    def test_home(self):
        """
        Tests that the home page load redirects to the browse page without an error.
        """
        response = self.client.get('/project/pps-got-magic/')
        # Test for redirection to the browse page
        self.assertRedirects(response, '/project/pps-got-magic/browse/')
        self.assertEqual(response.status_code, 302)


    def test_browse(self):
        """
        Tests the loading of projects' browse page, along with the presence of
        a root collection & single root of a browse tree.
        """
        response = self.client.get('/project/pps-got-magic/browse/')
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.context['collection'])
        self.assertEqual(len(response.context['browse_tree'].keys()), 1)
        self.assertEqual(
            response.context['browse_tree'].keys()[0], response.context['collection'])


    def test_root_collections_listing(self):
        """
        Tests if browsing the root collection of the project lists all the root projects
        as expected.
        """
        response = self.client.get('/project/pps-got-magic/browse/')
        root_collection = response.context['collection']
        child_collections = response.context['collections']

        from django.contrib.contenttypes.models import ContentType
        collection_ct = ContentType.objects.get_for_model(Collection)

        collections_in_root = Collection.objects.filter(
            host_id=root_collection.id, host_type=collection_ct)

        # Get the child collections that have been created during setup
        for collection in collections_in_root:
            self.assertIn(collection, child_collections)


    def test_collections_listing(self):
        """
        Tests if browsing a one-level deep collection of a collection in a project lists
        all the child collections as expected.
        """
        response = self.client.get('/project/pps-got-magic/browse/test-collection-three/')
        root_collection = response.context['collection']
        child_collections = response.context['collections']

        from django.contrib.contenttypes.models import ContentType
        collection_ct = ContentType.objects.get_for_model(Collection)

        collections_in_root = Collection.objects.filter(
            host_id=root_collection.id, host_type=collection_ct)

        # Get the child collection that has been created during setup
        for collection in collections_in_root:
            self.assertIn(collection, child_collections)


    def test_list_discussions(self):
        """
        Tests the presence of discussion posts (created during setup) on the
        discussions page.
        """
        response = self.client.get('/project/pps-got-magic/discussions/')
        project = response.context['project']

        posts_on_page = response.context['posts']

        from django.contrib.contenttypes.models import ContentType
        project_ct = ContentType.objects.get_for_model(Project)

        discussions = Comment.objects.filter(
            parent_type=project_ct, parent_id = project.id
        )

        # Check if all the collections from the database show up on the discussions
        # page.
        for discussion in discussions:
            self.assertIn(discussion, posts_on_page)


    def test_post_new_post(self):
        """
        Tests sending POST HTTP request to add a new post and then loading
        the discussion page to test the presence of the new 'comment' object.
        """
        project = Project.objects.get(slug='pps-got-magic')
        new_post_body = 'This is a new discussion post!'

        # Post the new discussion item.
        post_response = self.client.post('/project/pps-got-magic/discussions/post/', {
            'parent_id': project.id,
            'body_markdown': new_post_body
        })
        self.assertEqual(post_response.status_code, 302)

        # Now load the discussions page and see if the new post is the top post.
        response = self.client.get('/project/pps-got-magic/discussions/')

        # Test for if the last post is the same as the one just created, as ordering
        # works only at a templating level
        top_post = response.context['posts'][len(response.context['posts']) - 1]

        self.assertEqual(top_post.body_markdown, new_post_body)


    def test_post_new_comment(self):
        """
        Tests submitting new comment as HTTP POST request on existing discussion post
        and consequent listing in the discussion tree.
        """
        # Fetch discussion post through unique body_markdown.
        # TODO(Varun): Make the lookup for the comment smarter.
        discussion_post = Comment.objects.get(body_markdown='This is my second post')
        new_comment_body = 'This is a comment on the post #2'

        from django.contrib.contenttypes.models import ContentType
        comment_ct = ContentType.objects.get_for_model(Comment)

        # Post the new comment on the discussion post.
        post_response = self.client.post('/interactions/comment/', {
            'parent_id': discussion_post.id,
            'user': 1,
            'parent_type': comment_ct.id,
            'body_markdown': new_comment_body
        })
        self.assertEqual(post_response.status_code, 200)

        # Get newly created comment.
        import json
        comment_id = json.loads(post_response.content)['message']['id']
        new_comment = Comment.objects.get(pk=comment_id)

        # Now load the discussion page and see if the new comment is there as
        # a response to the root thread post.
        response = self.client.get(
            '/project/pps-got-magic/discussion/' + str(discussion_post.id) + '/')

        post_comments = response.context['post'].comments

        self.assertIn(new_comment, post_comments[discussion_post])


    def test_post_new_nested_comment(self):
        # Fetch discussion post response through unique body_markdown.
        existing_comment = Comment.objects.get(
            body_markdown='This is my response to the first post')
        new_comment_body = 'This is a response to the comment on the post #1'

        from django.contrib.contenttypes.models import ContentType
        comment_ct = ContentType.objects.get_for_model(Comment)

        # Post the new comment on the discussion post.
        post_response = self.client.post('/interactions/comment/', {
            'parent_id': existing_comment.id,
            'user': 1,
            'parent_type': comment_ct.id,
            'body_markdown': new_comment_body
        })
        self.assertEqual(post_response.status_code, 200)

        # Get newly created comment.
        import json
        comment_id = json.loads(post_response.content)['message']['id']
        new_comment = Comment.objects.get(pk=comment_id)

        from interactions.CommentUtilities import CommentUtilities
        (root_type, root, root_child) = CommentUtilities.get_comment_root(new_comment)

        # Now load the discussion page and see if the new comment is there as
        # a response to the root thread post.
        response = self.client.get(
            '/project/pps-got-magic/discussion/' + str(root_child.id) + '/')

        post_comments = response.context['post'].comments

        self.assertIn(new_comment, post_comments[root_child][0][existing_comment])


    def test_upvote_post(self):
        """
        Tests casting a positive vote on a root discussion post on the test project.
        """
        # Get a post from the test project.
        post = Comment.objects.get(body_markdown='This is my first post!')

        # Cast an upvote on the discussion post.
        get_response = self.client.get('/interactions/comment/' + str(post.id) + '/upvote/')

        import json
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(json.loads(get_response.content)['status'], 'true')


    def test_downvote_comment(self):
        """
        Tests casting a negative vote on a comment on a post in the test project.
        """
        # Get a post from the test project.
        post = Comment.objects.get(body_markdown='This is my response to the first post')

        # Cast an upvote on the discussion post.
        get_response = self.client.get('/interactions/comment/' + str(post.id) + '/downvote/')

        import json
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(json.loads(get_response.content)['status'], 'true')
