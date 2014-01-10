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
            $.get('/project/' + projectID + '/add-admin/' + userID + '/',
                function (response) {
                    OC.projects.addAdminHandler(response, target);
                    spinner.hide();
                }, 'json');
        } else {
            // Submit the add request through the project API.
            $.get('/project/' + projectID + '/remove-admin/' + userID + '/',
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
        $.get('/project/' + projectID + '/remove/' + userID + '/',
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
                $.get('/project/' + projectID + '/add/' + ui.item.id + '/',
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

        OC.projects.bindPostDeleteButtons();
    },

    bindNewPostButton: function(){
        $('.new-discussion-post-button').click(
            OC.projects.newPostButtonClickHandler);

        $('.new-discussion-post-submit').click(
            OC.projects.newPostSubmitButtonClickHandler);
    },

    newPostButtonClickHandler: function(event){
        OC.customPopup('.new-discussion-post-dialog');
        $('.new-discussion-post-body').focus();
    },

    newPostSubmitButtonClickHandler: function(event){
        if ($('.new-discussion-post-body').val() !== ''){
            $('form#new-discussion-post-form').submit();
        } else {
            $('.new-discussion-post-body').addClass('form-input-error');
        }
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
        $('.request-to-join .request-button').click(function(event){
            project_id = $(event.target).parents('form').find(
                'input[name=project_id]').val();

            $.get('/project/' + project_id + '/request-invite/',
                function(response){
                    if (response.status == 'true'){
                        OC.projects.inviteRequestSuccessHandler(event.target);
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

    inviteRequestSuccessHandler: function(target){
        // Change the text in the button box.
        $(target).text('Request sent');
        
        // Disable the button.
        $(target).disabled = true;

        // Fade the button out.
        $(target).addClass('disabled-action-button');

        // Unbind the click handler previously attached to this.
        $(target).unbind();

        // Bind a return none handler with this.
        $(target).click(function(event){
            event.stopPropagation();
            event.preventDefault();
            return false;
        });
    },

    bindInviteAcceptButton: function(){
        $('.requestor-actions .accept-member').click(function(event){
            request_id = $(event.target).parents('form').find(
                'input[name=request_id]').val();

            $.get('/project/request/' + request_id + '/accept/',
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

            $.get('/project/request/' + request_id + '/decline/',
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
});