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
                redirectToParameter = _.find(params, function(param){
                return param.indexOf('redirect_to=') !== -1;
            });

            if (postParameter){
                var post = postParameter.substring(postParameter.indexOf('post=') + 5);
                if (post === 'new'){
                    OC.projects.postRedirectTo = redirectToParameter.substring(
                        redirectToParameter.indexOf('redirect_to=') + 12);

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
                OC.launchSignupDialog(function(){
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

    bindPostDeleteButtons: function(){
        $('.discussion-item .post-body-wrapper > .delete-button').click(function(event){
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
        });
    },

    postDeleteHandler: function(target){
        $(target).closest('.discussion-item').remove();
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
            else OC.launchSignupDialog(makeRequest);

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
});