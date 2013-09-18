from django.conf.urls import patterns, url

from interactions import views

urlpatterns = patterns(
    '',
    url(r'^comment/(?P<comment_id>.+)/upvote/$', views.upvote_comment, name='upvote_comment'),
    url(r'^comment/(?P<comment_id>.+)/downvote/$', views.downvote_comment, name='downvote_comment'),
    url(r'^comment/(?P<comment_id>.+)/delete/$', views.delete_comment, name='delete_comment'),
    url(r'^comment/$', views.post_comment, name='post_comment'),
)
