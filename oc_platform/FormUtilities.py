def get_taglist(form_tags, tag_category):
    if tag_category:
        tags = convert_to_tag_array(form_tags, tag_category)
    else:
        tags = convert_to_tag_array(form_tags)

    if len(tags) == 0:
        return []
    else:
        return tags

def convert_to_tag_array(tag_array, tag_category):
    from meta.models import Tag

    tags = []

    for tag in tag_array:
        try:
            present_tag = Tag.objects.get(title=tag)
            tags.append(present_tag.id)
        except:
            # Create new tag and return it
            if tag_category:
                new_tag = Tag(title=tag, description='', category=tag_category)
            else:
                new_tag = Tag(title=tag, description='')
            new_tag.save()
            tags.append(new_tag.id)

    return tags


def _get_original_form_values(request, form_fields_to_return):
    original_form_values = {}

    form_dict = dict(request.POST.copy())

    for k, v in form_dict.iteritems():
        if k in form_fields_to_return:
            original_form_values[k] = v[0] if len(v) <= 1 else v

    return original_form_values