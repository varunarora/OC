from interactions.models import Vote

class VoteUtilities():

    @staticmethod
    def get_upvotes_of(comment):
        return VoteUtilities.get_votes(comment, True)

    @staticmethod
    def get_downvotes_of(comment):
        return VoteUtilities.get_votes(comment, False)


    @staticmethod
    def get_votes(parent, positive):
        from interactions.models import Comment
        from django.contrib.contenttypes.models import ContentType
        comment_ct = ContentType.objects.get_for_model(Comment)

        return Vote.objects.filter(
            parent_type=comment_ct, parent_id=parent.id, positive=positive)