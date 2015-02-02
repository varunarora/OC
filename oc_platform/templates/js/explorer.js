OC.curriculum = {};

var rawText, rawUnit, rawUnitObjectives, rawObjective;

OC.curriculum.settings = {
    userPicture: '{{ MEDIA_URL }}{{ curriculum.user.get_profile.profile_pic.name }}',
    periods: {
        title: '{{ curriculum.settings.periods.title }}',
        start: '{{ curriculum.settings.periods.start }}',
        end: '{{ curriculum.settings.periods.end }}',
        data: [],
        session: '{{ curriculum.settings.periods.session }}'
    },
    description: '{{ curriculum.description|safe|escapejs }}',
    id: {{ curriculum.id }},
    isOwner: {% if is_owner %}true{% else %}false{% endif %},
    menu: [],
    grade: '{{ curriculum.grade }}',
    subject: '{{ curriculum.subject }}',
    title: '{{ curriculum.title }}',
    sync: {
        on: {% if curriculum.settings.sync.on %}'true'{% else %}'false'{% endif %},
        state: '{{ curriculum.settings.sync.state }}',
        lastPushed: '{{ curriculum.settings.sync.last_pushed }}'
    },
    synced_to: {% if curriculum.synced_to %}{{ curriculum.synced_to.id }}{% else %}null{% endif %}
};

{% for period_data in curriculum.settings.periods.data %}
OC.curriculum.settings.periods.data.push({
    title: '{{ period_data.title }}',
    caption: '{{ period_data.caption }}'
});
{% endfor %}

{% for menu_item in curriculum.settings.menu %}
OC.curriculum.settings.menu.push({
    title: '{{ menu_item.title }}',
    organization: '{{ menu_item.organization }}'
});
{% endfor %}

OC.curriculum.home = '{% url user:user_curricula username=user_profile.username %}'

require(['curriculum']);