OC.projects = {
    newCommentTemplate: _.template('<li class="post-comment" id="comment-<%= id %>">' +
            '<div class="post-comment-user-thumbnail">' +
            '<div style="background-image: url(\'<%= profile_pic %>\')" class="discussion-response-thumbnail"></div>' +
            '</div><div class="delete-button" title="Delete comment"></div>' +
            '<div class="post-comment-body">' +
            '<a href=""><%= name %></a><%= body %>' +
            '<form><input type="hidden" name="user" value="<%= user_id %>" />' +
            '<input type="hidden" name="parent_type" value="<%= content_type %>" />' +
            '<input type="hidden" name="parent_id" value="<%= id %>" /></form>' +
            '<div class="comment-actions"><div class="reply-to-comment">Reply</div>' +
            '<div class="upvote-comment">0</div><div class="downvote-comment">0</div>' +
            '</div></div></li>'),
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

        // Bind comment post button on each post to handler.
        OC.projects.bindNewCommentButton();

        OC.projects.bindCommentReplyButton();

        OC.projects.bindVotingButtons('.discussion-item');

        OC.projects.bindCommentDeleteButtons();

        OC.projects.bindPostDeleteButtons();

        var commentInput = 'textarea[name=body_markdown]';

        $(commentInput).on('focus', function(){
            $(this).addClass('expanded');
        });

        $(commentInput).on('blur', function(){
            if ($(this).val() === ''){
                $(this).removeClass('expanded');
            }
        });
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

    bindNewCommentButton: function(){
        $('.post-comment-button-wrapper .post-comment-button').click(function(event){
            var commentTextarea = $(event.target).parents('.post-comments').find('textarea[name=body_markdown]');

            if (commentTextarea.val() !== ''){
                $.post('/interactions/comment/',  $(this).parents('form').serialize(),
                    function(response){
                        // Hide the resource
                        if (response.status == 'success'){
                            OC.projects.newCommentSuccessHandler(response, event.target);
                        }
                        else {
                            OC.popup(
                                'Sorry, the comment could not be posted. Please try again later.');
                        }
                    },
                'json');
            } else {
                commentTextarea.focus();
            }
        });
    },

    newCommentSuccessHandler: function(response, button){
        var newCommentTemplate = OC.projects.newCommentTemplate;
        var newComment = newCommentTemplate(response.message);

        var postComments = $(button).parents('.post-comments'),
            postCommentList = postComments.children('ul');

        if (postCommentList.length === 0){
            postCommentList = $('<ul/>');
            // Insert the new comment list BEFORE the input box
            postComments.prepend(postCommentList);
        }
    
        postCommentList.append(newComment);
        var insertedComment = postCommentList.find('.post-comment:last');

        // Clear the contents of the input box
        var commentTextarea = $(button).parents('.post-comments').find('textarea[name=body_markdown]');
        commentTextarea.val('');

        // Collapse the textarea
        commentTextarea.removeClass('expanded');
        commentTextarea.blur();

        // TODO(Varun): Attach the event handlers to this response.
        OC.projects.attachNewCommentActions(insertedComment);
    },

    newCommentReplySuccessHandler: function(response, originalComment){
        var newCommentTemplate = OC.projects.newCommentTemplate;
        var newComment = newCommentTemplate(response.message);

        // See if the comment already has a <ul> child, and if so, append
        //     the new <li> to it. If not, create a new <ul> and append the <ul>
        //     to it
        var childCommentList = $('> ul', originalComment);

        if (childCommentList.length === 0){
            childCommentList = $('<ul/>');
            originalComment.append(childCommentList);
        }

        childCommentList.append(newComment);
        var insertedComment = childCommentList.find('.post-comment:last');

        // TODO(Varun): Attach the event handlers to this response.
        //     May be consolidate comment generation and assigning handler
        //     to independent function.
        OC.projects.attachNewCommentActions(insertedComment);

        // Empty the contents of the reply textarea
        $('.new-comment-reply-body').val('');
    },

    attachNewCommentActions: function(newComment){
        // Tipsy-fy then new comment's delete button.
        OC.projects.addDeleteButtonTooltip(newComment);

        // Attach the comment delete handler.
        $('.delete-button', newComment).click(
            OC.projects.commentDeleteButtonClickHandler);

        // Attach the comment reply handler.
        $('.reply-to-comment', newComment).click(
            OC.projects.commentReplyButtonClickHandler);

        // Attach the comment upvote and downvote handlers.
        OC.projects.bindVotingButtons(newComment);
    },

    addDeleteButtonTooltip: function(deleteParent){
        $('.delete-button', deleteParent).tipsy({gravity: 'n'});
    },

    bindCommentReplyButton: function(){
        $('.reply-to-comment').click(OC.projects.commentReplyButtonClickHandler);
    },

    commentReplyButtonClickHandler: function(event){
        var originalComment = $(event.target).closest('.post-comment');
        var commentBodyClone = originalComment.find('.post-comment-body:first').clone();

        // TODO(Varun): Give the element a class and lookup that way
        var userName = commentBodyClone.find('a:first').clone();

        // Remove username, comment actions from comment body clone
        commentBodyClone.find('a:first').remove();
        commentBodyClone.find('.comment-actions').remove();
        commentBodyClone.find('ul').remove();

        // Set the title of what needs to popup
        strippedTitle = '"' + commentBodyClone.text().substring(0, 40);
        if (commentBodyClone.text().length > 40){
            strippedTitle += '..."';
        } else {
            strippedTitle += '"';
        }
        $('.new-comment-reply-dialog .new-comment-reply-title').text(
             strippedTitle
        );

        // Set the body of original comment in the popup
        $('.new-comment-reply-dialog .new-comment-original-reply-body').html(
            commentBodyClone.html()
        );

        // Set the user thumbnail of the original comment in the popup
        var originalCommentUserThumbnail = originalComment.find(
            '.discussion-response-thumbnail').css('background-image');

        $('.new-comment-reply-dialog .new-comment-original-commentor-thumbnail').css(
            'background-image', originalCommentUserThumbnail
        );

        // Set the name of the original commentor
        $('.new-comment-reply-dialog .new-comment-original-reply-user-name').html(
            userName
        );

        // Clear no body error classes, if they exist.
        $('.new-comment-reply-body').removeClass('form-input-error');

        // Set comment ID in the input field of the new comment form
        // Given that the format of the ID of the comment <li> is 'comment-xx'.
        originalCommentID = originalComment.attr('id').substring(8);
        $('.new-comment-reply-dialog input[name=parent_id]').val(originalCommentID);

        newCommentReplyPopup = OC.customPopup('.new-comment-reply-dialog');

        $('.new-comment-reply-submit').click(function(event){
            if ($('.new-comment-reply-body').val() !== ''){
                // Get the form.
                var commentReplyForm = $(event.target).parents(
                    '.new-comment-reply-dialog').find('form#new-comment-reply-form');

                // Submit the form via ajax and submit response to handler.
                $.post('/interactions/comment/',  commentReplyForm.serialize(),
                    function(response){
                        if (response.status == 'success'){
                            OC.projects.newCommentReplySuccessHandler(response, originalComment);

                            // Close the popup
                            newCommentReplyPopup.close();
                        }
                        else {
                            OC.popup(
                                'Sorry, the comment reply could not be posted.' +
                                'Please try again later.');
                        }
                    },
                'json');

            } else {
                $('.new-comment-reply-body').addClass('form-input-error');
            }

            event.stopPropagation();
            event.preventDefault();
            return false;
        });
    },

    bindVotingButtons: function(targetParent){
        var commentID;
        $('.upvote-post', targetParent).click(function(event){
            commentID = OC.projects.getDiscussionID(event.target);
            OC.projects.newVote(commentID, true, event.target);
        });
        $('.downvote-post', targetParent).click(function(event){
            commentID = OC.projects.getDiscussionID(event.target);
            OC.projects.newVote(commentID, false, event.target);
        });
        $('.upvote-comment', targetParent).click(function(event){
            commentID = OC.projects.getCommentID(event.target);
            OC.projects.newVote(commentID, true, event.target);
        });
        $('.downvote-comment', targetParent).click(function(event){
            commentID = OC.projects.getCommentID(event.target);
            OC.projects.newVote(commentID, false, event.target);
        });
    },

    getDiscussionID: function(target){
        // Get the comment ID (with the format 'discussion-xx')
        return $(target).closest(
            '.discussion-item').attr('id').substring(11);
    },

    getCommentID: function(target){
        return $(target).closest(
            '.post-comment').attr('id').substring(8);
    },

    newVote: function(commentID, upvote, target){
        if (upvote){
            endpoint = '/interactions/comment/' + commentID + '/upvote/';
        } else {
            endpoint = '/interactions/comment/' + commentID + '/downvote/';
        }

        // Submit the form via ajax and submit response to handler
        $.get(endpoint,
            function(response){
                if (response.status == 'true'){
                    OC.projects.newVoteHandler(target, upvote);
                } else if (response.status == 'unvote success'){
                    OC.projects.newVoteHandler(target, upvote, true);
                }
                else {
                    OC.popup(
                        'Sorry, your vote could not be posted. ' +
                        'Please try again later.');
                }
            },
        'json');
    },

    newVoteHandler: function(target, upvote, undoAction){
        undoAction = undoAction || false;

        var currentVotes = $(target).text();

        if (undoAction) {
            $(target).text(parseInt(currentVotes, 10) - 1);
            $(target).removeClass('user-upvoted');
            $(target).removeClass('user-downvoted');
        } else {
            $(target).text(parseInt(currentVotes, 10) + 1);

            if (upvote){
                $(target).addClass('user-upvoted');
            } else {
                $(target).addClass('user-downvoted');
            }
        }
    },

    bindCommentDeleteButtons: function(){
        $('.post-comments .delete-button').click(
            OC.projects.commentDeleteButtonClickHandler);
    },

    commentDeleteButtonClickHandler: function(event){
        var commentID = OC.projects.getCommentID(event.target);
            
        $.get('/interactions/comment/' + commentID + '/delete/',
            function(response){
                if (response.status == 'true'){
                    OC.projects.commentDeleteHandler(event.target);
                } else {
                    OC.popup(
                        'Sorry, your comment could not be deleted.' +
                        'Please try again later.');
                }
            },
        'json');
    },

    commentDeleteHandler: function(target){
        var commentWrapper = $(target).closest('.post-comment');
        var siblingCount = commentWrapper.siblings('.post-comment').length;

        // Hide the tipsy on the 'delete' target.
        $(target).tipsy('hide');

        if (siblingCount === 0){
            commentWrapper.closest('ul').remove();
        } else {
            commentWrapper.remove();
        }
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

    OC.projects.addDeleteButtonTooltip('.discussion-item');

    // Attach project request invitation button.
    OC.projects.bindInviteRequestButton();

    // Setup autocomplete for add member functionality.
    OC.projects.initAddMemberAutocomplete();

    // Initialize discussion board handlers and functionalities.
    OC.projects.initDiscussionBoard();

    OC.projects.bindInviteAcceptButton();

    OC.projects.bindInviteDeclineButton();
});