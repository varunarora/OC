module("Projects functionality", {
    setup: function(){
        // Fixture setup to ensure the body is empty
        this.newPostButton = $('.new-discussion-post-button');
        this.newPostBody = $('.new-discussion-post-body');
        this.newPostSubmitButton = $('.new-discussion-post-submit');
        this.newPostForm = $('#new-discussion-post-form');

        OC.projects.bindNewPostButton();
    }
});

test('Binding "new post" button with handler', 2, function(){
    // Tests to see if the click handler is in the event list.
    ok(this.newPostButton.hasClickEventListener(
        OC.projects.newPostButtonClickHandler));

    this.newPostButton.click();

    // TODO(Varun): Check for presence of popup
    
    // Assert that new post body is focused.
    ok(this.newPostBody.is(':focus'));
});

test('Binding new post "submit" button with handler', 1, function(){
    // Tests to see if the click handler is in the event list.
    ok(this.newPostSubmitButton.hasClickEventListener(
        OC.projects.newPostSubmitButtonClickHandler));
});

test('New post submit shows error on submit if post body empty', 1, function(){
    this.newPostSubmitButton.click();
    ok(this.newPostBody.hasClass('form-input-error'));
});


test('New post fails to submit with empty body', 1, function(){
    // Unregister any current submit handlers associated with the form.
    this.newPostForm.unbind('submit');
 
    // Create mock submit handler and assign it as a click handler.
    var submitSpy = sinon.spy();

    this.newPostForm.submit(submitSpy);
    ok(!submitSpy.called);
});

test('New post submits if there is content in the body post', 1, function(){
    // Set non-empty contents in the textarea of the post.
    this.newPostBody.val('Non-empty discussion post');

    // Unregister any current submit handlers associated with the form.
    this.newPostSubmitButton.unbind('submit');

    // Create mock submit handler and assign it as a click handler.
    var submitSpy = sinon.spy(function(event){
        event.stopPropagation();
        event.preventDefault();
        return false;
    });

    this.newPostForm.submit(submitSpy);

    this.newPostSubmitButton.click();
    ok(submitSpy.called);
});

test('Do not allow posting of empty comment on a discussion post', function(){});
test('Post a new comment on a discussion post', function(){});

test('New comment posted has actions bound on click', function(){});
test('Post reply to existing comment', function(){});

test('Existing comments voting buttons bound to handlers', function(){});
test('Cast upvote / downvote on a discussion post', function(){});

test('Cast upvote / downvote on an existing post reply', function(){});
test('Cast upvote / downvote on a new post reply', function(){});

test('Cast unvote on upvote / downvote on an existing post reply', function(){});

test('All comment delete buttons are bound', function(){});
test('Delete a standalone descendant element without affecting parent', function(){});

test('Delete a post comment that deletes all its descendants', function(){});

test('Delete a post deleting all nested and root descendants', function(){});

/* Projects member management */
test('Add a member to the project', function(){});

test('Bind admin toggler button', function(){});

test('Turn a member into an administrator', function(){});
test('Remove a member as an administrator', function(){});

test('Remove a member', function(){});


/* Projects invitations requests and administration testing */
test('Make a request for invitation into the project', function(){});

test('Accept a pending project invite request', function(){});
test('Reject a pending project invite request', function(){});
