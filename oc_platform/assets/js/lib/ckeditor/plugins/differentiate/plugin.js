CKEDITOR.plugins.add('differentiate', {
    requires: 'widget',
    icons: 'differentiate',
    init: function(editor){
        editor.widgets.add('differentiation', {
            allowedContent: 'div(!differentiation-tabs-wrapper); ' +
                'nav(!differentiation-tabs); ul(!differentiation-tabs-list); ' +
                'a(!differentiation-tabs-list-item); li(!differentiation-tab); ' +
                'a(!differentiation-tab); div(!oc-tabs-content); ' +
                'div(!oc-tabs-content-body); ',
            upcast: function(element) {
                return element.name == 'div' && (
                    element.hasClass('differentiation-tabs-wrapper')
                );
            },
            editables: {
                tabLink: {
                    selector: '.differentiation-tabs-list-item-1'
                },
                tabBody: {
                    selector: '.oc-tabs-content-body'
                },
                tabBody2: {
                    selector: '.oc-tabs-content-body-2'
                },
                tabBody3: { selector: '.oc-tabs-content-body-3' },
                tabBody4: { selector: '.oc-tabs-content-body-4' },
                tabBody5: { selector: '.oc-tabs-content-body-5' },
                tabBody6: { selector: '.oc-tabs-content-body-6' },
                tabBody7: { selector: '.oc-tabs-content-body-7' },
                tabBody8: { selector: '.oc-tabs-content-body-8' },
            }
        });

        /* Command for inserting a custom image */
        editor.addCommand( 'insertDifferentiation', {
            allowedContent: 'div(!differentiation-tabs-wrapper); ' +
                'nav(!differentiation-tabs); ul(!differentiation-tabs-list); ' +
                'a(!differentiation-tabs-list-item); li(!differentiation-tab); ' +
                'a(!differentiation-tab); div(!oc-tabs-content); ' +
                'div(!oc-tabs-content-body); ',
            startDisabled : true,
            exec: function(editor) {
                // Create a tabbed-HTML template with two tabs.

                // Create navigation & content.
                var tabWrapper = $('<div/>', {'class': 'differentiation-tabs-wrapper'}),
                    navigation = $('<nav/>', {'class': 'differentiation-tabs'}),
                    list = $('<ul/>',  {'class': 'differentiation-tabs-list'}),
                    allStudentsTab = $('<li/>', {
                        'class': 'all-students differentiation-tab'}),
                    allStudentLink = $('<a/>', {
                        'href': '.all-students-content',
                        'text': 'All students',
                        'class': 'differentiation-tabs-list-item'
                    }),

                    newTab = $('<li/>', {'class': 'new-differentiation differentiation-tab'}),
                    newLink = $('<a/>', {
                        'href': '.new-differentiation-content',
                        'class': 'differentiation-tabs-list-item differentiation-tabs-list-item-1',
                        'html': '&nbsp;'
                    }),

                    addTab = $('<li/>', {'class': 'add-differentiation differentiation-tab'}),
                    addLink = $('<a/>', {
                        'href': '.add-differentiation-content',
                        'class': 'differentiation-tabs-list-item',
                        'html': '&nbsp;'
                    }),

                    contentWrapper = $('<div/>', {
                        'class': 'differentiation-content oc-tabs-content'}),
                    allStudentsContent = $('<div/>', {
                        'class': 'all-students-content oc-tabs-content-body',

                        // Get the current selection of text and place in tab 1.
                        'html': editor.getSelection().getSelectedText()
                    }),

                    newContent = $('<div/>', {
                        'class': 'new-differentiation-content oc-tabs-content-body oc-tabs-content-body-2',
                        'html': editor.getSelection().getSelectedText()
                    }),
                    addContent = $('<div/>', {
                        'class': 'add-differentiation-content oc-tabs-content-body oc-tabs-content-body-3',
                        'html': '&nbsp;'
                    });

                // Now assemble it.
                allStudentsTab.append(allStudentLink);
                list.append(allStudentsTab);

                newTab.append(newLink);
                list.append(newTab);

                addTab.append(addLink);
                list.append(addTab);

                navigation.append(list);

                contentWrapper.append(allStudentsContent);
                contentWrapper.append(newContent);
                contentWrapper.append(addContent);

                // Now put the navigation and content in a wrapper.
                tabWrapper.append(navigation);
                tabWrapper.append(contentWrapper);

                editor.insertHtml(tabWrapper.get(0).outerHTML);
                OC.tabs('.differentiation-tabs-wrapper', {tab: 1});

                var newTabEditable = $(editor.getSelection().getStartElement().$).find(
                    'a[href=".new-differentiation-content"]');

                function dismisser(dismissCallback){
                    dismissCallback();
                }
                // Set dismiss handler callback
                OC.tip(newTabEditable, {
                    title: 'Enter a learner type',
                    gravity: 's',
                    description: 'A learner type for differentiation including the lesson note',
                    dismisser: dismisser
                });

                // Destroy parent widget.
                var widget = $(editor.getSelection().getStartElement().$).parents(
                    '.cke_widget_wrapper');

                if (widget.length > 0){
                    var widgetID = parseInt(widget.attr('data-cke-widget-id'), 10);
                    editor.widgets.instances[widgetID].destroy();
                }

            },
        });

        editor.ui.addButton( 'Differentiate', {
            label: 'Differentiate instruction / practice / assessment...',
            command: 'insertDifferentiation',
            toolbar: 'insert'
        });

        /* Listener for selection change to enable/disable differentiator */
        $(editor.element.$).on('mouseup', function(event){
            if (editor.readOnly)
                    return;

            var command = editor.commands.insertDifferentiation;
            if (editor.getSelection().getSelectedText()){
                if (editor.getSelection().getSelectedText().length > 0){
                    command.setState(CKEDITOR.TRISTATE_OFF);
                } else
                    command.setState(CKEDITOR.TRISTATE_DISABLED);
            }
        });
    }
});