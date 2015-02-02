define(['filepicker', 'dropzone', 'hogan'], function(fp, Dropzone, Hogan){
    var Upload = {
        filepickerKey: 'AGuSaWwXNQFi60wveigBHz',
        
        fp_uploaded_files: {},
        dropzone_uploaded_files: {},
        manual_to_upload_files: [],
        
        isPost: false,

        launchFilepickerDialog: function(event, service) {
            // Allow multiple files at once, store to S3, and the callback is fpPost
            filepicker.pickAndStore(
                {multiple: true, openTo: service},
                {location: 'S3', path: '/resources/', access: 'public'},
                this.fpPost, this.fpError
            );

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
            var new_files, key, failed_list, upload = this;
            new_files = response;

            require(['deep_extend'], function(extend){
                extend(upload.fp_uploaded_files, response);
            });

            // TODO: This is inefficient. Catch failures first, delete then do rest
            for (key in new_files) {
                if (key === 'failures') {
                    failed_list = document.createElement('div');
                    failed_list.innerHTML = 'The following files failed to upload: ';
                    failed_list.innerHTML += JSON.stringify(new_files['failures']);

                    document.querySelector('.uploadfiles').appendChild(failed_list);
                }
                else {
                    this.addToUploadList(key, new_files[key], '', 'filepicker-item');
                    this.newFileUploadListener();
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
            var data, i, num_files, key, filename, view = this;
            num_files = fpfiles.length;
            data = {};

            for (i = 0; i < num_files; i++) {
                key = fpfiles[i].key;
                filename = fpfiles[i].filename;

                data[key] = filename;
            }

            data['user'] = OC.config.user.id;

            var collectionInput = document.querySelector('form input[name=collection]');
            if (collectionInput) data['collection'] = collectionInput.value;

            atomic.post('/api/filepicker-upload/', data)
            .success(function(response, xhr){
                view.uploadCallback(response);
            });
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

        dzTemplate: Hogan.compile('<div class="dz-preview dz-file-preview {{process}}">' +
            '<div class="dz-details">' +
                '<div class="dz-filename"><span data-dz-name contenteditable="true" class="{{key}}">{{filename}}</span></div>' +
                '<div class="dz-size" data-dz-size>{{filesize}}</div>' +
                '<img data-dz-thumbnail />' +
            '</div>' +
            '<div class="dz-progress">' +
                '<span class="dz-upload" data-dz-uploadprogress></span>' +
            '</div>' +
            '<div class="dz-success-mark"><span>✔</span></div>' +
            '<div class="dz-error-mark"><span>✘</span></div>' +
            '<div class="dz-error-message"><span data-dz-errormessage></span></div>' +
            '</div>'),

        singleFileTemplate: Hogan.compile('<div class="single-upload {{process}}">' +
            '<input type="hidden" name="key" value="{{key}}" />' +
            '<input type="text" name="filename" value="{{filename}}" />' +
            '<input type="hidden" name="upload_service" value="{{process}}" />' +
            '<div class="dz-progress"><span class="dz-upload" data-dz-uploadprogress></span></div>' +
            '<!--<select name="type"><option value="lesson">Lesson</option><option value="project">Project</option>' +
            '<option value="worksheet">Worksheet</option><option value="handout">Handout</option><option value="activity">Activity</option>' +
            '<option value="assessment">Test / assessment</option><option value="lecture">Lecture</option></select>-->' +
            '<div class="alternative-upload"><a>Upload something else instead...</a></div></div>'),


        newFileUploadListener: function(){
            var formDoneButton = document.querySelector('form.files-upload-rename button[type=submit]'),
                formUploadComputerButton = document.querySelector('form.files-upload-rename button[name="select-file"]');

            if (OC.$.hasClass(formDoneButton, 'hidden')){
                if (! OC.$.isEmpty(this.fp_uploaded_files) ||
                    ! OC.$.isEmpty(this.dropzone_uploaded_files) ||
                    this.manual_to_upload_files.length){
                    OC.$.removeClass(formDoneButton, 'hidden');

                    // Hide the upload button if this is a single upload environment.
                    if (this.isPost){
                        OC.$.addClass(formUploadComputerButton, 'hidden');
                    }
                }
            }
        },

        updateSingleItemKey: function(key){
            document.querySelector('.upload-dialog .upload-drag-drop-replace input[name=key]').value = key;
        },

        addToUploadList: function(key, filename, filesize, process){
            var newFile = {
                key: key,
                filename: filename,
                filesize: filesize,
                process: process
            };

            if (this.isPost){
                // Hide dropzone.
                var dropzoneElement = document.querySelectorAll('.upload-dialog .upload-drag-drop,' +
                    '.upload-dialog .upload-drag-drop-message');
                OC.$.addClass(dropzoneElement, 'hidden');

                // Show element similar to dropzone dimensions with file.
                var singleFile = this.singleFileTemplate.render(newFile);
                var dragDropReplace = document.querySelector('.upload-dialog .upload-drag-drop-replace');
                dragDropReplace.innerHTML = singleFile;
                OC.$.removeClass(dragDropReplace, 'hidden');

                // Focus on input text.
                dragDropReplace.querySelector('input[name="filename"]').focus();

                // Bind click handler on uploading something else.
                OC.$.addListener(dragDropReplace.querySelector('.alternative-upload a'), 'click', function(event){
                    OC.$.addClass(dragDropReplace, 'hidden');
                    OC.$.removeClass(dropzoneElement, 'hidden');

                    // Delete the original file from the manual listing.
                    var allManualUploads = document.querySelectorAll('input[class="manual-upload"]');
                    allManualUploads[allManualUploads.length - 2].parent.removeChild(allManualUploads[allManualUploads.length - 2]);
                    
                    this.manual_to_upload_files = [];

                    // Delete the original files from the dropzone listing.
                    this.dropzone_uploaded_files = {};
                    Dropzone.forElement('.upload-dialog .upload-drag-drop').removeAllFiles();

                    // Delete the original files from Filepicker.
                    this.fp_uploaded_files = {};

                    // Reset buttons at the bottom to original state.
                    var formDoneButton = $('form.files-upload-rename button[type=submit]'),
                        formUploadComputerButton = $('form.files-upload-rename button[name="select-file"]');
                    
                    OC.$.removeClass(formUploadComputerButton, 'hidden');
                    OC.$.addClass(formDoneButton, 'hidden');
                });

            } else {
                var newElement = this.dzTemplate.render(newFile);
                document.querySelector('.upload-dialog .upload-drag-drop').appendChild(newElement);
            }
        },

        onFileInputChange: function(event){
            var size = this.files[0].size;
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
                var filepickerPrompt = OC.utils.popup('.upload-filepicker-suggest-dialog');
                OC.$.addListener(filepickerPrompt.dialog.querySelector('.filepicker-suggest'), 'click',
                    function(event){
                        filepickerPrompt.close();

                        event.preventDefault();
                        event.stopPropagation();
                        return false;
                    }
                );
            } else {
                var filename = this.files[0].name;
                addToUploadList(
                    filename, filename, formatted_filesize, 'manual-item');
                manual_to_upload_files.push(filename);

                newFileUploadListener();

                var numberOfFiles = document.querySelectorAll(
                    'form.files-upload-rename input.manual-upload').length,
                    newFileInputs = document.createElement('input');
                
                newFileInput.className = 'manual-upload';
                newFileInput.type = 'file';

                OC.$.addListener(newFileInput, 'change', onFileInputChange);
                document.querySelector('form.files-upload-rename').appendChild(newFileInput);
            }
        },

        preSubmissionHandler: function(event){
            var filesUploadRenameInput;

            if (this.isPost){
                var dragDropReplace = document.querySelector('.upload-drag-drop-replace'),
                    key = dragDropReplace.querySelector('input[name="key"]').value,
                    newFilename = dragDropReplace.querySelector('input[name="filename"]').value,
                    service = dragDropReplace.querySelector('input[name="upload_service"]').value;

                if (service === 'filepicker-item' || service === 'dropzone-item'){
                    filesUploadRenameInput = document.createElement('input');
                    filesUploadRenameInput.type = 'hidden';
                    filesUploadRenameInput.name = key;
                    filesUploadRenameInput.value = newFilename;

                    document.querySelector('.files-upload-rename').appendChild(
                        filesUploadRenameInput);

                } else {
                    var allManualUploads = document.querySelectorAll('.files-upload-rename input[class=manual-upload]');
                    allManualUploads[allManualUploads.length - 2].name = newFilename;
                }

            } else {
                var preparedFiles = document.querySelectorAll('.upload-dialog .upload-drag-drop .dz-preview');

                var fp_key, dz_key, i, j, file_item, element_key, element_value;
                var formFiles = document.querySelectorAll('.files-upload-rename input[type=file]');
                for (i = 0; i < preparedFiles.length; i++) {
                    file_item = preparedFiles[i];
                    element_key = file_item.querySelector('.dz-filename span:first').className;
                    element_value = file_item.querySelector('.dz-filename span:first').innerHTML.trim();

                    // Capture Filepicker.io file renames and update {} before passing
                    //     to form
                    if (OC.$.hasClass(file_item, 'filepicker-item')) {
                        if (fp_uploaded_files[element_key] != element_value){
                            fp_uploaded_files[element_key] = element_value;
                        }
                    }

                    // Capture manual file renames and update {} before passing to
                    //     form
                    else if (OC.$.hasClass(file_item, 'manual-item')) {
                        for (j = 0; j < formFiles.length; j++){
                            // NOTE(Varun): Originally, name on input element was being
                            //     added only in the case when the file name had
                            //     changed,
                            //if (element_value !=  element_key){
                            if (formFiles[j].value !== element_key) {
                                formFiles[j].name = element_value;
                            }
                            //}
                        }
                    }

                    // Capture Dropzone file renames and update {} before passing to
                    //     form
                    else {
                        if (dropzone_uploaded_files[element_key] != element_value){
                            dropzone_uploaded_files[element_key] = element_value;
                        }
                    }
                }

                for (fp_key in OC.upload.fp_uploaded_files) {
                    filesUploadRenameInput = document.createElement('input');
                    filesUploadRenameInput.type = 'hidden';
                    filesUploadRenameInput.name = fp_key;
                    filesUploadRenameInput.value = fp_uploaded_files[fp_key];

                    document.querySelector('.files-upload-rename').appendChild(
                        filesUploadRenameInput);
                }

                for (dz_key in OC.upload.dropzone_uploaded_files) {
                    filesUploadRenameInput = document.createElement('input');
                    filesUploadRenameInput.type = 'hidden';
                    filesUploadRenameInput.name = dz_key;
                    filesUploadRenameInput.value = dropzone_uploaded_files[dz_key];

                    document.querySelector('.files-upload-rename').appendChild(
                        filesUploadRenameInput);
                }
            }
        },

        sending: function(file, xhr, formData){
            var getCookie = function(name) {
                var cookieValue = null, cookies, i, cookie;
                if (document.cookie && document.cookie !== '') {
                    cookies = document.cookie.split(';');
                    for (i = 0; i < cookies.length; i++) {
                        cookie = cookies[i].trim();
                        // Does this cookie string begin with the name we want?
                        if (cookie.substring(0, name.length + 1) === (name + '=')) {
                            cookieValue = decodeURIComponent(
                                cookie.substring(name.length + 1));
                            break;
                        }
                    }
                }
                return cookieValue;
            };

            var sameOrigin = function(url) {
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
            };

            var safeMethod = function(method) {
                return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
            };
            
            var url = this.options.url;

            // HACK(Varun): Modified from original if statement, because the method
            //     is not available to us here. Original 'if' below:
            //     if (!safeMethod(settings.type) && sameOrigin(url))

            if (sameOrigin(url)) {
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }

            // Append the values of user, project and collection ID
            formData.append('user', OC.config.user.id);

            var collectionInput = document.querySelector('.upload-dialog form input[name=collection]');

            if (collectionInput) formData.append('collection', collectionInput.value);

            if (Upload.isPost) {
                Upload.addToUploadList(null, file.name, 0, 'dropzone-item');
            }
        },

        // TODO(Varun): Add the project/user + collection ID to the Dropzone request
        // In the case of posting a single item, bind upload progress event with template.
        uploadprogress: function(file, progress, bytesSent){
            if (Upload.isPost){
                $('.single-upload .dz-progress .dz-upload').css('width', progress + '%');
            }
        },

        success: function(file, response){
            var key;
            var response_object = JSON.parse(response);
            for (key in response_object) {
                Upload.dropzone_uploaded_files[key] = response_object[key]['title'];
            }

            // Because there is no hook for the generated HTML, there is no way to
            //     programatically pass in the class for the <span> that holds the
            //     original filename. So have to inject the class manually.
            function getSpanThatContains(els, text){
                var i, el;
                for (i = 0; i < els.length; i++){
                    el = els[i];
                    if (el.innerHTML.indexOf(text) !== -1) return el;
                }
                return null;
            }

            OC.$.addClass(getSpanThatContains(document.querySelectorAll(
                '.dz-preview .dz-filename > span'), Upload.dropzone_uploaded_files[key]), key);

            // Make the name of the file content editable.
            file.previewElement.querySelector('.dz-filename span').setAttribute('contenteditable', true);

            Upload.newFileUploadListener();

            if (Upload.isPost) {
                Upload.updateSingleItemKey(key);
            }
        }


    };


    filepicker.setKey(Upload.filepickerKey);

    Upload.isPost = document.querySelector('form.files-upload-rename input[name="post"]').value === 'true';

    // Prevent form being submitted on hitting enter
    OC.$.addListener(document.querySelector('form.files-upload-rename'), 'keypress', function (e) {
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

    for (var service in uploadButtonServicesMap){
        OC.$.addListener(document.querySelector(service), 'click', function(event){
            Upload.launchFilepickerDialog(event, uploadButtonServicesMap[service]);
        });
    }

    OC.$.addListener(document.querySelector('form.files-upload-rename button[type=submit]'), 'click', function(event) {
        Upload.preSubmissionHandler(event);
        if (Upload.isPost){
            return false;
        }
        return true;
    });

    // Bind the 'Select file' button to the uploading mechanism.
    OC.$.addListener(document.querySelector('button[name=select-file]'), 'click', function(event){
        if (Upload.isPost) document.querySelector('.upload-drag-drop').click();
        else document.querySelector('input[class=manual-upload]:last').click();

        event.preventDefault();
        event.stopPropagation();
        return false;
    });

    // Setup dropzone.
    var uploadDragDrop = document.querySelector('.upload-drag-drop');
    if (uploadDragDrop){
        var uploadDZ = new Dropzone('.upload-dialog .upload-drag-drop', {
            url: '/api/file-upload/',
            maxFilesize: 5,
            createImageThumbnails: false,
            init: function(){
                this.on('sending', Upload.sending);
                this.on('uploadprogress', Upload.uploadprogress);
                this.on('success', Upload.success);
            }
        });
    }

    OC.$.addListener(document.querySelector('input[type=file]'), 'change', Upload.onFileInputChange);

    return Upload;
});
