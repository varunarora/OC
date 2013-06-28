/* global $:false, jQuery:false, filepicker:false, console:false */

/**
 * @file Client-side for file upload using filepicker.io
 * @author sri@theopencurriculum.org (Srinivasan Vijayaraghavan)
 */

// Set global variables, such as the Filepicker.io API key.
var uploaded_files = new Object();
filepicker.setKey('AGuSaWwXNQFi60wveigBHz');


$(document).ready(function() {
    $('form').hide();

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
    $('#uploadfiles').click(function() {
        // Allow multiple files at once, store to S3, and the callback is FPpost
        filepicker.pickAndStore({multiple: true},
            {location: 'S3', path: '/attachments/', access: 'public'}, FPpost);
        return true;
    });

    $('#rename').submit(function(event) {
        for (key in window.uploaded_files) {
            $('<input/>').attr('type', 'hidden')
                .attr('name', key)
                .attr('value', window.uploaded_files[key])
                .appendTo('#rename');
        }
        return true;
   });
});

/**
 * @function uploadCallback
 * @desc Callback for POST request from FPpost.<br><br>
 * Updates the HTML to show that the upload was successful.
 * @param {object} response - Response from server.
 * @return none
 */
function uploadCallback(response) {
    var title_box, new_files;
    new_files = JSON.parse(response);
    $.extend(window.uploaded_files, new_files);
    $('#uploadfiles').html('Upload more files');
    $('form').show();

    for (var key in new_files) {
        var text_box = $('<input>').val(new_files[key])
                        .addClass(key)
                        .attr('type', 'text');

        text_box.change(function() {
            var element = $(this);
            var selected = element.attr('class');
            var new_text = element.val();
            window.uploaded_files[selected] = new_text;
        });

        $('#titles').append(text_box);
    }
}

/**
 * @function FPpost
 * @desc Callback for filepicker.pickAndStore. <br><br>
 * Generates key-filename pairs for each file from its FPFile properties.<br>
 * Then POST's a list of these to the server.
 * @param {list} fpfiles - List of FPFile objects from filepicker.io API.
 * @return none
 */
function FPpost(fpfiles) {
    var data, i, num_files, pair;
    num_files = fpfiles.length;
    data = new Object();

    for (i = 0; i < num_files; i++) {
        key = fpfiles[i].key;
        filename = fpfiles[i].filename;

        data[key] = filename;
    }

    $.post('/api/fpUpload/', data, uploadCallback);
};

/*
 * @desc Function to test without polluting the S3 bucket.
 * @return none
 */
function funpost() {
    var data = {
            'yolo0': String(Math.round(10000000*Math.random())),
            'yolo1': String(Math.round(10000000*Math.random()))
    };

    $.post('/api/fpUpload/', data, function(response) {
         $('#fpfilebox').append('Upload success!!');
         console.log(response);
    });
}
