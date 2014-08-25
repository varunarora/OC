require(['jquery', 'groups', 'dropzone'], function($, groups, Dropzone){
    $(document).ready(function ($) {
        /* Projects specific initializers/renderers */

        // Initialize Projects' launch page.
        OC.projects.launch.init();

        // Bind admin click events with handler function.
        OC.projects.bindAdminClick();

        // Bind remove member button with handler function.
        OC.projects.bindDeleteButton();

        // Attach tipsy to delete button.
        $('.delete-button').tipsy();

        // Attach tipsy to admin thumbnails on the 'About' page.
        $('.project-admin-thumbnail').tipsy({gravity: 's'});

        OC.comments.addDeleteButtonTooltip('.discussion-item');

        // Attach project request invitation button.
        OC.projects.bindInviteRequestButton();

        // Setup autocomplete for add member functionality.
        OC.projects.initAddMemberAutocomplete();

        // Initialize discussion board handlers and functionalities.
        OC.projects.initDiscussionBoard();

        OC.projects.bindInviteAcceptButton();

        OC.projects.bindInviteDeclineButton();

        // Initialize the projects deletion button on settings page.
        OC.projects.bindProjectDeleteButton();

        // Initialize the category creation and delete button.
        OC.projects.bindNewCategoryButton();

        OC.projects.bindCategoryDeleteButton();


        function attachUserID(file, xhr, formData){
            formData.append('user', OC.config.user.id);
        }

        // Setup up Dropzone.
        $('.new-discussion-post-attach-dialog .upload-drag-drop').dropzone({
            url: '/api/file-upload/',
            createImageThumbnails: false,
            maxFilesize: 5
        });
        Dropzone.forElement('.new-discussion-post-attach-dialog .upload-drag-drop').on('sending', attachUserID);
        Dropzone.forElement('.new-discussion-post-attach-dialog .upload-drag-drop').on("sending", OC.attachCSRFToken);
        Dropzone.forElement('.new-discussion-post-attach-dialog .upload-drag-drop').on('success', function(file, response){
            if (response.status !== "false") {
                // Make the name of the file content editable.
                $('.dz-filename span', file.previewElement).attr(
                    'contenteditable', true);

                var newFileElement = $(this.element).children().last();
                var attachFileWrapper = $('<div/>', {
                    'class': 'attach-insert-button'
                });

                var attachButton = $('<button/>', {
                    'text': 'Attach',
                    'class': 'btn dull-button'
                });

                var response_object = JSON.parse(response);
                var key, uploadedFile;
                for (key in response_object) {
                    uploadedFile = response_object[key];
                    break;
                }

                attachButton.click(function(event){
                    OC.projects.insertAttachment(
                        uploadedFile['id'], uploadedFile['title'],
                        true
                    );
                });

                attachFileWrapper.append(attachButton);
                newFileElement.append(attachFileWrapper);
            } else {
                OC.popup('The upload process failed due to some errors. ' +
                    'Contact us if the problem persists. Error description below:' +
                    response.error, 'Upload image failed'
                );
            }
        });

        if ($('.discussion-board').length > 0){
             // Construct a collection view using the post objects built in
            OC.groups.postCollectionView = new OC.PostCollectionView({collection: OC.groups.postSet});

            // Render the collection view
            OC.groups.postCollectionView.render();

            // Initiatialize the Backbone models/collection/view
            OC.groups.init_mvc();
        }
    });
});