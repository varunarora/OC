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
    isPost: false,

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

        data['user'] = OC.config.user.id;
        
        if ($('form input[name=project]').length > 0){
            data['project'] = $('form input[name=project]').val();
        }

        if ($('form input[name=collection]').length > 0){
            data['collection'] = $('form input[name=collection]').val();
        }

        $.post('/api/filepicker-upload/', data, OC.upload.uploadCallback, 'json');
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

    singleFileTemplate: _.template('<div class="single-upload <%= process %>">' +
        '<input type="hidden" name="key" value="<%= key %>" />' +
        '<input type="text" name="filename" value="<%= filename %>" />' +
        '<input type="hidden" name="upload_service" value="<%= process %>" />' +
        '<div class="dz-progress"><span class="dz-upload" data-dz-uploadprogress></span></div>' +
        '<!--<select name="type"><option value="lesson">Lesson</option><option value="project">Project</option>' +
        '<option value="worksheet">Worksheet</option><option value="handout">Handout</option><option value="activity">Activity</option>' +
        '<option value="assessment">Test / assessment</option><option value="lecture">Lecture</option></select>-->' +
        '<div class="alternative-upload"><a>Upload something else instead...</a></div></div>'),

    newFileUploadListener: function(){
        var formDoneButton = $('form.files-upload-rename button[type=submit]'),
            formUploadComputerButton = $('form.files-upload-rename button[name="select-file"]');
        if (formDoneButton.hasClass('hidden')){
            if (! $.isEmptyObject(OC.upload.fp_uploaded_files) ||
                ! $.isEmptyObject(OC.upload.dropzone_uploaded_files) ||
                OC.upload.manual_to_upload_files.length){
                formDoneButton.removeClass('hidden');

                // Hide the upload button if this is a single upload environment.
                if (OC.upload.isPost){
                    formUploadComputerButton.addClass('hidden');
                }
            }
        }
    },

    updateSingleItemKey: function(key){
        $('.post-new-upload-dialog .upload-drag-drop-replace input[name=key]').val(key);
    },

    addToUploadList: function(key, filename, filesize, process){
        var newFile = {
            key: key,
            filename: filename,
            filesize: filesize,
            process: process
        };

        if (OC.upload.isPost){
            // Hide dropzone.
            var dropzoneElement = $('.post-new-upload-dialog .upload-drag-drop,' +
                '.post-new-upload-dialog .upload-drag-drop-message');
            dropzoneElement.addClass('hidden');

            // Show element similar to dropzone dimensions with file.
            var singleFile = OC.upload.singleFileTemplate(newFile);
            var dragDropReplace = $('.post-new-upload-dialog .upload-drag-drop-replace');
            dragDropReplace.html(singleFile);
            dragDropReplace.removeClass('hidden');

            // Focus on input text.
            $('input[type="filename"]', dragDropReplace).focus();

            // Bind click handler on uploading something else.
            $('.alternative-upload a', dragDropReplace).click(function(){
                dragDropReplace.addClass('hidden');
                dropzoneElement.removeClass('hidden');

                // Delete the original file from the manual listing.
                var allManualUploads = $('input[class="manual-upload"]');
                $(allManualUploads[allManualUploads.length - 2]).remove();
                
                OC.upload.manual_to_upload_files = [];

                // Delete the original files from the dropzone listing.
                OC.upload.dropzone_uploaded_files = {};
                Dropzone.forElement('.post-new-upload-dialog .upload-drag-drop').removeAllFiles();

                // Delete the original files from Filepicker.
                OC.upload.fp_uploaded_files = {};

                // Reset buttons at the bottom to original state.
                var formDoneButton = $('form.files-upload-rename button[type=submit]'),
                    formUploadComputerButton = $('form.files-upload-rename button[name="select-file"]');
                
                formUploadComputerButton.removeClass('hidden');
                formDoneButton.addClass('hidden');
            });

        } else {
            var newElement = OC.upload.dzTemplate(newFile);
            $('.post-new-upload-dialog .upload-drag-drop').append(newElement);
        }
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

        // If filesize > 5MB, prompt user to use filepicker for the same.
        if (size > 5242880){
            var filepickerPrompt = OC.customPopup('.upload-filepicker-suggest-dialog');
            $('.filepicker-suggest', filepickerPrompt.dialog).click(
                function(event){
                    filepickerPrompt.close();

                    event.preventDefault();
                    event.stopPropagation();
                    return false;
                }
            );
        } else {
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
        }
    },

    preSubmissionHandler: function(event){
        if (OC.upload.isPost){
            var dragDropReplace = $('.upload-drag-drop-replace'),
                key = $('input[name="key"]', dragDropReplace).val(),
                newFilename = $('input[name="filename"]', dragDropReplace).val(),
                service = $('input[name="upload_service"]', dragDropReplace).val();

            if (service == 'filepicker-item'){
                $('<input/>').attr('type', 'hidden')
                    .attr('name', key)
                    .attr('value', newFilename)
                    .appendTo('.files-upload-rename');
            } else if (service == 'dropzone-item'){
                $('<input/>').attr('type', 'hidden')
                    .attr('name', key)
                    .attr('value', newFilename)
                    .appendTo('.files-upload-rename');
            } else {
                var allManualUploads = $('.files-upload-rename input[class=manual-upload]');
                $(allManualUploads[allManualUploads.length - 2]).attr('name', newFilename);
            }

        } else {
            var preparedFiles = $('.post-new-upload-dialog .upload-drag-drop .dz-preview');

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
                        if ($(formFiles[j]).val() !== element_key) {
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
    }
};

$(document).ready(function() {
    OC.upload.isPost = $('form.files-upload-rename input[name="post"]').val() == 'true';

    // Prevent form being submitted on hitting enter
    $('form.files-upload-rename').bind('keypress', function (e) {
        if (e.keyCode === 13) {
            e.preventDefault();
        }
    });

    var uploadButtonServicesMap = {
        '.uploadfiles': 'COMPUTER',
        '.gdrive-upload': 'GOOGLE_DRIVE',
        '.skydrive-upload': 'SKYDRIVE',
        '.dropbox-upload': 'DROPBOX',
        '.gmail-upload': 'GMAIL',
        '.box-upload': 'BOX',
        '.picasa-upload': 'PICASA',
        '.ftp-upload': 'FTP',
        '.webdav-upload': 'WEBDAV',
        '.facebook-upload': 'FACEBOOK'
    };

    _.each(uploadButtonServicesMap, function(value, key, list){
        $(key).click(function(event){ OC.upload.launchFilepickerDialog(
            event, value); });
    });

    $('form.files-upload-rename button[type=submit]').click(function(event) {
        OC.upload.preSubmissionHandler(event);
        if (OC.upload.isPost){
            return false;
        }
        return true;
   });

    $('button[name=select-file]').click(function(event){
        $('input[class=manual-upload]:last').click();
        event.preventDefault();
        event.stopPropagation();
        return false;
    });

    $('.post-new-upload-dialog .upload-drag-drop').dropzone({
        url: '/api/file-upload/',
        maxFilesize: 5,
        createImageThumbnails: false
    });

    Dropzone.forElement('.post-new-upload-dialog .upload-drag-drop').on("sending", function(file, xhr, formData){
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
        formData.append('user', OC.config.user.id);
        if ($('form input[name=project]').length > 0){
            formData.append('project', $(
            'form.files-upload-rename input[name=project]').val());
        }
        if ($('form input[name=collection]').length > 0) {
            formData.append('collection', $(
                'form.files-upload-rename input[name=collection]').val());
        }

        if (OC.upload.isPost) {
            OC.upload.addToUploadList(null, file.name, 0, 'dropzone-item');
        }
    });

    // TODO(Varun): Add the project/user + collection ID to the Dropzone request

    // In the case of posting a single item, bind upload progress event with template.
    Dropzone.forElement('.post-new-upload-dialog .upload-drag-drop').on('uploadprogress', function(file, progress, bytesSent){
        if (OC.upload.isPost){
            $('.single-upload .dz-progress .dz-upload').css('width', progress + '%');
        }
    });

    Dropzone.forElement('.post-new-upload-dialog .upload-drag-drop').on("success", function(file, response){
        // Make the name of the file content editable.
        $('.dz-filename span', file.previewElement).attr(
            'contenteditable', true);

        var key;
        var response_object = JSON.parse(response);
        for (key in response_object) {
            OC.upload.dropzone_uploaded_files[key] = response_object[key]['title'];
        }

        // Because there is no hook for the generated HTML, there is no way to
        //     programatically pass in the class for the <span> that holds the
        //     original filename. So have to inject the class manually.
        $('.dz-preview:last .dz-filename > span').addClass(key);

        OC.upload.newFileUploadListener();

        if (OC.upload.isPost) {
            OC.upload.updateSingleItemKey(key);
        }
    });

    $('input[type=file]').change(OC.upload.onFileInputChange);

});
