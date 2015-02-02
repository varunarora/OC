from planner.models import Event, Class
from oc_platform import APIUtilities

def events(request, user_id, zone, from_date=None):
    import datetime
    import dateutil.parser

    a_month = datetime.timedelta(days=31)
    a_week = datetime.timedelta(days=7)

    from django.utils import timezone
    #now = datetime.datetime.now()
    now = timezone.now()

    import pytz
    zone = pytz.timezone(zone)

    #if from_date:
    #    now = dateutil.parser.parse(from_date)
    #    after_one_month = a_month + now

    #    events = Event.objects.filter(user=request.user, start__range=(now, after_one_month)).order_by('start')

    #else:
    a_month_ago = now - a_month
    after_one_month = now + a_month

    events = Event.objects.filter(user_id=user_id, start__range=(a_month_ago, after_one_month)).order_by('start')

    # Get units from curricula.
    from curriculum.models import Curriculum
    curricula = Curriculum.objects.filter(user_id=user_id)

    serialized_events = {}
    for curriculum in curricula:
        for unit in curriculum.units.all():
            if unit.period:
                if 'from' in unit.period and 'to' in unit.period:
                    unit_from = dateutil.parser.parse(unit.period['from']).replace(tzinfo=zone)
                    unit_to = dateutil.parser.parse(unit.period['to']).replace(tzinfo=zone)

                    if (from_date and (unit_from > from_date and unit_from < from_date + a_week)) or (
                        unit_from > now - a_month and unit_from < now + a_month):

                        serialized_unit = {
                            'title': unit.title,
                            'start': unit_from.isoformat(),
                            'end': unit_to.isoformat(),
                            'curriculum': curriculum.title,
                            'all_day': True
                        }

                        date = unit_from.strftime('%Y-%m-%d')
                        if date in serialized_events:
                            serialized_events[date].append(serialized_unit)
                        else:
                            serialized_events[date] = [serialized_unit]

    for event in events:
        serialized_event = _serialize_event(event)

        date = event.start.astimezone(zone).strftime('%Y-%m-%d')
        if date in serialized_events:
            serialized_events[date].append(serialized_event)
        else:
            serialized_events[date] = [serialized_event]

    return APIUtilities.success(serialized_events)


def events_around(request, around_date):
    import datetime
    import dateutil.parser
    around = dateutil.parser.parse(around_date)

    a_month = datetime.timedelta(days=31)
    a_month_ago = around - a_month
    after_one_month = around + a_month

    from django.utils import timezone
    now = timezone.now()

    if (now > around):
        events = Event.objects.filter(user=request.user, start__range=(
            a_month_ago, around)).order_by('start')
    else:
        events = Event.objects.filter(user=request.user, start__range=(
            around, after_one_month)).order_by('start')

    serialized_events = {}
    for event in events:
        serialized_event = _serialize_event(event)

        date = event.start.strftime('%Y-%m-%d')
        if date in serialized_events:
            serialized_events[date].append(serialized_event)
        else:
            serialized_events[date] = [serialized_event]

    return APIUtilities.success(serialized_events)


def event_after(request, event_id):
    try:
        event = Event.objects.get(pk=event_id)
    except:
        return APIUtilities._api_not_found()
    
    if event.class_link:
        from django.db.models import Min

        closest_future_events = Event.objects.filter(
            class_link=event.class_link, start__gt=event.end)

        closest_future_event = closest_future_events.get(
            start=closest_future_events.aggregate(Min('start'))['start__min'])

        return APIUtilities.success(_serialize_event(closest_future_event))
    else:
        return APIUtilities.success(None)


def event_before(request, event_id):
    try:
        event = Event.objects.get(pk=event_id)
    except:
        return APIUtilities._api_not_found()
    
    if event.class_link:
        from django.db.models import Max

        closest_previous_events = Event.objects.filter(
            class_link=event.class_link, end__lt=event.start)

        closest_previous_event = closest_previous_events.get(
            end=closest_previous_events.aggregate(Max('end'))['end__max'])

        return APIUtilities.success(_serialize_event(closest_previous_event))
    else:
        return APIUtilities.success(None)


def _serialize_event(event):
    return {
        'id': event.id,
        'start': event.start.isoformat(),
        'end': event.end.isoformat(),
        'title': event.title,
        'all_day': event.all_day,
        'palette': event.class_link.palette if event.class_link else None,
        'class_link': {
            'id': event.class_link.id,
            'title': event.class_link.title
        } if event.class_link else None
    }


def daily(request, date):
    import dateutil.parser

    now = dateutil.parser.parse(date)
    return _get_daily_events(request, date, now)


def daily_zone(request, date, zone):
    import pytz
    tz = pytz.timezone(zone)

    import dateutil.parser
    now = tz.localize(dateutil.parser.parse(date).replace(
        tzinfo=None, hour=0, minute=0, second=0))

    return _get_daily_events(request, date, now)


def _get_daily_events(request, date, now):
    from django.core.urlresolvers import reverse

    import datetime
    end = now + datetime.timedelta(days=1)

    events = Event.objects.filter(
        user=request.user,
        
        start__gte=now,
        end__lte=end,
    ).order_by('start')

    serialized_events = []
    for event in events:
        serialized_event = {
            'id': event.id,
            'start': event.start.isoformat(),
            'end': event.end.isoformat(),
            'date': date,
            'title': event.title,
            'all_day': event.all_day,
            'url': reverse(
                'planner:event', kwargs={
                    'event_id': event.id,
                }
            )
        }
        serialized_events.append(serialized_event)

    return APIUtilities.success(serialized_events)


def event(request, event_id):
    from django.http import Http404
    from django.shortcuts import render

    try:
        event = Event.objects.get(pk=event_id)
    except:
        return Http404
    
    context = {
        'title': event.title
    }

    return render(request, 'event.html', context)


def event_body(request, event_id):
    try:
        event = Event.objects.get(pk=event_id)
    except:
        return APIUtilities._api_not_found()
    
    serialized_contexts = {}

    # For all items associated with this event, place into context.
    for item in event.items.all():
        from curriculum.models import Section, Unit
        section = Section.objects.get(items=item)

        serialized_item = {
            'id': item.id,
            'description': item.description
        }

        if section.id in serialized_contexts:
            serialized_contexts[section.id].items.append(serialized_item)
        else:
            serialized_contexts[section.id] = {
                'id': section.id,
                'title': section.title,
                'unitTitle': Unit.objects.get(sections=section).title,
                'items': [serialized_item]
            }

    context = {
        'contexts': serialized_contexts if len(serialized_contexts.keys()) > 0 else None,
        'notes': event.description if (event.description and len(event.description) > 0) else None
    }

    return APIUtilities.success(context)


def add_item_to_event(request):
    section_item_id = request.POST.get('item_id')
    event_id = request.POST.get('event_id')

    try:
        from curriculum.models import SectionItem
        section_item = SectionItem.objects.get(pk=section_item_id)
        event = Event.objects.get(pk=event_id)
    except:
        return APIUtilities._api_not_found()

    event.items.add(section_item)

    return APIUtilities.success()


def remove_item_from_event(request):
    section_item_id = request.POST.get('item_id')
    event_id = request.POST.get('event_id')

    try:
        from curriculum.models import SectionItem
        section_item = SectionItem.objects.get(pk=section_item_id)
        event = Event.objects.get(pk=event_id)
    except:
        return APIUtilities._api_not_found()

    event.items.remove(section_item)

    return APIUtilities.success()


def save_class(request):
    class_id = request.POST.get('id')
    title = request.POST.get('title')
    palette = request.POST.get('palette')
    #schedule = request.POST.get('schedule')
    from_date = request.POST.get('from')
    to_date = request.POST.get('to')

    try:
        class_to_save = Class.objects.get(pk=class_id)
    except:
        class_to_save = Class(user=request.user)

    class_to_save.title = title
    class_to_save.palette = palette

    schedule = {}
    import re

    for post_key, post_value in request.POST.items():
        if 'schedule' in post_key:
            # Loop through the json objects.
            match = re.match('schedule\[(?P<day>.+)\]\[(?P<period>\d+)\]\[(?P<ft>from|to)\]', post_key)
            
            day = match.group('day')
            period = int(match.group('period'))
            from_to = match.group('ft')

            if day not in schedule:
                schedule[day] = []

            try:
                schedule[day][period][from_to] = post_value
            except:
                try:
                    schedule[day][period] = { from_to: post_value }
                except IndexError:
                    # Calculate the difference between period and length of existing schedule.
                    diff = period - len(schedule[day]) + 1

                    for _ in range(diff):
                        schedule[day].append({})

                    schedule[day][period] = { from_to: post_value }

    class_to_save.schedule = schedule

    import pytz
    zone = pytz.timezone(request.POST.get('zone'))

    # Create events for the duration of the class.
    import dateutil.parser
    from_datetime = dateutil.parser.parse(from_date).replace(tzinfo=zone, hour=0, minute=0)
    to_datetime = dateutil.parser.parse(to_date).replace(tzinfo=zone, hour=23, minute=59)

    class_to_save.start = from_datetime
    class_to_save.end = to_datetime
    class_to_save.save()

    events = []
    event_schedule = {}

    import datetime
    from django.utils import timezone

    # Loop through every day listed on the class schedule.
    for day, day_schedule in schedule.items():
        # For every class period, create a from and to datetime
        event_day_schedule = []
        for period in day_schedule:
            event_period = {}

            now = timezone.now()

            from_match = re.match('(?P<hour>\d+):(?P<minutes>\d+)(?P<ampm>am|pm)', period['from'])
            from_hour =  int(from_match.group('hour'))
            from_minutes = int(from_match.group('minutes'))
            from_ampm = from_match.group('ampm')
            
            event_period['from'] = now.replace(
                hour=(from_hour if (from_ampm == 'am' or from_hour == 12) else from_hour + 12),
                minute=from_minutes)

            to_match = re.match('(?P<hour>\d+):(?P<minutes>\d+)(?P<ampm>am|pm)', period['to'])
            to_hour =  int(to_match.group('hour'))
            to_minutes = int(to_match.group('minutes'))
            to_ampm = to_match.group('ampm')
            
            event_period['to'] = now.replace(
                hour=(to_hour if (to_ampm == 'am' or to_hour == 12) else to_hour + 12),
                minute=to_minutes)

            event_day_schedule.append(event_period)

        event_schedule[day] = event_day_schedule

    duration = (to_datetime - from_datetime) + datetime.timedelta(days=1)

    import math
    num_weeks = int(math.ceil(float(duration.days) / 7))

    a_week = datetime.timedelta(days=7)

    days_of_weeks = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    # Loop through every week between the start and end date.
    for _ in range(num_weeks):
        start_date = from_datetime + (_ * a_week)
        #end_date = from_datetime + ((_+1) * a_week)

        # Loop through every day listed on the class schedule.
        for day, day_schedule in event_schedule.items():
            day_of_week = days_of_weeks.index(day)
            diff = start_date.weekday() - day_of_week

            # For every class period, create an event.
            for period in day_schedule:
                start = (start_date - datetime.timedelta(days=diff)).replace(
                    hour=period['from'].hour, minute=period['from'].minute)
                end = (start_date - datetime.timedelta(days=diff)).replace(
                    hour=period['to'].hour, minute=period['to'].minute)

                if start > from_datetime and end < to_datetime:
                    events.append(
                        Event(title=title, class_link=class_to_save,
                            start=start, end=end, user=request.user)
                    )

    Event.objects.bulk_create(events)

    return APIUtilities.success({'id': class_to_save.id })


def save_event(request):
    event_id = request.POST.get('id')
    title = request.POST.get('title')
    from_date = request.POST.get('from_date')
    from_time = request.POST.get('from_time')
    to_date = request.POST.get('to_date')
    to_time = request.POST.get('to_time')
    class_id = request.POST.get('class')
    notes = request.POST.get('notes')

    try:
        event_to_save = Event.objects.get(pk=event_id)
    except:
        event_to_save = Event(user=request.user)

    event_to_save.title = title
    event_to_save.description = notes

    try:
        class_link = Class.objects.get(pk=class_id)
        event_to_save.class_link = class_link
    except:
        if class_id == 'none':
            event_to_save.class_link = None
        else:
            pass

    import dateutil.parser
    import re

    import pytz
    zone = pytz.timezone(request.POST.get('zone'))

    raw_from_date = dateutil.parser.parse(from_date)
    raw_to_date = dateutil.parser.parse(to_date)
    
    raw_from_date = zone.localize(raw_from_date)
    raw_to_date = zone.localize(raw_to_date)

    from_time_match = re.match('(?P<hour>\d+):(?P<minute>\d+)(?P<ampm>am|pm)', from_time)
    from_hour = int(from_time_match.group('hour'))
    from_datetime = raw_from_date.replace(
        hour=(from_hour if (from_time_match.group('ampm') == 'am' or from_hour == 12) else from_hour + 12),
        minute=int(from_time_match.group('minute'))
    )

    to_time_match = re.match('(?P<hour>\d+):(?P<minute>\d+)(?P<ampm>am|pm)', to_time)
    to_hour = int(to_time_match.group('hour'))
    to_datetime = raw_to_date.replace(
        hour=(to_hour if (to_time_match.group('ampm') == 'am' or to_hour == 12) else to_hour + 12),
        minute=int(to_time_match.group('minute'))
    )

    event_to_save.start = from_datetime
    event_to_save.end = to_datetime
    event_to_save.save()

    return APIUtilities.success({
        'id': event_to_save.id,
        'start': from_datetime.isoformat(),
        'end': to_datetime.isoformat()
    })


def delete_event(request, event_id):
    try:
        event = Event.objects.get(pk=event_id)
    except:
        return APIUtilities._api_not_found()

    if request.user != event.user:
        return APIUtilities._api_unauthorized_failure()

    event.delete()
    return APIUtilities.success()


def delete_class(request, class_id):
    try:
        class_to_delete = Class.objects.get(pk=class_id)
    except:
        return APIUtilities._api_not_found()

    if request.user != class_to_delete.user:
        return APIUtilities._api_unauthorized_failure()

    # Deep delete all events with this class link.
    events = Event.objects.filter(class_link=class_to_delete)
    for event in events:
        event.delete()

    class_to_delete.delete()
    return APIUtilities.success()
