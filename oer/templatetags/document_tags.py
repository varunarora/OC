from django import template

register = template.Library()

@register.filter(is_safe=True)
def dictsortbykey(value):
    try:
        sorted_dict = {}
        sorted_dict_tuples = sorted(value.items())
        for (key, value) in sorted_dict_tuples:
            sorted_dict[int(key)] = value
        return sorted_dict
    except Exception, e:
        return e
