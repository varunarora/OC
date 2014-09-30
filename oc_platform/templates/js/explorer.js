OC.explorer = {
    rawTexts: []
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
                    'title': '{{ resource.title|safe|escapejs }}'
                });
            {% endfor %}

            rawObjective = {
                id: {{ objective.id }},
                description: '{{ objective.description }}',
                unit_id: {{ unit.id }},
                resources: rawUnitObjectiveResources
            };

            rawObjective['issue'] = {
                id: {% if objective.issue %}{{ objective.issue.id }}{% else %}null{% endif %},
                host_id: {% if objective.issue %}{{ objective.issue.host_id }}{% else %}null{% endif %},
                message: {% if objective.issue %}'{{ objective.issue.message }}'{% else %}null{% endif %}
            }

            rawUnitObjectives.push(rawObjective);
        {% endfor %}

        rawUnit = {
            id: {{ unit.id }},
            title: '{{ unit.title }}',
            objectives: rawUnitObjectives
        };

        rawText.push(rawUnit);

    {% endfor %}

OC.explorer.rawTexts.push({
    thumbnail: '{{ text.thumbnail }}',
    title: '{{ text.title }}',
    units: rawText,
});
{% endfor %}

require(['explorer']);