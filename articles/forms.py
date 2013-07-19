from django.forms import ModelForm
from articles.models import ArticleRevision


class EditArticleForm(ModelForm):
    from django import forms
    #tags = forms.CharField(required=False)

    def __init__(self, request, user, article, flag):
        newRequest = request.copy()

        if flag == "fork":
            # This line is more or less unnecessary as logs have been marked optional
            newRequest.__setitem__('log', '')

        if user.id:
            newRequest.__setitem__('user', user.id)
        else:
            newRequest.__setitem__('user', None)
        newRequest.__setitem__('article', article.id)
        newRequest.__setitem__('flag', flag)

        tags = self.convert_to_tag_array(newRequest.getlist('tags'))
        if len(tags) == 0:
            newRequest.setlist('tags', [])
        else:
            newRequest.setlist('tags', tags)

        super(EditArticleForm, self).__init__(newRequest)

    @staticmethod
    def convert_to_tag_array(tag_array):
        from meta.models import Tag

        tags = []

        for tag in tag_array:
            try:
                present_tag = Tag.objects.get(title=tag)
                tags.append(present_tag.id)
            except:
                # Create new tag and return it
                new_tag = Tag(title=tag, description='')
                new_tag.save()
                tags.append(new_tag.id)

        return tags

    class Meta:
        model = ArticleRevision
