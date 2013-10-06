from django.conf.urls import patterns, url

from interactions import views

urlpatterns = patterns(
    '',
    url(r'^comment/(?P<comment_id>.+)/upvote/$', views.upvote_comment, name='upvote_comment'),
    url(r'^comment/(?P<comment_id>.+)/downvote/$', views.downvote_comment, name='downvote_comment'),
    url(r'^comment/(?P<comment_id>.+)/delete/$', views.delete_comment, name='delete_comment'),
    url(r'^comment/$', views.post_comment, name='post_comment'),

    url(r'^vote/up/resource/(?P<resource_id>.+)/$', views.upvote_resource, name='upvote_resource'),
    url(r'^vote/down/resource/(?P<resource_id>.+)/$', views.downvote_resource, name='downvote_resource'),

    url(r'^votes/count/resource/(?P<resource_id>.+)/$', views.get_resource_vote_count, name='get_resource_vote_count'),

    url(r'^favorite/state/resource/(?P<resource_id>.+)/user/(?P<user_id>.+)/$', views.get_favorite_state, name='get_favorite_state'),
    url(r'^favorite/resource/(?P<resource_id>.+)/user/(?P<user_id>.+)/$', views.favorite_resource, name='favorite_resource'),
)
