from interactions.models import Comment
import itertools

class CommentUtilities():
    @staticmethod
    def get_comment_root(comment):
        if comment.parent_type.name != 'comment':
            return (comment.parent_type, comment.parent, comment)
        else:
            return CommentUtilities.get_comment_root(comment.parent)


    @staticmethod
    def _get_child_comments(comment):
        # Get all the collections whose parent is the root collection.
        from django.contrib.contenttypes.models import ContentType
        comment_type = ContentType.objects.get_for_model(Comment)
        child_comments = Comment.objects.filter(
            parent_id=comment.id, parent_type=comment_type)

        return child_comments

    @staticmethod
    def _hasImmediateChildComments(comment):
        """Adapted from _hasImmediateChildren() in articles.views"""
        from interactions.CommentUtilities import CommentUtilities
        childComments = list(CommentUtilities._get_child_comments(comment))
        if len(childComments) > 0:
            return {comment: childComments}
        else:
            return None

    @staticmethod
    def build_comment_tree(comment_model, flattened_descendants):
        if len(comment_model) == 0:
            return (None, flattened_descendants)
        else:
            # Get all child comments whose children need to be found
            commentValues = comment_model.values()

            # Chain all the contents of the values
            childComments = list(itertools.chain.from_iterable(commentValues))

            # Create a master list [] of all { parent : [child, child] } mapping
            children = map(CommentUtilities._hasImmediateChildComments, childComments)

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

            (descendantsTree, descendantsFlattened) = CommentUtilities.build_comment_tree(
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
