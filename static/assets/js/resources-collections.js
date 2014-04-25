OC.resourcesCollections = {
    resourceCollectionCollaboratorTemplate: _.template('<li class="collaborator-item user" id="user-<%= id %>">' +
        '<div class="collaborator-info user-info">' +
        '<div class="collaborator-photo user-photo" style="background-image: url(\'<%= profile_pic %>\')"></div>' +
        '<div class="collaborator-description user-description">' +
        '<a href="/user/<%= username %>"><%= name %></a></div></div>' +
        '<div class="collaborator-actions user-actions">' +
        '<span class="delete-member delete-button" title="Remove collaborator"></span>' +
        '</div></li>'),

    resourceItemTemplate: _.template('<div class="<%= host %>-browse-item resource-collection-item resource <%= type %>-resource" id="resource-<%= id %>">' +
        '<input type="checkbox" name="resource_id" value="<%= id %>"/>' +
        '<a href="<%= url %>"><%= title %> <span class="<%= host %>-browse-item-date"><%= created %></span>' +
        '<div class="resource-collection-actions <%= resource_type %> <%= is_collaborator %> is-owner">' +
        '<span class="<%= host %>-browse-item-visibility browse-item-visibility visibility-<%= visibility %>" title=" '+
        'Who has access: <%= access %>"></span><div class="<%= host %>-resource-delete resource-collection-delete" id="resource-<%= id %>" title="Delete"></div>' +
        '</div></a></div>'),

    collectionItemTemplate: _.template('<div class="<%= host %>-browse-item resource-collection-item directory " id="collection-<%= id %>">' +
        '<input type="checkbox" name="collection_id" value="<%= id %>"/>' +
        '<a href="<%= url %>"><%= title %> <span class="<%= host %>-browse-item-date"><%= created %></span>' +
        '<div class="resource-collection-actions <%= collection_type %> <%= is_collaborator %> is-owner">' +
        '<span class="<%= host %>-browse-item-visibility browse-item-visibility visibility-<%= visibility %>" title=" '+
        'Who has access: <%= access %>"></span><div class="<%= host %>-collection-delete resource-collection-delete" id="collection-<%= id %>" title="Delete"></div>' +
        '</div></a></div>'),

    currentResourceCollectionVisibility: '',

    initFavoriteStates: function(){
        var resourceCollectionItem, resourceFavoriteWrapper, resourceFavoriteButton;

        function setFavoriteState(resourceID, state){
            resourceCollectionItem = $(
                '.resource-collection-item#resource-' + resourceID);
            var resourceFavoriteButton = $(
                '.resource-favorite', resourceCollectionItem),
                resourceFavoriteWrapper = $(
                    '.resource-favorite-wrapper', resourceCollectionItem);
            if (state){
                resourceFavoriteWrapper.addClass(
                    'favorited');
                resourceFavoriteButton.text('Favorited');
            }

            resourceFavoriteButton.click(function(event){
                OC.favoriteClickHandler(
                    'resource', resourceID,
                    OC.config.user.id, resourceFavoriteWrapper, event
                );
            });

        }

        var resourcesCollections = $('.resource-collection-item');

        var i, resourceID;
        for (i = 0; i < resourcesCollections.length; i++){
            resourceID = $(resourcesCollections[i]).attr('id').substring(9);
            OC.getFavoriteState('resource', resourceID, setFavoriteState);
        }
    },

    initCopyAction: function(){
        var resourcesCollections = $('.resource-collection-item'),
            resourceCollectionSet = $('.resources-collections-added');
        
        var currentCollectionID;
        if (resourceCollectionSet.length >= 1){
            currentCollectionID =  resourceCollectionSet.attr('id').substring(11);
        }

        var i, loadingPopup;
        for (i = 0; i < resourcesCollections.length; i++){
            var resourceID, collectionID, resourceCopyButton;
            resourceCollectionItem = $(resourcesCollections[i]);
            resourceCollectionCopyButton = $(
                '.resource-copy', resourceCollectionItem);

            if (resourceCollectionItem.hasClass('collection')){
                collectionID = resourceCollectionItem.attr('id').substring(11);
            } else {
                resourceID = resourceCollectionItem.attr('id').substring(9);
                collectionID = undefined;
            }

            if (currentCollectionID){
                if (collectionID){
                    OC.resourcesCollections.bindResourceCollectionCopyButton(
                        'collection', collectionID, currentCollectionID);
                } else {
                    OC.resourcesCollections.bindResourceCollectionCopyButton(
                        'resource', resourceID, currentCollectionID);
                }
            } else {
                if (collectionID){
                    OC.resourcesCollections.fetchParentCollectionAndBindCopyButton(
                        'collection', collectionID, OC.resourcesCollections.bindResourceCollectionCopyButton);
                } else {
                    OC.resourcesCollections.fetchParentCollectionAndBindCopyButton(
                        'resource', resourceID, OC.resourcesCollections.bindResourceCollectionCopyButton);
                }
            }
        }
    },

    synchronizeSelectors: function(){
        var thumbnail, resourceCollectionCheckbox,
            thumbnails = $('.resource-item-thumbnail-selector');

        // Synchonize the checkbox value with the thumbnail.
        var i = 0;
        for (i = 0; i < thumbnails.length; i++){
            thumbnail = $(thumbnails[i]);
            resourceCollectionCheckbox = thumbnail.parents(
                '.resource-collection-item').find('input[name=resource_collection_id]')[0];

            if (resourceCollectionCheckbox.checked){
                console.log(thumbnail);
                thumbnail.addClass('selected');
            } else {
                thumbnail.removeClass('selected');
            }
        }

    },

    bindThumbnailSelect: function(){
        var thumbnail, resourceCollectionCheckbox,
            thumbnails = $('.resource-item-thumbnail');

        $('.resource-item-thumbnail').click(function(event){
            thumbnail = $(event.target);
            resourceCollectionCheckbox = $(event.target).parents(
                '.resource-collection-item').find('input[name=resource_collection_id]');

            resourceCollectionCheckbox.trigger('click');
            thumbnail.toggleClass('selected');
        });
    },

    bindResourceCollectionCopyButton: function(itemType, resourceCollectionID, currentCollectionID){
        resourceCollectionCopyButton.click(function(event){
            OC.addCopyClickHandler(itemType, resourceCollectionID, currentCollectionID, event);
        });
    },

    fetchParentCollectionAndBindCopyButton: function(itemType, resourceCollectionID, callback){
        if (itemType === 'collection'){
            $.get('/resources/parent-collection-from-collection/' + resourceCollectionID + '/',
                function(response){
                    if (response.status == 'true'){
                        callback('collection', collectionID, response.collectionID);
                    }
                    else {
                        OC.popup(response.message, response.title);
                    }
                },
            'json');
        } else {
            $.get('/resources/collection-from-resource/' + resourceCollectionID + '/',
                function(response){
                    if (response.status == 'true'){
                        callback('resource', resourceID, response.collectionID);
                    }
                    else {
                        OC.popup(response.message, response.title);
                    }
                },
            'json');
        }
    },

    bindItemVisibilityButton: function(){
        $('.browse-item-visibility').click(
            OC.resourcesCollections.itemVisibilityButtonClickHandler);
    },

    itemVisibilityButtonClickHandler: function(event){
        // Check to see if the user is allow to change to visibility or members.
        var actionsWrapper = $(event.target);

        if (actionsWrapper.hasClass('is-owner') || actionsWrapper.hasClass(
            'is-collaborator')){

            // Is this resource/collection a part of a project or not.
            var isProject = actionsWrapper.hasClass('project-browse-item-visibility');

            // Get wrapping resource/collection element.
            var resourceCollectionItem = $(event.target).closest('.resource-collection-item');

            OC.customPopup('.resource-collection-visibility-dialog', {
                closeCallback: OC.resourcesCollections.closeCollaboratorPopupCallback
            });

            var isOwner = actionsWrapper.hasClass('is-owner');

            var collaboratorForm = $('#add-collection-collaborator-form');
            var collaboratorInput = $('input[name=add-collaborator]', collaboratorForm);
            collaboratorInput.focus();

            // Nested if/else to figure out the visibility of the resource/collection.
            OC.resourcesCollections.currentResourceCollectionVisibility = OC.resourcesCollections.getResourceCollectionVisibility(
                actionsWrapper, isProject);

            // Empty contents of collaborator input.
            collaboratorInput.val('');

            // Get the list of current collaborators and place in popup list.
            var userList = $('ul.collaborators', collaboratorForm);

            // Clear current list.
            userList.children().remove();

            // Unbind all previously registered events from tabs.
            $('.resource-collection-visibility-form-tabs li a').unbind('click');

            if (resourceCollectionItem.hasClass('collection')){
                // Setup the popup.
                var collectionID = resourceCollectionItem.attr('id').substring(11);
                $('input[name=collection_id]', collaboratorForm).val(collectionID);

                // Re-initiate autocomplete add-a-collaborator-to-collection
                //     functionality.
                OC.resourcesCollections.addCollaborator(true);

                userList.addClass('waiting');
                $.get('/resources/collection/' + collectionID + '/list-collaborators/',
                    function (response) {
                        if (response.status === 'true'){
                            OC.resourcesCollections.listCollaboratorsHandler(response);
                        } else {
                            OC.popup(response.message, response.title);
                        }

                        // Clear spinner from the user listing.
                        userList.removeClass('waiting');
                    },
                'json');

                // Make requests everytime the user clicks on a visibility button.
                OC.resourcesCollections.collectionVisibility.setupToggler(
                    collectionID, isProject);
            } else {
                // Setup the popup.
                var resourceID = resourceCollectionItem.attr('id').substring(9);
                $('input[name=resource_id]', collaboratorForm).val(resourceID);

                // Re-initiate autocomplete add-a-collaborator-to-a-resource
                //     functionality.
                OC.resourcesCollections.addCollaborator(false);

                userList.addClass('waiting');
                $.get('/resources/resource/' + resourceID + '/list-collaborators/',
                    function (response) {
                        if (response.status === 'true'){
                            OC.resourcesCollections.listCollaboratorsHandler(response);
                        } else {
                            OC.popup(response.message, response.title);
                        }

                        // Clear spinner from the user listing.
                        userList.removeClass('waiting');
                    },
                'json');

                // Make requests everytime the user clicks on a visibility button.
                OC.resourcesCollections.resourceVisibility.setupToggler(
                    resourceID, isProject);
            }

            if (isProject){
                // Get current visibility of the project.
                // TODO(Varun): Make projectID retrieval less hackish.
                var projectID = $('#add-collection-collaborator-form input[name=project_id]').val();
                $.get('/group/' + projectID + '/visibility/',
                    function (response) {
                        if (response.status === 'true'){
                            // Set the body of the project visibility tab accordingly.
                            var projectAccessWrapper = $(
                                '.resource-collection-visibility-form-content .project-access');
                            if (response.visibility === 'private'){
                                projectAccessWrapper.text('This group is private, so only ' +
                                    'the members of this project can see this.');
                            } else if (response.visibility === 'public'){
                                projectAccessWrapper.text('This group is public, so ' +
                                    'everyone can see this.');
                            }
                        } else {
                            OC.popup(response.message, response.title);
                        }
                    },
                'json');
            }

            OC.tabs('.resource-collection-visibility-form', {
                // Select the second tab (with index starting at 0)
                tab: OC.resourcesCollections.currentResourceCollectionVisibility == 'private' ? 1:0,
                showOnly: isOwner ? null : 1,
            });
        }

        event.stopPropagation();
        event.preventDefault();
        return false;
    },

    addCollaborator: function(isCollection){
        var collaboratorForm = $('#add-collection-collaborator-form');
        var addCollaboratorInput = $('input[name=add-collaborator]', collaboratorForm);
        var collectionID = $('input[name=collection_id]', collaboratorForm).val();
        var resourceID = $('input[name=resource_id]', collaboratorForm).val();

        addCollaboratorInput.autocomplete({
            source: function(request, response){
                $.get('/user/api/list/' + request.term,
                    function (data){
                        response($.map(data, function(item){
                            // TODO (Varun): Remove existing users.
                            return {
                                label: item.name,
                                value: item.username,
                                id: item.id
                            };
                        }));
                    }, 'json');
            },
            minLength: 2,
            select: function(event, ui){
                // Show the spinner as soon as the 'Add' button is clicked.
                addCollaboratorInput.addClass('waiting');

                if (isCollection){
                    // Submit the add request through the project API        
                    $.get('/resources/collection/' + collectionID + '/add/' + ui.item.id + '/',
                        function (response) {
                            var userList = $('#add-collection-collaborator-form ul.collaborators');
                            OC.resourcesCollections.addCollaboratorHandler(response.user, userList);
                        
                            // Clear contents from the input box
                            addCollaboratorInput.val('');
                            addCollaboratorInput.removeClass('waiting');
                        },
                    'json');
                } else {
                    // Submit the add request through the project API        
                    $.get('/resources/resource/' + resourceID + '/add/' + ui.item.id + '/',
                        function (response) {
                            var userList = $('#add-collection-collaborator-form ul.collaborators');
                            OC.resourcesCollections.addCollaboratorHandler(response.user, userList, isCollection);
                        
                            // Clear contents from the input box
                            addCollaboratorInput.val('');
                            addCollaboratorInput.removeClass('waiting');
                        },
                    'json');
                }

            }
        });
    },

    addCollaboratorHandler: function(user, userList, isCollection){
        collaborator = OC.resourcesCollections.resourceCollectionCollaboratorTemplate(user);
        userList.append(collaborator);

        // Bind delete action with each user.
        var newUserDeleteButton = userList.find(
            'li.collaborator-item:last .delete-button');
        newUserDeleteButton.click(function(event){
            OC.resourcesCollections.removeCollaboratorHandler(event, isCollection);
        });

        // Tipsy the collaborator.
        newUserDeleteButton.tipsy({gravity: 'n'});
    },

    listCollaboratorsHandler: function(response){
        var userList = $('#add-collection-collaborator-form ul.collaborators');

        var i, collaborator;
        for (i = 0; i < response.users.length; i++){
            OC.resourcesCollections.addCollaboratorHandler(response.users[i], userList);
        }
    },

    getResourceCollectionVisibility: function(element, isProject){
        return element.hasClass(
            'visibility-private') ? 'private' : (isProject ? 'project' : 'public');
    },

    collectionVisibility: {
        setupToggler: function(collectionID, isProject){
            var collectionVisibility = $('.resources-collections-added #collection-' +
                    collectionID + ' .browse-item-visibility');

            if (isProject){
                var projectVisibilityTab = $(
                    '.resource-collection-visibility-form-tabs li a[href=".project-access"]');

                projectVisibilityTab.click(function(){
                    OC.resourcesCollections.collectionVisibility.setProjectVisibility(collectionVisibility, collectionID);
                });
            } else {
                var publicVisibilityTab = $(
                    '.resource-collection-visibility-form-tabs li a[href=".profile-access"]');

                publicVisibilityTab.click(function(){
                    OC.resourcesCollections.collectionVisibility.setPublicVisibility(collectionVisibility, collectionID);
                });
            }

            var privateVisibilityTab = $(
                '.resource-collection-visibility-form-tabs li a[href=".private-access"]');

            privateVisibilityTab.click(function(){
                OC.resourcesCollections.collectionVisibility.setPrivateVisibility(collectionVisibility, collectionID);
            });
        },

        setProjectVisibility: function(collectionVisibility, collectionID){
            $.get('/resources/collection/' + collectionID + '/visibility/project/');

            // Remove the private visibility class on the collection.
            collectionVisibility.removeClass('visibility-private');

            // Add the project visibility class on the collection.
            collectionVisibility.addClass('visibility-project');
            collectionVisibility.html(
                '<span class="group-shared-icon"></span>Shared with group');
        },

        setPrivateVisibility: function(collectionVisibility, collectionID){
            $.get('/resources/collection/' + collectionID + '/visibility/private/');

            // Remove the private & public visibility class on the collection.
            collectionVisibility.removeClass('visibility-project');
            collectionVisibility.removeClass('visibility-public');

            // Add the project visibility class on the collection.
            collectionVisibility.addClass('visibility-private');
            collectionVisibility.html(
                '<span class="private-shared-icon"></span>Shared');
        },

        setPublicVisibility: function(collectionVisibility, collectionID){
            $.get('/resources/collection/' + collectionID + '/visibility/public/');

            // Remove the private visibility class on the collection.
            collectionVisibility.removeClass('visibility-private');

            // Add the public visibility class on the collection.
            collectionVisibility.addClass('visibility-public');
            collectionVisibility.html(
                '<span class="publicly-shared-icon"></span>Public');
        }
    },

    resourceVisibility: {
        setupToggler: function(resourceID, isProject){
            var resourceVisibility = $('.resources-collections-added #resource-' +
                    resourceID + ' .browse-item-visibility');

            if (isProject){
                var projectVisibilityTab = $(
                    '.resource-collection-visibility-form-tabs li a[href=".project-access"]');

                projectVisibilityTab.click(function(){
                    OC.resourcesCollections.resourceVisibility.setProjectVisibility(resourceVisibility, resourceID);
                });
            } else {
                var publicVisibilityTab = $(
                    '.resource-collection-visibility-form-tabs li a[href=".profile-access"]');

                publicVisibilityTab.click(function(){
                    OC.resourcesCollections.resourceVisibility.setPublicVisibility(resourceVisibility, resourceID);
                });
            }

            var privateVisibilityTab = $(
                '.resource-collection-visibility-form-tabs li a[href=".private-access"]');

            privateVisibilityTab.click(function(){
                OC.resourcesCollections.resourceVisibility.setPrivateVisibility(resourceVisibility, resourceID);
            });
        },

        setProjectVisibility: function(resourceVisibility, resourceID){
            $.get('/resources/resource/' + resourceID + '/visibility/project/');

            // Remove the private visibility class on the collection.
            resourceVisibility.removeClass('visibility-private');

            // Add the project & public visibility class on the collection.
            resourceVisibility.addClass('visibility-project');
            resourceVisibility.html(
                '<span class="group-shared-icon"></span>Shared with group');
        },

        setPrivateVisibility: function(resourceVisibility, resourceID){
            $.get('/resources/resource/' + resourceID + '/visibility/private/');

            // Remove the private visibility class on the collection.
            resourceVisibility.removeClass('visibility-project');
            resourceVisibility.removeClass('visibility-public');

            // Add the project visibility class on the collection.
            resourceVisibility.addClass('visibility-private');
            resourceVisibility.html(
                '<span class="private-shared-icon"></span>Shared');
        },

        setPublicVisibility: function(resourceVisibility, resourceID){
            $.get('/resources/resource/' + resourceID + '/visibility/public/');

            // Remove the private visibility class on the collection.
            resourceVisibility.removeClass('visibility-private');


            // Add the public visibility class on the collection.
            resourceVisibility.addClass('visibility-public');
            resourceVisibility.html(
                '<span class="publicly-shared-icon"></span>Public');
        }
    },

    removeCollaboratorHandler: function(event, isCollection){
        // From event target, get the collectionID/resourceID and userID.
        var collaboratorForm = $('#add-collection-collaborator-form'),
            collectionID = $('input[name=collection_id]', collaboratorForm).val(),
            resourceID = $('input[name=resource_id]', collaboratorForm).val(),
            target = $(event.target),
            userID = target.closest('li.collaborator-item').attr('id').substring(5);

        if (isCollection){
            // Submit the remove member request through the project API.
            $.get('/resources/collection/' + collectionID + '/remove/' + userID + '/',
                function (response) {
                    if (response.status === 'true') {
                        OC.resourcesCollections.removeCollaborator(target);
                    } else {
                        OC.popup(response.message, response.title);
                    }
                },
            'json');
        } else {
            // Submit the remove member request through the project API.
            $.get('/resources/resource/' + resourceID + '/remove/' + userID + '/',
                function (response) {
                    if (response.status === 'true') {
                        OC.resourcesCollections.removeCollaborator(target);
                    } else {
                        OC.popup(response.message, response.title);
                    }
                },
            'json');
        }
    },

    removeCollaborator: function(target){
        var collaboratorContainer = $(target).parents('li.collaborator-item');

        // Hide the tipsy on the 'delete' target.
        $(target).tipsy('hide');

        collaboratorContainer.remove();
    },

    closeCollaboratorPopupCallback: function(){
        var collectionID = $(
            'form#add-collection-collaborator-form input[name=collection_id]').val(),
            resourceID = $(
                'form#add-collection-collaborator-form input[name=resource_id]').val();

        var resourceCollection = collectionID === '' ?
            'resource-' + resourceID : 'collection-' + collectionID;

        // Is this resource/collection a part of a project.
        var isProject = $('.resources-collections-added').hasClass(
            'project-resources-collections');

        var resourceCollectionElement = $(
            '.resources-collections-added #' + resourceCollection  + ' .browse-item-visibility');
        var resourceCollectionNewVisibility = OC.resourcesCollections.getResourceCollectionVisibility(
            resourceCollectionElement, isProject);

        if (resourceCollectionNewVisibility !== OC.resourcesCollections.currentResourceCollectionVisibility){
            if (collectionID !== ''){
                OC.setMessageBoxMessage(
                'Changing access control of resources and folders inside...');
                OC.showMessageBox();
                OC.resourcesCollections.collectionVisibilityChangePropagation(collectionID);
            }
        }
    },

    collectionVisibilityChangePropagation: function(collectionID){
        $.get('/resources/collection/' + collectionID + '/visibility/propagate-changes/',
            function (response) {
                if (response.status === 'true') {
                    OC.resourcesCollections.collectionVisibilityPropagationSuccess();
                } else {
                    OC.popup(response.message, response.title);
                }
            },
        'json');
    },

    collectionVisibilityPropagationSuccess: function(){
        OC.dismissMessageBox();
    }
};

OC.resourcesCollectionsActions = {
    pendingActions: {
        copyResources: [],
        copyCollections: [],
        deleteResources: [],
        deleteCollections: []
    },

    actionsCompleted: {
        copyResources: [],
        copyCollections: [],
        deleteResources: [],
        deleteCollections: []
    },
    actionCompletionCallback: '',

    actionCompleted: function(){
        // Go through pending actions list to see if it is empty.
        var noPendingActions = true;

        var action;
        for (action in OC.resourcesCollectionsActions.pendingActions){
            if (OC.resourcesCollectionsActions.pendingActions[action].length >= 1){
                noPendingActions = false;
                break;
            }
        }

        // If pending actions is empty, call callback function for action
        //     completion.
        if (noPendingActions) OC.resourcesCollectionsActions.actionCompletionCallback();
    },

    initResourcesCollectionsActions: function(){
        // Check if there are resources/collections on this page.
        var currentCollection = $('.resources-collections-added');

        if (currentCollection.length > 0){
            // Initialize navigation panel for the collections.
            OC.resourcesCollectionsActions.initBrowseNavigation();

            // Initialize ability to move and reorganize resources and collections.
            OC.resourcesCollectionsActions.initMoveResourcesCollections();

            // Initialize action buttons for collection and resource manipulation.
            OC.resourcesCollectionsActions.initResourceCollectionActions();
        }
    },

    initMoveResourcesCollections: function(){
        OC.resourcesCollectionsActions.initResourceCollectionsDraggability(
            $('.resource-collection-item'));
        OC.resourcesCollectionsActions.initResourceCollectionsDroppability(
            $('.resource-collection-item.directory'));
    },

    initResourceCollectionsDraggability: function(resourceCollectionItems){
        resourceCollectionItems.draggable({ revert: "invalid" });
    },

    initResourceCollectionsDroppability: function(resourceCollectionItems){
        resourceCollectionItems.droppable({
            hoverClass: 'droppable',
            accept: ".directory, .resource",
            drop: function(event, ui){
                if (ui.draggable.hasClass('directory')){
                    OC.resourcesCollectionsActions.moveCollectionIntoCollection(
                        ui.draggable.attr('id').substring(11),
                        $(event.target).attr('id').substring(11)
                    );

                    // Set confirmation message
                    OC.resourcesCollectionsActions.movedIntoCollection([], [ui.draggable]);
                } else {
                    OC.resourcesCollectionsActions.moveResourceIntoCollection(
                        ui.draggable.attr('id').substring(9),
                        $(event.target).attr('id').substring(11)
                    );

                    // Set confirmation message
                    OC.resourcesCollectionsActions.movedIntoCollection([ui.draggable], []);
                }
            }
        });
    },

    moveResourceIntoCollection: function(resourceID, toCollectionID){
        var currentCollectionID = $('.resources-collections-added').attr('id').substring(11);

        $.get('/resources/move/resource/' + resourceID + '/from/' +
            currentCollectionID + '/to/' + toCollectionID + '/',
            function(response){
                if (response.status == 'true'){
                    OC.resourcesCollectionsActions.resourceCollectionMovedSuccess(
                        '.resource-collection-item#resource-' + resourceID);
                }
                else {
                    OC.popup(response.message, response.title);
                }
            },
        'json');
    },

    moveCollectionIntoCollection: function(fromCollectionID, toCollectionID){
        var currentCollectionID = $('.resources-collections-added').attr('id').substring(11);

        $.get('/resources/move/collection/' + fromCollectionID + '/from/' +
            currentCollectionID + '/to/' + toCollectionID + '/',
            function(response){
                if (response.status == 'true'){
                    OC.resourcesCollectionsActions.resourceCollectionMovedSuccess(
                        '.resource-collection-item#collection-' + fromCollectionID);
                } else {
                    OC.popup(response.message, response.title);
                }
            },
        'json');
    },

    resourceCollectionMovedSuccess: function(movedResourceCollectionID){
        // Fade out the resource/collection.
        $(movedResourceCollectionID).fadeOut('fast');
    },

    movedIntoCollection: function(resources, collections){
        var movedResources = resources || [];
        var movedCollections = collections || [];

        // Generate message over project header.
        if (movedResources.length >= 1 && movedCollections.length >= 1) {
            OC.setMessageBoxMessage(
                'Moved resources and folders successfully');
        } else if (movedResources.length >= 1) {
            OC.setMessageBoxMessage(
                'Moved resource(s) into the folder successfully');
        } else if (movedCollections.length >= 1) {
            OC.setMessageBoxMessage(
                'Moved folder(s) successfully');
        }

        OC.showMessageBox();
    },

    resourceCopiedSuccessfully: function(copiedResource, resourceID){
        var resourceType = copiedResource.host === 'project' ? '' : 'profile-resource';
        var whoHasAccess = copiedResource.visibility === 'collection' ?
            'Private (collection)' : copiedResource.visibility.charAt(0).toUpperCase();

        copiedResource.resource_type = resourceType;
        copiedResource.access = whoHasAccess;

        var newResourceHTML = OC.resourcesCollections.resourceItemTemplate(copiedResource);

        // Append the new resource to the resources collections listing
        $('.' + copiedResource.host + '-resources-added-list').append(newResourceHTML);

        // Associate resource actions with the new resource element.
        var newResourceItem = $(
            '.' + copiedResource.host + '-resources-added-list .resource-collection-item:last'),
            newResourceItemCheckbox = $('input[type=checkbox]', newResourceItem),
            newResourceItemDeleteButton = $(
                '.' + copiedResource.host + '-resource-delete', newResourceItem),
            newResourceItemVisibilityButton = $('.browse-item-visibility', newResourceItem);

        // Bind the click handler on the checkbox, the delete button and the visibility.
        newResourceItemCheckbox.click(
            OC.resourcesCollectionsActions.resourceCollectionCheckboxHandler);
        newResourceItemDeleteButton.click(OC.deleteResourceHandler);
        newResourceItemVisibilityButton.click(
            OC.resourcesCollections.itemVisibilityButtonClickHandler);

        // Now make the collection draggable-droppable (+acceptable of new stuff).
        OC.resourcesCollectionsActions.initResourceCollectionsDraggability(newResourceItem);

        // Drop the action from the pending action list and announce completion.
        OC.resourcesCollectionsActions.pendingActions.copyResources.splice(resourceID);
        OC.resourcesCollectionsActions.actionsCompleted.copyResources.push(resourceID);

        OC.resourcesCollectionsActions.actionCompleted();
    },

    collectionCopiedSuccessfully: function(copiedCollection, collectionID){
        var collectionType = copiedCollection.host === 'project' ? '' : 'profile-collection';
        var whoHasAccess = copiedCollection.visibility === 'collection' ?
            'Private (collection)' : copiedCollection.visibility.charAt(0).toUpperCase();

        copiedCollection.collection_type = collectionType;
        copiedCollection.access = whoHasAccess;

        var newCollectionHTML = OC.resourcesCollections.collectionItemTemplate(copiedCollection);

        // Append the new collection to the resources collections listing
        $('.' + copiedCollection.host + '-collections-added-list').append(newCollectionHTML);

        // Associate collection actions with the new collection element.
        var newCollectionItem = $(
            '.' + copiedCollection.host + '-collections-added-list .resource-collection-item:last'),
            newCollectionItemCheckbox = $('input[type=checkbox]', newCollectionItem),
            newCollectionItemDeleteButton = $(
                '.' + copiedCollection.host + '-collection-delete', newCollectionItem),
            newCollectionItemVisibilityButton = $('.browse-item-visibility', newCollectionItem);

        // Bind the click handler on the checkbox, the delete button and the visibility.
        newCollectionItemCheckbox.click(
            OC.resourcesCollectionsActions.resourceCollectionCheckboxHandler);
        newCollectionItemDeleteButton.click(OC.deleteCollectionHandler);
        newCollectionItemVisibilityButton.click(
            OC.resourcesCollections.itemVisibilityButtonClickHandler);

        // Now make the collection draggable-droppable (+acceptable of new stuff).
        OC.resourcesCollectionsActions.initResourceCollectionsDraggability(newCollectionItem);
        OC.resourcesCollectionsActions.initResourceCollectionsDroppability(newCollectionItem);

        // Drop the action from the pending action list and announce completion.
        OC.resourcesCollectionsActions.pendingActions.copyCollections.splice(collectionID);
        OC.resourcesCollectionsActions.actionsCompleted.copyCollections.push(collectionID);

        OC.resourcesCollectionsActions.actionCompleted();
    },

    copying: function(){
        OC.setMessageBoxMessage('Copying...');
        OC.showMessageBox();
    },

    copied: function(){
        var copiedResources = OC.resourcesCollectionsActions.actionsCompleted.copyResources;
        var copiedCollections = OC.resourcesCollectionsActions.actionsCompleted.copyCollections;

        // Generate message over project header.
        if (copiedResources.length >= 1 && copiedCollections.length >= 1) {
            OC.setMessageBoxMessage(
                'Copied resources and folders successfully');
        } else if (copiedResources.length >= 1) {
            OC.setMessageBoxMessage(
                'Copied resource(s) successfully');
        } else if (copiedCollections.length >= 1) {
            OC.setMessageBoxMessage(
                'Copied folder(s) successfully');
        }

        OC.showMessageBox();
    },

    collectionDeletedSuccessfully: function(deletedCollectionID){
        $('.resource-collection-item#collection-' + deletedCollectionID).fadeOut();

        // Drop the action from the pending action list and announce completion.
        OC.resourcesCollectionsActions.pendingActions.deleteCollections.splice(deletedCollectionID);
        OC.resourcesCollectionsActions.actionsCompleted.deleteCollections.push(deletedCollectionID);

        OC.resourcesCollectionsActions.actionCompleted();
    },

    resourceDeletedSuccessfully: function(deletedResourceID){
        console.log($('.resource-collection-item#resource-' + deletedResourceID));
        $('.resource-collection-item#resource-' + deletedResourceID).fadeOut();

        // Drop the action from the pending action list and announce completion.
        OC.resourcesCollectionsActions.pendingActions.deleteResources.splice(deletedResourceID);
        OC.resourcesCollectionsActions.actionsCompleted.deleteResources.push(deletedResourceID);

        OC.resourcesCollectionsActions.actionCompleted();
    },

    deleting: function(){
        OC.setMessageBoxMessage('Deleting...');
        OC.showMessageBox();
    },

    deleted: function(){
        var deletedResources = OC.resourcesCollectionsActions.actionsCompleted.deleteResources;
        var deletedCollections = OC.resourcesCollectionsActions.actionsCompleted.deleteCollections;

        // Generate message over project header.
        if (deletedResources.length >= 1 && deletedCollections.length >= 1) {
            OC.setMessageBoxMessage(
                'Deleted resources and folders successfully');
        } else if (deletedResources.length >= 1) {
            OC.setMessageBoxMessage(
                'Deleted resource(s) successfully');
        } else if (deletedCollections.length >= 1) {
            OC.setMessageBoxMessage(
                'Deleted folder(s) successfully');
        }

        OC.showMessageBox();
    },


    initResourceCollectionActions: function(){
        OC.resourcesCollectionsActions.bindResourceCollectionSelectors();

        OC.resourcesCollectionsActions.actionButtonsClickHandler();

        var checkedResourceCollections = $(
            '.resource-collection-item input[type=checkbox]:checked');
        if (checkedResourceCollections.length >= 1){
            var i;
            for (i = 0; i < checkedResourceCollections.length; i++){
                OC.resourcesCollectionsActions.selectedResourcesCollections.push(
                    checkedResourceCollections[i]);
            }
        } else {
            var moveButton = $('.collection-actions .move-button');
            OC.resourcesCollectionsActions.disableActionButton(moveButton);

            var copyButton = $('.collection-actions .copy-button');
            OC.resourcesCollectionsActions.disableActionButton(copyButton);
        }
    },

    actionButtonsClickHandler: function(){
        var moveButton = $('.collection-actions .move-button');
        moveButton.click(OC.resourcesCollectionsActions.moveButtonClickHandler);

        var copyButton = $('.collection-actions .copy-button');
        copyButton.click(OC.resourcesCollectionsActions.copyButtonClickHandler);

        //var renameButton = $('.collection-actions .rename-button');
        //renameButton.click(OC.resourcesCollectionsActions.renameButtonClickHandler);

        var deleteButton = $('.collection-actions .del-button');
        deleteButton.click(OC.resourcesCollectionsActions.deleteButtonClickHandler);
    },

    moveButtonClickHandler: function(event){
        var movePopup = OC.customPopup('.move-resource-collection-dialog'),
            collectionBrowser = $('.move-resource-collection-browser'),
            collectionID = $('.resources-collections-added').attr('id').substring(11);

        // Clear contents from previous tree popup and set loading class.
        collectionBrowser.children().remove();
        collectionBrowser.addClass('loading-browser');

        // Bind the 'Done' button on the popup.
        $('.move-resource-collection-submit-button').click(function(event){
            // Capture currently selected collection.
            var toCollection = collectionBrowser.find(
                '.selected-destination-collection');

            movePopup.close();

            if (toCollection){
                var toCollectionID = toCollection.attr('id').substring(11);

                // Loop through all selected resources.
                var i, resourcesMoved = [], collectionsMoved = [];
                for (i = 0; i < OC.resourcesCollectionsActions.selectedResourcesCollections.length; i++){
                    var resourceCollectionItem = $(OC.resourcesCollectionsActions.selectedResourcesCollections[i]).closest(
                        '.resource-collection-item');
                    if (resourceCollectionItem.hasClass('collection')){
                        OC.resourcesCollectionsActions.moveCollectionIntoCollection(
                            resourceCollectionItem.attr('id').substring(11), toCollectionID);
                        collectionsMoved.push(OC.resourcesCollectionsActions.selectedResourcesCollections[i]);
                    } else {
                        OC.resourcesCollectionsActions.moveResourceIntoCollection(
                            resourceCollectionItem.attr('id').substring(9), toCollectionID);
                        resourcesMoved.push(OC.resourcesCollectionsActions.selectedResourcesCollections[i]);
                    }
                }
                // Set confirmation message
                OC.resourcesCollectionsActions.movedIntoCollection(resourcesMoved, collectionsMoved);
            }
        });

        var isProject = $('.resources-collections-added').hasClass(
            'project-resources-collections');

        if (isProject){
            $.get('/resources/collection/' + collectionID + '/tree/collections/project/',
                function(response){
                    if (response.status == 'true'){
                        OC.renderBrowser(
                            response.tree, collectionBrowser, collectionID);
                        collectionBrowser.removeClass('loading-browser');
                    }
                    else {
                        OC.popup(response.message, response.title);
                    }
                },
            'json');
        } else {
            $.get('/resources/tree/collections/user/',
                function(response){
                    if (response.status == 'true'){
                        OC.renderBrowser(
                            response.tree, collectionBrowser, collectionID);
                        collectionBrowser.removeClass('loading-browser');
                    }
                    else {
                        OC.popup(response.message, response.title);
                    }
                },
            'json');
        }
    },

    copyButtonClickHandler: function(event){
        // TODO: Make a copy of the resources/collections.
        var currentCollectionID = $('.resources-collections-added').attr('id').substring(11);

        // Set status to copying.
        OC.resourcesCollectionsActions.copying();

        // Loop through all selected resources.
        var i, resourcesCopied = [], collectionsCopied = [];
        for (i = 0; i < OC.resourcesCollectionsActions.selectedResourcesCollections.length; i++){
            var resourceCollectionItem = $(OC.resourcesCollectionsActions.selectedResourcesCollections[i]).closest(
                '.resource-collection-item');
            if (resourceCollectionItem.hasClass('collection')){
                var collectionID = resourceCollectionItem.attr('id').substring(11);
                OC.collection.copy(
                    collectionID, currentCollectionID, OC.resourcesCollectionsActions.collectionCopiedSuccessfully);
                collectionsCopied.push(collectionID);
            } else {
                var resourceID = resourceCollectionItem.attr('id').substring(9);
                OC.resource.copy(
                    currentCollectionID, resourceID, currentCollectionID,
                    OC.resourcesCollectionsActions.resourceCopiedSuccessfully
                );
                resourcesCopied.push(resourceID);
            }
        }
        OC.resourcesCollectionsActions.pendingActions.copyResources.concat(resourcesCopied);
        OC.resourcesCollectionsActions.pendingActions.copyCollections.concat(collectionsCopied);

        OC.resourcesCollectionsActions.actionCompletionCallback = OC.resourcesCollectionsActions.copied;
    },

    deleteButtonClickHandler: function(event){
        var currentCollectionID = $('.resources-collections-added').attr('id').substring(11);

        // Set status to deleting.
        OC.resourcesCollectionsActions.deleting();

        // Loop through all selected resources.
        var i, resourcesDeleted = [], collectionsDeleted = [];
        for (i = 0; i < OC.resourcesCollectionsActions.selectedResourcesCollections.length; i++){
            var resourceCollectionItem = $(OC.resourcesCollectionsActions.selectedResourcesCollections[i]).closest(
                '.resource-collection-item');
            if (resourceCollectionItem.hasClass('collection')){
                OC.collection.delete(
                    resourceCollectionItem.attr('id').substring(11),
                    OC.resourcesCollectionsActions.collectionDeletedSuccessfully
                );
                collectionsDeleted.push(OC.resourcesCollectionsActions.selectedResourcesCollections[i]);
            } else {
                OC.resource.delete(
                    resourceCollectionItem.attr('id').substring(9), currentCollectionID,
                    OC.resourcesCollectionsActions.resourceDeletedSuccessfully
                );
                resourcesDeleted.push(OC.resourcesCollectionsActions.selectedResourcesCollections[i]);
            }
        }

        OC.resourcesCollectionsActions.pendingActions.deleteResources.concat(resourcesDeleted);
        OC.resourcesCollectionsActions.pendingActions.deleteCollections.concat(collectionsDeleted);

        OC.resourcesCollectionsActions.actionCompletionCallback = OC.resourcesCollectionsActions.deleted;
    },


    bindResourceCollectionSelectors: function(){
        $('.resource-collection-item input[type=checkbox]').change(
            OC.resourcesCollectionsActions.resourceCollectionCheckboxHandler);
    },

    selectedResourcesCollections: [],

    resourceCollectionCheckboxHandler: function(event){
        var resourceCollectionItem = $(event.target).closest('.resource-collection-item');
        if (event.target.checked === false){
            var elementPosition = OC.resourcesCollectionsActions.selectedResourcesCollections.indexOf(
                resourceCollectionItem);
            OC.resourcesCollectionsActions.selectedResourcesCollections.splice(elementPosition, 1);
        } else {
            OC.resourcesCollectionsActions.selectedResourcesCollections.push(resourceCollectionItem);
        }
        
        OC.resourcesCollectionsActions.selectedResourcesCollectionsChangeListener();
    },

    selectedResourcesCollectionsChangeListener: function(){
        var moveButton = $('.collection-actions .move-button'),
            copyButton = $('.collection-actions .copy-button'),
            deleteButton = $('.collection-actions .del-button');
        if (OC.resourcesCollectionsActions.selectedResourcesCollections.length >= 1){
            // Enable the action buttons that depend on checked resources/collections.
            OC.resourcesCollectionsActions.enableActionButton(moveButton);
            OC.resourcesCollectionsActions.enableActionButton(copyButton);
            OC.resourcesCollectionsActions.enableActionButton(deleteButton);

            OC.resourcesCollectionsActions.actionButtonsClickHandler();
        } else {
            OC.resourcesCollectionsActions.disableActionButton(moveButton);
            OC.resourcesCollectionsActions.disableActionButton(copyButton);
            OC.resourcesCollectionsActions.disableActionButton(deleteButton);
        }
    },

    enableActionButton: function(actionButton){
        actionButton.removeClass('disabled-collection-button');
        actionButton.disabled = false;
    },

    disableActionButton: function(actionButton){
        actionButton.addClass('disabled-collection-button');
        actionButton.disabled = true;
        actionButton.unbind('click');
    },

    initBrowseNavigation: function(){
        // Bold the current collection.
        var currentCollectionID = $('.resources-collections-added').attr('id').substring(11);
        var collectionInNavigation = $('nav.collections-navigation').find(
            'a#collection-' + currentCollectionID);
        collectionInNavigation.addClass('current-navigation-collection');

        // Toggle open all the ancestors.
        collectionInNavigation.parents('.parent-collection').each(function(){
            $(this).find('.toggle-collection:first').click();
        });
    },
};

jQuery(document).ready(function ($) {
    OC.resourcesCollections.synchronizeSelectors();
});
