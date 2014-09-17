OC.standards = {
    rawGrades: []
};

{% for subcategory in subcategories %}
    OC.standards.rawGrades.push({
        id: '{{ subcategory.id }}',
        title: '{{ subcategory.title|safe }}',
        position: {{ forloop.counter }}
    });
{% endfor %}

require(['standards']);
