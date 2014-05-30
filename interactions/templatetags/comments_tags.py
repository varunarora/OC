from django import template
from xml.etree import ElementTree
import itertools
from django.conf import settings
from django.core.urlresolvers import reverse
from interactions.CommentUtilities import CommentUtilities
from interactions.VoteUtilities import VoteUtilities

register = template.Library()

"""
Class adopted from project_tags.py in projects app
"""

@register.filter(is_safe=True)
def nested_comment_tree(value, user):
    root = ElementTree.Element('ul')

    # Get the project that owns the root collection
    root_comment = get_root_key(value)

    # HACK(Varun): If there are children
    if root_comment:
        child_nodes = build_child_tree(value, user)
        for node in child_nodes:
            root.append(node)
        return ElementTree.tostring(root)
    else:
        return ''


def build_child_tree(root_node, user):
    # Get the list of child of this node.
    nodes = list(itertools.chain.from_iterable(root_node.values()))
    nodeElements = []

    # Create <li> nodes for each.
    for node in nodes:
        nodeElement = ElementTree.Element('li')
        nodeElement.set('class', 'post-comment')

        # If this child has other children, build child tree.
        if type(node) is dict:
            root_node = get_root_key(node)

            (host_type, host, root) = CommentUtilities.get_comment_root(root_node)
            add_comment_data_to_element(root_node, nodeElement, user, host, host_type)

            nodeList = ElementTree.SubElement(nodeElement, 'ul')

            child_nodes = build_child_tree(node, user)
            for child_node in child_nodes:
                nodeList.append(child_node)

        # Otherwise, append a child <a> element as is.
        else:
            (host_type, host, root) = CommentUtilities.get_comment_root(node)
            add_comment_data_to_element(node, nodeElement, user, host, host_type)

        nodeElements.append(nodeElement)

    return nodeElements


def get_root_key(value):
    # NOTE(Varun): This function may be written better to only iterate through
    #     once and return the first value
    root_elements = []
    for root_element in value.keys():
        root_elements.append(root_element)

    try:
        return root_elements[0]
    except:
        return None


def add_comment_data_to_element(node, node_element, user, root, host_type):
    # Set the ID of the <li> holding the comment to the ID of the node
    node_element.set('id', 'comment-' + str(node.id))

    # Add the user thumbnail to the comment block
    node_thumbnail_wrapper = ElementTree.SubElement(node_element, 'div')
    node_thumbnail_wrapper.set('class', 'post-comment-user-thumbnail')

    #node_thumbnail = ElementTree.SubElement(node_thumbnail_wrapper, 'div')
    node_thumbnail = ElementTree.Element('div')
    node_thumbnail.set('class', 'discussion-response-thumbnail')
    node_thumbnail.set('style', 'background-image: url(\'%s\')' % (
        settings.MEDIA_URL + node.user.get_profile().profile_pic.name ))
    node_thumbnail.text = ' '
    node_thumbnail_wrapper.append(node_thumbnail)


    # Add post body to comment block
    commentor = ElementTree.Element('a')
    commentor.set('href', reverse('user:user_profile', kwargs={
        'username': node.user.username
    }))
    commentor.text = node.user.get_full_name()

    markdown_html = ElementTree.fromstring(
        '<div class=\'post-comment-body\'>' + 
        ElementTree.tostring(commentor) +
        node.body_markdown_html + '</div>')

    # Add comment actions (reply, upvote, downvote) to the comment
    node_actions = ElementTree.SubElement(markdown_html, 'div')
    node_actions.set('class', 'comment-actions')

    # Add 'reply' action to the comment actions block
    node_reply = ElementTree.SubElement(node_actions, 'div')
    node_reply.set('class', 'reply-to-comment')
    node_reply.text = settings.STRINGS['comments']['REPLY']

    # Add 'upvote' action to the comment actions block
    node_upvote = ElementTree.SubElement(node_actions, 'div')
    upvotes = VoteUtilities.get_upvotes_of(node)
    node_upvote.text = str(upvotes.count())
    node_upvote.set('class', 'upvote-comment')
    for upvote in upvotes.all():
        if user == upvote.user:
            node_upvote.set('class', 'upvote-comment user-upvoted')
            break

    # Add 'downvote' action to the comment actions block
    node_downvote = ElementTree.SubElement(node_actions, 'div')
    downvotes = VoteUtilities.get_downvotes_of(node)
    node_downvote.text = str(downvotes.count())
    node_downvote.set('class', 'downvote-comment')
    for downvote in downvotes.all():
        if user == downvote.user:
            node_downvote.set('class', 'downvote-comment user-downvoted')
            break

    # If comment is created by the user or the requester is the admin,
    #     add a delete button
    if (host_type.name == 'project' and user in root.admins.all()) or (
        host_type.name == 'resource' and user == node.user):
            delete_button = ElementTree.SubElement(node_element, 'div')
            delete_button.set('class', 'delete-button')
            delete_button.set('title', 'Delete comment')
            delete_button.text = ' '

    node_element.append(markdown_html)
