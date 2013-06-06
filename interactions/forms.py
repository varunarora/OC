from django.forms import ModelForm
from interactions.models import Comment


class NewCommentForm(ModelForm):
    class Meta:
        model = Comment
