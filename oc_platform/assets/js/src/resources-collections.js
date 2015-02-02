define(['jquery', 'underscore', 'core', 'timeago', 'draggable', 'droppable'], function($, _){
    _.extend(OC.resourcesCollections, {
    resourceItemTemplate: _.template('<div class="<%= host %>-browse-item resource-collection-item resource <%= type %>-resource" id="resource-<%= id %>">' +
        '<input type="checkbox" name="resource_id" value="<%= id %>"/>' +
        '<a href="<%= url %>"><%= title %> <span class="<%= host %>-browse-item-date"><%= created %></span>' +
        '<div class="resource-collection-actions <%= resource_type %> <%= is_collaborator %> is-owner">' +
        '<span class="<%= host %>-browse-item-visibility browse-item-visibility visibility-<%= visibility %>" title=" '+
        'Who has access: <%= access %>"></span><div class="<%= host %>-resource-delete resource-collection-delete" id="resource-<%= id %>" title="Delete"></div>' +
        '</div></a></div>'),

    resourceCollectionItemTemplate: _.template('<div class="resource-collection-item <%= category %>" id="<%= category %>-<%= id %>">' +
        '<% if (owner){ %> <div class="resource-item-selector"><input type="checkbox" name="resource_collection_id" value="<%= id %>"/></div><% } %>' +
        '<a href="<%= url %>"<% if (open_url){ %> target="_blank"<% } %> class="resource-item-thumbnail" style="background-image: url(\'<%= thumbnail %>\');">' +
        '<div class="resource-item-thumbnail-selector"></div>' +
        '<div class="resource-item-thumbnail-<%= type %>"></div>' +
        '</a><div class="resource-item-description">' +
        '<div class="resource-item-description-title"><a href="<%= url %>"<% if (open_url){ %> ' +
        'target="_blank"<% } %>><%= title %></a></div>' +
        '<div class="resource-item-description-modified" title="<%= modified %>"><%= modified %></div>' +
        '<div class="resource-item-description-actions">' +
        '<div class="resource-item-description-actions-visibility">' +
        '<span class=" ' +
        '<%= host %>-browse-item-visibility browse-item-visibility visibility-<%= visibility %> <%= visibility_classes %>">' +
        '<span class="visibility-icon"></span><%= visibility_title %></span></div>' +
        '</div></div></div>'),

    collectionItemTemplate: _.template('<div class="<%= host %>-browse-item resource-collection-item directory " id="collection-<%= id %>">' +
        '<input type="checkbox" name="collection_id" value="<%= id %>"/>' +
        '<a href="<%= url %>"><%= title %> <span class="<%= host %>-browse-item-date"><%= created %></span>' +
        '<div class="resource-collection-actions <%= collection_type %> <%= is_collaborator %> is-owner">' +
        '<span class="<%= host %>-browse-item-visibility browse-item-visibility visibility-<%= visibility %>" title=" '+
        'Who has access: <%= access %>"></span><div class="<%= host %>-collection-delete resource-collection-delete" id="collection-<%= id %>" title="Delete"></div>' +
        '</div></a></div>'),

    currentResourceCollectionVisibility: '',

    initResourcesCollections: function(){
        if ($('.resource-collection-item').length >= 1){
            OC.resourcesCollections.initFavoriteStates();
        
            OC.resourcesCollections.initCopyAction();

            if (OC.resourcesCollections.ownerView)
                OC.resourcesCollections.bindItemSelect();

            OC.resourcesCollections.infiniteScroll();
        }

        if ($('.resources-collections-added').length >= 1){
            // Tipsy the collections/resources visibility.
            $('.project-browse-item-visibility, .profile-browse-item-visibility').tipsy(
                {gravity: 'n'});

            // Tipsy the collections/resources item delete button.
            $('.resource-collection-delete').tipsy({gravity: 'n'});

            OC.resourcesCollections.bindItemVisibilityButton();

            OC.resourcesCollectionsActions.initResourcesCollectionsActions();
        }
    },

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
                var currentResourceFavoriteButton = $(this),
                    currentResourceFavoriteButtonWrapper = currentResourceFavoriteButton.parent('.resource-favorite-wrapper');

                OC.favoriteClickHandler(
                    'resource', resourceID, function(){
                        currentResourceFavoriteButtonWrapper.addClass('favorited');
                        currentResourceFavoriteButton.text('Favorited');
                    }, function(){
                        currentResourceFavoriteButtonWrapper.removeClass('favorited');
                        currentResourceFavoriteButton.text('Favorite');
                    }
                );

                event.stopPropagation();
                event.preventDefault();
                return false;
            });

        }

        var resourcesCollections = $('.resource-collection-item');

        var i, resourceID;
        for (i = 0; i < resourcesCollections.length; i++){
            resourceID = $(resourcesCollections[i]).attr('id').substring(9);
            OC.getFavoriteState('resource', resourceID, setFavoriteState);
        }
    },

    infiniteScroll: function(){
        if (OC.resourcesCollections.resourceCount > 20){
            var loadButton = $('.lazy-load-button'),
                currentCollectionID, i;
            $('.profile-content').on('DOMContentLoaded load resize scroll', function(event){
                currentCollectionID = $('.resources-collections-added').attr('id').substring(11);

                // If the load button is attached to the document.
                if ($.contains(document, loadButton[0])){
                    if (isElementInViewport(loadButton) && !loadButton.hasClass('loading')){
                        loadButton.addClass('loading');

                        $.get('/resources/api/load-resources/' + currentCollectionID +
                                '/from/' + OC.resourcesCollections.currentCount + '/',
                            function(response){
                                if (response.status == 'true'){
                                    var keys = Object.keys(response.resources);

                                    if (keys.length !== 0){
                                        var newResourceCollection, rawResource;
                                        for (i = 0; i < keys.length; i++){
                                            rawResource = response.resources[keys[i]];
                                            rawResource['owner'] = OC.resourcesCollections.ownerView;
                                            $('.resources-collections-added').append(
                                                OC.resourcesCollections.resourceCollectionItemTemplate(
                                                    rawResource)
                                            );

                                            var newResourceCollectionSelector = '.resources-collections-added .resource-collection-item:last';
                                            newResourceCollection =  $(newResourceCollectionSelector);

                                            OC.resourcesCollections.bindItemSelect(newResourceCollectionSelector);
                                            OC.resourcesCollectionsActions.bindResourceCollectionSelectors(newResourceCollectionSelector);
                                            
                                            // Make the datetime on the resource timeago'ed.
                                            $('.resource-item-description-modified', newResourceCollection).timeago();
                                        }
                                        OC.resourcesCollections.currentCount += keys.length;

                                    } else {
                                        loadButton.remove();
                                    }
                                }
                                else {
                                    OC.popup(response.message, response.title);
                                }
                                loadButton.removeClass('loading');

                            },
                        'json');
                    }
                }
            });
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
        var thumbnail, resourceCollectionCheckbox, resourceCollectionItem,
            thumbnails = $('.resource-item-thumbnail-selector');

        // Synchonize the checkbox value with the thumbnail.
        var i = 0;
        for (i = 0; i < thumbnails.length; i++){
            thumbnail = $(thumbnails[i]);
            resourceCollectionItem = thumbnail.parents('.resource-collection-item');
            resourceCollectionCheckbox = resourceCollectionItem.find('input[name=resource_collection_id]')[0];

            if (resourceCollectionCheckbox.checked){
                resourceCollectionItem.addClass('selected');
            } else {
                resourceCollectionItem.removeClass('selected');
            }
        }

    },

    bindItemSelect: function(itemSelector){
        var selector = itemSelector || '.resource-collection-item';

        $(selector).click(
             OC.resourcesCollections.itemSelectClickHandlers.itemClick);

        $(selector + ' input[name=resource_collection_id]').click(
            OC.resourcesCollections.itemSelectClickHandlers.inputClick);

        // Do not let checkbox, thumbnail link click triggers propogate back to the resource item.
        OC.resourcesCollections.itemSelectClickHandlers.preventPropagationOnItemClick(selector);
    },

    itemSelectClickHandlers: {
        itemClick: function(event){
            var resourceCollection = $(this),
                resourceCollectionCheckboxEl = $('input[name=resource_collection_id]', resourceCollection),
                resourceCollectionCheckbox = resourceCollectionCheckboxEl[0];

            if (resourceCollectionCheckbox.checked){
                resourceCollectionCheckboxEl.prop('checked', false);
            } else {
                resourceCollectionCheckboxEl.prop('checked', true);
            }
            resourceCollection.toggleClass('selected');

            resourceCollectionCheckboxEl.trigger('itemSelected');
        },

        inputClick: function(event){
            var resourceCollectionItem = $(event.target).parents('.resource-collection-item');
            resourceCollectionItem.toggleClass('selected');

            $(event.target).trigger('itemSelected');
        },

        preventPropagationOnItemClick: function(itemSelector){
            $(itemSelector + ' input[name=resource_collection_id], ' + itemSelector + ' a.resource-item-thumbnail, ' +
                itemSelector + ' .resource-item-description-title a').click(function(event){
                event.stopPropagation();
            });
        }
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

            resourceCollectionItem.type =  resourceCollectionItem.hasClass(
                'collection') ? 'collection' : 'resource';
            resourceCollectionItem.id = resourceCollectionItem.type === 'collection' ? resourceCollectionItem.attr(
                'id').substring(11) : resourceCollectionItem.attr('id').substring(9);

            // Nested if/else to figure out the visibility of the resource/collection.
            OC.collaborators.currentResourceCollectionVisibility = OC.resourcesCollections.getResourceCollectionVisibility(
                actionsWrapper, isProject);

            OC.collaborators.init(
                resourceCollectionItem,
                OC.resourcesCollections.resourceVisibility.setupToggler,
                OC.resourcesCollections.collectionVisibility.setupToggler,
                OC.resourcesCollections.closeCollaboratorPopupCallback,
                actionsWrapper.hasClass('is-owner')
            );
        }

        event.stopPropagation();
        event.preventDefault();
        return false;
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
                    '.resource-collection-visibility-form-tabs li a[href="#project-access"]');

                projectVisibilityTab.click(function(){
                    OC.resourcesCollections.collectionVisibility.setProjectVisibility(collectionVisibility, collectionID);
                });
            } else {
                var publicVisibilityTab = $(
                    '.resource-collection-visibility-form-tabs li a[href="#profile-access"]');

                publicVisibilityTab.click(function(){
                    OC.resourcesCollections.collectionVisibility.setPublicVisibility(collectionVisibility, collectionID);
                });
            }

            var privateVisibilityTab = $(
                '.resource-collection-visibility-form-tabs li a[href="#private-access"]');

            privateVisibilityTab.click(function(){
                OC.resourcesCollections.collectionVisibility.setPrivateVisibility(collectionVisibility, collectionID);
            });
        },

        setProjectVisibility: function(collectionVisibility, collectionID){
            // Remove the private visibility class on the collection.
            collectionVisibility.removeClass('visibility-private');

            // Add the project visibility class on the collection.
            collectionVisibility.addClass('visibility-project');
            collectionVisibility.html(
                '<span class="group-shared-icon"></span>Shared with group');
        },

        setPrivateVisibility: function(collectionVisibility, collectionID){
            // Remove the private & public visibility class on the collection.
            collectionVisibility.removeClass('visibility-project');
            collectionVisibility.removeClass('visibility-public');

            // Add the project visibility class on the collection.
            collectionVisibility.addClass('visibility-private');
            collectionVisibility.html(
                '<span class="private-shared-icon"></span>Shared');
        },

        setPublicVisibility: function(collectionVisibility, collectionID){
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
                    '.resource-collection-visibility-form-tabs li a[href="#project-access"]');

                projectVisibilityTab.click(function(){
                    OC.resourcesCollections.resourceVisibility.setProjectVisibility(resourceVisibility, resourceID);
                });
            } else {
                var publicVisibilityTab = $(
                    '.resource-collection-visibility-form-tabs li a[href="#profile-access"]');

                publicVisibilityTab.click(function(){
                    OC.resourcesCollections.resourceVisibility.setPublicVisibility(resourceVisibility, resourceID);
                });
            }

            var privateVisibilityTab = $(
                '.resource-collection-visibility-form-tabs li a[href="#private-access"]');

            privateVisibilityTab.click(function(){
                OC.resourcesCollections.resourceVisibility.setPrivateVisibility(resourceVisibility, resourceID);
            });
        },

        setProjectVisibility: function(resourceVisibility, resourceID){
            // Remove the private visibility class on the collection.
            resourceVisibility.removeClass('visibility-private');

            // Add the project & public visibility class on the collection.
            resourceVisibility.addClass('visibility-project');
            resourceVisibility.html(
                '<span class="group-shared-icon"></span>Shared with group');
        },

        setPrivateVisibility: function(resourceVisibility, resourceID){
            // Remove the private visibility class on the collection.
            resourceVisibility.removeClass('visibility-project');
            resourceVisibility.removeClass('visibility-public');

            // Add the project visibility class on the collection.
            resourceVisibility.addClass('visibility-private');
            resourceVisibility.html(
                '<span class="private-shared-icon"></span>Shared');
        },

        setPublicVisibility: function(resourceVisibility, resourceID){
            // Remove the private visibility class on the collection.
            resourceVisibility.removeClass('visibility-private');


            // Add the public visibility class on the collection.
            resourceVisibility.addClass('visibility-public');
            resourceVisibility.html(
                '<span class="publicly-shared-icon"></span>Public');
        }
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
});

OC.resourcesCollectionsActions = {
    pendingActions: {
        copyResources: [],
        copyCollections: [],
        deleteResources: [],
        deleteCollections: [],
        renameResources: [],
        renameCollections: []
    },

    actionsCompleted: {
        copyResources: [],
        copyCollections: [],
        deleteResources: [],
        deleteCollections: [],
        renameResources: [],
        renameCollections: []
    },
    actionCompletionCallback: undefined,

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

        var newResourceHTML = OC.resourcesCollections.resourceCollectionItemTemplate(copiedResource);

        // Append the new resource to the resources collections listing
        $('.' + copiedResource.host + '-resources-added-list').append(newResourceHTML);

        // Associate resource actions with the new resource element.
        var newResourceItem = $(
            '.' + copiedResource.host + '-resources-added-list .resource-collection-item:last'),
            newResourceItemCheckbox = $('input[type=checkbox]', newResourceItem),
            newResourceItemVisibilityButton = $('.browse-item-visibility', newResourceItem);

        // Bind the click handler on the checkbox, the delete button and the visibility.
        newResourceItemCheckbox.click(
            OC.resourcesCollectionsActions.resourceCollectionCheckboxHandler);
        newResourceItemVisibilityButton.click(
            OC.resourcesCollections.itemVisibilityButtonClickHandler);

        // Now make the collection draggable-droppable (+acceptable of new stuff).
        OC.resourcesCollectionsActions.initResourceCollectionsDraggability(newResourceItem);

        // Make the datetime on the resource timeago'ed.
        $(".resource-item-description-modified", newResourceItem).timeago();

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
            newCollectionItemVisibilityButton = $('.browse-item-visibility', newCollectionItem);

        // Bind the click handler on the checkbox, the delete button and the visibility.
        newCollectionItemCheckbox.click(
            OC.resourcesCollectionsActions.resourceCollectionCheckboxHandler);
        newCollectionItemVisibilityButton.click(
            OC.resourcesCollections.itemVisibilityButtonClickHandler);

        // Now make the collection draggable-droppable (+acceptable of new stuff).
        OC.resourcesCollectionsActions.initResourceCollectionsDraggability(newCollectionItem);
        OC.resourcesCollectionsActions.initResourceCollectionsDroppability(newCollectionItem);

        // Make the datetime on the resource timeago'ed.
        $(".resource-item-description-modified", newCollectionItem).timeago();

        // Drop the action from the pending action list and announce completion.
        OC.resourcesCollectionsActions.pendingActions.copyCollections.splice(collectionID);
        OC.resourcesCollectionsActions.actionsCompleted.copyCollections.push(collectionID);

        OC.resourcesCollectionsActions.actionCompleted();
    },

    resourceRenamedSuccessfully: function(resourceID, newTitle){
        var resourceItem = $('.resource-collection-item#resource-' + resourceID),
            resourceTitle = $(".resource-item-description-title a", resourceItem);

        resourceTitle.text(newTitle);

        // Unselect the item.
        resourceItem.trigger('click');

        // Drop the action from the pending action list and announce completion.
        OC.resourcesCollectionsActions.pendingActions.renameResources.splice(resourceID);
        OC.resourcesCollectionsActions.actionsCompleted.renameResources.push(resourceID);

        OC.resourcesCollectionsActions.actionCompleted();
    },

    collectionRenamedSuccessfully: function(collectionID, newTitle){
        var collectionItem = $('.resource-collection-item#collection-' + collectionID),
            collectionTitle = $(".resource-item-description-title a", collectionItem);

        collectionTitle.text(newTitle);

        // Unselect the item.
        collectionItem.trigger('click');

        // Drop the action from the pending action list and announce completion.
        OC.resourcesCollectionsActions.pendingActions.renameCollections.splice(collectionID);
        OC.resourcesCollectionsActions.actionsCompleted.renameCollections.push(collectionID);

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

    renaming: function(){
        // NOTE: This is currently overridden by the popup that dismisses it.
        OC.setMessageBoxMessage('Renaming...');
        OC.showMessageBox();
    },

    renamed: function(){
        var renamedResource = OC.resourcesCollectionsActions.actionsCompleted.renameResources;
        var renamedCollection = OC.resourcesCollectionsActions.actionsCompleted.renameCollections;

        if (renamedResource.length === 1) {
            OC.setMessageBoxMessage(
                'Renamed resource successfully');
        } else if (renamedCollection.length === 1) {
            OC.setMessageBoxMessage(
                'Renamed folder successfully');
        }

        OC.showMessageBox();
    },

    collectionsDeletedSuccessfully: function(deletedCollectionIDs){
        var i;
        for (i = 0; i < deletedCollectionIDs.length; i++){
            // Drop the action from the pending action list and announce completion.
            OC.resourcesCollectionsActions.pendingActions.deleteCollections.splice(deletedCollectionIDs[i]);
            OC.resourcesCollectionsActions.actionsCompleted.deleteCollections.push(deletedCollectionIDs[i]);

            $('.resource-collection-item#collection-' + deletedCollectionIDs[i]).fadeOut();
        }

        OC.resourcesCollectionsActions.actionCompleted();
    },

    resourcesDeletedSuccessfully: function(deletedResourceIDs){
        var i;
        for (i = 0; i < deletedResourceIDs.length; i++){
            // Drop the action from the pending action list and announce completion.
            OC.resourcesCollectionsActions.pendingActions.deleteResources.splice(deletedResourceIDs[i]);
            OC.resourcesCollectionsActions.actionsCompleted.deleteResources.push(deletedResourceIDs[i]);

            $('.resource-collection-item#resource-' + deletedResourceIDs[i]).fadeOut();
        }

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
        // Make the action panel sticky.
        var actionsPanel = $('.profile-resources-collections-actions'),
            actionsShadow = $('.profile-resources-collections-actions-shadow'),
            resourcesCollections = $('.profile-resources-collections-wrapper'),
            profileTabs = $('.profile-tabs'),
            offsetPoint = profileTabs.position().top + profileTabs.outerHeight(true),
            actionsPanelLeft = actionsPanel.position().left;

        // Pre-write the absolute position, only applied when absolute class is added.
        actionsPanel.css({
            top: offsetPoint,
            left: actionsPanelLeft
        });

        function getShadowHeight(){
            var resourcesCollections = $('.profile-resources-collections-wrapper'),
                actionsMenu = $('.profile-resources-collections-actions-menu');
            if (!isElementInViewport(resourcesCollections)){
                return $(window).height() - resourcesCollections.offset().top;
            } else {
                if (actionsMenu.height() > resourcesCollections.height()){
                    return actionsMenu.height();
                } else {
                    return resourcesCollections.height();
                }
            }
        }

        var shadowHeight = getShadowHeight();

        $('.profile-content').on('scroll', function(event){
            // If the load button is attached to the document.
            if (isElementInViewport(actionsPanel) && !actionsPanel.hasClass('floating')){
                if (actionsPanel.position().top < offsetPoint){
                    actionsPanel.addClass('floating');
                    actionsShadow.height(
                       $(window).height() - offsetPoint
                    );
                }
                
            } else if (actionsPanel.hasClass('floating')){
                if (resourcesCollections.position().top > offsetPoint){
                    actionsPanel.removeClass('floating');
                    actionsShadow.height(shadowHeight);
                }
            }
        });

        // Set the height of the page.
        function setShadowHeight(){
            actionsShadow.height(shadowHeight);
        }

        setShadowHeight();
        $(window).resize(function(){
            shadowHeight = getShadowHeight();
            setShadowHeight();
        });
        

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
            OC.resourcesCollectionsActions.selectedResourcesCollectionsChangeListener();
        }
    },

    actionButtonsClickHandler: function(){
        var moveButton = $('.collection-actions .move-button');
        moveButton.click(OC.resourcesCollectionsActions.moveButtonClickHandler);

        var copyButton = $('.collection-actions .copy-button');
        copyButton.click(OC.resourcesCollectionsActions.copyButtonClickHandler);

        var renameButton = $('.collection-actions .rename-button');
        renameButton.click(OC.resourcesCollectionsActions.renameButtonClickHandler);

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

        event.stopPropagation();
        event.preventDefault();
        return false;
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

        event.stopPropagation();
        event.preventDefault();
        return false;
    },

    renameButtonClickHandler: function(event){
        // Set status to copying.
        OC.resourcesCollectionsActions.renaming();

        var resourceCollectionItem = $(OC.resourcesCollectionsActions.selectedResourcesCollections[0]).closest(
            '.resource-collection-item');

        // Launch rename dialog.
        var renameFileFolderPopup = OC.customPopup('.rename-file-folder-dialog'),
            nameInput = $('input[name="new_name"]', renameFileFolderPopup.dialog);

        var oldTitle = $('.resource-item-description-title a', resourceCollectionItem).text();
        nameInput.val(oldTitle);

        $('.rename-file-folder-submit-button', renameFileFolderPopup.dialog).click(function(event){
            renameFileFolderPopup.close();
            var newTitle = nameInput.val();

            if (newTitle !== oldTitle){
                var renameResources = [], renameCollections = [];

                if (resourceCollectionItem.hasClass('collection')){
                    var collectionID = resourceCollectionItem.attr('id').substring(11);
                    OC.collection.rename(
                        collectionID, newTitle, OC.resourcesCollectionsActions.collectionRenamedSuccessfully);
                    renameCollections.push(collectionID);
                } else {
                    var resourceID = resourceCollectionItem.attr('id').substring(9);
                    OC.resource.rename(
                        resourceID, newTitle, OC.resourcesCollectionsActions.resourceRenamedSuccessfully);
                    renameResources.push(resourceID);
                }

                OC.resourcesCollectionsActions.pendingActions.renameResources.concat(renameResources);
                OC.resourcesCollectionsActions.pendingActions.renameCollections.concat(renameCollections);

                OC.resourcesCollectionsActions.actionCompletionCallback = OC.resourcesCollectionsActions.renamed;
            }
            
            // Clear the new name from the dialog. 
            nameInput.val('');
            $(this).unbind('click');

            event.stopPropagation();
            event.preventDefault();
            return false;
        });

        event.stopPropagation();
        event.preventDefault();
        return false;
    },

    setDialogMessage: function(dialogSelector, message, title){
        $(dialogSelector + '-message').text(message);
        $(dialogSelector + '-title').text(title);
    },

    getSelectedResourcesCollections: function(){
        var i, resources = [], collections = [];
        for (i = 0; i < OC.resourcesCollectionsActions.selectedResourcesCollections.length; i++){
            var resourceCollectionItem = $(OC.resourcesCollectionsActions.selectedResourcesCollections[i]).closest(
                '.resource-collection-item');
            if (resourceCollectionItem.hasClass('collection')){
                collections.push(OC.resourcesCollectionsActions.selectedResourcesCollections[i]);
            } else resources.push(OC.resourcesCollectionsActions.selectedResourcesCollections[i]);
        }

        return [resources, collections];
    },

    deleteButtonClickHandler: function(event){
        var currentCollectionID = $('.resources-collections-added').attr('id').substring(11);

        // Set status to deleting.
        OC.resourcesCollectionsActions.deleting();

        // Loop through all selected resources.
        var i, j, resourceIDsToDelete = [], collectionIDsToDelete = [], resourcesDeleted = [], collectionsDeleted = [];
        for (i = 0; i < OC.resourcesCollectionsActions.selectedResourcesCollections.length; i++){
            var resourceCollectionItem = $(OC.resourcesCollectionsActions.selectedResourcesCollections[i]).closest(
                '.resource-collection-item');
            if (resourceCollectionItem.hasClass('collection')){
                collectionIDsToDelete.push(resourceCollectionItem.attr('id').substring(11));
                collectionsDeleted.push(OC.resourcesCollectionsActions.selectedResourcesCollections[i]);
            } else {
                resourceIDsToDelete.push(resourceCollectionItem.attr('id').substring(9));
                resourcesDeleted.push(OC.resourcesCollectionsActions.selectedResourcesCollections[i]);
            }
        }

        resourceCollections = OC.resourcesCollectionsActions.getSelectedResourcesCollections();

        if (resourceCollections[0].length > 1 && resourceCollections[1].length > 1){
            OC.resourcesCollectionsActions.setDialogMessage(
                '.delete-resource-collection-dialog',
                'Are you sure you want to delete these files and folders? This will also ' +
                    'delete all the files and folders within these folders.',
                'Delete files and folders'
            );
            OC.resource.deleteMultiple(
                resourceIDsToDelete, currentCollectionID,
                OC.resourcesCollectionsActions.resourcesDeletedSuccessfully
            );
            OC.collection.deleteMultiple(
                collectionIDsToDelete,
                OC.resourcesCollectionsActions.collectionsDeletedSuccessfully
            );
        } else if (resourceCollections[0].length > 1 && resourceCollections[1].length === 1){
            OC.resourcesCollectionsActions.setDialogMessage(
                '.delete-resource-collection-dialog',
                'Are you sure you want to delete these files and the selected folder? This will also ' +
                    'delete all the files and folders within the folder.',
                'Delete files and folder'
            );
            OC.resource.deleteMultiple(
                resourceIDsToDelete, currentCollectionID,
                OC.resourcesCollectionsActions.resourcesDeletedSuccessfully
            );
            OC.collection.delete(
                collectionIDsToDelete[0],
                OC.resourcesCollectionsActions.collectionsDeletedSuccessfully
            );
        }  else if (resourceCollections[0].length === 1 && resourceCollections[1].length > 1){
            OC.resourcesCollectionsActions.setDialogMessage(
                '.delete-resource-collection-dialog',
                'Are you sure you want to delete these folders and the selected file? This will also ' +
                    'delete all the files and folders within these folders.',
                'Delete folders and file'
            );
            OC.resource.delete(
                resourceIDsToDelete[0], currentCollectionID,
                OC.resourcesCollectionsActions.resourcesDeletedSuccessfully
            );
            OC.collection.deleteMultiple(
                collectionIDsToDelete,
                OC.resourcesCollectionsActions.collectionsDeletedSuccessfully
            );
        }  else if (resourceCollections[0].length === 1 && resourceCollections[1].length === 1){
            OC.resourcesCollectionsActions.setDialogMessage(
                '.delete-resource-collection-dialog',
                'Are you sure you want to delete this folder and this file? This will also ' +
                    'delete all the files and folders within the folder.',
                'Delete folder and file'
            );
            OC.resource.delete(
                resourceIDsToDelete[0], currentCollectionID,
                OC.resourcesCollectionsActions.resourcesDeletedSuccessfully
            );
            OC.collection.delete(
                collectionIDsToDelete[0],
                OC.resourcesCollectionsActions.collectionsDeletedSuccessfully
            );
        }  else if (resourceCollections[0].length > 1){
            OC.resourcesCollectionsActions.setDialogMessage(
                '.delete-resource-collection-dialog',
                'Are you sure you want to delete these resources?',
                'Delete resources'
            );
            OC.resource.deleteMultiple(
                resourceIDsToDelete, currentCollectionID,
                OC.resourcesCollectionsActions.resourcesDeletedSuccessfully
            );
        }  else if (resourceCollections[1].length > 1){
            OC.resourcesCollectionsActions.setDialogMessage(
                '.delete-resource-collection-dialog',
                'Are you sure you want to delete these folders? This will also ' +
                    'delete all the files and folders within these folders.',
                'Delete folders'
            );
            OC.collection.deleteMultiple(
                collectionIDsToDelete,
                OC.resourcesCollectionsActions.resourcesDeletedSuccessfully
            );
        }  else if (resourceCollections[0].length === 1){
            OC.resourcesCollectionsActions.setDialogMessage(
                '.delete-resource-collection-dialog',
                'Are you sure you want to delete this resource?',
                'Delete resource'
            );
            OC.resource.delete(
                resourceIDsToDelete[0], currentCollectionID,
                OC.resourcesCollectionsActions.resourcesDeletedSuccessfully
            );
        }  else if (resourceCollections[1].length === 1){
            OC.resourcesCollectionsActions.setDialogMessage(
                '.delete-resource-collection-dialog',
                'Are you sure you want to delete this folder? This will also ' +
                    'delete all the files and folders within the folder.',
                'Delete folder'
            );
            OC.collection.delete(
                collectionIDsToDelete[0],
                OC.resourcesCollectionsActions.collectionsDeletedSuccessfully
            );
        }

        OC.resourcesCollectionsActions.pendingActions.deleteResources.concat(resourcesDeleted);
        OC.resourcesCollectionsActions.pendingActions.deleteCollections.concat(collectionsDeleted);

        OC.resourcesCollectionsActions.actionCompletionCallback = OC.resourcesCollectionsActions.deleted;

        event.stopPropagation();
        event.preventDefault();
        return false;
    },


    bindResourceCollectionSelectors: function(itemSelector){
        var selector = itemSelector || '.resource-collection-item';
        $(selector + ' input[type=checkbox]').on(
            'itemSelected', OC.resourcesCollectionsActions.resourceCollectionCheckboxHandler);
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
            deleteButton = $('.collection-actions .del-button'),
            renameButton = $('.collection-actions .rename-button'),
            shareButton = $('.collection-actions .share-button'),
            collectionActionsEdit = $('.profile-resources-collections-actions-menu-edit'),
            collectionActionsAdd = $('.profile-resources-collections-actions-menu-add');

        if (OC.resourcesCollectionsActions.selectedResourcesCollections.length >= 1){
            if (!collectionActionsEdit.hasClass('show')){
                collectionActionsEdit.addClass('show');

                // Make the add items menu a little transparent.
                collectionActionsAdd.addClass('fade-out');
            }

            if (OC.resourcesCollectionsActions.selectedResourcesCollections.length == 1){
                OC.resourcesCollectionsActions.enableActionButton(shareButton);
                OC.resourcesCollectionsActions.enableActionButton(renameButton);
            } else {
                OC.resourcesCollectionsActions.disableActionButton(shareButton);
                OC.resourcesCollectionsActions.disableActionButton(renameButton);
            }

            // Enable the action buttons that depend on checked resources/collections.
            OC.resourcesCollectionsActions.enableActionButton(moveButton);
            OC.resourcesCollectionsActions.enableActionButton(copyButton);
            OC.resourcesCollectionsActions.enableActionButton(deleteButton);

            OC.resourcesCollectionsActions.actionButtonsClickHandler();
        } else {
            OC.resourcesCollectionsActions.disableActionButton(moveButton);
            OC.resourcesCollectionsActions.disableActionButton(copyButton);
            OC.resourcesCollectionsActions.disableActionButton(deleteButton);
            OC.resourcesCollectionsActions.disableActionButton(renameButton);
            OC.resourcesCollectionsActions.disableActionButton(shareButton);

            collectionActionsEdit.removeClass('show');
            collectionActionsAdd.removeClass('fade-out');
        }
    },

    enableActionButton: function(actionButton){
        actionButton.removeClass('disabled-collection-button');
        actionButton.disabled = false;
        actionButton.unbind('click');
    },

    disableActionButton: function(actionButton){
        actionButton.addClass('disabled-collection-button');
        actionButton.disabled = true;
        actionButton.unbind('click');

        actionButton.click(function(event){
            event.stopPropagation();
            event.preventDefault();
            return false;
        });
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

$(document).ready(function ($) {
    OC.resourcesCollections.initResourcesCollections();

    if (OC.resourcesCollections.ownerView)
        OC.resourcesCollections.synchronizeSelectors();

    $(".resource-item-description-modified").timeago();
});
});
