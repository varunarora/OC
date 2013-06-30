from django.shortcuts import render
from django.template import Context
from discussions.models import DiscussionBoard, Comment, Topic


def discussions(request):
    """Display all discussion boards."""
    boards = DiscussionBoard.objects.all()

    c = Context({
        'board_list': boards,
    })

    return render(request, "discussions.html", c)


def board(request, board_id):
    """Display the topics in a discussion board.

    The topics are sorted so that the newest topic appears first.
    Clicking a topic leads to its own page.
    """
    title = DiscussionBoard.objects.get(id=board_id).title
    topics = Topic.objects.filter(discussion_board__id=
                                  board_id).order_by('-post_time')
    c = Context({
        'board_title': title,
        'topic_list': topics,
    })

    return render(request, "board.html", c)


def topic(request, topic_id):
    title = Topic.objects.get(id=topic_id).title
    comments = Comment.objects.filter(topic__id=
                                      topic_id).order_by('post_time')

    c = Context({
        'topic_title': title,
        'comment_list': comments,
    })
    return render(request, "topic.html", c)
