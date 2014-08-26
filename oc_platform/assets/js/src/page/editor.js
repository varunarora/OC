define(['ckeditor', 'ckeditor_jquery', 'ckeditor_config', 'ckeditor_styles', 'editor'], function(){
    CKEDITOR.config.contentsCss =  staticURL + 'css/ckeditor/contents.css';
    CKEDITOR.config.skin = 'moono,' + staticURL + 'css/ckeditor/skins/moono_docs/';

    require(['jquery', 'dropzone', 'editor'], function($, Dropzone){

        $(document).ready(function(){
            $('.image-upload-dialog .upload-drag-drop').dropzone({
                url: '/api/image-upload/',
                createImageThumbnails: false
                /*previewTemplate: '<div class="dz-preview">' +
                    '<img data-dz-thumbnail /><input type="text" data-dz-name />' +
                    '<div class="dz-upload" data-dz-uploadprogress></div></div>' +
                    '<div data-dz-errormessage></div>',*/
            });
            if ($('.image-upload-dialog .upload-drag-drop').length > 0){
                Dropzone.forElement('.image-upload-dialog .upload-drag-drop').on('sending', OC.editor.attachUserID);
                Dropzone.forElement('.image-upload-dialog .upload-drag-drop').on("sending", OC.attachCSRFToken);
            }

            $('.upload-widget-dialog .upload-drag-drop').dropzone({
                url: '/api/file-upload/',
                createImageThumbnails: false,
                maxFilesize: 5
            });

            if ($('.editor-frame').length > 0) OC.editor.init();

            OC.editor.initImageUploaderTabs();

            if ($('.upload-widget-dialog .upload-drag-drop').length > 0){
                // Setup up Dropzone.
                Dropzone.forElement('.upload-widget-dialog .upload-drag-drop').on('sending', OC.editor.attachUserID);

                // TODO(Varun): Move this to a common place to a context agnostic upload lib
                Dropzone.forElement('.upload-widget-dialog .upload-drag-drop').on("sending", OC.attachCSRFToken);
            }

            $('.tagit').tagit({
                allowSpaces: true
            });

            $('span.delete-objective').click(OC.editor.objectiveDeleteHandler);

            OC.editor.initDropMenus();

            OC.editor.initEditUnit();

            window.onbeforeunload = function(event) {
                return 'If you quit, you will loose all your work. Would you still like to leave?';
            };

            // Initialize document meta collapser.
            //OC.editor.initDocumentMetaCollapser();

            // Initialize the JS on widgets on page from load, such as in the case of edit.
            //OC.editor.initExistingWidgets();

            /*
            $('#new-resource-document-form #submission-buttons button').click(function(event){
                // Serialize the widgets on the page.
                var documentElements = $('.document-body .document-element');

                // TODO(Varun): Add some spinner into the button as we serialize.

                var serializedElements = [];
                var j, k, l, m, rows, currentRow, currentRowCells, element;
                for (j = 0; j < documentElements.length; j++){
                    element = {};

                    var documentElement = $(documentElements[j]);
                    if (documentElement.hasClass('document-table')){
                        element.type = 'table';

                        rows = $('tr', documentElement);
                        cols = $('col', documentElement);

                        element['data'] = {};
                        element.data.rowsCount = rows.length;
                        element.data.colsCount = cols.length;
                        element.data.colWidths = [];

                        for (k = 0; k < cols.length; k++){
                            var colWidthPercent = ($(
                                cols[k]).width() / $(documentElement).width()) * 100;
                            element.data.colWidths.push(colWidthPercent.toFixed(2));
                        }

                        element.data['rows'] = {};
                        for (l = 0; l < rows.length - 1; l++){
                            currentRow = $(rows[l]);
                            currentRowCells = currentRow.children();

                            element.data.rows[l] = {};
                            for (m = 0; m < currentRowCells.length; m++){
                                element.data.rows[l][m] = $(currentRowCells[m]).html();
                            }
                        }
                    } else if (documentElement.hasClass('document-textblock')){
                        element.type = 'textblock';
                        element.data = $('textarea', documentElement).val();
                    }

                    serializedElements.push(element);
                }

                // Add all element JSONs into strings.
                var newDocumentForm = $('#new-resource-document-form');

                var serializedDocumentBody = $('<textarea/>', {
                    'text': JSON.stringify(serializedElements),
                    'name': 'serialized-document-body'
                });
                
                newDocumentForm.append(serializedDocumentBody);

                newDocumentForm.submit();

                event.stopPropagation();
                event.preventDefault();
                return false;
            });
            */

            $('#new-resource-document-form .editor-button-wrapper .save-button').click(function(event){
                window.onbeforeunload = null;

                // Add all element JSONs into strings.
                OC.editor.serializeDocument();
                $('#new-resource-document-form').submit();

                event.stopPropagation();
                event.preventDefault();
                return false;
            });

        });


    });
});