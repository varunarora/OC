OC.explorer = {
    rawTexts: [],
    settings: {}
};

var rawText, rawUnit, rawUnitObjectives, rawObjective;

OC.explorer.curriculumSettings = {
    periods: {
        title: '{{ curriculum.settings.periods.title }}',
        data: []
    },
    description: '{{ curriculum.description|safe|escapejs }}',
    id: {{ curriculum.id }},
    isOwner: {% if is_owner %}true{% else %}false{% endif %},
    menu: []
};

{% for period_data in curriculum.settings.periods.data %}
OC.explorer.curriculumSettings.periods.data.push({
    title: '{{ period_data.title }}',
    caption: '{{ period_data.caption }}'
});
{% endfor %}

{% for menu_item in curriculum.settings.menu %}
OC.explorer.curriculumSettings.menu.push({
    title: '{{ menu_item.title }}',
    organization: '{{ menu_item.organization }}'
});
{% endfor %}

require(['explorer']);