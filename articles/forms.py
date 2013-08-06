from django.forms import ModelForm
from articles.models import ArticleRevision
from oc_platform import FormUtilities


class EditArticleForm(ModelForm):
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

        from meta.models import TagCategory
        tag_category = TagCategory.objects.get(title='Article')
        newRequest.setlist('tags', FormUtilities.get_taglist(
            newRequest.getlist('tags'), tag_category))

        super(EditArticleForm, self).__init__(newRequest)

    class Meta:
        model = ArticleRevision
