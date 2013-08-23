/*global $, OC, filepicker */

/**
 * @file Client-side for file upload using filepicker.io
 * @author sri@theopencurriculum.org (Srinivasan Vijayaraghavan)
 */

// Set global variables, such as the Filepicker.io API key.

OC.config.uploads = {
    filepicker_key: 'AGuSaWwXNQFi60wveigBHz',
    store_error_code: 151
};

filepicker.setKey(OC.config.uploads.filepicker_key);

OC.upload = {
    fp_uploaded_files: {},
    dropzone_uploaded_files: {},
    manual_to_upload_files: [],

    launchFilepickerDialog: function(event, service) {
        // Allow multiple files at once, store to S3, and the callback is fpPost
        filepicker.pickAndStore({multiple: true, openTo: service},
            {location: 'S3', path: '/', access: 'public'},
             OC.upload.fpPost, OC.upload.fpError);
        event.preventDefault();
        event.stopPropagation();
        return false;
    },

    /**
     * @function uploadCallback
     * @desc Callback for POST request from fpPost.<br><br>
     * Updates the HTML to show that the upload was successful.
     * @param {object} response - Response from server.
     * @return none
     */
    uploadCallback: function(response) {
        var new_files, key, failed_list;
        new_files = response;
        $.extend(OC.upload.fp_uploaded_files, response);

        // TODO: This is inefficient. Catch failures first, delete then do rest
        for (key in new_files) {
            if (key === 'failures') {
                failed_list = $(document.createElement('div'));
                failed_list.html('The following files failed to upload: ');
                failed_list.append(JSON.stringify(new_files['failures']));
                $('.uploadfiles').before(failed_list);
            }
            else {
                OC.upload.addToUploadList(key, new_files[key], '', 'filepicker-item');
                OC.upload.newFileUploadListener();
            }
        }
    },

    /**
     * @function fpPost
     * @desc Success callback for filepicker.pickAndStore.
     * Generates key-filename pairs for each file from its FPFile properties.
     * Then POST's a list of these to the server, along with user and project.
     * @param {list} fpfiles - List of FPFile objects from filepicker.io API.
     * @return none
     */
    fpPost: function(fpfiles) {
        var data, i, num_files, key, filename;
        num_files = fpfiles.length;
        data = {};

        for (i = 0; i < num_files; i++) {
            key = fpfiles[i].key;
            filename = fpfiles[i].filename;

            data[key] = filename;
        }

        data['user'] = $('form input[name=user]').val();
        
        if ($('form input[name=project]').length > 0){
            data['project'] = $('form input[name=project]').val();
        }

        if ($('form input[name=collection]').length > 0){
            data['collection'] = $('form input[name=collection]').val();
        }

        $.post('/api/fpUpload/', data, OC.upload.uploadCallback, 'json');
    },

    /**
     * @function fpError
     * @desc Failure callback for filepicker.pickAndStore.
     * If dialog was closed, don't do anything.
     * If there was a file store error, display a message.
     * @param {number} error_code - from the filepicker API.
     * @return none
     */
    fpError: function(error_code) {
        if (error_code === 151) {       // If file store error
            alert('Sorry, something went wrong');   //TODO
        }
    },

    dzTemplate: _.template('<div class="dz-preview dz-file-preview <%= process %>">' +
        '<div class="dz-details">' +
            '<div class="dz-filename"><span data-dz-name contenteditable="true" class="<%= key %>"><%= filename %></span></div>' +
            '<div class="dz-size" data-dz-size><%= filesize %></div>' +
            '<img data-dz-thumbnail />' +
        '</div>' +
        '<div class="dz-progress">' +
            '<span class="dz-upload" data-dz-uploadprogress></span>' +
        '</div>' +
        '<div class="dz-success-mark"><span>✔</span></div>' +
        '<div class="dz-error-mark"><span>✘</span></div>' +
        '<div class="dz-error-message"><span data-dz-errormessage></span></div>' +
        '</div>'),

    newFileUploadListener: function(){
        var formDoneButton = $('form.files-upload-rename button[type=submit]');
        if (formDoneButton.hasClass('hidden')){
            if (! $.isEmptyObject(OC.upload.fp_uploaded_files) ||
                ! $.isEmptyObject(OC.upload.dropzone_uploaded_files) ||
                OC.upload.manual_to_upload_files.length){
                formDoneButton.removeClass('hidden');
            }
        }
    },

    addToUploadList: function(key, filename, filesize, process){
        var newFile = {
            key: key,
            filename: filename,
            filesize: filesize,
            process: process
        };
        var newElement = OC.upload.dzTemplate(newFile);
        $('.upload-drag-drop').append(newElement);
    },

    onFileInputChange: function(event){
        var size = $(this)[0].files[0].size;
        var formatted_filesize;

        // Based on the size of the file, prepare a formatted string of file size
        if (size >= 1048576){
            formatted_filesize = (size / 1048576).toFixed(2) + " MB";
        } else if (size >= 1024){
            formatted_filesize = (size / 1024).toFixed(2) + " KB";
        } else {
            formatted_filesize = size + " B";
        }

        var filename = $(this)[0].files[0].name;
        OC.upload.addToUploadList(
            filename, filename, formatted_filesize, 'manual-item');
        OC.upload.manual_to_upload_files.push(filename);

        OC.upload.newFileUploadListener();

        var numberOfFiles = $('form.files-upload-rename input.manual-upload').length;
        var newFileInput = $('<input/>', {
            'class': 'manual-upload',
            'type': 'file'
        });

        newFileInput.change(OC.upload.onFileInputChange);

        $('form.files-upload-rename').append(newFileInput);
    },

    preSubmissionHandler: function(event){
        var preparedFiles = $('.upload-drag-drop .dz-preview');

        var fp_key, dz_key, i, j, file_item, element_key, element_value;
        var formFiles = $('.files-upload-rename input[type=file]');
        for (i = 0; i < preparedFiles.length; i++) {
            file_item = preparedFiles[i];
            element_key = $('.dz-filename span:first', file_item).attr('class');
            element_value = $('.dz-filename span:first', file_item).text().trim();

            // Capture Filepicker.io file renames and update {} before passing
            //     to form
            if ($(file_item).hasClass('filepicker-item')) {
                if (OC.upload.fp_uploaded_files[element_key] != element_value){
                    OC.upload.fp_uploaded_files[element_key] = element_value;
                }
            }

            // Capture manual file renames and update {} before passing to
            //     form
            else if ($(file_item).hasClass('manual-item')) {
                for (j = 0; j < formFiles.length; j++){
                    // NOTE(Varun): Originally, name on input element was being
                    //     added only in the case when the file name had
                    //     changed,
                    //if (element_value !=  element_key){
                    if ($(formFiles[j]).val() == element_key) {
                        $(formFiles[j]).attr('name', element_value);
                    }
                    //}
                }
            }

            // Capture Dropzone file renames and update {} before passing to
            //     form
            else {
                if (OC.upload.dropzone_uploaded_files[element_key] != element_value){
                    OC.upload.dropzone_uploaded_files[element_key] = element_value;
                }
            }
        }

        for (fp_key in OC.upload.fp_uploaded_files) {
            $('<input/>').attr('type', 'hidden')
                .attr('name', fp_key)
                .attr('value', OC.upload.fp_uploaded_files[fp_key])
                .appendTo('.files-upload-rename');
        }

        for (dz_key in OC.upload.dropzone_uploaded_files) {
            $('<input/>').attr('type', 'hidden')
                .attr('name', dz_key)
                .attr('value', OC.upload.dropzone_uploaded_files[dz_key])
                .appendTo('.files-upload-rename');
        }
    }
};

$(document).ready(function() {
    // Prevent form being submitted on hitting enter
    $('form').bind('keypress', function (e) {
        if (e.keyCode === 13) {
            e.preventDefault();
        }
    });

    /**
     * @function on-click
     * @desc On-click handler for the upload button.
     * @return none
     */
    $('.uploadfiles').click(function(e) {
        OC.upload.launchFilepickerDialog(e, 'COMPUTER');
    });

    $('.gdrive-upload').click(function(e) {
        OC.upload.launchFilepickerDialog(e, 'GOOGLE_DRIVE');
    });

    $('.skydrive-upload').click(function(e) {
        OC.upload.launchFilepickerDialog(e, 'SKYDRIVE');
    });

    $('.dropbox-upload').click(function(e) {
        OC.upload.launchFilepickerDialog(e, 'DROPBOX');
    });

    $('.gmail-upload').click(function(e) {
        OC.upload.launchFilepickerDialog(e, 'GMAIL');
    });

    $('.box-upload').click(function(e) {
        OC.upload.launchFilepickerDialog(e, 'BOX');
    });

    $('.picasa-upload').click(function(e) {
        OC.upload.launchFilepickerDialog(e, 'PICASA');
    });

    $('.ftp-upload').click(function(e) {
        OC.upload.launchFilepickerDialog(e, 'FTP');
    });

    $('.webdav-upload').click(function(e) {
        OC.upload.launchFilepickerDialog(e, 'WEBDAV');
    });

    $('.facebook-upload').click(function(e) {
        OC.upload.launchFilepickerDialog(e, 'FACEBOOK');
    });

    $('form.files-upload-rename button[type=submit]').click(function(event) {
        OC.upload.preSubmissionHandler(event);
        return true;
   });

    $('button[name=select-file]').click(function(event){
        $('input[class=manual-upload]:last').click();
        event.preventDefault();
        event.stopPropagation();
        return false;
    });

    $('.upload-drag-drop').dropzone({
        url: '/api/file-upload/',
        maxFilesize: 5,
        createImageThumbnails: false
    });

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

        // Append the values of user, project and collection ID
        formData.append('user', $(
            'form.files-upload-rename input[name=user]').val());
        if ($('form input[name=project]').length > 0){
            formData.append('project', $(
            'form.files-upload-rename input[name=project]').val());
        }
        if ($('form input[name=collection]').length > 0) {
            formData.append('collection', $(
                'form.files-upload-rename input[name=collection]').val());
        }
    });

    // TODO(Varun): Add the project/user + collection ID to the Dropzone request


    Dropzone.forElement('.upload-drag-drop').on("success", function(file, response){
        var key;
        var response_object = JSON.parse(response);
        for (key in response_object) {
            OC.upload.dropzone_uploaded_files[key] = response_object[key];
        }

        // Because there is no hook for the generated HTML, there is no way to
        //     programatically pass in the class for the <span> that holds the
        //     original filename. So have to inject the class manually.
        $('.dz-preview:last .dz-filename > span').addClass(key);

        OC.upload.newFileUploadListener();
    });

    $('input[type=file]').change(OC.upload.onFileInputChange);

});
