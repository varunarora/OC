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
    }
};

(function () {

    var converter = Markdown.getSanitizingConverter();
    var editor = new Markdown.Editor(converter);

    editor.hooks.set("insertImageDialog", function (callback) {
        setTimeout(function(){OC.editor.createImageUploadDialog(callback);}, 0);
        return true;
    });

    editor.run();

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

        for (var i = 0; i < inputObjs.length; i++){
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

});
