OC.editor = {
    myImages: [],
    imageUploadCallback: undefined,

    searchCache: {},

    imageHistoryTemplate: _.template('<div class="image">' +
        '<div class="image-info">' +
        '<div class="image-title"><%= title %></div>' +
        '<div class="image-path"><%= path %></div>' +
        '</div>' +
        '<div class="image-insert-button">' +
        '<button class="btn dull-button" value="<%= path %>">Insert image</button>' +
        '</div></div>'),

    editorSearchItemTemplate: _.template('<div class="editor-search-result" id="<%= id %>">' +
        '<div class="editor-search-result-handle"></div>' +
        '<div class="editor-search-result-thumbnail" style="background-image: ' +
        'url(\'<%= thumbnail %>\');"></div><div class="editor-search-result-description">' +
        '<div class="editor-search-result-description-title"><%= title %></div>'+
        '<div class="editor-search-result-description-meta"><%= views %> views &#183;' +
        'By <a href="<%= user_url %>"><%= user %></a></div></div>' +
        '<div class="editor-search-result-preview"></div>' +
        '</div>'),

    init: function(){
        var editorFrame = $('.editor-frame'),
            editorBody = $('.editor-body');
        editorFrame.height(
            $(window).height() - ($('body > header').height() + $(
                '.editor-header').outerHeight(true) + $(
                '.editor-toolbar-wrapper').height() + parseInt($('.editor-toolbar-wrapper').css(
                'padding-top'), 10) + parseInt(editorFrame.css(
                'padding-top'), 10)) + 'px');

        editorBody.ckeditor({
            extraPlugins: 'internallink,sharedspace,resources',
            startupFocus: true,
            sharedSpaces: {
                top: 'editor-toolbar'
            }
        });

        var scrollbarWidth = getScrollbarWidth();

        // Prepare the internal search visuals.
        var editorSearch = $('.editor-search'),
            editorSearchPullout = $('.editor-search-pullout');

        editorSearchPullout.css({
            'margin-right': scrollbarWidth
        });

        editorSearch.css({
            'top': $('.editor-toolbar-wrapper').outerHeight(true) + $(
                '.editor-toolbar-wrapper').offset().top + 5
        });

        editorSearchPullout.click(function(event){
            if (!$(this).hasClass('pulled-out')){
                editorSearch.animate({
                    right: scrollbarWidth,
                }, {
                    duration: 'slow'
                });
                editorSearchPullout.css({
                    'margin-right': 0
                });
                $(this).addClass('pulled-out');
            } else {
                editorSearch.animate({
                    right: '-' + $('.editor-search-main-panel').width(),
                }, {
                    duration: 'slow',
                    complete: function(){
                        editorSearchPullout.css({
                            'margin-right': scrollbarWidth
                        });
                    }
                });
                $(this).removeClass('pulled-out');
            }
        });

        $('.editor-search-body').css({
            'height': editorFrame.outerHeight(true) - $(
                '.editor-search-bar').height() - 5
        });

        // Initialize side search experience.
        OC.tabs('.editor-search-body', { tab: 1 });
        OC.editor.initEditorSearchAutocomplete();

        $('.editor-search-tabs .editor-search-tab').parent('li').addClass('hide-tab');

        var editorFavoritesBrowser = $('.editor-favorites-browser');
        if (editorFavoritesBrowser.children().length === 0){
            $.get('/interactions/favorites/list/',
                function(response){
                    if (response.status == 'true'){
                        OC.editor.renderListings(response.favorites, editorFavoritesBrowser);
                        editorFavoritesBrowser.removeClass('loading-browser');
                    }
                    else {
                        OC.popup(response.message, response.title);
                    }
                },
            'json');
        }


        var projectBrowserTab = $('.editor-search-tabs li a[href=".my-projects"]'),
            profileBrowserTab = $('.editor-search-tabs li a[href=".my-profile"]');

        if (!projectBrowserTab.hasClickEventListener()){
            projectBrowserTab.click(OC.editor.searchProjectsTabClickHandler);
        }

        if (!profileBrowserTab.hasClickEventListener()){
            profileBrowserTab.click(OC.editor.searchProfileTabClickHandler);
        }
    },

    searchProjectsTabClickHandler: function(event){
        var projectsEditorBrowser = $('.editor-project-browser');

        if (projectsEditorBrowser.children().length === 0){
            $.get('/resources/raw-tree/all/projects/',
                function(response){
                    if (response.status == 'true'){
                        OC.editor.renderTree('projects', response.tree, projectsEditorBrowser);
                        projectsEditorBrowser.removeClass('loading-browser');
                    }
                    else {
                        OC.popup(response.message, response.title);
                    }
                },
            'json');
        }
    },

    searchProfileTabClickHandler: function(event){
        var projectsEditorBrowser = $('.editor-profile-browser');

        if (projectsEditorBrowser.children().length === 0){
            $.get('/resources/raw-tree/all/user/',
                function(response){
                    if (response.status == 'true'){
                        OC.editor.renderTree('user', response.tree, projectsEditorBrowser);
                        projectsEditorBrowser.removeClass('loading-browser');
                    }
                    else {
                        OC.popup(response.message, response.title);
                    }
                },
            'json');
        }
    },

    renderListings: function(response, listingBrowser){
        var i;
        for (i = 0; i < response.length; i++){
            result = OC.editor.editorSearchItemTemplate(response[i]);
            listingBrowser.append(result);
        }
    },

    renderTree: function(host, tree, listingBrowser){
        var key;
        if (host == 'projects'){
            console.log(tree[0]);
        } else {
            for (key in tree){
                if (tree.hasOwnProperty(key)){
                    resources = _.pluck(_.where(tree[key].items, {type:'resource'}), 'resource');
                    OC.editor.renderListings(resources, listingBrowser);
                }
            }
        }
    },

    searchDraggable: function($el){
        $el.on('mousedown', function(event){
            var originalEl = $(this);
            var $elShadow = originalEl.clone();

            //$elShadow.addClass('draggable-shadow');
            $elShadow.css({
                top: originalEl.offset().top - 10,
                left: originalEl.offset().left
            });
            $('.editor-frame-result-clones').append($elShadow);

            var $newEl = $('.editor-frame-result-clones .editor-search-result:last');

            var newElHeight = $(this).outerHeight(),
                newElWidth = $(this).outerWidth(),
                newElY = $(this).offset().top + newElHeight - event.pageY,
                newElX = $(this).offset().left + newElWidth - event.pageX;


            // Establish the editor frame.
            var droppableFrame = {
                top: $('.editor-frame').offset().top,
                bottom: $('.editor-frame').offset().top + $('.editor-frame').outerHeight(true),
                left: $('.editor-body').offset().left,
                right: $('.editor-frame').width() - $('.editor-search').offset().left
            };

            $(this).parents('.editor-frame').on('mousemove', function(event){
                $newEl.addClass('draggable-shadow');
                $('.draggable-shadow').offset({
                    top: event.pageY + newElY - newElHeight,
                    left: event.pageX + newElX - newElWidth
                });

                $newEl.offset().right = $newEl.offset().left + $newEl.width();

                // TODO(Varun): Needs to account for the case dual case of newEl larger than frame on y-axis.
                if (($newEl.offset().top > droppableFrame.top && $newEl.offset().top < droppableFrame.bottom) && ((
                        $newEl.offset().left < droppableFrame.right && $newEl.offset().left > droppableFrame.left) || (
                        $newEl.offset().right < droppableFrame.right && $newEl.offset().right > droppableFrame.left) || (
                        droppableFrame.left > $newEl.offset().left && droppableFrame.right < $newEl.offset().right)
                    )){
                    $('.editor-body').addClass('accepting');
                }
                else {
                    $('.editor-body').removeClass('accepting');
                }

            }).on('mouseup', function(){
                $newEl.removeClass('draggable-shadow');

                if ($('.editor-body').hasClass('accepting')){
                    var editor = $('.editor-body').ckeditorGet();
                    var resultData = {
                        id: $newEl.attr('id'),
                        title: $('.editor-search-result-description-title', $newEl).text(),
                        thumbnail: $('.editor-search-result-thumbnail', $newEl).css('background-image').replace(/"/g, '\'')
                    };

                    editor.insertHtml(
                        _.template(OC.editor.insertedSearchResultTemplate)(resultData)
                    );
                    $newEl.remove();
                }

                $(this).unbind('mousemove');
                $(this).unbind('mouseup');
            });

            event.preventDefault();
        });
    },

    insertedSearchResultTemplate: '<div class="foreign-document-element" id="<%= id %>">' +
        '<div class="foreign-document-element-thumbnail" style="background-image: <%= thumbnail %>"></div>' +
        '<div class="foreign-document-element-description">' +
            '<div class="foreign-document-element-description-title"><%= title %></div>' +
            '<div class="foreign-document-element-description-preview"><a href="">Preview</a></div>' +
        '</div>' +
        '</div>',

    initEditorSearchAutocomplete: function(){
        var searchInput = $('.editor-search-bar input[type="search"]'),
            searchResults = $('.my-search-results'),
            i, resultsHTML;

        var editorSearchTab = $('nav.editor-search-tabs .editor-search-tab').parent(
            'li');

        searchInput.bind('paste keyup', function(){
            var currentValue = $(this).val();
            if (currentValue.length > 2){
                $('.search-query', editorSearchTab).text(currentValue);

                // Check if the search tab has been opened.
                if (editorSearchTab.hasClass('hide-tab')){
                    editorSearchTab.removeClass('hide-tab');
                    $('a', editorSearchTab).click();
                }

                if (OC.editor.searchCache.hasOwnProperty(currentValue)){
                    searchResults.html(OC.editor.searchCache[currentValue]);
                } else {
                    $.get('/resources/api/editor-search/' + currentValue.trim() + '/',
                        function(response){
                            searchResults.html('');
                            resultsHTML = '';
                            for (i = 0; i < response.length; i++){
                                result = OC.editor.editorSearchItemTemplate(response[i]);
                                
                                resultsHTML += result;
                                searchResults.append(result);

                                OC.editor.searchDraggable(
                                    $('.editor-search-result:last', searchResults));
                            }
                            
                            OC.editor.searchCache[currentValue] = resultsHTML;
                        },
                    'json');
                }

            } else {
                searchResults.html('');
            }
        });
    },

    initDropMenus: function(){
        OC.setUpMenuPositioning('nav#license-menu', '.editor-button-wrapper .license-button');
        OC.setUpMenuPositioning('nav#tags-menu', '.editor-button-wrapper .tags-button');
        OC.setUpMenuPositioning('nav#share-menu', '.editor-button-wrapper .share-button');

        $(window).resize(function () {
            OC.setUpMenuPositioning('nav#license-menu', '.editor-button-wrapper .license-menu');
            OC.setUpMenuPositioning('nav#tags-menu', '.editor-button-wrapper .tags-menu');
            OC.setUpMenuPositioning('nav#share-menu', '.editor-button-wrapper .share-button');
        });

        // Now bind the click actions with the menus.
        $('.editor-button-wrapper button.license-button').click(
            function(e){
                $('#license-menu').toggleClass('showMenu');
                $('button.license-button').toggleClass('menu-open');

                e.stopPropagation();
                e.preventDefault();
                return false;
            }
        );

        $('.editor-button-wrapper button.tags-button').click(
            function(e){
                $('#tags-menu').toggleClass('showMenu');
                $('button.tags-button').toggleClass('menu-open');

                e.stopPropagation();
                e.preventDefault();
                return false;
            }
        );

        $('.editor-button-wrapper button.share-button').click(
            function(e){
                $('#share-menu').toggleClass('showMenu');
                $('button.share-button').toggleClass('menu-open');

                e.stopPropagation();
                e.preventDefault();
                return false;
            }
        );
    },

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
        var widgets = $('.document-element'),
            i, j, k, table, columns, cells, widget,
            widgetElement, moveHandle, documentElementDelete;

        for (i = 0; i < widgets.length; i++){
            widget = $(widgets[i]);

            // Initialize custom widgets.
            // TODO(Varun): This needs to be made "object-oriented".
            if (widget.hasClass('document-table')){
                tableWrapper = widget;
                widgetElement = $('table', tableWrapper);

                // Set table ID.
                widgetElement.attr('id', 'table-' + i);

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

                OC.editor.bindWidgetHandlers(widget, widgetElement);
            } else if (widget.hasClass('document-textblock')){
                var textblockTextarea = $('<textarea/>', {
                    'html': widget.html()
                });
                widget.html(textblockTextarea);

                $('textarea', widget).ckeditor(function(textarea){
                    widgetElement = $('.cke', widget);
                    OC.editor.bindWidgetHandlers(widget, widgetElement);
                });
            }
        }

        OC.editor.initWidgetSorting(true);
    },

    bindWidgetDelete: function(widgetDeleteButton){
        widgetDeleteButton.click(function(event){
            $('.widget-delete-dialog').dialog({
                modal: true,
                open: false,
                width: 500,
                buttons: {
                    Yes: function () {
                        widgetDeleteButton.parent('.document-element').remove();
                        $(this).dialog("close");
                    },
                    Cancel: function () {
                        $(this).dialog("close");
                    }
                }
            });

            event.stopPropagation();
            event.preventDefault();
            return false;
        });
    },

    bindWidgetHandlers: function(widget, widgetElement){
        // Add 'move' and 'delete' widget controls on the elements.
        var deleteButton = $('<div/>', {
            'class': 'document-element-delete-button delete-button',
            'title': 'Delete block'
        });
        deleteButton.css({
            'left': widgetElement.offset().left + widgetElement.width() + 10
        });
        widget.prepend(deleteButton);
        widgetDelete = $('.document-element-delete-button', widget);
        widgetDelete.tipsy({ gravity: 'n' });

        // Bind delete functionality with delete button.
        OC.editor.bindWidgetDelete(widgetDelete);

        var moveHandle = $('<div/>', {
            'class': 'document-element-handle'
        });
        moveHandle.css({
            'height': widget.height(),
            'margin-bottom': widget.height(),
            'left': widgetElement.offset().left - 35
        });

        widget.prepend(moveHandle);
    },

    initWidgetSorting: function(initialize){
        var initializeDocument = initialize || false;

        if (initializeDocument){
            // Make all elements sortable.
            $('.document-body').sortable({
                axis: 'y',
                handle: '.document-element-handle',
                opacity: 0.5,
                items: '.document-element',

                start: function(event, ui){
                    var widgetBeingDragged = $(ui.item);
                    if (widgetBeingDragged.hasClass('document-textblock')){
                        // Get the editor instance associated with this object.
                        var editor = $('textarea', widgetBeingDragged).ckeditorGet();
                        editor.destroy();
                    }
                },

                stop: function(event, ui){
                    var widgetDragged = $(ui.item);
                    if (widgetDragged.hasClass('document-textblock')){
                        // Create an editor instance from this textarea.
                        var editor = $('textarea', widgetDragged).ckeditor();
                    }
                }
            });
        } else {
            // Refresh the sortable list by recognizing the new widget.
            $('.document-body').sortable('refresh');
        }
    },

    initAddWidget: function(){
        var addWidgetButton = $('button.add-widget');

        addWidgetButton.click(function(event){
            var addPopup = OC.customPopup('.add-document-widget-dialog');

            var widgetSubmit = $('.add-document-widget-submit-button');
            widgetSubmit.unbind('click');

            var widgetElement;

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
                        $('td[contenteditable=true], th[contenteditable=true]', appendedTableWrapper).ckeditor();

                        // Focus on the first cell.
                        $('th:first', appendedTableWrapper).focus();

                        // Allow resize of the columns.
                        OC.editor.initTableResize(appendedTableWrapper);

                        // Bind table actions with event handlers.
                        OC.editor.bindTableActionHandlers(appendedTableWrapper);

                        widget = appendedTableWrapper;
                        widgetElement = $('table', appendedTableWrapper);

                        // Add widget handlers.
                        OC.editor.bindWidgetHandlers(widget, widgetElement);
                        OC.editor.initWidgetSorting();
                    } else if (selectedOption.hasClass('text-block')){
                        var newTextBlock = OC.editor.widgets.textBlock();
                        $('.document-body').append(newTextBlock);

                        var appendedTextBlock = $('.document-body .document-textblock:last');
                        $('textarea', appendedTextBlock).ckeditor(function(textarea){
                            widgetElement = $('.cke', appendedTextBlock);
                            widget = appendedTextBlock;

                            // Add widget handlers.
                            OC.editor.bindWidgetHandlers(widget, widgetElement);
                            OC.editor.initWidgetSorting();
                        });
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

        textBlock: _.template('<div class="document-textblock document-element"><textarea></textarea></div>')
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

            if (tableColumns.length >= 4){
                OC.popup('We only permit 4 columns per document at this stage. Sorry ' +
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
                $('table tr:last td', tableWrapper).attr('colspan', tableColumns.length + 1);
            }

            // Recalculate and set widths of all columns.
            $('.document-body table col').width((100 / (tableColumns.length + 1)) + '%');
            
            // Adjust the position of the handlers.
            OC.editor.addNewColumnHandle(tableWrapper);
        });
    },

    getNewColumnID: function(tableWrapper){
        var tableID = $('table', tableWrapper).attr('id'),
            tableNumber = tableID.substring(6);

        var columns = $('col', tableWrapper);
        return 'column-' + tableNumber + '-' + (columns.length);
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

        OC.editor.makeHandlerDraggable($('.column-handle', columnResizeWrapper), tableNumber);
    },

    makeHandlerDraggable: function(elementSelector, tableNumber){
        // Make the resize handle draggable on the x-axis, with the constraint
        //    being the 'th' row width.
        var handleID, endIndex, columnNumber, column;
        elementSelector.draggable({
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
    },

    addNewColumnHandle: function(tableWrapper){
        var columns = $('tr > th', tableWrapper);

        // Reposition the existing column handles.
        var columnResizeWrapper = $('.column-resize', tableWrapper),
            columnHandles = $('.column-resize .column-handle', tableWrapper);

        var table = $('table', tableWrapper),
            tableHeader = $('tr:first', tableWrapper),
            tableNumber = table.attr('id').substring(6),
            tableLeft = tableWrapper.position().left;

        var i;
        // Don't iterate through the last column.
        for (i = 0; i < columns.length - 2; i++){
            var currentColumn = $(columns[i]),
                currentColumnHandler = $(columnHandles[i]);

            // Calculate the offset of the column from the left edge of the table.
            var columnLeft = currentColumn.position().left;

            // Set the new left of the handle based on the new column position.
            var left = (columnLeft - tableLeft) + (
                currentColumn.outerWidth() - currentColumnHandler.width()/2);
            currentColumnHandler.css({ 'left': left });
        }

        var columnHandle = $('<div/>', {
            'class': 'column-handle', 'id': 'column-' + tableNumber + '-' + i + '-handle'});
            columnResizeWrapper.append(columnHandle);

        var appendedColumnHandle = $('.column-handle:last', columnResizeWrapper);

        var appendedColumn = $(columns[i]),
            appendedColumnLeft = appendedColumn.position().left;
        var appendColumnHandleLeft = (appendedColumnLeft - tableLeft) + (
            appendedColumn.outerWidth() - appendedColumnHandle.width()/2);

        appendedColumnHandle.css({'left': appendColumnHandleLeft + 'px'});

        // Set the handle height and left position.
        var currentColumnHeight = tableHeader.outerHeight();
        appendedColumnHandle.height(currentColumnHeight);
        appendedColumnHandle.css('margin-bottom', '-' + currentColumnHeight + 'px');

        OC.editor.makeHandlerDraggable(appendedColumnHandle, tableNumber);
    },

    addInlineLinkPopout: function(callback, currentText, currentURL){
        // Setup the tabs the link-to popup.
        OC.tabs('.link-resource-browser');

        var linkToPopup = OC.customPopup('.link-resource-dialog'),
            profileResourceCollectionBrowser = $('.link-resource-profile-browser'),
            projectsResourceCollectionBrowser = $('.link-resource-project-browser'),
            collectionID = $('form#resource-form input[name=collection_id]').val(),
            toURLInput = $('form#link-to-url-form input[name=resource-url]'),
            toURLTextInput = $('form#link-to-url-form input[name=resource-url-text]');

        profileResourceCollectionBrowser.addClass('loading-browser');
        projectsResourceCollectionBrowser.addClass('loading-browser');

        // If there was a link selected, fill in inputs with original URL values,
        //     else clear their browser cached value.
        if (currentURL && currentText){
            toURLInput.val(currentURL);
            toURLTextInput.val(currentText);
        } else if (currentText) {
            toURLInput.val('');
            toURLTextInput.val(currentText);
        } else {
            toURLInput.val('');
            toURLTextInput.val('');
        }

        // Bind Done button on custom popup.
        $('.link-resource-submit-button').click(function(event){
            // Capture the actively selected tab.
            var activeTab = $('.link-resource-dialog .link-resource-tabs li a.selected');

            var toResourceCollection, toURL;

            // If the active tab is projects.
            if (activeTab.attr('href') === '.my-projects'){
                // Capture currently selected collection.
                toResourceCollection = projectsResourceCollectionBrowser.find(
                    '.selected-destination-collection, .selected-destination-resource');
            } else if (activeTab.attr('href') === '.my-profile'){
                toResourceCollection = profileResourceCollectionBrowser.find(
                    '.selected-destination-collection, .selected-destination-resource');
            } else {
                toURL = $('form#link-to-url-form input[name=resource-url]').val();
                toURLText = $('form#link-to-url-form input[name=resource-url-text]').val();
            }

            linkToPopup.close();

            if (toResourceCollection){
                callback($(toResourceCollection[0]).attr('href'), null);
            } else if (toURL){
                callback(toURL, toURLText);
            }
        });

        if (profileResourceCollectionBrowser.children().length === 0){
            $.get('/resources/tree/all/user/',
                function(response){
                    if (response.status == 'true'){
                        OC.renderBrowser(response.tree, profileResourceCollectionBrowser);
                        profileResourceCollectionBrowser.removeClass('loading-browser');
                    }
                    else {
                        OC.popup(response.message, response.title);
                    }
                },
            'json');
        }

        var projectBrowserTab = $('.link-resource-tabs li a[href=".my-projects"]');

        if (!projectBrowserTab.hasClickEventListener()){
            projectBrowserTab.click(OC.editor.linkToProjectsTabClickHandler);
        }

        var standardsBrowserTab = $('.link-resource-tabs li a[href=".standards"]');

        if (!standardsBrowserTab.hasClickEventListener()){
            standardsBrowserTab.click(OC.editor.linkToStandardsTabClickHandler);
        }
    },

    linkToProjectsTabClickHandler: function(event){
        var projectsResourceCollectionBrowser = $('.link-resource-project-browser'),
            collectionID = $('form#resource-form input[name=collection_id]').val();

        if (projectsResourceCollectionBrowser.children().length === 0){
            $.get('/resources/tree/all/projects/',
                function(response){
                    if (response.status == 'true'){
                        OC.renderBrowser(response.tree, projectsResourceCollectionBrowser);
                        projectsResourceCollectionBrowser.removeClass('loading-browser');
                    }
                    else {
                        OC.popup(response.message, response.title);
                    }
                },
            'json');
        }
    },

    linkToStandardsTabClickHandler: function(event){
        var standardsResourceCollectionBrowser = $('.link-resource-standards-browser');

        if (standardsResourceCollectionBrowser.children().length === 0){
            $.get('/meta/standards/tree/',
                function(response){
                    if (response.status == 'true'){
                        OC.renderBrowser(response.tree, standardsResourceCollectionBrowser);
                        standardsResourceCollectionBrowser.removeClass('loading-browser');
                    }
                    else {
                        OC.popup(response.message, response.title);
                    }
                },
            'json');
        }
    },
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

    OC.editor.init();

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

    OC.editor.initDropMenus();

    // Initialize document meta collapser.
    //OC.editor.initDocumentMetaCollapser();

    // Initialize the JS on widgets on page from load, such as in the case of edit.
    //OC.editor.initExistingWidgets();

    // Initialize the add widget functionality.
    //OC.editor.initAddWidget();

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
        // Add all element JSONs into strings.
        var newDocumentForm = $('#new-resource-document-form');

        var serializedDocumentBody = $('<textarea/>', {
            'text': JSON.stringify([
                {
                    type: 'textblock',
                    data: $('.editor-body').ckeditorGet().getData()
                }
            ]),
            'name': 'serialized-document-body'
        });
        
        newDocumentForm.append(serializedDocumentBody);
        newDocumentForm.submit();

        event.stopPropagation();
        event.preventDefault();
        return false;
    });

});
