OC.categoryResources = {
    rawResources: [],
    rawChildCategories: [],
    rawRequests: [],
    gradeCategoryMap: {},
    requestURL: '',
    isCatalog: false,
    isSubjectHome: false,
    currentCategoryID: null
};

OC.categoryResources.currentCategoryID = '{{ current_category_id.id }}';
OC.categoryResources.isCatalog = '{{ is_catalog }}' === 'True' ? true : false;
OC.categoryResources.isSubjectHome = {% if child_categories_map %}true{% else %}false{% endif %};

{% for key, value in child_categories_map.items %}
    OC.categoryResources.gradeCategoryMap['{{ key }}'] = [];
    {% for child_categories_child in value %}
        OC.categoryResources.gradeCategoryMap['{{ key }}'].push({
            title: '{{ child_categories_child.title }}',
            url: '{{ child_categories_child.url }}'
        });
    {% endfor %}
{% endfor %}


{% if not child_categories_map %}

{% for child_category in child_categories %}
    OC.categoryResources.rawChildCategories.push({
        id: '{{ child_category.id }}',
        title: '{{ child_category.title }}',
        url: '{{ child_category.url }}',
        count: {{ child_category.count }},
        position: {{ forloop.counter }}
    });
{% endfor %}
{% endif %}

{% if browse_mode != 'suggestions' %}
{% for item in items %}
    {% if item.item_type == 'resource' %}
    var resource = {
        id: '{{ item.id }}',
        url: {% if item.content_type == 'link'%}'{{ item.revision.content.url }}'{% else %}'{% url read resource_id=item.id resource_slug=item.slug %}'{% endif %},
        remote: {% if item.content_type == 'link' %}true{% else %}false{% endif %},
        title: '{{ item.title }}',
        user: '{{ item.serialized_user.name }}',
        user_id: '{{ item.serialized_user.id }}',
        user_thumbnail: '{{ MEDIA_URL }}{{ item.serialized_user.profile_pic }}',
        user_url: '{% url user:user_profile username=item.serialized_user.username %}',
        favorites: '{{ item.favorites_count }}',
        views: '{{ item.views }}',
        type: '{{ item.type|upper }}',
        thumbnail: '{{ MEDIA_URL }}{{ item.image.name }}',
        favorited: '{{ item.favorited }}' === 'True',
        created: '{{ item.created|date:"U" }}',
        tags: {% if item.filtered_tags %}["{{ item.filtered_tags|join:'","' }}"]{% else %}[]{% endif %},
        description: {% if item.description %}'<div>{{ item.description|escapejs|safe }}</div>'{% else %}''{% endif %},
        stars: '{{ item.rating }}',
        review_count: {{ item.review_count }},
        objectives: {% if item.objectives %}["{{ item.objectives|join:'","' }}"]{% else %}[]{% endif %},
        category: '{{ item.category.title }}'
    };
    OC.categoryResources.rawResources.push(resource);
    {% else %}
    var collection = {
        id: '{{ item.id }}',
        url: '{% url user:list_collection username=item.creator.username collection_slug=item.slug %}',
        remote: false,
        title: '{{ item.title }}',
        user: '{{ item.creator }}',
        user_id: '{{ item.creator.id }}',
        user_thumbnail: '{{ MEDIA_URL }}{{ item.creator.get_profile.profile_pic.name }}',
        user_url: '{% url user:user_profile username=item.creator.username %}',
        favorites: '{{ item.favorites_count }}',
        views: null,
        type: '{{ item.type|upper }}',
        thumbnail: '{{ STATIC_URL }}images/folder-large.png',
        favorited: '{{ item.favorited }}' === 'True',
        created: '{{ item.created|date:"U" }}',
        tags: [],
        description: {% if item.description %}'<div>{{ item.description|escapejs|safe }}</div>'{% else %}''{% endif %},
        stars: '{{ item.rating }}',
        review_count: {{ item.review_count }},
        objectives: [],
        category: '{{ item.category.title }}'
    };
    OC.categoryResources.rawResources.push(collection);
    {% endif %}
{% empty %}
{% endfor %}
{% endif %}

{% if not query and query != '' and category_group %}
    OC.categoryResources.requestURL = '{% url projects:project_home project_slug=category_group.slug %}?post=new&category=requests&redirect_to={{ selected_category.url }}';
    {% for request in requests %}
    var newRequest = {
        url: '{% url projects:project_discussion project_slug=request.project_slug discussion_id=request.id %}',
        body: '{{ request.body|safe|escapejs }}',
        user: '{{ request.user_name }}',
        user_thumbnail: '{{ MEDIA_URL }}{{ request.user_thumbnail }}'
    };
    OC.categoryResources.rawRequests.push(newRequest);

    {% endfor %}
{% endif %}

require(['browse']);
