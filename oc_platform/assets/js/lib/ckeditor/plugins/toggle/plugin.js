CKEDITOR.plugins.add('toggle', {
    requires: 'widget',
    icons: 'toggle',
    init: function(editor){
        editor.widgets.add('toggle', {
            allowedContent: 'div(!toggle-content); ' +
                'div(!toggle-content-title-wrapper); div(!toggle-content-title); ' +
                'div(!toggle-content-body);',
            upcast: function(element) {
                return element.name == 'div' && (
                    element.hasClass('toggle-content')
                );
            },
            editables: {
                title: {
                    selector: '.toggle-content-title'
                },
                body: {
                    selector: '.toggle-content-body'
                }
            }
        });

        /* Command for inserting a custom image */
        editor.addCommand( 'toggleContent', {
            allowedContent: 'div(!toggle-content); ' +
                'div(!toggle-content-title-wrapper); div(!toggle-content-title); ' +
                'div(!toggle-content-body);',
            exec: function(editor) {
                var wrapper = $('<div/>', {'class': 'toggle-content'}),
                    titleWrapper = $('<div/>', {'class': 'toggle-content-title-wrapper open'}),
                    title = $('<div/>', {
                        'class': 'toggle-content-title',
                        'text': '(untitled toggle title)'
                    }),
                    body = $('<div/>', {'class': 'toggle-content-body'});

                titleWrapper.append(title);
                wrapper.append(titleWrapper);
                wrapper.append(body);

                editor.insertHtml(wrapper.get(0).outerHTML);

                var parentElement = $(editor.getSelection().getStartElement().$);
                $('.toggle-content-title', parentElement).click(function(event){
                    event.stopPropagation();
                    event.preventDefault();
                    return false;
                });
                $('.toggle-content-title-wrapper', parentElement).click(OC.togglerClickHandler);
            },
        });

        editor.ui.addButton( 'Toggle', {
            label: 'Toggle hide or show content',
            command: 'toggleContent',
            toolbar: 'insert'
        });
    }
});
