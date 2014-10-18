OC.explorer = {
    rawTexts: [],
    settings: {}
};

var rawText, rawUnit, rawUnitObjectives, rawObjective;

{% for text in serialized_textbooks %}
rawText = [];
    {% for unit in text.units %}
        
        rawUnitObjectives = [];
        {% for objective in unit.objectives %}
            rawUnitObjectiveResources = [];

            {% for resource in objective.resources %}
                rawUnitObjectiveResources.push({
                    'id': {{ resource.id }},
                    'url': '{{ resource.url }}',
                    'title': '{{ resource.title|safe|escapejs }}',
                    'thumbnail': '{{ resource.thumbnail }}'
                });
            {% endfor %}

            rawObjective = {
                id: {{ objective.id }},
                description: '{{ objective.description|safe|escapejs }}',
                unit_id: {{ unit.id }},
                resources: rawUnitObjectiveResources,
                selected: false
            };

            rawObjective['issue'] = {
                id: {% if objective.issue %}{{ objective.issue.id }}{% else %}null{% endif %},
                host_id: {% if objective.issue %}{{ objective.issue.host_id }}{% else %}null{% endif %},
                message: {% if objective.issue %}'{{ objective.issue.message }}'{% else %}null{% endif %}
            };

            rawObjective['meta'] = {};
            {% if objective.meta %}
            {% for meta_key, meta_value in objective.meta.items %}
            rawObjective['meta']['{{ meta_key }}'] = '{{ meta_value }}';
            {% endfor %}
            {% endif %}


            rawUnitObjectives.push(rawObjective);
        {% endfor %}

        rawUnit = {
            id: {{ unit.id }},
            title: '{{ unit.title|safe|escapejs }}',
            objectives: rawUnitObjectives,
            {% if unit.period %}
            period: {
                type: '{{ unit.period.type }}',
                unit: '{{ unit.period.unit }}',
                begin: {{ unit.period.begin }},
                end: {{ unit.period.end }}
            }
            {% else %}
            period: null
            {% endif %}
        };

        rawText.push(rawUnit);

    {% endfor %}

OC.explorer.rawTexts.push({
    thumbnail: '{{ text.thumbnail }}',
    title: '{{ text.title }}',
    units: rawText,
});
{% endfor %}

OC.explorer.curriculumSettings = {
    periods: {
        title: '{{ curriculum.settings.periods.title }}',
        data: []
    },
    description: '{{ curriculum.description|safe|escapejs }}',
    id: {{ curriculum.id }},
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