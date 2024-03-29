{% load comments_tags %}

OC.groups = {
    rawPosts: []
};

{% for post in posts %}
    var post = {
        id: {{ post.id }},
        user: '{{ post.user.get_full_name }}',
        userThumbnail: '{{ MEDIA_URL }}{{ post.user.get_profile.profile_pic.name }}',
        userURL: '{% url user:user_profile username=post.user.username %}',
        category: '{{ post.category.title|upper }}',
        body: '{{ post.body_markdown_html|safe|escapejs }}',
        attachmentTitle: '{{ post.attachment.title }}',
        comments: '{{ post.comments|nested_comment_tree:user|safe|escapejs }}',
        hasAttachment: {% if post.attachment %}true{% else %}false{% endif %},
        attachmentHost: '{{ post.attachment.host_type.name }}',
        attachmentType: '{{ post.attachment_type.name }}',
        attachmentThumbnail: {% if post.attachment_type.name == 'resource' %}'{{ MEDIA_URL }}{{ post.attachment.image.name }}'{% else %}'{{ STATIC_URL }}images/folder-icon.png'{% endif %},
        attachmentURL: {% if post.attachment %}{% if post.attachment_type.name == 'resource' %}'{% url read resource_id=post.attachment.id resource_slug=post.attachment.slug %}'{% else %}{% if post.attachment.host_type.name == 'user profile' %}'{% url user:list_collection username=post.attachment.creator.username collection_slug=post.attachment.slug %}'{% else %}'{% url projects:list_collection project_slug=post.attachment.host.slug collection_slug=post.attachment.slug %}'{% endif %}{% endif %}{% else %}''{% endif %},
        upvotes: {{ post.upvotes.count }},
        userInUpvotes: {% if post.user_in_upvotes %}true{% else %}false{% endif %},
        downvotes: {{ post.downvotes.count }},
        userInDownvotes: {% if post.user_in_downvotes %}true{% else %}false{% endif %},
        created_raw: {{ post.created|date:"U" }},
        created: '{{ post.created }}'

    };
    OC.groups.rawPosts.push(post);
{% endfor %}

require(['group']);
