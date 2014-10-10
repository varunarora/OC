{% if resources_source == 'search' %}
{% load highlight %}
{% load stripper %}
{% endif %}

{% for resource in resources %}
    var result = new OC.Result({
        id: {% if resources_source == 'search' %}'{{ resource.object.id }}'{% elif resources_source == 'favorites' %}'{{ resource.parent.id }}'{% else %}'{{ resource.id }}'{% endif %},

        url: {% if resources_source == 'search' %}'{% url read resource_id=resource.object.id resource_slug=resource.object.slug %}'{% elif resources_source == 'favorites' %}'{% url read resource_id=resource.parent.id resource_slug=resource.parent.slug %}'{% else %}'{% url read resource_id=resource.id resource_slug=resource.slug %}'{% endif %},

        title: {% if resources_source == 'search' %}'{{ resource.object.title }}'{% elif resources_source == 'favorites' %}'{{ resource.parent.title }}'{% else %}'{{ resource.title }}'{% endif %},

        user_url: {% if resources_source == 'search' %}'{% url user:user_profile username=resource.object.revision.user.username %}'{% elif resources_source == 'favorites' %}'{% url user:user_profile username=resource.parent.revision.user.username %}'{% else %}'{% url user:user_profile username=resource.revision.user.username %}'{% endif %},

        user_thumbnail: {% if resources_source == 'search' %}'{{ MEDIA_URL }}{{ resource.object.revision.user.get_profile.profile_pic.name }}'{% elif resources_source == 'favorites' %}'{{ MEDIA_URL }}{{ resource.parent.revision.user.get_profile.profile_pic.name }}'{% else %}'{{ MEDIA_URL }}{{ resource.revision.user.get_profile.profile_pic.name }}'{% endif %},

        type: {% if resources_source == 'search' %}'{{ resource.object.type|upper }}'{% else %}'{{ resource.type|upper }}'{% endif %},

        favorited: {% if resources_source == 'search' %}{% if resource.object.favorited %}true{% else%}false{% endif %}{% elif resources_source == 'favorites' %}'{{ resource.parent.id }}'{% else %}{% if resource.favorited %}true{% else%}false{% endif %}{% endif %},

        favorites: {% if resources_source == 'search' %}'{{ resource.object.favorites_count }}'{% elif resources_source == 'favorites' %}'{{ resource.parent.favorites_count }}'{% else %}'{{ resource.favorites_count }}'{% endif %},

        thumbnail: {% if resources_source == 'search' %}'{{ MEDIA_URL }}{{ resource.object.image.name }}'{% elif resources_source == 'favorites' %}'{{ MEDIA_URL }}{{ resource.parent.image.name }}'{% else %}'{{ MEDIA_URL }}{{ resource.image.name }}'{% endif %},

        views: {% if resources_source == 'search' %}'{{ resource.object.views }}'{% elif resources_source == 'favorites' %}'{{ resource.parent.views }}'{% else %}'{{ resource.views }}'{% endif %},

        tags: {% if resources_source == 'search' %}[]{% elif resources_source == 'favorites' %}[]{% else %}[]{% endif %},

        created: {% if resources_source == 'search' %}'{{ resource.object.created }}'{% elif resources_source == 'favorites' %}'{{ resource.parent.created }}'{% else %}'{{ resource.created }}'{% endif %},

        created_iso: {% if resources_source == 'search' %}'{{ resource.object.created|date:"c" }}'{% elif resources_source == 'favorites' %}'{{ resource.parent.created|date:"c" }}'{% else %}'{{ resource.created|date:"c" }}'{% endif %},

        username: {% if resources_source == 'search' %}'{{ resource.object.user.username }}'{% elif resources_source == 'favorites' %}'{{ resource.parent.user.username }}'{% else %}'{{ resource.user.username }}'{% endif %},

        difficulty: {% if resources_source == 'search' %}'{{ resource.object.difficulty }}'{% elif resources_source == 'favorites' %}'{{ resource.parent.difficulty }}'{% else %}'{{ resource.difficulty }}'{% endif %},

        visibility: {% if resources_source == 'search' %}'{{ resource.object.visibility }}'{% elif resources_source == 'favorites' %}'{{ resource.parent.visibility }}'{% else %}'{{ resource.visibility }}'{% endif %},

        cost: 'free',

        remote: false,

        license: {% if resources_source == 'search' %}'{{ resource.object.license }}'{% elif resources_source == 'favorites' %}'{{ resource.parent.license }}'{% else %}'{{ resource.license }}'{% endif %},

        review_count: {% if resources_source == 'search' %}0{% elif resources_source == 'favorites' %}0{% else %}0{% endif %},

        {% if resources_source == 'search' %}
        {% with stripped_result=resource.object.description|striptags|escapejs %}
        description: '{% highlight stripped_result with query %}',
        {% endwith %}
        {% elif resources_source == 'favorites' %}
        description: '{{ resource.parent.description|striptags|escapejs }}'
        {% else %}
        description: '{{ resource.description|striptags|escapejs }}'
        {% endif %}
    });

    OC.resources.resultSet.add(result);
{% endfor %}
