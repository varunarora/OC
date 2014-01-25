CKEDITOR.plugins.add('internallink', {
    icons: 'internallink,internalunlink',
    init: function(editor) {
        /* Command for inserting link */
        editor.addCommand( 'insertLink', {
            allowedContent: 'a[href]',
            exec: function(editor) {

                function hyperlinkWord(url, text){
                    var selection = editor.getSelection(),
                        urlToInsert;

                    var currentURLSelection = getSelectedLink(editor);

                    if (currentURLSelection){
                        if (url === currentURLSelection.getAttribute('href'))
                            return;
                        else {
                            currentURLSelection.setAttribute('href', url);
                        }
                    } else {
                        if (text){
                            urlToInsert = $('<a/>', {
                                'href': url,
                                'text': text
                            });
                        } else {
                            urlToInsert = $('<a/>', {
                                'href': url,
                                'text': selection.getSelectedText()
                            });
                        }
                        var element = CKEDITOR.dom.element.createFromHtml(
                            urlToInsert.get(0).outerHTML);
                        editor.insertElement(element);
                    }
                }

                // If there is something currently selected.
                var currentURLSelection = getSelectedLink(editor);

                if (!currentURLSelection){
                    currentSelection = editor.getSelection().getSelectedText();
                }

                if (currentURLSelection){
                    OC.editor.addInlineLinkPopout(
                        hyperlinkWord,
                        currentURLSelection.getText(),
                        currentURLSelection.getAttribute('href')
                    );
                } else if (currentSelection){
                    OC.editor.addInlineLinkPopout(hyperlinkWord, currentSelection, null);
                } else
                    OC.editor.addInlineLinkPopout(hyperlinkWord, null, null);
            }
        });

        /* Listener for selection change to enable/disable unlink */
        editor.on( 'selectionChange', function(event){
            if (editor.readOnly)
                return;

            var command = editor.commands.removeLink,
                element = event.data.path.lastElement && event.data.path.lastElement.getAscendant( 'a', true );

            if (element && element.getName() == 'a' && element.getAttribute('href') && element.getChildCount() )
                command.setState(CKEDITOR.TRISTATE_OFF);
            else
                command.setState(CKEDITOR.TRISTATE_DISABLED);
        });
        
        /* Command for removing link */
        editor.addCommand( 'removeLink', {
            allowedContent: 'span',
            exec: function(editor) {
                var url = getSelectedLink(editor);
                var element = CKEDITOR.dom.element.createFromHtml(
                    '<span>' + url.getText() + '</span>');
                element.replace(url);
            },
            startDisabled : true
        });

        /* Buttons for the defined commands */
        editor.ui.addButton( 'InternalLink', {
            label: 'Insert link',
            command: 'insertLink',
            toolbar: 'insert'
        });
        editor.ui.addButton( 'InternalUnlink', {
            label: 'Remove link',
            command: 'removeLink',
            toolbar: 'insert'
        });

        /**
         *  Get the surrounding link element of current selection.
         * @param editor
         * @example CKEDITOR.plugins.link.getSelectedLink( editor );
         * @since 3.2.1
         * The following selection will all return the link element.
         *   <pre>
         *  <a href="#">li^nk</a>
         *  <a href="#">[link]</a>
         *  text[<a href="#">link]</a>
         *  <a href="#">li[nk</a>]
         *  [<b><a href="#">li]nk</a></b>]
         *  [<a href="#"><b>li]nk</b></a>
         * </pre>*/
         
        function getSelectedLink(editor){
            try {
                var selection = editor.getSelection();
                if ( selection.getType() == CKEDITOR.SELECTION_ELEMENT )
                {
                    var selectedElement = selection.getSelectedElement();
                    if ( selectedElement.is( 'a' ) )
                        return selectedElement;
                }

                var range = selection.getRanges( true )[ 0 ];
                // Descrease the range to make sure that boundaries always anchor beside text nodes or innermost element.
                range.shrink( CKEDITOR.SHRINK_TEXT );
                var root = range.getCommonAncestor();
                return root.getAscendant( 'a', true );
            }
            catch(e) { return null; }
        }

    }
});
