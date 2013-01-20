from django import template
from django.template.defaultfilters import stringfilter

register = template.Library()

@register.filter
@stringfilter
def stripper(value):
    return value.strip(' \t\n\r')
