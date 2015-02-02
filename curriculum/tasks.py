from __future__ import absolute_import
from oc_platform.celery import app
from curriculum.models import Curriculum

@app.task
def create_item(item_id, section_id, curriculum_id):
    from curriculum.models import Section, SectionItem, Unit

    section = Section.objects.get(pk=section_id)
    section_item = SectionItem.objects.get(pk=item_id)
    curriculum = Curriculum.objects.get(pk=curriculum_id)

    # Determine the unit that has this section.
    unit = Unit.objects.get(sections=section)

    # Determine the item before the new item created.
    try:
        before = section.items.get(position=section_item.position - 1)
    except:
        before = 0

    # Build path for change.
    path = {
        'type': 'unit',
        'id': unit.id,
        'child': {
            'type': 'section',
            'id': section.id,
            'child': {
                'type': 'item',
                'before': before
            }
        }
    }

    from curriculum.models import Change
    Change.new_change.send(
        sender='Curriculum', action="add", context=section, target=section_item,
        curriculum=curriculum, path=path)

    # Add as new sync link. (TODO in accept)

@app.task
def push_changes(now, curriculum_id=None):
    from curriculum.models import Change

    states = ['pending']
    if curriculum_id:
        states.append('pause')

    changes = Change.objects.filter(state__in=states)

    if curriculum_id:
        curricula = Curriculum.objects.filter(pk=curriculum_id)
    else:
        # Check against the sync status of each curriculum which has pending
        #     changes.
        curricula = []
        for change in changes:
            if change.curriculum not in curricula:
                curricula.append(change.curriculum)

    for curriculum in curricula:
        # Find all the curricula that are forking this curricula.
        syncing_curricula = Curriculum.objects.filter(synced_to=curriculum)
        curriculum.syncers = syncing_curricula

        current_settings = curriculum.settings

        if current_settings['sync']['on']:
            current_settings['sync']['last_pushed'] = now

            curriculum.settings = current_settings
            curriculum.save()

    for change in changes:
        # Add each curriculum 'subscriber' to the change recipients.
        matching_curriculum = next(curriculum for curriculum in curricula if (
            curriculum.id == change.curriculum.id))

        for syncer in matching_curriculum.syncers:
            #change.recipients.add(syncer)

            # Add notication for each syncer user.
            from user_account.models import Notification
            from django.template.defaultfilters import slugify
            from django.core.urlresolvers import reverse

            new_notification = Notification(
                context=change,
                user=syncer.user
            )
            new_notification.url = reverse(
                'curriculum:curriculum_changes', kwargs={
                'username': syncer.user.username,
                'grade_slug': slugify(syncer.grade),
                'subject_slug': slugify(syncer.subject)
            })
            new_notification.description = "%s created changes in the original copy of this curriculum" % (
                syncer.user.get_full_name())
            new_notification.save()

    """for curriculum in curricula:
        import datetime
        curriculum.pushed = datetime.datetime.now()
        curriculum.save()"""

    # Dispatch email.
