define(['react', 'core_light', 'immutable'], function(React, OC, Immutable){
    var iList = Immutable.List;
    var Files = {
        files: React.createClass({
            getInitialState: function(){
                return {selectedFiles: [],
                    files: iList(),
                    folders: OC.config.user.id === OC.config.profile.id && OC.config.hasOwnProperty('organization') && OC.files.isHome ? iList(
                        [Immutable.Map({title: 'My Google Drive', modified: new Date().toISOString(),
                            url: OC.files.driveURL, drive: true})]) : iList(),
                    showCreateMenu: false,
                    mode: OC.files.drive === true ? 'view' : (
                        OC.config.user.id === OC.config.profile.id ? 'edit' : 'view')
                };
            },
            load: function(){
                var view = this;
                require(['atomic'], function(atomic){
                    //if (Files.hasOwnProperty('spinner')) Files.spinner.spin(loadButton);

                    atomic.get('/resources/api/folder/' + OC.config.profile.id + '/' + OC.files.folderID + '/from/0/tfi/')
                    .success(function(response, xhr){
                        response.folders.forEach(function(folder){folder.selected = false; });
                        response.files.forEach(function(file){file.selected = false; });

                        OC.files.itemsCount += response.files.length;
                        view.setState({
                            files: view.state.files.concat(Immutable.fromJS(response.files)),
                            folders: view.state.folders.concat(Immutable.fromJS(response.folders))
                        });
                        
                        //OC.$.removeClass(loadButton, 'loading');
                        //OC.$.addClass(loadButtonWrapper, 'hide');
                        Files.spinner.stop();
                    });
                });
            },
            gLoad: function(){
                var view = this;

                /** Google Drive part **/
                var getFilesFolders = function(googleDriveListing){
                    var files = [], folders = [], i;

                    var rawFile, file;
                    for (i = 0; i < googleDriveListing.items.length; i++){
                        rawFile = googleDriveListing.items[i];
                        file = Immutable.Map({
                            title: rawFile.title,
                            modified: rawFile.modifiedDate,
                            visibility: 'private',
                            url: rawFile.alternateLink
                        });

                        if (rawFile.mimeType === 'application/vnd.google-apps.folder') folders.push(file);
                        else files.push(file.set('file', true));
                    }

                    return [iList(files), iList(folders)];
                };

                var listDrive = function(){
                    var request = gapi.client.drive.files.list();
                    request.execute(function(response){
                        var filesFolders = getFilesFolders(response);
                        view.setState({
                            files: filesFolders[0],
                            folders: filesFolders[1]
                        });
                        Files.spinner.stop();
                    });
                };

                require(['gapi']);
                window.gReady = function(){
                    gapi.auth.authorize({'client_id': '747453362533.apps.googleusercontent.com',
                        'scope': 'https://www.googleapis.com/auth/drive.readonly',
                        'immediate': true
                    },
                        function(){
                        gapi.client.load('drive', 'v2', function() {
                            listDrive();
                        });
                    });
                };
                /** End of Google Drive part **/
            },
            componentDidMount: function(){
                var loadButton = document.querySelector('.ajax-loader'),
                loadButtonWrapper = document.querySelector('.ajax-loader-wrapper'),
                view = this, url;

                function loadSpinner(callback){
                    // Set spinner on loading button area.
                    require(['spin'], function(Spinner){
                        if (! Files.hasOwnProperty('spinner')){
                            Files.spinner = new Spinner(OC.spinner.options).spin(loadButton);
                        } else Files.spinner.spin(loadButton);

                        callback();
                    });
                }

                loadSpinner(function(){
                    //OC.files.drive === true ? view.gLoad : view.load);
                    (OC.files.drive === true ? view.gLoad : view.load)();
                });

                function resizeUI(){
                    view.refs.tableWrapper.getDOMNode().style.height = (
                        parseInt(window.innerHeight, 10) - parseInt(OC.$.css(document.querySelector(
                            '.content-panel header'), 'height'), 10) - parseInt(OC.$.css(document.querySelector(
                            '.content-panel-body-title-bar-wrapper'), 'height'), 10) + 'px');

                    view.refs.titleBarWrapper.getDOMNode().style.width = (
                        OC.$.css(document.querySelector('.content-panel header'), 'width'));
                }
    
                resizeUI();
                window.addEventListener('resize', resizeUI);

                if (OC.config.user.id === OC.config.profile.id)
                    OC.utils.menu(this.getDOMNode().querySelector('nav.files-create-menu'),
                        this.refs.create.getDOMNode());
            },
            renderFile: function(file){
                file = file.toJS();
                file.onFileSelected = this.onFileSelected;

                return Files.file(file);
            },

            renderFolder: function(folder){
                folder = folder.toJS();
                folder.onFileSelected = this.onFileSelected;

                return Files.file(folder);
            },

            onFileSelected: function(fileProps){
                itemType = fileProps.file ? 'files' : 'folders';

                var j, fileList = this.state[itemType];
                for (j = 0; j < fileList.size; j++){
                    if (fileList.get(j).get('id') === fileProps.id) break;
                }

                var file = fileList.get(j).set('selected', !fileList.get(j).get('selected'));

                var selectedFiles = this.state.selectedFiles;
                if (file.get('selected') === false){
                    var elementPosition = selectedFiles.indexOf(fileList.get(j));
                    selectedFiles.splice(elementPosition, 1);
                } else {
                    selectedFiles.push(fileList.get(j));
                }

                var view = this;
                newState = this.state;
                newState[itemType] = fileList.set(j, file);
                newState.selectedFiles = selectedFiles;

                view.replaceState(newState, function(){
                    view.selectedFilesChanged();
                });
            },


            selectedFilesChanged: function(){
                if (this.state.selectedFiles.length >= 1){
                    // Animation to load the buttons

                    if (this.state.selectedFiles.length === 1)
                        this.enableButtons(['share-button', 'rename-button']);
                    else
                        this.disableButtons(['share-button', 'rename-button']);

                    this.enableButtons(['move-button', 'copy-button', 'delete-button']);
                } else {
                    //this.disableButtons(['move-button', 'copy-button', 'delete-button',
                    //    'rename-button', 'share-button']);

                    // Hide the buttons
                }
            },

            enableButtons: function(buttons){
                var i, el;
                for (i = 0; i < buttons.length; i++){
                    el = this.refs[buttons[i]].getDOMNode();
                    OC.$.removeClass(el, 'disabled');
                    el.disabled = false;
                }
            },

            disableButtons: function(buttons){
                var i, el;
                for (i = 0; i < buttons.length; i++){
                    el = this.refs[buttons[i]].getDOMNode();
                    OC.$.addClass(el, 'disabled');
                    el.disabled = true;
                }
            },

            /******************** MOVE *************************/

            move: function(event){
                var view = this, movePopup = OC.utils.popup('.move-file-folder-dialog'),
                    folderBrowser = document.querySelector('.move-file-folder-browser');

                // Clear contents from previous tree popup and set loading class.
                folderBrowser.innerHTML = '';
                OC.$.addClass(folderBrowser, 'loading-browser');

                // Bind the 'Done' button on the popup.
                OC.$.addListener(movePopup.dialog.querySelector('.move-file-folder-submit-button'), 'click', function(event){
                    // Capture currently selected collection.
                    var toFolder = folderBrowser.querySelector('.selected-destination-collection');

                    movePopup.close();

                    if (toFolder){
                        var toFolderID = toFolder.id.substring(11);

                        // Loop through all selected resources.
                        var i, filesMoved = [], foldersMoved = [],
                            selectedFiles = view.state.selectedFiles, fileFolder;
                        for (i = 0; i < selectedFiles.length; i++){
                            //fileFolder = OC.$.closest(selectedFiles[i], '.resource-collection-item');
                            fileFolder = selectedFiles[i];

                            if (fileFolder.get('file') === false){
                                view.moveFolderIntoFolder(fileFolder, toFolderID);
                                foldersMoved.push(fileFolder);
                            } else {
                                view.moveFileIntoFolder(fileFolder, toFolderID);
                                filesMoved.push(fileFolder);
                            }
                        }

                        // Set confirmation message
                        view.movedIntoFolder(filesMoved, foldersMoved);
                    }
                });

                require(['atomic'], function(atomic){
                    atomic.get('/resources/tree/collections/user/')
                    .success(function(response, xhr){
                        if (response.status == 'true'){
                            OC.utils.browser(
                                response.tree, folderBrowser, OC.files.folderID);
                            OC.$.removeClass(folderBrowser, 'loading-browser');
                        }
                        else {
                            //OC.popup(response.message, response.title);
                        }
                    });
                });

                event.stopPropagation();
                event.preventDefault();
                return false;
            },

            moveFolderIntoFolder: function(fromFolder, toFolderID){
                var currentFolderID = OC.files.folderID, view = this;

                require(['atomic'], function(atomic){
                    atomic.get('/resources/move/collection/' + fromFolder.get('id') + '/from/' +
                        currentFolderID + '/to/' + toFolderID + '/')
                    .success(function(response, xhr){
                        if (response.status == 'true'){
                            view.fileFolderMoved(fromFolder);
                        } else {
                            //OC.popup(response.message, response.title);
                        }
                    });
                });
            },

            moveFileIntoFolder: function(file, toFolderID){
                var currentFolderID = OC.files.folderID, view = this;

                require(['atomic'], function(atomic){
                    atomic.get('/resources/move/resource/' + file.get('id') + '/from/' +
                    currentFolderID + '/to/' + toFolderID + '/')
                    .success(function(response, xhr){
                        if (response.status == 'true'){
                            view.fileFolderMoved(file);
                        }
                        else {
                            //OC.popup(response.message, response.title);
                        }
                    });
                });
            },

            fileFolderMoved: function(movedFileFolder){
                var position, itemType = movedFileFolder.get('file') ? 'files' : 'folders';
                this.state[itemType].find(function(file, index){
                    position = index;
                    return file.get('id') === movedFileFolder.get('id');
                });

                newState = {};
                newState[itemType] = this.state[itemType].remove(position);
                this.state.selectedFiles.splice(
                    this.state.selectedFiles.indexOf(movedFileFolder), 1);

                newState.selectedFiles = this.state.selectedFiles;

                this.setState(newState);
            },

            movedIntoFolder: function(files, folders){
                var movedFiles = files || [];
                var movedFolders = folders || [];

                // Generate message over project header.
                if (movedFiles.length >= 1 && movedFolders.length >= 1) {
                    OC.utils.messageBox.set(
                        'Moved files and folders successfully');
                } else if (movedFiles.length >= 1) {
                    OC.utils.messageBox.set(
                        'Moved file(s) into the folder successfully');
                } else if (movedFolders.length >= 1) {
                    OC.utils.messageBox.set(
                        'Moved folder(s) successfully');
                }

                OC.utils.messageBox.show();
            },

            /******************** COPY *************************/
            
            copy: function(event){
                // Set status to copying.
               this.copying();

                // Loop through all selected resources.
                var i, filesCopied = [], foldersCopied = [],
                    selectedFiles = this.state.selectedFiles, fileFolder;
                for (i = 0; i < selectedFiles.length; i++){
                    fileFolder = selectedFiles[i];
                    
                    if (fileFolder.get('file') === false){
                        Files.api.folder.copy(fileFolder, OC.files.folderID, this.folderCopied);
                        foldersCopied.push(fileFolder);
                    } else {
                        Files.api.file.copy(
                            OC.file.folderID, fileFolder, OC.files.folderID, this.fileCopied);
                        filesCopied.push(fileFolder);
                    }
                }

                Files.pendingActions.copyFiles.concat(filesCopied);
                Files.pendingActions.copyFolders.concat(foldersCopied);

                Files.actionCompletionCallback = this.copied;

                event.stopPropagation();
                event.preventDefault();
                return false;
            },

            copying: function(){
                OC.utils.messageBox.set('Copying...');
                OC.utils.messageBox.show();
            },

            copied: function(){
                var copiedFiles = Files.actionsCompleted.copyFiles;
                var copiedFolders = Files.actionsCompleted.copyFolders;

                // Generate message over project header.
                if (copiedFiles.length >= 1 && copiedFolders.length >= 1) {
                    OC.utils.messageBox.set(
                        'Copied files and folders successfully');
                } else if (copiedFiles.length >= 1) {
                    OC.utils.messageBox.set(
                        'Copied file(s) successfully');
                } else if (copiedFolders.length >= 1) {
                    OC.utils.messageBox.set(
                        'Copied folder(s) successfully');
                }

                OC.utils.messageBox.show();
            },

            fileCopied: function(copiedFile, file){
                copiedFile.selected = false;

                var selectedFiles = this.state.selectedFiles;
                selectedFiles.splice(selectedFiles.indexOf(file), 1);

                this.setState({
                    files: this.state.files.push(Immutable.fromJS(copiedFile)),
                    selectedFiles: selectedFiles
                });

                // Drop the action from the pending action list and announce completion.
                Files.pendingActions.copyFiles.splice(file);
                Files.actionsCompleted.copyFiles.push(file);

                Files.actionCompleted();
            },

            folderCopied: function(copiedFolder, folder){
                copiedFolder.selected = false;

                var selectedFiles = this.state.selectedFiles;
                selectedFiles.splice(selectedFiles.indexOf(file), 1);

                this.setState({
                    folders: this.state.folders.push(Immutable.fromJS(copiedFolder)),
                    selectedFiles: selectedFiles
                });

                // Drop the action from the pending action list and announce completion.
                Files.pendingActions.copyFolders.splice(folder);
                Files.actionsCompleted.copyFolders.push(folder);

                Files.actionCompleted();
            },

            /******************** RENAME *************************/

            rename: function(event){
                // Set status to copying.
                this.renaming();

                var fileFolder = this.state.selectedFiles[0],
                    view = this;

                // Launch rename dialog.
                var renameFileFolderPopup = OC.utils.popup('.rename-file-folder-dialog'),
                    nameInput = renameFileFolderPopup.dialog.querySelector('input[name="new_name"]'),
                    oldTitle = fileFolder.get('title');

                nameInput.value = oldTitle;

                (function onRenamed(){
                    OC.$.addListener(renameFileFolderPopup.dialog.querySelector(
                        '.rename-file-folder-submit-button'), 'click', function(event){
                        renameFileFolderPopup.close();
                        var newTitle = nameInput.value;

                        if (newTitle !== oldTitle){
                            var renameFiles = [], renameFolders = [];

                            if (fileFolder.get('file') === false){
                                Files.api.folder.rename(fileFolder, newTitle, view.folderRenamed);
                                renameFolders.push(fileFolder);
                            } else {
                                Files.api.file.rename(
                                    fileFolder, newTitle, view.fileRenamed);
                                renameFiles.push(fileFolder);
                            }

                            Files.pendingActions.renameFiles.concat(renameFiles);
                            Files.pendingActions.renameFolders.concat(renameFolders);

                            Files.actionCompletionCallback = view.renamed;
                        }
                        
                        // Clear the new name from the dialog. 
                        nameInput.value = '';
                        this.removeEventListener('click', onRenamed);

                        event.stopPropagation();
                        event.preventDefault();
                        return false;
                    });
                })();

                event.stopPropagation();
                event.preventDefault();
                return false;
            },

            renaming: function(){
                // NOTE: This is currently overridden by the popup that dismisses it.
                OC.utils.messageBox.set('Renaming...');
                OC.utils.messageBox.show();
            },

            renamed: function(){
                var renamedFile = Files.actionsCompleted.renameFiles;
                var renamedFolder = Files.actionsCompleted.renameFolders;

                if (renamedFile.length === 1) {
                    OC.utils.messageBox.set('Renamed file successfully');
                } else if (renamedFolder.length === 1) {
                    OC.utils.messageBox.set('Renamed folder successfully');
                }

                OC.utils.messageBox.show();
            },

            fileRenamed: function(file, newTitle){
                var position;
                this.state.files.find(function(f, index){
                    position = index;
                    return f.get('id') === file.get('id');
                });

                var modifiedFile = file.withMutations(function(originalFile){
                    originalFile.set('title', newTitle).set('selected', false);
                });

                var selectedFiles = this.state.selectedFiles;
                selectedFiles.splice(selectedFiles.indexOf(file), 1);

                this.setState({
                    files: this.state.files.set(position, modifiedFile),
                    selectedFiles: selectedFiles
                });

                // Drop the action from the pending action list and announce completion.
                Files.pendingActions.renameFiles.splice(file);
                Files.actionsCompleted.renameFiles.push(file);

                Files.actionCompleted();
            },

            folderRenamed: function(folder, newTitle){
                var position;
                this.state.folders.find(function(f, index){
                    position = index;
                    return f.get('id') === folder.get('id');
                });

                var modifiedFolder = folder.withMutations(function(originalFolder){
                    originalFolder.set('title', newTitle).set('selected', false);
                });

                var selectedFiles = this.state.selectedFiles;
                selectedFiles.splice(selectedFiles.indexOf(folder), 1);

                this.setState({
                    folders: this.state.folders.set(position, modifiedFolder),
                    selectedFiles: selectedFiles
                });

                // Drop the action from the pending action list and announce completion.
                Files.pendingActions.renameFolders.splice(folder);
                Files.actionsCompleted.renameFolders.push(folder);

                Files.actionCompleted();
            },


            /******************** DELETE *************************/

            delete: function(event){
                // Loop through all selected resources.
                var i, j, filesToDelete = [], foldersToDelete = [],
                    selectedFiles = this.state.selectedFiles, fileFolder;
                for (i = 0; i < selectedFiles.length; i++){
                    fileFolder = selectedFiles[i];
                    if (fileFolder.get('file') === false){
                        foldersToDelete.push(fileFolder);
                    } else {
                        filesToDelete.push(fileFolder);
                    }
                }

                var filesFolders = this.getSelectedFilesFolders(),
                    fileIDsToDelete = filesToDelete.map(function(file){ return file.get('id'); }),
                    folderIDsToDelete = foldersToDelete.map(function(folder){ return folder.get('id'); });

                if (filesFolders[0].length > 1 && filesFolders[1].length > 1){
                    this.setDeleteMessage(
                        'Are you sure you want to delete these files and folders? This will also ' +
                            'delete all the files and folders within these folders.',
                        'Delete files and folders'
                    );
                    Files.api.file.deleteMultiple(
                        fileIDsToDelete, OC.files.folderID, this.filesDeleted);
                    Files.api.folder.deleteMultiple(folderIDsToDelete, this.foldersDeleted);

                } else if (filesFolders[0].length > 1 && filesFolders[1].length === 1){
                    this.setDeleteMessage(
                        'Are you sure you want to delete these files and the selected folder? This will also ' +
                            'delete all the files and folders within the folder.',
                        'Delete files and folder'
                    );
                    Files.api.file.deleteMultiple(
                        fileIDsToDelete, OC.files.folderID, this.filesDeleted);
                    Files.api.folder.delete(folderIDsToDelete[0], this.foldersDeleted);

                } else if (filesFolders[0].length === 1 && filesFolders[1].length > 1){
                    this.setDeleteMessage(
                        'Are you sure you want to delete these folders and the selected file? This will also ' +
                            'delete all the files and folders within these folders.',
                        'Delete folders and file'
                    );
                    Files.api.file.delete(
                        fileIDsToDelete[0], OC.files.folderID, this.filesDeleted);
                    Files.api.folder.deleteMultiple(folderIDsToDelete, this.foldersDeleted);

                }  else if (filesFolders[0].length === 1 && filesFolders[1].length === 1){
                    this.setDeleteMessage(
                        'Are you sure you want to delete this folder and this file? This will also ' +
                            'delete all the files and folders within the folder.',
                        'Delete folder and file'
                    );
                    Files.api.file.delete(
                        fileIDsToDelete[0], OC.files.folderID, this.filesDeleted);
                    Files.api.folder.delete(folderIDsToDelete[0], this.foldersDeleted);

                }  else if (filesFolders[0].length > 1){
                    this.setDeleteMessage(
                        'Are you sure you want to delete these files?',
                        'Delete files'
                    );
                    Files.api.file.deleteMultiple(
                        fileIDsToDelete, OC.files.folderID, this.filesDeleted);

                } else if (filesFolders[1].length > 1){
                    this.setDeleteMessage(
                        'Are you sure you want to delete these folders? This will also ' +
                            'delete all the files and folders within these folders.',
                        'Delete folders'
                    );
                    Files.api.folder.deleteMultiple(folderIDsToDelete, this.foldersDeleted);

                }  else if (filesFolders[0].length === 1){
                    this.setDeleteMessage(
                        'Are you sure you want to delete this file?',
                        'Delete file'
                    );
                    Files.api.file.delete(
                        fileIDsToDelete[0], OC.files.folderID, this.filesDeleted);

                }  else if (filesFolders[1].length === 1){
                    this.setDeleteMessage(
                        'Are you sure you want to delete this folder? This will also ' +
                            'delete all the files and folders within the folder.',
                        'Delete folder'
                    );
                    Files.api.folder.delete(folderIDsToDelete[0], this.foldersDeleted);
                }

                Files.pendingActions.deleteFiles.concat(fileIDsToDelete);
                Files.pendingActions.deleteFolders.concat(folderIDsToDelete);

                Files.actionCompletionCallback = this.deleted;

                event.stopPropagation();
                event.preventDefault();
                return false;
            },

            setDeleteMessage: function(message, title){
                document.querySelector('.delete-file-folder-dialog-message').innerHTML = message;
                document.querySelector('.delete-file-folder-dialog-title').innerHTML = title;
            },

            foldersDeleted: function(deletedFolderIDs){
                var i, j, mutableFolder;
                for (i = 0; i < deletedFolderIDs.length; i++){
                    // Drop the action from the pending action list and announce completion.
                    Files.pendingActions.deleteFolders.splice(deletedFolderIDs[i]);
                    Files.actionsCompleted.deleteFolders.push(deletedFolderIDs[i]);
                }

                var selectedFiles = this.state.selectedFiles,
                    folders = this.state.folders.filter(function(f, index){
                        if (deletedFolderIDs.indexOf(f.get('id')) === -1){
                            return true;
                        } else {
                            selectedFiles.splice(selectedFiles.indexOf(f), 1);
                            return false;
                        }
                    });

                this.setState({folders: folders, selectedFiles: selectedFiles});

                /*this.setState({
                    folders: this.state.folders.withMutations(function(foldersCopy){
                        mutableFolder = foldersCopy;
                        for (j = 0; j < foldersToDeleteIndexes.size; j++){
                            mutableFolder = mutableFolder.remove(foldersToDeleteIndexes[j]);
                        }
                    })
                });*/

                Files.actionCompleted();
            },

            filesDeleted: function(deletedFilesIDs){
                var i, j, mutableFile;
                for (i = 0; i < deletedFilesIDs.length; i++){
                    // Drop the action from the pending action list and announce completion.
                    Files.pendingActions.deleteFiles.splice(deletedFilesIDs[i]);
                    Files.actionsCompleted.deleteFiles.push(deletedFilesIDs[i]);
                }

                var selectedFiles = this.state.selectedFiles,
                    files = this.state.files.filter(function(f, index){
                        if (deletedFilesIDs.indexOf(f.get('id')) === -1){
                            return true;
                        } else {
                            selectedFiles.splice(selectedFiles.indexOf(f), 1);
                            return false;
                        }
                    });

                this.setState({files: files, selectedFiles: selectedFiles});

                Files.actionCompleted();
            },

            deleted: function(){
                var deletedFiles = Files.actionsCompleted.deleteFiles;
                var deletedFolders = Files.actionsCompleted.deleteFolders;

                // Generate message over project header.
                if (deletedFiles.length >= 1 && deletedFolders.length >= 1) {
                    OC.utils.messageBox.set(
                        'Deleted files and folders successfully');
                } else if (deletedFiles.length >= 1) {
                    OC.utils.messageBox.set(
                        'Deleted file(s) successfully');
                } else if (deletedFolders.length >= 1) {
                    OC.utils.messageBox.set(
                        'Deleted folder(s) successfully');
                }

                OC.utils.messageBox.show();
            },

            getSelectedFilesFolders: function(){
                var i, files = [], folders = [],
                    selectedFiles = this.state.selectedFiles, fileFolder;
                for (i = 0; i < selectedFiles.length; i++){
                    fileFolder = selectedFiles[i];
                    if (fileFolder.get('file') === false){
                        folders.push(fileFolder);
                    } else files.push(fileFolder);
                }

                return [files, folders];
            },

            toggleCreateMenu: function(){
                var view = this;

                this.setState({showCreateMenu: !this.state.showCreateMenu}, function(){
                    if (this.state.showCreateMenu){
                        var view = this, body = document.querySelector('body');
                        body.addEventListener('click', function hideMenu(event){
                            if (view.getDOMNode() !== event.target && !view.getDOMNode(
                                ).contains(event.target)){
                                view.setState({showCreateMenu: false});

                                body.removeEventListener('click', hideMenu);

                                event.preventDefault();
                                event.stopPropagation();
                                return false;
                            }
                        });
                    }
                });
            },

            render: function(){
                if (OC.files.drive === true || (OC.files.isHome === true && OC.config.hasOwnProperty('organization')) || OC.files.itemsCount > 0){
                    return React.DOM.div({className: 'files-wrapper'}, [
                        React.DOM.div({className: 'content-panel-body-title-bar-wrapper', ref: 'titleBarWrapper'},
                            React.DOM.div({className: 'content-panel-body-title-wrapper'}, [
                                this.state.selectedFiles.length === 0 ? React.DOM.h1(
                                    {className: 'content-panel-body-title'}, 'Files') : React.DOM.div({className: 'files-button-wrapper'}, [
                                    React.DOM.button({className: 'oc-button oc-dull-button rename-button', ref: 'rename-button', onClick: this.rename}, 'Rename'),
                                    React.DOM.button({className: 'oc-button oc-dull-button move-button', ref: 'move-button', onClick: this.move}, 'Move to'),
                                    React.DOM.button({className: 'oc-button oc-dull-button delete-file-button', ref: 'delete-button', onClick: this.delete}, 'Delete'),
                                    React.DOM.button({className: 'oc-button oc-dull-button share-button', ref: 'share-button'}, 'Share'),
                                    React.DOM.button({className: 'oc-button oc-dull-button copy-button', ref: 'copy-button', onClick: this.copy}, 'Make a copy')
                                ]),
                                OC.config.user.id === OC.config.profile.id ? React.DOM.button({className: 'content-panel-body-create content-panel-body-create-files oc-button oc-page-action-button' + (
                                    this.state.showCreateMenu ? ' active' : ''), onClick: this.toggleCreateMenu, ref: 'create'}, [
                                    React.DOM.span({className: 'content-panel-body-create-title'}, '+ Create new'),
                                    React.DOM.span({className: 'content-panel-body-create-dropdown'})
                                ]) : null,
                                OC.config.user.id === OC.config.profile.id ? Files.createMenu({open: this.state.showCreateMenu}) : null
                            ])
                        ),

                        React.DOM.div({className: 'tabular-list-wrapper', ref: 'tableWrapper'},
                            React.DOM.table({className: 'tabular-list files-list'},
                                React.DOM.colgroup({}, [
                                    React.DOM.col({className: 'name-column'}),
                                    React.DOM.col({className: 'modified-column'}),
                                    React.DOM.col({className: 'actions-column'})
                                ]),
                                React.DOM.tr({}, [
                                    React.DOM.th({}, 'Name'),
                                    React.DOM.th({}, 'Last changed'),
                                    React.DOM.th({}, 'Sharing')
                                ]),
                                this.state.folders.map(this.renderFolder).toJS().concat(this.state.files.map(this.renderFile).toJS())
                            ),
                            React.DOM.div({className: 'ajax-loader-wrapper files-loader-wrapper'},
                                React.DOM.div({className: 'ajax-loader'})
                            )
                        )
                    ]);
                }
                else
                    return React.DOM.div({className: 'empty-state-title empty-state-title-independent'}, 'No files.');
            }
        }),

        createMenu: React.createClass({
            render: function(){
                return React.DOM.nav({className: 'oc-menu files-create-menu' + (this.props.open ? ' show-menu' : '')}, [
                    React.DOM.div({className: 'floating-menu-spacer'}, null),
                    React.DOM.ul({},
                        React.DOM.li({}, React.DOM.a({
                            href: '/',
                            className: 'files-create-document'
                        }, 'Document')),
                        React.DOM.li({}, React.DOM.a({
                            href: '/',
                            className: 'files-create-upload'
                        }, 'Upload')),
                        React.DOM.li({}, React.DOM.a({
                            href: '/',
                            className: 'files-create-link'
                        }, 'Website link')),
                        React.DOM.li({}, React.DOM.a({
                            href: '/',
                            className: 'files-create-folder'
                        }, 'Folder'))
                    )
                ]);
            }
        }),

        file: React.createClass({
            getInitialState: function(){
                return {selected: this.props.selected};
            },
            componentDidMount: function(){
                OC.utils.timeago(this.getDOMNode().querySelector('.file-modified'));
            },
            componentWillReceiveProps: function(nextProps){
                this.setState({selected: nextProps.selected });
            },
            cholay: function(){
                var checkbox = this.getDOMNode().querySelector('.file-selector');

                if (checkbox.checked){
                    checkbox.checked = false;
                } else {
                    checkbox.checked = true;
                }
                
                this.setState({selected: !this.props.selected});
                this.props.onFileSelected(this.props);
            },
            inputClick: function(event){
                this.setState({selected: !this.props.selected});
                this.props.onFileSelected(this.props);

                event.stopPropagation();
            },
            changeVisibility: function(event){
                alert('visibility');

                event.stopPropagation();
                event.preventDefault();
                return false;
            },
            preventPropogation: function(event){
                event.stopPropagation();
            },
            getItemVisibility: function(){
                if (this.props.user_id !== OC.config.user.id){
                    if (this.props.visibility === 'public') return 'Public';
                    else if (this.props.visibility === 'private') return 'Shared with me';
                } else {
                    if (this.props.visibility === 'public') return 'Public';
                    else if (this.props.visibility === 'private') {
                        if (this.props.collaborator_count ===  1) return 'Only me';
                        else return 'Shared';
                    }
                }
            },
            render: function(){
                return React.DOM.tr({onClick: OC.config.user.id === OC.config.profile.id ? this.cholay : null, className: this.state.selected ? 'selected' : '' }, [
                    React.DOM.td({},
                        React.DOM.input({
                            type: 'checkbox',
                            className: 'file-selector',
                            onClick: this.inputClick,
                            checked: this.state.selected ? true : false
                        }),
                        React.DOM.a({className: 'file-thumbnail' + (this.props.file ? '' : ' folder-thumbnail') + (this.props.hasOwnProperty('drive') ? ' drive-thumbnail' : '') }),
                        React.DOM.a({className: 'list-item-title', href: this.props.url, onClick: this.preventPropogation}, this.props.title)
                    ),
                    React.DOM.td({},
                        React.DOM.span({title: this.props.modified, className: 'file-modified'})
                    ),
                    React.DOM.td({},
                        React.DOM.span({
                            className: 'sharing-status',
                            onClick: this.changeVisibility
                        }, this.getItemVisibility())
                    )
                ]);
            }
        }),

        pendingActions: {
            copyFiles: [],
            copyFolders: [],

            deleteFiles: [],
            deleteFolders: [],

            renameFiles: [],
            renameFolders: []
        },

        actionsCompleted: {
            copyFiles: [],
            copyFolders: [],

            deleteFiles: [],
            deleteFolders: [],

            renameFiles: [],
            renameFolders: []
        },
        actionCompletionCallback: '',

        actionCompleted: function(){
            // Go through pending actions list to see if it is empty.
            var noPendingActions = true;

            var action;
            for (action in Files.pendingActions){
                if (Files.pendingActions[action].length >= 1){
                    noPendingActions = false;
                    break;
                }
            }

            // If pending actions is empty, call callback function for action
            //     completion.
            if (noPendingActions) Files.actionCompletionCallback();
        },

        deleting: function(){
            OC.utils.messageBox.set('Deleting...');
            OC.utils.messageBox.show();
        },

        api: {
            file: {
                copy: function(fromFolderID, file, toFolderID, callback){
                    require(['atomic'], function(atomic){
                        atomic.post('/resources/resource/' + file.get('id') + '/copy/from/' +
                            fromFolderID + '/to/' + toFolderID + '/')
                        .success(function(response, xhr){
                            if (response.status == 'true'){
                                callback(response.resource, file);
                            } else {
                                //OC.popup(response.message, response.title);
                                OC.utils.messageBox.dismiss();
                            }

                        });
                    });
                },

                /*link: function(fromCollectionID, resourceID, toCollectionID, callback){
                    $.get('/resources/resource/' + resourceID + '/link/from/' +
                        fromCollectionID + '/to/' + toCollectionID + '/',
                        function(response){
                            if (response.status == 'true'){
                                callback(response.resource, resourceID);
                            } else {
                                OC.popup(response.message, response.title);
                                OC.dismissMessageBox();
                            }
                        },
                    'json');
                },

                successfullyCopied: function(copiedResource, resourceID){
                    OC.setMessageBoxMessage('Resource has been copied to your folder successfully.');
                    OC.showMessageBox();
                },

                successfullyLinked: function(copiedResource, resourceID){
                    OC.setMessageBoxMessage('Resource has been linked in your folder successfully.');
                    OC.showMessageBox();
                },*/

                delete: function(fileID, fromFolderID, callback){
                    var deletePopup = OC.utils.popup('.delete-file-folder-dialog');

                    (function onDelete(){
                        OC.$.addListener(deletePopup.dialog.querySelector(
                            '.delete-file-folder-submit-button'), 'click', function(event){
                            deletePopup.close();
                    
                            // Set status to deleting.
                            Files.deleting();

                            require(['atomic'], function(atomic){
                                atomic.post('/resources/delete-resource/' + fileID  +
                                    '/from/' + fromFolderID + '/')
                                .success(function(response, xhr){
                                    if (response.status == 'true'){
                                        callback([response.resourceID]);
                                    }
                                    else {
                                        OC.popup(response.message, response.title);
                                        OC.utils.messageBox.dismiss();
                                    }
                                });
                            });

                            this.removeEventListener('click', onDelete);

                            event.stopPropagation();
                            event.preventDefault();
                            return false;
                        });
                    })();
                },

                deleteMultiple: function(fileIDList, fromFolderID, callback){
                    var deletePopup = OC.utils.popup('.delete-file-folder-dialog');

                    (function onDelete(){
                        OC.$.addListener(deletePopup.dialog.querySelector(
                            '.delete-file-folder-submit-button'), 'click', function(event){
                            deletePopup.close();
                            var fileIDs = fileIDList.join();
                    
                            // Set status to deleting.
                            Files.deleting();

                            require(['atomic'], function(atomic){
                                atomic.post('/resources/delete-resources/from/' + fromFolderID + (
                                    '/?ids=' + fileIDs))
                                .success(function(response, xhr){
                                    if (response.status == 'true'){
                                        callback(response.resourceIDs);
                                    }
                                    else {
                                        OC.popup(response.message, response.title);
                                        OC.utils.messageBox.dismiss();
                                    }
                                });
                            });

                            this.removeEventListener('click', onDelete);

                            event.stopPropagation();
                            event.preventDefault();
                            return false;
                        });
                    })();
                },

                rename: function(file, title, callback){
                    require(['atomic'], function(atomic){
                        atomic.post('/resources/rename/resource/' + file.get('id') + '/' + encodeURIComponent(title) + '/')
                        .success(function(response, xhr){
                            if (response.status == 'true'){
                                callback(file, response.title);
                            }
                            else {
                                OC.popup(response.message, response.title);
                                OC.dismissMessageBox();
                            }
                        });
                    });
                }
            },

            folder: {
                copy: function(folder, toFolderID, callback){
                    require(['atomic'], function(atomic){
                        atomic.post('/resources/collection/' + folder.get('id') + '/copy/to/' +
                            toFolderID + '/')
                        .success(function(response, xhr){
                            if (response.status == 'true'){
                                callback(response.collection, folder);
                            } else {
                                //OC.popup(response.message, response.title);
                                OC.utils.messageBox.dismiss();
                            }
                        });
                    });
                },

                /*successfullyCopied: function(copiedCollection, collectionID){
                    OC.setMessageBoxMessage('Folder has been copied into your folder successfully.');
                    OC.showMessageBox();
                },*/

                delete: function(folderID, callback){
                    var deletePopup = OC.utils.popup('.delete-file-folder-dialog');

                    (function onDelete(){
                        OC.$.addListener(deletePopup.dialog.querySelector(
                            '.delete-file-folder-submit-button'), 'click', function(event){
                            deletePopup.close();
                    
                            // Set status to deleting.
                            Files.deleting();

                            require(['atomic'], function(atomic){
                                atomic.post('/resources/delete-collection/' + folderID  + '/')
                                .success(function(response, xhr){
                                    if (response.status == 'true'){
                                        callback([response.collectionID]);
                                    }
                                    else {
                                        OC.popup(response.message, response.title);
                                        OC.utils.messageBox.dismiss();
                                    }
                                });
                            });

                            this.removeEventListener('click', onDelete);

                            event.stopPropagation();
                            event.preventDefault();
                            return false;
                        });
                    })();
                },

                deleteMultiple: function(folderIDList, callback){
                    var deletePopup = OC.utils.popup('.delete-file-folder-dialog');

                    (function onDelete(){
                        OC.$.addListener(deletePopup.dialog.querySelector(
                            '.delete-file-folder-submit-button'), 'click', function(event){
                            deletePopup.close();
                            var folderIDs = folderIDList.join();
                    
                            // Set status to deleting.
                            Files.deleting();

                            require(['atomic'], function(atomic){
                                atomic.post('/resources/delete-collections/?ids=' + folderIDs)
                                .success(function(response, xhr){
                                    if (response.status == 'true'){
                                        callback(response.collectionIDs);
                                    }
                                    else {
                                        OC.popup(response.message, response.title);
                                        OC.utils.messageBox.dismiss();
                                    }
                                });
                            });

                            this.removeEventListener('click', onDelete);

                            event.stopPropagation();
                            event.preventDefault();
                            return false;
                        });
                    })();
                },

                rename: function(folder, title, callback){
                    require(['atomic'], function(atomic){
                        atomic.post('/resources/rename/collection/' + folder.get('id') + '/' + encodeURIComponent(title) + '/')
                        .success(function(response, xhr){
                            if (response.status == 'true'){
                                callback(folder, response.title);
                            }
                            else {
                                OC.popup(response.message, response.title);
                                OC.dismissMessageBox();
                            }
                        });
                    });
                }
            }

        }

    };

    React.renderComponent(
        Files.files(),
        document.querySelector('.content-panel-body-wrapper')
    );
});