from interactions.models import Comment
import itertools

from django.contrib.contenttypes.models import ContentType
COMMENT_TYPE = ContentType.objects.get_for_model(Comment)

class CommentsBuilder:

    # The root parent for the comment thread.
    comments_host = None

    # The content type of root parent for the comment thread.
    host_type = None


    def __init__(self, comments_host, host_type):
        self.comments_host = comments_host
        self.host_type = host_type


    def build_tree(self):
        return self.build_comment_tree({'root': [self.comments_host]}, [])


    def _get_child_comments(self, comment):
        # Get all the collections whose parent is the root collection.
        child_comments = Comment.objects.filter(
            parent_id=comment.id, parent_type=self.host_type, classification=None)

        # HACK(Varun): Change the flag of the host_type to comment type
        # after descending one step down in the comment tree i.e. after
        # getting the children of the root.
        if self.host_type != COMMENT_TYPE:
            self.host_type = COMMENT_TYPE

        return child_comments


    def _has_immediate_child_comments(self, comment):
        """Adapted from _hasImmediateChildren() in articles.views"""
        childComments = list(self._get_child_comments(comment))
        if len(childComments) > 0:
            return {comment: childComments}
        else:
            return None


    def build_comment_tree(self, comment_model, flattened_descendants):
        if len(comment_model) == 0:
            return (None, flattened_descendants)
        else:
            # Get all child comments whose children need to be found
            commentValues = comment_model.values()

            # Chain all the contents of the values
            childComments = list(itertools.chain.from_iterable(commentValues))

            # Create a master list [] of all { parent : [child, child] } mapping
            children = map(self._has_immediate_child_comments, childComments)

            # Flatten the {} objects in the master list into one new dict
            comment_model = {}
            for child in children:
                try:
                    for k, v in child.iteritems():
                        comment_model[k] = v
                except:
                    pass

            # Call this function recursively to obtain the current models'
            #     descendant child categories

            (descendantsTree, descendantsFlattened) = self.build_comment_tree(
                comment_model, childComments
            )

            # Append "my" descendants to the descendants of "my" children
            flattened_descendants += descendantsFlattened

            if descendantsTree is not None:
                # Iterate through all the dictionary keys, and replace the category
                #     model items, and return the category model
                for val in comment_model.itervalues():
                    for v in val:
                        for a, b in descendantsTree.iteritems():
                            if a == v:
                                val[val.index(v)] = {a: b}
                return (comment_model, flattened_descendants)
            else:
                return (comment_model, flattened_descendants)


class CommentUtilities:
    @staticmethod
    def get_comment_root(comment):
        if comment.parent_type.name != 'comment':
            return (comment.parent_type, comment.parent, comment)
        else:
            return CommentUtilities.get_comment_root(comment.parent)