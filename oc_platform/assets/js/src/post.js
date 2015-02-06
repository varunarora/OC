define(['core_light', 'uploadNew'], function(OC, Upload){
    var Post = {
        _options: {},
        _postDialog: null,
        _prePostDialog: null,
        _submit: null,
        _prepFormCallback: null,
        _postURL: null,
        _postTitle: 'Post',

        init: function(options){
            _options = options;

            var browseTitleEl = document.querySelector('.browse-post-new-dialog .popup-title'),
                browseMessageEl = document.querySelector('.browse-post-new-message'),
                postTitleEl = document.querySelector('.post-new-url-dialog .popup-title'),
                submits = document.querySelectorAll('.post-new-url-submit, .post-new-file-folder-submit, .projects-progress-button');

            // Use the options to build the popup.
            browseTitleEl.innerHTML = options.title;
            browseMessageEl.innerHTML = options.message;
            postTitleEl.innerHTML = options.urlTitle;
            
            if (!options.addMeta){
                var i;
                for (i = 0; i < submits.length; i++){
                    submits[i].innerHTML = _options.postTitle || _postTitle;
                }
            }

            this.launch();

            
            /*var postTagIt = $('.post-tag-dialog .standards-input').tagit({
                fieldName: 'standard',
                autocomplete: {
                    minLength: 2,
                    source: function(request, response){
                        $.get('/meta/api/standard/search/' + request.term + '/?limit=15',
                            function (data){
                                response($.map(data, function(item){
                                    return { label: item, value: item };
                                }));
                            },
                        'json');
                    },
                }
            });*/
        },

        launch: function(){
            _postDialog = OC.utils.popup('.browse-post-new-dialog');

            this.choices();
        },

        choices: function(){
            var bindPost = this.bindPost,
                uploadOption = _postDialog.dialog.querySelector('.browse-post-new-option.upload-option'),
                folderOption = _postDialog.dialog.querySelector('.browse-post-new-option.file-folder-option'),
                urlOption = _postDialog.dialog.querySelector('.browse-post-new-option.url-option');

            function upload(){
                OC.$.addListener(uploadOption, 'click', function(event){
                    _postDialog.close();

                    // Launch the upload popup.
                    var uploadPopup = OC.utils.popup('.upload-dialog');

                    // Set the popup settings to being 'is_post'.
                    uploadPopup.dialog.querySelector('input[name="post"]').value = 'true';
                    Upload.isPost = true;

                    function pre(){
                        var title = document.querySelector('form.files-upload-rename input[name="filename"]').value,
                            input = document.createElement('input');

                        input.name = 'title';
                        input.title = title;

                        document.querySelector('form.files-upload-rename').appendChild(input);
                    }

                    bindPost('form.files-upload-rename button[type="submit"]',
                        uploadPopup, true, _options.uploadPostURL, pre);
                });
            }

            function folder(){
                OC.$.addListener(folderOption, 'click', function(event){
                    _postDialog.close();

                    // Launch the upload popup.
                    var fileFolderPopup = OC.utils.popup('.post-new-file-folder-dialog'),
                        filesBrowser = document.querySelector('.post-new-file-folder-profile-browser');

                    require(['atomic'], function(atomic){
                        atomic.get('/resources/tree/all/user/')
                        .success(function(response, xhr){
                            if (response.status == 'true'){
                                OC.utils.browser(response.tree, filesBrowser);
                                OC.$.removeClass(filesBrowser, 'loading-browser');
                                fileFolderPopup.reposition(fileFolderPopup);
                            }
                            else {
                                //OC.popup(response.message, response.title);
                            }
                        });
                    });

                    // Bind 'attach' button click handler.
                    function pre(){
                        // If the active tab is projects.
                        var selectedResourceCollection = filesBrowser.querySelector(
                            '.selected-destination-collection, .selected-destination-resource');

                        if (selectedResourceCollection){
                            var elementID = selectedResourceCollection.id,
                                resource = elementID.indexOf('resource') != -1;

                            var resourceCollectionID = resource ? elementID.substring(9) : elementID.substring(11);

                            // Append the resource/collection ID to the form.
                            document.querySelector('#post-new-file-folder-profile-form input[name=is_resource]').value = resource;
                            document.querySelector('#post-new-file-folder-profile-form input[name=resource_collection_ID]').value = resourceCollectionID;
                            document.querySelector('#post-new-file-folder-profile-form input[name=title]').value = selectedResourceCollection.innerHTML;
                        }
                    }

                    bindPost('.post-new-file-folder-submit', fileFolderPopup,
                        true, _options.existingPostURL, pre);
                });
            }

            function url(){
                OC.$.addListener(urlOption, 'click', function(event){
                    _postDialog.close();

                    // Launch the upload popup.
                    var newURLPopup = OC.utils.popup('.post-new-url-dialog');

                    bindPost('.post-new-url-submit', newURLPopup,
                        true, _options.urlPostURL);
                });
            }

            // Remove previous bindings to these methods.
            uploadOption.removeEventListener('click', upload);
            folderOption.removeEventListener('click', folder);
            urlOption.removeEventListener('click', url);

            upload();
            folder();
            url();
        },

        post: function(event){
            _prePostDialog.close();

            if (_options.addMeta) {
                var postTagDialog = OC.utils.popup('.post-tag-dialog');

                OC.$.addListener(postTagDialog.dialog.querySelector('.post-tag-submit'), 'click', function(event){
                    // Add the resource type and tags to the form URL post form.
                    var resourceType = postTagDialog.dialog.querySelector('select[name=type]').value,
                        newTypeInput = document.createElement('input');

                    newTypeInput.name = 'type';
                    newTypeInput.value = resourceType;
                    newTypeInput.type = hidden;

                    var dialogForm = _prePostDialog.dialog.querySelector('form:first'),
                        standardTags = postTagDialog.dialog.querySelector('input[name="standard"]'), i;
                    
                    dialogForm.appendChild(standardTags.clone());
                    dialogForm.appendChild(newTypeInput);

                    // Submit the form.
                    if (_submit) dialogForm.submit();
                });

            } else {
                if (_prepFormCallback) _prepFormCallback();

                var dialogForm = _prePostDialog.dialog.querySelector('form');

                var serialiedForm = OC.$.serialize(dialogForm);
                for (var d in _options.toAppendFormData)
                    serialiedForm[d] = _options.toAppendFormData[d];

                var newTitle = _prePostDialog.dialog.querySelector('input[name="title"]');
                if (newTitle) serialiedForm['title'] = newTitle.value;

                Post.complete(serialiedForm, _postURL);
            }

            event.stopPropagation();
            event.preventDefault();
            return false;
        },

        bindPost: function(buttonSelector, $dialog, submit, postURL, prepFormCallback){
            $dialog.dialog.querySelector(buttonSelector).removeEventListener('click', Post.post);
            OC.$.addListener($dialog.dialog.querySelector(
                buttonSelector), 'click', Post.post);

            _prePostDialog = $dialog;
            _submit = submit;
            _postURL = postURL;
            _prepFormCallback = prepFormCallback;
        },

        complete: function(data, url){
            var ref = null, options = _options;
            if (_options.sent) ref = _options.sent({ title: data.title });

            require(['atomic'], function(atomic){
                atomic.post(url, data)
                .success(function(response, xhr){
                    options.callback(response, ref);
                });
            });
        }
    };

    return Post;
});