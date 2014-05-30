OC.projects = {
/*
    resourceCollectionCollaboratorTemplate: _.template('<li class="collaborator-item user" id="user-<%= id %>">' +
            '<div class="collaborator-info user-info">' +
            '<div class="collaborator-photo user-photo" style="background-image: url(\'<%= profile_pic %>\')"></div>' +
            '<div class="collaborator-description user-description">' +
            '<a href="/user/<%= username %>"><%= name %></a></div></div>' +
            '<div class="collaborator-actions user-actions">' +
            '<span class="delete-member delete-button" title="Remove collaborator"></span>' +
            '</div></li>'),
*/
    attachPopup: '',
    postRedirectTo: '',
    addMemberHandler: function(response) {
        if (response.status === 'true') {
            var newMemberTemplate = _.template('<div class="member user">' +
                    '<div class="member-info user-info"><div class="member-photo user-photo" style="background-image:url(\'<%= profile_pic %>\')">' +
                    '</div><div class="member-description user-description">' +
                    '<a href="/user/<%= username %>"><%= name %></a></div></div>' +
                    '<div class="member-actions user-actions"><form>'+
                    '<input type="hidden" name="user_id" value="<%= id %>" />' +
                    '<input type="hidden" name="project_id" value="' + OC.projects.getProjectID() + '" />' +
                    '<button class="btn dull-button admin-toggle make-admin">Make admin</button>' +
                    '</form><span class="delete-member delete-button" id="project-<%= project_id %>-user-<%= id %>"></span>' +
                    '</div></div>');
            var newMember = newMemberTemplate(response.user);

            // Add this member to the top of the list of members.
            $('#member-list').prepend(newMember);

            // Get the newly added DOM element to assign event handlers to it.
            var newDomMember = $('#member-list .member:first');

            $('button.admin-toggle', newDomMember).click(function(event){
                OC.projects.adminToggleHandler(event);
            });
            $('span.delete-member', newDomMember).click(function(event){
                OC.projects.deleteMemberHandler(event);
            });
        } else {
            OC.popup(response.message, response.title);
        }
    },

    addAdminHandler: function(response, target) {
        if (response.status === 'true') {
            // Change button text to represent that the user is now an admin.
            target.html('Remove admin');

            target.removeClass('make-admin');
            target.addClass('remove-admin');

            // Add 'Administrator' label to the name
            target.parents('.member').find('.member-description').append(
                '<span class="admin-label label">ADMINISTRATOR</span>');
        } else {
            OC.popup(response.message, response.title);
        }
    },

    removeAdminHandler: function(response, target) {
        if (response.status === 'true') {
            // Change button text to represent that the user is now an admin.
            target.html('Make admin');

            target.removeClass('remove-admin');
            target.addClass('make-admin');

            // Remove 'Administrator' label to the name
            target.parents('.member').find(
                '.member-description .admin-label').remove();
        } else {
            OC.popup(response.message, response.title);
        }
    },

    getProjectID: function(){
        return $('#project-add-member input[name=project_id]').val();
    },

    bindAdminClick: function(){
        $('button.admin-toggle').click(function (e) {
            OC.projects.adminToggleHandler(e);
        });
    },

    adminToggleHandler: function(event){
        // Show the spinner as soon as the 'Add' button is clicked.
        var spinner = $('#revision-comment .form-spinner');
        spinner.show();

        var target = $(event.target);

        var userID = target.parent().children('input[name=user_id]').val();
        var projectID = target.parent().children('input[name=project_id]').val();

        if (target.hasClass('make-admin')) {
            // Submit the add request through the project API.
            $.get('/group/' + projectID + '/add-admin/' + userID + '/',
                function (response) {
                    OC.projects.addAdminHandler(response, target);
                    spinner.hide();
                }, 'json');
        } else {
            // Submit the add request through the project API.
            $.get('/group/' + projectID + '/remove-admin/' + userID + '/',
                function (response) {
                    OC.projects.removeAdminHandler(response, target);
                    spinner.hide();
                }, 'json');
        }

        event.stopPropagation();
        event.preventDefault();
        return false;
    },

    bindDeleteButton: function(event){
        $('span.delete-member').click(function(event){
            OC.projects.deleteMemberHandler(event);
        });
    },

    deleteMemberHandler: function(event){
        // From event target, get the projectID and userID
        target = $(event.target);
        targetID = target.attr('id');

        // Given that the format for the ID is project-xxx-user-xxx
        var lastHyphenPosition = targetID.lastIndexOf('-');
        var projectID = targetID.substring(8, lastHyphenPosition - 5);
        var userID = targetID.substring(lastHyphenPosition + 1);

        // Submit the remove member request through the project API.
        $.get('/group/' + projectID + '/remove/' + userID + '/',
            function (response) {
                OC.projects.removeMemberHandler(response, target);
            }, 'json');
    },

    removeMemberHandler: function(response, target){
        if (response.status === 'true') {
            var memberContainer = $(target).parents('.member');
            // Hide the tipsy on the 'delete' target.
            $(target).tipsy('hide');

            memberContainer.remove();
        } else {
            OC.popup(response.message, response.title);
        }
    },

    initAddMemberAutocomplete: function(){
        var addMemberInput = '#project-add-member input[name=add-member]';
        $(addMemberInput).autocomplete({
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
                // Show the spinner as soon as the 'Add' button is clicked
                var spinner = $('#revision-comment .form-spinner');
                spinner.show();

                var projectID = OC.projects.getProjectID();

                // Submit the add request through the project API        
                $.get('/group/' + projectID + '/add/' + ui.item.id + '/',
                    function (response) {
                    OC.projects.addMemberHandler(response);
                    
                    // Clear contents from the input box
                    $(addMemberInput).val('');
                    spinner.hide();
                }, 'json');
            }
        });
    },

    initDiscussionBoard: function(){
        // Bind "create new post" button on Discussion Board to handler.
        OC.projects.bindNewPostButton();

        OC.comments.bindVotingButtons('.discussion-item');

        $('.project-info-settings').tipsy({gravity: 's'});

        // If there is a new post request, open the new post dialog.
        var params = window.location.search === '' ? [] : window.location.search.substring(
            1).split('&');

        if (params){
            var postParameter = _.find(params, function(param){
                return param.indexOf('post=') !== -1;
            }),
                categoryParameter = _.find(params, function(param){
                return param.indexOf('category=') !== -1;
            }),
                redirectToParameter = _.find(params, function(param){
                return param.indexOf('redirect_to=') !== -1;
            });

            if (postParameter){
                var post = postParameter.substring(postParameter.indexOf('post=') + 5);
                if (post === 'new'){
                    OC.projects.postRedirectTo = redirectToParameter.substring(
                        redirectToParameter.indexOf('redirect_to=') + 12);

                    if (categoryParameter){
                        var category = categoryParameter.substring(
                            categoryParameter.indexOf('category=') + 9);

                        var camelCaseCategory = category.charAt(0).toUpperCase() + category.slice(
                            1);
                        var categoryElement = $('.new-discussion-post-dialog select[name="category"] option:contains("' +
                            camelCaseCategory + '")');

                        categoryElement.attr('selected', 'true');
                    }

                    OC.projects.newPostButtonClickHandler();

                    // Bind submit button click.
                    $('.new-discussion-post-submit').click(
                        OC.projects.newPostSubmitButtonClickHandler);
                }
            }
        }
    },

    bindNewPostButton: function(){
        $('.new-discussion-post-button').click(
            OC.projects.newPostButtonClickHandler);

        $('.new-discussion-post-submit').click(
            OC.projects.newPostSubmitButtonClickHandler);
    },

    newPostButtonClickHandler: function(event){
        // Clear previous attachment (form data) / text from post dialog.

        var writePostPopup = OC.customPopup('.new-discussion-post-dialog'),
            attachWrapper;
        $('.new-discussion-post-body').focus();

        // If user is not logged in, hide attachment option and post meta information.
        if (! OC.config.user.id){
            $('.new-discussion-post-prompt-user-thumbnail').addClass('hide');
            $('.new-discussion-post-prompt-suggest-post-as').text('Post');

            $('.new-discussion-post-attach').addClass('hide');
        } else {
            // Bind the click handler to attach files.
            $('a.new-discussion-post-attach').click(function(event){
                attachPopup = OC.customPopup('.new-discussion-post-attach-dialog');
                OC.projects.attachPopup = attachPopup;

                var filesBrowser = $('.new-discussion-post-attach-resource-project-browser');

                OC.tabs('.new-discussion-post-attach-resource-browser');

                var filesBrowserTab = $('.new-discussion-post-attach-resource-tabs li a[href=".my-files"]');

                if (!filesBrowserTab.hasClickEventListener()){
                    filesBrowserTab.click(function(event){
                        $.get('/resources/tree/all/user/',
                            function(response){

                                if (response.status == 'true'){
                                    OC.renderBrowser(response.tree, filesBrowser);
                                    filesBrowser.removeClass('loading-browser');
                                }
                                else {
                                    OC.popup(response.message, response.title);
                                }

                            },
                        'json');

                        event.stopPropagation();
                        event.preventDefault();
                        return false;
                    });
                }

                // Bind 'attach' button click handler.
                $('.new-discussion-post-attach-submit').click(function(event){
                    // Capture the actively selected tab.
                    var activeTab = $('.new-discussion-post-attach-dialog .new-discussion-post-attach-resource-tabs li a.selected');

                    var toResourceCollection;

                    // If the active tab is projects.
                    if (activeTab.attr('href') === '.my-files'){
                         selectedResourceCollection = filesBrowser.find(
                            '.selected-destination-collection, .selected-destination-resource');

                         if (selectedResourceCollection.length > 0)
                            toResourceCollection = $(selectedResourceCollection[0]);
                    }

                    if (toResourceCollection){
                        var elementID = toResourceCollection.attr('id'),
                            resource = elementID.indexOf('resource') != -1;

                        var resourceCollectionID = resource ? elementID.substring(9) : elementID.substring(11);
                        OC.projects.insertAttachment(
                            resourceCollectionID, toResourceCollection.text(),
                            resource
                        );
                    }

                    event.stopPropagation();
                    event.preventDefault();
                    return false;
                });

                event.stopPropagation();
                event.preventDefault();
                return false;
            });
        }
    },

    insertAttachment: function(id, title, isResource){
        attachWrapper = $('.new-discussion-post-dialog .new-discussion-post-attach-wrapper');

        var attachmentReference = $('<span/>', {
            'text': title,
            'class': 'new-discussion-post-attachment'
        });
        var newDiscussionPostForm = $('form#new-discussion-post-form');

        $('input[name=attachment_id]', newDiscussionPostForm).val(id);
        $('input[name=is_resource]', newDiscussionPostForm).val(isResource);

        attachWrapper.html(attachmentReference);

        // Close the popup.
        OC.projects.attachPopup.close();
    },

    newPostSubmitButtonClickHandler: function(event){
        if ($('.new-discussion-post-body').val() !== ''){
            var newDiscussionPostForm = $('form#new-discussion-post-form');

            if (OC.config.user.id){
                newDiscussionPostForm.submit();
            } else {
                var message = 'To complete this post, please login or create ' +
                'a free account (takes 30 seconds!). Don\'t worry, we\'ll keep your posting safe';
                OC.launchSignupDialog(message, function(){
                    // Add a redirect_to in the form.
                    if (OC.projects.postRedirectTo){
                        var redirectToInput = $('<input/>', {
                            'type': 'hidden',
                            'name': 'redirect_to',
                            'value': OC.projects.postRedirectTo
                        });
                        newDiscussionPostForm.prepend(redirectToInput);
                    }

                    newDiscussionPostForm.submit();
                });
            }
        } else {
            $('.new-discussion-post-body').addClass('form-input-error');
        }

        event.stopPropagation();
        event.preventDefault();
        return false;
    },

    getDiscussionID: function(target){
        // Get the comment ID (with the format 'discussion-xx')
        return $(target).closest(
            '.discussion-item').attr('id').substring(11);
    },

    bindPostDeleteButtons: function(event){
        var commentID = OC.projects.getDiscussionID(event.target);

        $.get('/interactions/comment/' + commentID + '/delete/',
            function(response){
                if (response.status == 'true'){
                    OC.projects.postDeleteHandler(event.target);
                } else {
                    OC.popup(
                        'Sorry, your comment could not be deleted.' +
                        'Please try again later.');
                }
            },
        'json');
    },

    postDeleteHandler: function(target){
        $(target).closest('.discussion-item-wrapper').remove();
    },

    bindInviteRequestButton: function(){
        $('.disabled-action-button').click(function(event){
            event.stopPropagation();
            event.preventDefault();
            return false;
        });

        function makeRequest(){
            var requestButton = $('#project-invite-form button.request-button');
            requestButton.addClass('loading');

            var project_id = $('#project-invite-form input[name=project_id]').val();

            $.get('/group/' + project_id + '/request-invite/',
                function(response){
                    requestButton.removeClass('loading');
                    if (response.status == 'true'){
                        if (requestButton.hasClass('join-button')){
                            requestButton.fadeOut();

                            // Reload the page.
                            window.location.reload();
                        }
                        else OC.projects.inviteRequestSuccessHandler(
                            requestButton);
                    }
                    else {
                        OC.popup(response.message, response.title);
                    }
                },
            'json');
        }

        $('#project-info .request-button:not(.disabled-action-button)').click(function(event){
            if (OC.config.user.id) makeRequest();
            else {
                var message = 'To become a member, please login or create a free account (takes 30 seconds!).';
                OC.launchSignupDialog(message, makeRequest);
            }

            event.stopPropagation();
            event.preventDefault();
            return false;
        });
    },

    inviteRequestSuccessHandler: function(targetElement){
        // Change the text in the button box.
        targetElement.text('Request sent');

        // Disable the button.
        targetElement.disabled = true;

        // Fade the button out.
        targetElement.addClass('disabled-action-button');

        // Unbind the click handler previously attached to this.
        targetElement.unbind();

        // Bind a return none handler with this.
        targetElement.click(function(event){
            event.stopPropagation();
            event.preventDefault();
            return false;
        });
    },

    bindInviteAcceptButton: function(){
        $('.requestor-actions .accept-member').click(function(event){
            request_id = $(event.target).parents('form').find(
                'input[name=request_id]').val();

            $.get('/group/request/' + request_id + '/accept/',
                function(response){
                    if (response.status == 'true'){
                        OC.projects.inviteAcceptSuccessHandler(event.target);
                    }
                    else {
                        OC.popup(response.message, response.title);
                    }
                },
            'json');

            event.stopPropagation();
            event.preventDefault();
            return false;
        });
    },

    inviteAcceptSuccessHandler: function(target){
        var requestorItem = $(target).closest('.requestor');

        // Replace buttons with the label 'ACCEPTED'
        var acceptedBadge = $('<span/>', {
            'class': 'accepted-label label',
            'text': 'ACCEPTED'
        });

        requestorItem.find('.requestor-actions').html(acceptedBadge);

        // Add a class to set a green tint of acceptance in the background.
        requestorItem.addClass('user-success');
    },

    bindInviteDeclineButton: function(){
        $('.requestor-actions .decline-member').click(function(event){
            request_id = $(event.target).parents('form').find(
                'input[name=request_id]').val();

            $.get('/group/request/' + request_id + '/decline/',
                function(response){
                    if (response.status == 'true'){
                        OC.projects.inviteDeclineSuccessHandler(event.target);
                    }
                    else {
                        OC.popup(response.message, response.title);
                    }
                },
            'json');

            event.stopPropagation();
            event.preventDefault();
            return false;
        });
    },

    inviteDeclineSuccessHandler: function(target){
        var requestorItem = $(target).closest('.requestor');

        // Replace buttons with the label 'ACCEPTED'
        var declinedBadge = $('<span/>', {
            'class': 'declined-label label',
            'text': 'DECLINED'
        });

        requestorItem.find('.requestor-actions').html(declinedBadge);

        // Add a class to set a green tint of acceptance in the background.
        requestorItem.addClass('user-failure');
    },

    bindProjectDeleteButton: function(){
        $('.delete-project-button').click(function(event){
            projectDeletePopup = OC.customPopup('.confirm-project-delete-dialog');

            event.stopPropagation();
            event.preventDefault();
            return false;
        });
    },

    bindNewCategoryButton: function(){
        $('.add-group-category-button').click(function(event){

            var categoryItem = '<li><input type="text" name="new" value="" />' +
                '<span class="delete-button category-delete-button" title="Delete category">'+
                '</span></li>';
            $('.category-listing').append(categoryItem);

            $('.category-listing li:last .category-delete-button').tipsy({gravity: 's'});
            $('.category-listing li:last .category-delete-button').click(
                OC.projects.categoryDeleteButtonClickHandler);

            $('.category-listing li:last input[type="text"]').focus();

            event.stopPropagation();
            event.preventDefault();
            return false;
        });
    },

    bindCategoryDeleteButton: function(){
        // Add tipsy to the delete button.
        $('.category-listing li .category-delete-button').tipsy({gravity: 's'});

        $('.category-listing li .category-delete-button').click(
            OC.projects.categoryDeleteButtonClickHandler);
    },

    categoryDeleteButtonClickHandler: function(){
        categoryDeletePopup = OC.customPopup('.confirm-category-delete-dialog');
        var categoryDeleteButton = $(this),
            categoryItem = categoryDeleteButton.parents('li');

        $('.confirm-category-delete-submit-button', categoryDeletePopup.dialog).click(function(event){
            categoryDeletePopup.close();

            var categoryInput = $(categoryDeleteButton.siblings('input[type="text"]')[0]),
                projectID = $('form.categories-form input[name=project_id]').val();

            // If this isn't a freshly created category
            if (categoryInput.attr('name') !== 'new'){

                var category_id = categoryInput.attr('name');
                $.get('/group/' + projectID + '/category/' + category_id + '/delete/',
                    function(response){
                        if (response.status == 'true'){
                            categoryDeleteButton.tipsy('hide');
                            categoryItem.remove();

                            OC.setMessageBoxMessage(
                                'Deleted the category successfully.');
                            OC.showMessageBox();
                        }
                        else {
                            OC.popup(response.message, response.title);
                        }
                    },
                'json');

            } else {
                categoryDeleteButton.tipsy('hide');

                // Just remove the list element.
                categoryItem.remove();
            }

            event.stopPropagation();
            event.preventDefault();
            return false;
        });
    },

    launch: {
        init: function(){
            this.bindClickScrolls();

            this.renderHeaderAnimation();

            this.renderPlayProjectCreate();

            this.setupProjectsSignupForm();

            // Instantiate tipsy for anchors on projects invite page
            $('.anchor-image').tipsy({gravity: 'n'});
        },

        bindClickScrolls: function(){
            // Bind 'Sign up' button click to the form
            OC.scrollBind('#projects-signup-anchor', '#projects-footer');

            // Bind anchor buttons to relevant block sections.
            OC.scrollBind('#anchor-upload', '#create-share');
            OC.scrollBind('#anchor-organize', '#organize-content');
            OC.scrollBind('#anchor-search', '#discover-content');
            OC.scrollBind('#anchor-social', '#social-content');
        },

        renderHeaderAnimation: function(){
            // Animate background of top block on page load.
            $('#chief-panel-container.projects-launch').addClass('play');
            $('#chief-panel-container #project-computer').addClass('play');
            $('#chief-panel-container #project-mobile').addClass('play');
            $('#chief-panel-container #project-tablet').addClass('play');
        },

        renderPlayProjectCreate: function(){
            function playProjectCreate() {
                $('#create-steps-panel #upload-create')
                    .animate({opacity: 1}, 1000, function () {
                        $('#create-steps-panel .hidden-arrow:eq(0)')
                            .animate({opacity: 1}, 1000, function () {
                                $('#create-steps-panel #rename-create')
                                    .animate({opacity: 1}, 1000, function () {
                                        $('#create-steps-panel .hidden-arrow:eq(1)')
                                            .animate({opacity: 1}, 1000, function () {
                                                $('#create-steps-panel #share-create')
                                                    .animate({opacity: 1}, 1000, function () {
                                                        $('#create-steps-panel > div')
                                                            .delay(2000)
                                                            .animate({opacity: 0});
                                                    });
                                            });
                                    });
                            });
                    });
            }

            setInterval(function () {
                playProjectCreate();
            }, 8000);

            playProjectCreate();
        },

        setupProjectsSignupForm: function(){
            // Deprecate placeholders for all IE browsers
            if (!Modernizr.input.placeholder) {

                // Adapted from Dropbox Help page implementation
                var initProjectForm = (function () {
                    // If this page is refresh, set all values of the form to ''
                    $('form#projects-signup input, form#projects-signup textarea').val('');

                    $('form#projects-signup input, form#projects-signup textarea').keyup(function () {
                        if ($(this).val() === '') {
                            $(this).prev('label').removeClass('typing');
                        } else {
                            $(this).prev('label').addClass('typing');
                        }
                    });

                    $('form#projects-signup input, form#projects-signup textarea').focus(function () {
                        $(this).prev('label').addClass('empty');
                    });

                    $('form#projects-signup input, form#projects-signup textarea').blur(function () {
                        $(this).prev('label').removeClass('empty');
                    });
                }());

            }
        }
    }
};

jQuery(document).ready(function ($) {

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
    Dropzone.forElement('.new-discussion-post-attach-dialog .upload-drag-drop').on("sending", attachCSRFToken);
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
        postCollectionView = new PostCollectionView({collection: postSet});

        // Render the collection view
        postCollectionView.render();

        // Initiatialize the Backbone models/collection/view
        init_mvc();
    }
});

function init_mvc() {
    // Listen to changes on all options in the filters panel
    var filterCheckboxes = $('.discussion-board-filters input:checkbox');

    // Bind change listeners on function that repopulates the resources
    _.each(filterCheckboxes, function (filter) {
        $(filter).change(function () {
            repopulatePosts(this, postCollectionView);
        });
    });

    // Bind click listeners on main sorting.
    $('.filter-sort-option').click(function(event){
        if ($(event.target).hasClass('filter-sort-option-newest')){
            postSet.sortByNewest();
            postCollectionView.render();
        } else {
            postSet.sortByPopularity();
            postCollectionView.render();
        }
    });

    // Bind text input field as filter.
    $('.discussion-board-filters-search input').keyup(function(event){
        var currentInput = $(this).val();
        var collectionToRender = new PostSet(postSet.filter(function (post) {
            return post.get('body').toLowerCase().indexOf(currentInput.toLowerCase()) !== -1;
        }));

        // Recreate the view (clears previous view)
        postCollectionView.render(collectionToRender);
    });

}

function repopulatePosts(target, resourceCollectionView) {
    /* Filter from current results */
    // Get target filter type and value
    var targetFilterType = $(target).attr("name"),
        targetFilterValue = $(target).attr("value"),

    // Add or remove the value of filter from the filters object based on target modified
        targetType = $(target).attr("type");

    if (typeof targetType !== "undefined" && $(target).attr("type") === "checkbox") {
        if (!target.checked) {
            filters[targetFilterType].push(targetFilterValue);
        } else {
            filters[targetFilterType].splice(
                _.indexOf(filters[targetFilterType], targetFilterValue), 1);
        }
    }

    var collectionToRender = new PostSet(postSet.reject(function (post) {
        return _.some(filters, function(filterValues, filterType){
            return _.indexOf(filterValues, post.get(filterType).toLowerCase()) !== -1;
        });
    }));

    // Recreate the view (clears previous view)
    postCollectionView.render(collectionToRender);
}

// Initialize Group posts Model.
var Post = Backbone.Model.extend({
    // ID of the post.
    id: "",

    // User who created the resource.
    user: "",

    // Thumbnail of user who created the resource.
    userThumbnail: "",

    // Profile URL of user who created the resource.
    userURL: "",

    // Group category this post belongs to.
    category: "",

    // The post body..
    body: "",

    // Comment thread.
    comments: "",

    // If the post has an attachment.
    hasAttachment: '',

    // The host of the attachment, usually 'user profile'.
    attachmentHost: '',

    // Post attachment title.
    attachmentTitle: "",

    // Thumbnail of attachment on the post.
    attachmentThumbnail: "",

    // Thumbnail of attachment on the post.
    attachmentURL: "",

    // Upvotes on the post.
    upvotes: "",

    // Whether or not the visiting user has upvoted the post.
    userInUpvotes: "",

    // Downvotes on the post.
    downvotes: "",

    // Whether or not the visiting user has downvoted the post.
    userInDownvotes: "",

    // Epoch date when this post was created.
    created_raw: "",

    // Formatted date/time of post.
    created: ""
});

// Initialize post set Collection
var PostSet = Backbone.Collection.extend({
    model: Post,
    sortByPopularity: function(){
        this.comparator = this.popularityComparator;
        this.sort();
    },
    sortByNewest: function(){
        this.comparator = this.newestComparator;
        this.sort();
    },
    newestComparator: function(post){
        return -post.get('created_raw');
    },
    popularityComparator: function(post){
        return -post.get('upvotes');
    }
});

// Initialize post view.
var PostView = Backbone.View.extend({
    tagName: "div",
    className: "discussion-item-wrapper",
    template: _.template('<div class="discussion-item" id="discussion-<%= id %>">' +
        '<div style="background-image: url(\'<%= userThumbnail %>\')"' +
        'class="discussion-user-thumbnail"></div><div class="discussion-item-post">' +
        '<div class="post-body-wrapper">' +
        '<div class="delete-button" title="Delete post"></div>' +
        '<div class="post-body">' +
        '<a href="<%= userURL %>" class="bold user-post-info-name"><%= user %></a> ' +
        'posted in <span class="label coming-soon-label"><%= category %></span>' +
        '<span class="post-datetime"> on <%= created %></span><%= body %>' +
        '<% if (hasAttachment){ %>' +
        '<div class="user-post-attachment">' +
        '<div class="user-post-attachment-photo" style="background-image: url' +
        '(\'<%= attachmentThumbnail %>\');"></div>' +
        '<div class="user-post-attachment-description"><a href="<%= attachmentURL %>">' +
        '<%= attachmentTitle %></a></div></div><% } %><div class="post-actions">' +
        '<div class="upvote-post <% if (userInUpvotes){ %>user-upvoted<% } %>">' +
        '<%= upvotes %></div>' +
        '<div class="downvote-post <% if (userInDownvotes){ %>user-upvoted<% } %>">' +
        '<%= downvotes %></div></div></div></div>' +

        '<div class="post-comments comment-thread"><%= comments %>' +
        '<div class="post-new-comment">' +
        '<div class="post-comment-user-thumbnail">' +
        '<div style="background-image: url(\'<%= loggedInUserThumbnail %>\')" ' +
        'class="discussion-response-thumbnail"></div></div>' +
        '<div class="post-comment-body"><form>' +
        '<input type="hidden" name="user" value="<%= loggedInUserID %>" />' +
        '<input type="hidden" name="parent_type" value="<%= commentsContentType %>" />' +
        '<input type="hidden" name="parent_id" value="<%= id %>" />' +
        '<textarea name="body_markdown" placeholder="Say something..."></textarea>' +
        '<div class="post-comment-button-wrapper">' +
        '<div class="action-button post-comment-button">Post comment</div>' +
        '</div></form></div></div></div></div></div>'),

    events: {
        'click .upvote-post': OC.comments.upvotePostClickHandler,
        'click .downvote-post': OC.comments.downvotePostClickHandler,
        'click .post-body-wrapper > .delete-button': OC.projects.bindPostDeleteButtons,

        'focus textarea': OC.comments.focusCommentInput,
        'blur textarea': OC.comments.blurCommentInput,

        'click .post-comment-button': OC.comments.postCommentClickHandler,
        'click .upvote-comment': OC.comments.upvoteCommentClickHandler,
        'click .downvote-comment': OC.comments.downvoteCommentClickHandler,
        'click .reply-to-comment': OC.comments.commentReplyButtonClickHandler
    },

    initialize: function() {
        this.listenTo(this.model, "change", this.render);
    },

    render: function () {
        this.$el.html(this.template(_.extend(this.model.toJSON(), {
            loggedInUserID: OC.config.user.id,
            loggedInUserThumbnail: OC.config.user.thumbnail,
            commentsContentType:  OC.config.contentTypes.comment
        })));
        $('.discussion-board').append(this.$el);

        return this;
    },
});

// Initialize the post collection view
var PostCollectionView = Backbone.View.extend({
    render: function (newCollection) {
        this.clearView();
        this.prepareView();
        var collectionToRender = newCollection || this.collection;
        this.collection = collectionToRender;

        // If no resources found.
        if (collectionToRender.length === 0) {
            this.showNullView();
        } else {
        // Create a new view object for each object in the collection and render it
            _.each(collectionToRender.models, function(item) {
                new PostView({model: item}).render();
            });
        }
        this.revealView();
    },

    clearView: function () {
        $('.discussion-board').html('');
    },

    prepareView: function () {
        $('.discussion-board').addClass('spinner-background');
    },

    revealView: function () {
        $('.discussion-board').removeClass('spinner-background');
        $('.discussion-board').css('display', 'none');
        $('.discussion-board').fadeIn("fast");
    },

    showNullView: function () {
        $('.discussion-board').html('<p>No post matching your criteria found. Sorry!</p>');
    },
});


var filters = {
    category: [],
    // type: [], // Type of the content
};

var postSet = new PostSet();
var postCollectionView;