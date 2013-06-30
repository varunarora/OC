/*jslint plusplus: true, browser: true */
/*jslint nomen: true, multistr: true */
/*global jQuery, $, Modernizr, gapi, _*/
/*jslint nomen: false */

/**
 * @file Client-side for file upload using filepicker.io
 * @author sri@theopencurriculum.org (Srinivasan Vijayaraghavan)
 */

// Set global variables, such as the Filepicker.io API key.

filepicker.setKey(OC.config.uploads.filepickerKey);

OC.upload = {
    uploaded_files: {},

    /**
     * @function uploadCallback
     * @desc Callback for POST request from fpPost.<br><br>
     * Updates the HTML to show that the upload was successful.
     * @param {object} response - Response from server.
     * @return none
     */
    uploadCallback: function(response) {
        var title_box, new_files;
        new_files = JSON.parse(response);
        $.extend(OC.upload.uploaded_files, new_files);
        $('.uploadfiles').html('Upload more files');
        $('form').removeClass("hide");

        for (var key in new_files) {
            var text_box = $('<input>').val(new_files[key])
                            .attr('id', key)
                            .attr('type', 'text');

            text_box.change(function() {
                var element = $(this);
                var selected = element.attr('id');
                var new_text = element.val();
                OC.upload.uploaded_files[selected] = new_text;
            });

            $('#titles').append(text_box);
        }
    },

    /**
     * @function fpPost
     * @desc Callback for filepicker.pickAndStore. <br><br>
     * Generates key-filename pairs for each file from its FPFile properties.<br>
     * Then POST's a list of these to the server, along with user and project.
     * @param {list} fpfiles - List of FPFile objects from filepicker.io API.
     * @return none
     */
    fpPost: function(fpfiles) {
        var data, i, num_files;
        num_files = fpfiles.length;
        data = {};

        for (i = 0; i < num_files; i++) {
            key = fpfiles[i].key;
            filename = fpfiles[i].filename;

            data[key] = filename;
        }

        data['user_id'] = $('form input[name=user_id]').val();
        data['project_id'] = $('form input[name=project_id]').val()

        $.post('/api/fpUpload/', data, OC.upload.uploadCallback);
    }
};

$(document).ready(function() {
    // Prevent form being submitted on hitting enter
    $('form').bind('keypress', function (e) {
        if (e.keyCode == 13) {
            e.preventDefault();
        }
    });

    /**
     * @function on-click
     * @desc On-click handler for the upload button.
     * @return none
     */
    $('.uploadfiles').click(function() {
        // Allow multiple files at once, store to S3, and the callback is fpPost
        filepicker.pickAndStore({multiple: true},
            {location: 'S3', path: '/attachments/', access: 'public'}, 
             OC.upload.fpPost);
        return true;
    });

    $('#rename').submit(function(event) {
        for (key in OC.upload.uploaded_files) {
            $('<input/>').attr('type', 'hidden')
                .attr('name', key)
                .attr('value', OC.upload.uploaded_files[key])
                .appendTo('#rename');
        }
        return true;
   });
});
