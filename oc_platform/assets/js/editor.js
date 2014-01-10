OC.editor = {
    myImages: [],
    imageUploadCallback: undefined,

    imageHistoryTemplate: _.template('<div class="image">' +
        '<div class="image-info">' +
        '<div class="image-title"><%= title %></div>' +
        '<div class="image-path"><%= path %></div>' +
        '</div>' +
        '<div class="image-insert-button">' +
        '<button class="btn dull-button" value="<%= path %>">Insert image</button>' +
        '</div></div>'),

    createImageUploadDialog: function(callback) {
        OC.editor.setImageUploadCallback(callback);

        // API to get a list of user images
        if (OC.editor.myImages.length === 0) {
            // Get User ID from editor
            var userID = $('.document-edit-form input[name=user]').val();

            var imageHistoryWrapper = $('.show-image-history .image-history-set');

            $.get('/api/list-user-images/' + userID, function(response){
                var i;
                for (i = 0; i < response.length; i++){
                    OC.editor.myImages.push(response[i]);
                    var newImageElement = OC.editor.imageHistoryTemplate(response[i]);
                    imageHistoryWrapper.append(newImageElement);
                }

                OC.editor.bindClickWithImageInsert(
                    $('.image-history-set .image-insert-button button'),
                    OC.editor.getImageUploadCallback()
                );
            }, 'json');

        }

        $('#image-upload').dialog({
            modal: true,
            open: false,
            width: 600,
            buttons: {
                Ok: function() {
                    $(this).dialog( "close" );
                }
            }
        });
    },

    getImageUploadCallback: function(){
        return OC.editor.imageUploadCallback;
    },

    setImageUploadCallback: function(callback){
        OC.editor.imageUploadCallback = callback;
    },

    bindClickWithImageInsert: function(button, callback){
        button.click(function(){
            callback(button.val());
            $('#image-upload').dialog('close');
        });
    },

    updateBreadcrumb: function(category_id){
        breadcrumb = $('.breadcrumbs-edit');

        // Set a spinner in absolute position inside the category box
        breadcrumbPosition = breadcrumb.position();

        bcRight = breadcrumbPosition.left + breadcrumb.outerWidth();

        if ($('#breadcrumb-spinner').length !== 1) {
            $("<div></div>", {
                id: 'breadcrumb-spinner',
                class: 'spinner',
                style: "position: absolute; top: " + (
                    breadcrumbPosition.top + 8) + "px; left: " + (
                        bcRight - 24) + "px;"
            }).appendTo('#floating-blocks');
        }

        $('#breadcrumb-spinner').fadeIn('fast');

        // Fetch the entire breadcrumb using the API        
        $.ajax({
            type: 'GET',
            url: '/api/getBreadcrumb?category_id=' + category_id,
            dataType: 'json',
            success: function(response) {
                newBreadcrumb = "";
                response.forEach(function(element){
                    newBreadcrumb += element;
                    if (element != _.last(response))
                        newBreadcrumb += "<span class=\"vertical-caret breadcrumbs-caret\"></span>";
                });
                $('.breadcrumbs-edit').html(newBreadcrumb);

                // Hide the spinner             
                $('#breadcrumb-spinner').fadeOut('fast');
            }
        });
    },

    initImageUploaderTabs: function(){
        OC.tabs('.article-image-uploader');
    },

    objectiveDeleteHandler: function(){
        // Get delete button and the block
        var deleteButton = $(this);
        var objectiveBlock = deleteButton.parents('.objective-input');

        // Remove the entire block from the DOM
        objectiveBlock.remove();
    },

    initDocumentMetaCollapser: function(){
        var documentMetaCollapser = $('.document-meta-collapser');

        OC.editor.repositionDocumentMetaCollapser(documentMetaCollapser);
        OC.editor.bindDocumentMetaCollapserClick(documentMetaCollapser);
    },

    repositionDocumentMetaCollapser: function(documentMetaCollapser){
        var articleTitle = $('#article-edit #article-title');

        documentMetaCollapser.css('left', articleTitle.position().left - 40);
        documentMetaCollapser.css('top', articleTitle.position().top + 10);
    },

    bindDocumentMetaCollapserClick: function(documentMetaCollapser){
        var itemsToCollapse = $(
            'table.document-visibility-license, .tags-drop-edit, .document-description-drop-edit');

        documentMetaCollapser.click(function(){
            if (documentMetaCollapser.hasClass('collapsed')){
                itemsToCollapse.show();
                documentMetaCollapser.removeClass('collapsed');
            } else {
                itemsToCollapse.hide();
                documentMetaCollapser.addClass('collapsed');
            }
        });

        // Temporarily collapse on page load.
        itemsToCollapse.hide();
        documentMetaCollapser.addClass('collapsed');
    },

    initExistingWidgets: function(){
        var tables =  $('.document-body .document-table');

        var i, j, k, table, columns, cells;
        for (i = 0; i < tables.length; i++){
            tableWrapper = $(tables[i]);

            // Set table ID.
            tableWrapper.find('table').attr('id', 'table-' + i);

            // Allow resize of the columns.
            tableWrapper.prepend('<div class="column-resize"></div>');
            columns = $('col', tableWrapper);
            for (j = 0; j < columns.length; j++){
                $(columns[j]).attr('id', 'column-' + i + '-' + j);
            }
            OC.editor.initTableResize(tableWrapper);

            // Add action row to the table.
            $('tr:last', tableWrapper).after(OC.editor.widgets.tableActionsRowHTML);

            // Bind table actions with event handlers.
            OC.editor.bindTableActionHandlers(tableWrapper);

            // Make all cells editable.
            cells = $('td, th', tableWrapper).not('td.table-actions-wrapper', tableWrapper);
            for (k = 0; k < cells.length; k++){
                $(cells[k]).attr('contenteditable', 'true');
            }
        }
    },

    initAddWidget: function(){
        var addWidgetButton = $('button.add-widget');

        addWidgetButton.click(function(event){
            var addPopup = OC.customPopup('.add-document-widget-dialog');

            var widgetSubmit = $('.add-document-widget-submit-button');
            widgetSubmit.unbind('click');

            // Bind the 'Done' button on the popup.
            widgetSubmit.click(function(event){
                var selectedOption = $(
                    '.add-document-widget-dialog .add-widget-option.selected');

                if (selectedOption.length >= 1){
                    if (selectedOption.hasClass('table')){
                        var tables =  $('.document-body .document-table');

                        var newTable = OC.editor.widgets.table({'tableID': tables.length});
                        $('.document-body').append(newTable);
                        var appendedTableWrapper = $('.document-body .document-table:last');

                        // Make cells CKEditor-able.
                        //$('td[contenteditable=true], th[contenteditable=true]', appendedTableWrapper).ckeditor();

                        // Focus on the first cell.
                        $('th:first', appendedTableWrapper).focus();

                        // Allow resize of the columns.
                        OC.editor.initTableResize(appendedTableWrapper);

                        // Bind table actions with event handlers.
                        OC.editor.bindTableActionHandlers(appendedTableWrapper);

                    } else if (selectedOption.hasClass('text-block')){
                        var newTextBlock = OC.editor.widgets.textBlock();
                        $('.document-body').append(newTextBlock);
                        $('.document-textblock').ckeditor();
                    }
                }

                addPopup.close();
            });

            event.preventDefault();
            event.stopPropagation();
            return false;
        });

        var widgetOption = $('.add-document-widget-dialog .add-widget-option');

        widgetOption.click(function(event){
            // Remove the 'selected' class from all other widget options.
            $('.add-document-widget-dialog .add-widget-option').removeClass('selected');
            $(event.target).closest('.add-widget-option').addClass('selected');
        });
    },

    widgets: {
        tableActionsRowHTML: '<tr><td colspan="3" class="table-actions-wrapper"><a class="table-action table-action-new new-row-action">New row</a>' +
            '<a class="table-action table-action-new new-column-action">New column</a></td></tr>',

        table: function(inputs){
            return _.template('<div class="document-table document-element"><div class="column-resize"></div>' +
            '<table id="table-<%= tableID %>"><colgroup><col id="column-<%= tableID %>-0"/><col id="column-<%= tableID %>-1" /><col id="column-<%= tableID %>-2" /></colgroup>' +
            '<tr><th contenteditable="true"></th><th contenteditable="true"></th><th contenteditable="true"></th></tr>' +
            '<tr><td contenteditable="true"></td><td contenteditable="true"></td><td contenteditable="true"></td></tr>' +
            OC.editor.widgets.tableActionsRowHTML + '</table></div>')(inputs);
        },

        tableRow: _.template('<tr><td contenteditable="true"></td><td contenteditable="true"></td><td contenteditable="true"></td></tr>'),

        textBlock: _.template('<textarea class="document-textblock document-element"></textarea>')
    },

    bindTableActionHandlers: function(tableWrapper){
        var newRowButton = $('.new-row-action', tableWrapper);
        var newColumnButton = $('.new-column-action', tableWrapper);

        newRowButton.click(function(){
            // Add the row.
            var tableRows = $('tr', tableWrapper);
            $(tableRows[tableRows.length - 2]).after(OC.editor.widgets.tableRow());

            // Make it editable.
            tableRows = $('tr', tableWrapper);
            $('td', tableRows[tableRows.length - 2]).ckeditor();
        });

        newColumnButton.click(function(){
            // Add the column.
            var tableRows = $('tr', tableWrapper);
            var tableColumns = $('tr:first th', tableWrapper);

            if (tableColumns.length >= 3){
                OC.popup('We only permit 3 columns per document at this stage. Sorry ' +
                    'for the inconvenience.', 'Cannot add new column');
            } else {
                // Append a 'th' to the header row.
                newCell = $('<th/>', {'contenteditable': 'true'});
                $(tableRows[0]).append(newCell);
                $('th:last', tableRows[0]).ckeditor();

                // TODO(Varun): Append new <col> to the <colgroup>
                newCol = $('<col/>', {'id': OC.editor.getNewColumnID(tableWrapper) });
                $('colgroup', tableWrapper).append(newCol);

                // Add a 'td' to each row except for the first & last one.
                var i, newCell;
                for (i = 1; i < tableRows.length - 1; i++){
                    newCell = $('<td/>', {'contenteditable': 'true'});
                    $(tableRows[i]).append(newCell);
                     $('td:last', tableRows[i]).ckeditor();
                }

                // Set the colspan of the bottom row to the new column length.
                $('tr:last td', table).attr('colspan', tableColumns.length + 1);
            }

            // Recalculate and set widths of all columns.
            $('.document-body table col').width((100 / (tableColumns.length + 1)) + '%');
        });
    },

    getNewColumnID: function(tableWrapper){
        var tableID = $('table', tableWrapper).attr('id'),
            tableNumber = tableID.substring(8);

        var columns = $('col', tableWrapper);
        return 'column-' + tableID + '-' + (columns.length + 1);
    },

    initTableResize: function(tableWrapper){
        // For every column, create a relatively positioned resize handle,
        //    which is the height of the 'th' row and width of about 4px.
        var columns = $('tr > th', tableWrapper);
        var columnResizeWrapper = $('.column-resize', tableWrapper);

        var table = $('table', tableWrapper),
            tableHeader = $('tr:first', tableWrapper),
            tableNumber = table.attr('id').substring(6);

        var i;
        for (i = 0; i < columns.length - 1; i++){
            var columnHandle = $('<div/>', {
                'class': 'column-handle', 'id': 'column-' + tableNumber + '-' + i + '-handle'});
            columnResizeWrapper.append(columnHandle);

            var newColumnHandle = $('.column-handle:last', tableWrapper);

            var currentColumn = $(columns[i]);

            // Reposition the handle by using the th left and top positions.

            // Calculate the offset of the column from the left edge of the table.
            var tableLeft = tableWrapper.position().left,
                columnLeft = currentColumn.position().left;

            var top = currentColumn.position().top,
                left = (columnLeft - tableLeft) + (
                    currentColumn.outerWidth() - newColumnHandle.width()/2);

            newColumnHandle.css({'left': left + 'px'});

            // Set the handle height.
            var currentColumnHeight = tableHeader.outerHeight();
            newColumnHandle.height(currentColumnHeight);
            newColumnHandle.css('margin-bottom', '-' + currentColumnHeight + 'px');
        }

        columnResizeWrapper.css('margin-bottom', '-' + (
            tableHeader.outerHeight() + parseInt(table.css('margin-top'), 10)) + 'px');

        // Make the resize handle draggable on the x-axis, with the constraint
        //    being the 'th' row width.
        var handleID, endIndex, columnNumber, column;
        $('.column-handle', columnResizeWrapper).draggable({
            axis: 'x',
            containment: '.column-resize',
            start: function(event, ui){
                // Add class to handle.
                $(event.target).addClass('dragging');
            },

            stop: function(event, ui){
                // Remove class from handle.
                $(event.target).removeClass('dragging');
            },

            // Make the onDrag function resize the <col> while moved.
            drag: function(event, ui){
                // Get the <col> associated with this handle.
                handleID = $(event.target).attr('id');
                endIndex = handleID.indexOf('-handle');
                columnNumber = parseInt(handleID.substring(
                    handleID.indexOf('-', 7) + 1, endIndex), 10);
                column = $('#column-' + tableNumber + '-' + columnNumber);

                // Calculate new column width.
                var newWidth = ui.offset.left - column.position().left;

                // Resize the current (left) column and the right column accordingly.
                column.width(newWidth);

                var originalWidth = column.width();
                var rightColumn = $('#column-' + tableNumber + '-' + (columnNumber + 1));
                rightColumn.width(
                    ((originalWidth - newWidth) + rightColumn.width()));
            }
        });

    }
};

(function () {
/*
    var converter = Markdown.getSanitizingConverter();
    var editor = new Markdown.Editor(converter);

    editor.hooks.set("insertImageDialog", function (callback) {
        setTimeout(function(){OC.editor.createImageUploadDialog(callback);}, 0);
        return true;
    });

    editor.run();
*/
})();


$(function() {
    $('.breadcrumbs-edit').click(function () {
        $( "#dialog-message" ).dialog({
            modal: true,
            open: false,
            buttons: {
                Ok: function() {
                    $(this).dialog( "close" );
                    OC.editor.updateBreadcrumb(
                        $("#category-selection option:selected").attr(
                            'data-id'));
                },
                Cancel: function() {
                    $(this).dialog( "close" );
                }
            }
        });
    });

    $('#article-edit-form #submission-buttons button').click(function (e) {
        var action = $(this).attr('data-action');

        // Populate textarea
        var objectives = [];
        var inputObjs = $('#objectives-inputs input');

        var i;
        for (i = 0; i < inputObjs.length; i++){
            objectives.push("\"" + $(inputObjs[i]).attr('value') + "\"");
        }

        $('textarea[name=objectives]').html("[" + objectives.join(',') + "]");

        // Based on which button was click, set the form input field attribute
        //     for the server to understand which buttonw as clicked
        $('input[name=action]').attr('value', action);

        if (action === "save") {
            $('#article-edit-form').submit();
        }
        else {

            // Launch log prompt dialog box
            $( "#log-message" ).dialog({
                modal: true,
                open: false,
                buttons: {
                    Ok: function() {
                        $(this).dialog( "close" );
                        // HACK: Because fields in display:none aren't passed in the
                        //    POST requests, manually copy log field value to a hidden
                        //    attribute
                        $('input[name=log]').attr('value', $(
                            'input[name=log_message]').attr('value'));

                        $('#article-edit-form').submit();
                    },
                    Cancel: function() {
                        $(this).dialog( "close" );
                        return false;
                    }
                }
            });
            e.stopPropagation();
            e.preventDefault();

            return false;
        }
    });

    // When "Add objectives" button in clicked, add empty <input> fields
    $('button#add-objective').click(function (e) {
        var inputs_wrapper = $(this).parents(
            '.edit-dropped').find('#objectives-inputs');
        var newObjective = $('<div />', {
            'class': 'objective-input'
        });

        var newInput = $('<input />', {
            'type': 'text',
            'class': 'browser-edit'
        });
        var deleteButton = $('<span />', {
            'class': 'delete-objective'
        });
        // Associate delete handler with button
        $(deleteButton).click(OC.editor.objectiveDeleteHandler);

        // Add the input and the delete button to the new objective block
        newObjective.append(newInput);
        newObjective.append(deleteButton);

        // Add the new objective block to the objectives list
        inputs_wrapper.append(newObjective);
        newInput.focus();
    });
});

$(document).ready(function(){
    $('.upload-drag-drop').dropzone({
        url: '/api/image-upload/',
        createImageThumbnails: false
        /*previewTemplate: '<div class="dz-preview">' +
            '<img data-dz-thumbnail /><input type="text" data-dz-name />' +
            '<div class="dz-upload" data-dz-uploadprogress></div></div>' +
            '<div data-dz-errormessage></div>',*/
    });

    OC.editor.initImageUploaderTabs();

    Dropzone.forElement('.upload-drag-drop').on('sending', function(file, xhr, formData){
        formData.append('user_id', $('form.document-edit-form input[name=user]').val());
    });

    Dropzone.forElement('.upload-drag-drop').on('success', function(file, response){
        if (response.status !== "false") {
            // Make the name of the file content editable.
            $('.dz-filename span', file.previewElement).attr(
                'contenteditable', true);

            var newFileElement = $(this.element).children().last();
            var insertImageWrapper = $('<div/>', {
                'class': 'image-insert-button'
            });

            var insertImageButton = $('<button/>', {
                'text': 'Insert image',
                'class': 'btn dull-button'
            });
            insertImageButton.attr('value', JSON.parse(response).url);

            OC.editor.bindClickWithImageInsert(
                insertImageButton, OC.editor.getImageUploadCallback()
            );

            insertImageWrapper.append(insertImageButton);
            newFileElement.append(insertImageWrapper);
        } else {
            OC.popup('The upload process failed due to some errors. ' +
                'Contact us if the problem persists. Error description below:' +
                response.error, 'Upload image failed'
            );
        }

    });

    // TODO(Varun): Move this to a common place to a context agnostic upload lib
    Dropzone.forElement('.upload-drag-drop').on("sending", function(file, xhr, formData){
        function getCookie(name) {
            var cookieValue = null, cookies, i, cookie;
            if (document.cookie && document.cookie !== '') {
                cookies = document.cookie.split(';');
                for (i = 0; i < cookies.length; i++) {
                    cookie = jQuery.trim(cookies[i]);
                    // Does this cookie string begin with the name we want?
                    if (cookie.substring(0, name.length + 1) === (name + '=')) {
                        cookieValue = decodeURIComponent(
                            cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        }
        function sameOrigin(url) {
            // url could be relative or scheme relative or absolute
            var host = document.location.host, // host + port
                protocol = document.location.protocol,
                sr_origin = '//' + host,
                origin = protocol + sr_origin;

            // Allow absolute or scheme relative URLs to same origin
            return (url === origin || url.slice(
                0, origin.length + 1) === origin + '/') ||
                (url === sr_origin || url.slice(
                    0, sr_origin.length + 1) === sr_origin + '/') ||
                // or any other URL that isn't scheme relative or absolute i.e
                //     relative.
                !(/^(\/\/|http:|https:).*/.test(url));
        }
        function safeMethod(method) {
            return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
        }

        var url = $(this)[0].options.url;

        // HACK(Varun): Modified from original if statement, because the method
        //     is not available to us here. Original 'if' below:
        //     if (!safeMethod(settings.type) && sameOrigin(url))

        if (sameOrigin(url)) {
            xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
        }
    });

    $('.tagit').tagit({
        allowSpaces: true
    });

    $('span.delete-objective').click(OC.editor.objectiveDeleteHandler);

    // Initialize document meta collapser.
    OC.editor.initDocumentMetaCollapser();

    // Initialize the JS on widgets on page from load, such as in the case of edit.
    OC.editor.initExistingWidgets();

    // Initialize the add widget functionality.
    OC.editor.initAddWidget();

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
                element.data = documentElement.html();
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


});
