/*jslint plusplus: true, browser: true */
/*jslint nomen: true, multistr: true */
/*global jQuery, $, Modernizr, gapi, _*/
/*jslint nomen: false */

var OC = {
    config: {
        search: {
            input: '#search-bar input[name=q]',
            submit: '#search-bar input[type=submit]'
        },
        popup: {
            id: 'default-popup',
            width: 360
        },
        articlePanel: {
            list: 'ul#article-panel',
            item: 'ul#article-panel li'
        },
        article: {
            redirectSelector: '#chapter-select, .revision-selector',
            thermometer: '.thermometer-difficulty',
            thermometerWrapper: '.thermometer-difficulty-wrapper',
            image: '#article img'
        },
        catalog: {
            filterInput: 'input[name=live-filter]',
            filterList: '.category-article-panel',
            categoryPanel: {
                list: 'ul.category-article-panel',
                item: 'ul.category-article-panel li'
            }
        },
        about: {
            jobsCarousel: '.jobs-image-rotator'
        },
        registration: {
            fields: {
                first_name: 'input[name=first_name]',
                last_name: 'input[name=last_name]',
                location: 'input[name=location]',
                socialLogin: '.social-login-hide',
                profilePicture: 'input[name=profile_pic]',
                socialFlag: 'form#signup-form input[name=social_login]'
            },
            googleAuthURL: '/gauth/',
            googleAuthResult: '#results',
            ToS: '#agree-terms-conditions',
            signUpButtonID: 'signup-button'
        },
        invite: {
            formSelector: 'form.signup',
            formSpinner: '.form-spinner',
            formError: '.form-error'
        }
    },

    /**
     * Initializes the click and styling interaction with the search box in the
     *     page header
     * @param none
     * @return none
     */
    renderSearch: function (){
        var searchBox = $(OC.config.search.input),
            searchBoxDefault = searchBox.attr('data-default'),
            searchButton = $(OC.config.search.submit);

        // Disable the search button by default
        searchButton.attr('disabled', 'disabled');

        // Initialize with default value and styling
        searchBox.val(searchBoxDefault);
        searchBox.addClass('default');

        // When there is focus on the input box, add CSS class. Remove when out
        //      of focus
        searchBox.focus(function () {
            if (searchBox.val() !== searchBoxDefault) {
                searchBox.removeClass('default');
                searchBox.addClass('typing');
            } else {
                searchBox.removeClass('typing');
                searchBox.addClass('empty');
                // Move cursor to initial position
                setTimeout(function () {
                    searchBox.selectRange(0, 0);
                }, 200);
            }
        });

        // When user begins typing, clear the default value and add CSS class
        searchBox.keydown(function () {
            if (searchBox.val() === searchBoxDefault) {
                searchBox.val('');
                searchButton.attr('disabled', 'disabled');
            } else { searchButton.removeAttr('disabled'); }
            searchBox.removeClass('default');
            searchBox.removeClass('empty');
            searchBox.addClass('typing');
        });

        // When user takes away focus, and leaves input empty, replace with
        //     original default text and remove CSS class
        searchBox.blur(function () {
            if (searchBox.val() === '') {
                searchBox.val(searchBoxDefault);
                searchButton.attr('disabled', 'disabled');
            }
            searchBox.removeClass('typing');
            searchBox.removeClass('empty');
            if (searchBox.val() === searchBoxDefault) {
                searchBox.addClass('default');
            }
        });
    },

    setUpMenuPositioning: function(menu, offsetSelector, center) {
        var centerMenu = center || false,

            // Returns the position if the button is present, and undefined if
            //      not
            loginPosition = $(offsetSelector).position();
        if (loginPosition) {
            $(menu).css(
                'top', loginPosition.top + $(offsetSelector).outerHeight(true));
            if (centerMenu) {
                $(menu).css(
                    'left', loginPosition.left - ($(menu).outerWidth() - $(
                        offsetSelector).outerWidth(true)));
            } else {
                $(menu).css('left', loginPosition.left);
            }
        }
    },

    popup: function(message, title){
        // See if a popup was already created before.
        var newPopup = $('#'+ OC.config.popup.id);

        var popupTitle = title || '';

        // If not, create one in the DOM assigning the title attribute,
        //     alongwith the ID.
        if (newPopup.length === 0) {
            newPopup = $('<div/>', { id: OC.config.popup.id, 'title': popupTitle});
        } else {
            // Just replace its old title.
            newPopup.attr('title', popupTitle);
        }

        // Populate the popup with the message.
        newPopup.html(message);

        // Launch the popup as a jQueryUI popup.
        newPopup.dialog({
            modal: true,
            open: false,
            width: OC.config.popup.width,
            buttons: {
                Ok: function () {
                    $(this).dialog("close");
                }
            }
        });
    },


    /* Beginning of functionality that may be moved into modules */

    /**
     * Randomly assigns a delay to all article panel elements for the home and
     *     then renders the animation by adding the new class. Uses a custom
     *     randomizer function shuffleElements() to randomly queue elements in
     *     the transition
     * @param none
     * @return none
     */
    renderArticlePanel: function() {
        if (!Modernizr.cssanimations) {
            $(OC.config.articlePanel.item).show();
        } else {
            $(OC.config.articlePanel.item).shuffleElements().each(
                function (i) {
                    $(this).attr(
                        "style", "-webkit-animation-delay:" + i * 300 + "ms; \
                        -moz-animation-delay:" + i * 300 + "ms; \
                        -o-animation-delay:" + i * 300 + "ms; \
                        animation-delay:" + i * 300 + "ms;");
                    if (i === $("ul[data-liffect] li").size() - 1) {
                        $("ul[data-liffect]").addClass("play");
                    }
                }
            );

            $(OC.config.articlePanel.list).attr('data-liffect', 'slideRight');
            $(OC.config.articlePanel.list).addClass("play");
        }
    },

    /**
     * Initializes the article/chapter <select> element with on change redirect
     *     behavior
     * @param none
     * @return none
    */
    renderSelectRedirector: function() {
        $(OC.config.article.redirectSelector).change(function () {
            // Capture slug of article to visit from option attribute
            var url = $("option:selected", this).attr('data-url');

            if (url !== undefined) {
                // Emulate a href click behavior by leading browser to slug page
                window.location.href = url;
            }
        });
    },

    /**
     * Renders the animation on the difficulty thermometer on each article on
     *      page load
     * @param none
     * @return none
    */
    renderThermometer: function() {
        // For every instance of the thermometer
        // HACK: This is done as a class and not as ID because the new added
        //     class with transition state change needs to take precedence over
        //     previous styling. IDs don't work as they command precedence in
        //     all cases
        $(OC.config.article.thermometer).each(function () {
            // Capture its difficulty level, deduct from 100, and turn into %
            //     and apply it to the
            //     width of the rendered meter
            $(this).parent(OC.config.article.thermometerWrapper).css(
                'width', (100 - $(this).attr('data-level')) + "%");
            // Render the animation by applying the transition class
            $(this).addClass("renderDifficulty");
        });
    },

    initCategoryLiveFilter: function(){
        $(OC.config.catalog.filterInput).liveUpdate(
            OC.config.catalog.filterList).focus();
    },

    renderCategoryArticles: function() {
        if (!Modernizr.cssanimations) {
            $(OC.config.catalog.categoryPanel.item).show();
        } else {
            $(OC.config.catalog.categoryPanel.item).each(function (i) {
                var interval = Math.ceil((i + 1) / 5);
                $(this).attr(
                    "style", "-webkit-animation-delay:" + interval * 300 + "ms; \
                        -moz-animation-delay:" + interval * 300 + "ms; \
                        -o-animation-delay:" + interval * 300 + "ms; \
                        animation-delay:" + interval * 300 + "ms;");
                if (interval === $("ul.category-article-panel li").size() - 1) {
                    $("ul.category-article-panel").addClass("play");
                }
            });

            $(OC.config.catalog.categoryPanel.list).attr(
                'data-liffect', 'slideUp');
            $(OC.config.catalog.categoryPanel.list).addClass("play");
        }
    },

    // @author (Ren Aysha)
    renderShowMore: function() {
        // Accept a paragraph and return a formatted paragraph with additional
        //     html tags.
        function formatWords(sentence, show) {
            // Split all the words and store it in an array.
            var words = sentence.split(' '),
                new_sentence = '',
                i;

            // Loop through each word.
            for (i = 0; i < words.length; i++) {
                // Process words that will visible to viewer.
                if (i <= show) {
                    new_sentence += words[i] + ' ';
                    // Process the rest of the words.
                } else {
                    // Add a span at start.
                    if (i === (show + 1)) {
                        new_sentence += '<span class="more_text hide">';
                    }

                    new_sentence += words[i] + ' ';
                    // Close the span tag and add read more link in the very
                    //     end.
                    if (words[i + 1] === null) {
                        new_sentence += '</span><a href="#" class="more_link"> Show more...</a>';
                    }
                }
            }

            return new_sentence;
        }

        // Grab all the excerpt class.
        $('.summary-text').add('[class^="showmore"]').each(function () {
            var words = 80;
            if ($(this).hasClass('showmore-20')) { words = 20;
                } else if ($(this).hasClass('showmore-40')) { words = 40;
                } else if ($(this).hasClass('showmore-60')) { words = 60;
                } else if ($(this).hasClass('showmore-80')) { words = 80;
                } else if ($(this).hasClass('showmore-100')) { words = 100;
                }

            // Run formatWord function and specify the length of words display
            //     to viewer.
            if ($.browser.msie) {
                $(this).html(formatWords($(this).html(), words));
            } else { $(this).html(formatWords($(this).html(), words + 5)); }

            // Hide the extra words.
            $(this).children('span').hide();

            // Apply click event to read more link.
        }).click(function () {
            // Grab the hidden span and anchor.
            var more_text = $(this).children('span.more_text'),
                more_link = $(this).children('a.more_link');

            // Toggle visibility using hasClass
            // I know you can use is(':visible') but it doesn't work in IE8
            //     somehow.

            if (more_text.hasClass('hide')) {
                if ($(this).hasClass('summary-text')) { more_text.show();
                    } else { more_text.slideDown('slow'); }

                more_link.html(' &#171; hide');
                more_text.removeClass('hide');

            } else {
                if ($(this).hasClass('summary-text')) { more_text.hide();
                    } else { more_text.slideUp('slow'); }

                more_link.html(' Show more...');
                more_text.addClass('hide');
            }

            return false;
        });
    },

    resizeArticleImages: function() {
        // HACK: Because Webkit browsers do not compute image width until it is
        //     loaded, this hack may be used to make an in-memory copy of the
        //     image to compute the dimensions
        $(OC.config.article.image).each(function () {
            var image = $(this);
            $("<img/>").attr("src", $(this).attr('src')).load(function () {
                var imgCaption = $('<div/>'),
                    imgCaptionWrapper = $('<div/>'),
                    imgWrapper = $('<div/>'),
                    imgSrc = image.attr('src'),
                    lastIndexOfSlash = imgSrc.lastIndexOf('/'),
                    lastIndexOfPeriod = imgSrc.lastIndexOf('.'),
                    imgNum = imgSrc.substring(
                        lastIndexOfSlash + 1, lastIndexOfPeriod),
                    currentWidth = this.width;

                imgCaption.addClass('img-caption');
                imgCaptionWrapper.addClass('img-caption-wrapper');
                imgWrapper.addClass('img-wrapper');

                imgCaption.appendTo(imgCaptionWrapper);

                imgCaption.text("Figure " + imgNum);

                imgWrapper.insertAfter(image);

                image.css('width', currentWidth * 0.5);

                image.appendTo(imgWrapper);
                imgCaptionWrapper.appendTo(imgWrapper);
            });
        });
    },

    initImageHoverDescriptions: function() {
        $('.pillar').mouseover(function () {
            function showPillarDescription(targetBlock) {
                $(targetBlock).fadeIn('fast');
            }

            if ($(this).hasClass('pillar-community')) {
                showPillarDescription('#pillars-community-description');
            } else if ($(this).hasClass('pillar-innovation')) {
                showPillarDescription('#pillars-innovation-description');
            } else if ($(this).hasClass('pillar-freedom')) {
                showPillarDescription('#pillars-freedom-description');
            }
        });

        $('.pillar').mouseleave(function () {
            function hidePillarDescription(targetBlock) {
                $(targetBlock).fadeOut('fast');
            }

            if ($(this).hasClass('pillar-community')) {
                hidePillarDescription('#pillars-community-description');
            } else if ($(this).hasClass('pillar-innovation')) {
                hidePillarDescription('#pillars-innovation-description');
            } else if ($(this).hasClass('pillar-freedom')) {
                hidePillarDescription('#pillars-freedom-description');
            }
        });

        $('.license').mouseover(function () {
            function showLicenseDescription(targetBlock) {
                $(targetBlock).fadeIn('fast');
            }

            if ($(this).hasClass('license-cc')) {
                showLicenseDescription('#license-cc-description');
            } else if ($(this).hasClass('license-by')) {
                showLicenseDescription('#license-by-description');
            } else if ($(this).hasClass('license-sa')) {
                showLicenseDescription('#license-sa-description');
            }
        });

        $('.license').mouseleave(function () {
            function hideLicenseDescription(targetBlock) {
                $(targetBlock).fadeOut('fast');
            }

            if ($(this).hasClass('license-cc')) {
                hideLicenseDescription('#license-cc-description');
            } else if ($(this).hasClass('license-by')) {
                hideLicenseDescription('#license-by-description');
            } else if ($(this).hasClass('license-sa')) {
                hideLicenseDescription('#license-sa-description');
            }
        });
    },

    renderJobsCarousel: function() {
        $(OC.config.about.jobsCarousel).animate({
            left: "-1950px"
        }, 200000);

        /* 
        // The setInterval-timeout callback way
        position = 0;
        var init = setInterval(function(){
            position -= 1;
            $('.jobs-image-rotator').css("left", position + "px");
        }, 200);
        */
    },

    /*jslint nomen: true */
    expediteGLogin: function(profile) {
        // Fill editable inputs
        $(OC.config.registration.fields.first_name).attr(
            'value', profile.name.givenName);
        $(OC.config.registration.fields.last_name).attr(
            'value', profile.name.familyName);

        var place = _.where(profile.placesLived, {primary : true})[0];
        $(OC.config.registration.fields.location).attr('value', place.value);

        // Hide fields that do not need to be filled
        $(OC.config.registration.fields.socialLogin).slideUp('slow');

        // Set the hidden field value for profile picture with the URL from gapi
        $(OC.config.registration.fields.profilePicture).attr(
            'value', profile.image.url);

        // Set a new hidden form item to communicate to the server that no
        //    reCaptcha verification is required
        $(OC.config.registration.fields.socialFlag).attr('value', 'true');
    },
    /*jslint nomen: false */

    signInCallback: function(authResult) {
        if (authResult.code) {
            authResult.state = $('#session-state').attr('data-state');

            gapi.client.load('plus', 'v1', function () {
                var request = gapi.client.plus.people.get({'userId' : 'me'});

                request.execute(function (profile) {
                    var authObject = {
                        code : authResult.code,
                        state : authResult.state, gplus_id : profile.id
                    };

                    // Send the code to the server
                    $.ajax({
                        type: 'POST',
                        url: OC.config.registration.googleAuthURL,
                        dataType: 'json',
                        contentType: 'application/octet-stream; charset=utf-8',
                        success: function (result) {
                            // Handle or verify the server response if
                            //     necessary.

                            // Eliminate fields that aren't required as a part
                            //     of social login and populate hidden fields
                            //     with necessary values
                            OC.expediteGLogin(profile);

                            // Set user message conveyed success with Google+
                            //     login
                            $(OC.config.registration.googleAuthResult).html(
                                'You have successfully connected to Google. Kindly complete the ' +
                                    'the form below to complete your sign up.'
                            );
                        },
                        data: authObject
                    });
                });
            });
        } else if (authResult.error) {
            // There was an error.
            // Possible error codes:
            //   "access_denied" - User denied access to your app
            //   "immediate_failed" - Could not automatially log in the user
            // console.log('There was an error: ' + authResult['error']);
        }
    },

    initInviteSignup: function() {
        $(OC.config.invite.formSelector).submit(function () {
            var form = $(this),
                formIDWHash = '#' + form.attr('id');
            $(OC.config.invite.formSpinner, form).show();

            // Clear previous error/success signals
            $(formIDWHash + '-error').slideUp('fast');
            $(OC.config.invite.formError, form).removeClass('form-error-show');

            $.ajax({
                data: $(this).serialize(),
                type: 'POST',
                url: $(this).attr('action'),
                success: function (response) {
                    // Hide the spinner
                    $(OC.config.invite.formSpinner, form).hide();

                    // Capture the responses from the JSON objects returned
                    var status = response.status,
                        message = response.message,
                        field_error = false;

                    // Webkit and FF interpret the 'false' JSON response
                    //     differently
                    if (status === false || status === 'false') {
                        ['name', 'organization', 'email'].forEach(
                            function (element, index, array) {
                                if (message[element]) {
                                    var error = $(
                                        '.' + element + '-error', form);
                                    // TODO: Add support for viewing multiple
                                    //     message errors
                                    error.html(message[element][0]);
                                    error.addClass("form-error-show");
                                    $('#id_' + element, form).addClass(
                                        "form-input-error");
                                    field_error = true;
                                }
                            }
                        );
                        if (!field_error) {
                            $(formIDWHash + '-error').html(message);
                            $(formIDWHash + '-error').slideDown('fast');
                        }
                    } else if (status) {
                        form.fadeOut('fast', function () {
                            var successImage = '<div class="success-check"></div>';
                            $(formIDWHash + '-success').html(successImage + message);
                            $(formIDWHash + '-success').slideDown('fast');
                        });
                    }
                }
            });

            return false;
        });

    },

    initRegistrationForm: function() {
        $(OC.config.registration.ToS).change(function () {
            $('#' + OC.config.registration.signUpButtonID).toggleClass(
                'disabled');
            var element = document.getElementById(
                OC.config.registration.signUpButtonID);
            element.disabled = !element.disabled;
        });

        if ($('form#signup-form input[name=social_login]').length > 0) {
            // If upon document.load, social login is set to true, instantly
            //     hide .social-login fields.
            if ($('form#signup-form input[name=social_login]').attr(
                'value').toLowerCase() === "true") {
                $('.social-login-hide').hide();

                // Hide the content block with the Google+ sign in button.
                $('aside.content-block.google-signin').hide();

                // Hide the description box.
                $('#new-account-signup-info').hide();
            }
        }
    },

    emailShare: function(emailAddress, message, from_name, fromAddress) {
        $('#email-share-success, #email-share-error').hide();

        var spinner = $('#share-via-email .form-spinner');
        spinner.show();

        // Send the email message to the right endpoint on the server
        $.ajax({
            type: 'POST',
            url: '/api/emailShare/',
            dataType: 'json',
            contentType: 'application/octet-stream; charset=utf-8',
            data: {
                'email': emailAddress,
                'message': message,
                'from_name': from_name,
                'fromAddress': fromAddress
            },
            success: function (result) {
                spinner.hide();

                // Update view confirming completion of request
                var status = result.status;

                if (status === "true") {
                    $('#email-share-success').html(
                        'You have successfully shared this resource over email'
                    );
                    $('#email-share-success').fadeIn('fast');
                } else {
                    $('#email-share-error').html(
                        'Your message could not be sent. Kindly check the above fields again'
                    );
                    $('#email-share-success').fadeIn('fast');
                }
            }
        });
    },

    commentSubmissionHandler: function(response) {
        if (response.status === "success") {

            // TODO: Change everything resource to comment. Here, and in CSS
            var resource = $('<div/>', { 'class': 'resource' }),
                resourceThumbnail = $('<div/>', {
                    'class': 'resource-thumbnail',
                    style: 'background-image:' +
                        'url(\'{{ MEDIA_URL }}profile/' + response.message.user + '-profile.jpg\')'
                }),
                description = $('<div/>', { 'class': 'description' });

            description.html(response.message.body);

            // Build and append the object to the document
            resourceThumbnail.appendTo(resource);
            description.appendTo(resource);

            $('#comments').prepend(resource);
        } else {
            $("#comment-fail").dialog({
                modal: true,
                open: false,
                width: 360,
                buttons: {
                    Ok: function () {
                        $(this).dialog("close");
                    }
                }
            });
        }
    },

    scrollBind: function (target, to) {
        $(target).click(function () {
            $('html, body').animate({
                scrollTop: $(to).offset().top
            }, 1000);
        });
    },

    commentHandler: function(){
        $('#revision-comment button').click(function (e) {
            // Show the spinner as soon as the 'Post' button is clicked
            var spinner = $('#revision-comment .form-spinner');
            spinner.show();

            // Submit the comment through the interactions API        
            $.post('/interactions/comment/', $('#revision-comment').serialize(),
                function (response) {
                    OC.commentSubmissionHandler(response);
                    spinner.hide();
                }, 'json');

            e.stopPropagation();
            e.preventDefault();
            return false;
        });
    },

    emailShareHandler: function(){
        $('#share-on-email').click(function () {
            $("#email-share-dialog").dialog({
                modal: true,
                open: false,
                width: 560,
                buttons: {
                    Send: function () {
                        OC.emailShare(
                            $("#email-share-address").attr('value'),
                            $("#email-share-message").attr('value'),
                            $("#email-from-name").attr('value'),
                            $("#email-from-address").attr('value')
                        );
                        // TODO: Better interaction. Currently keeps the popup open until
                        //     user explicitly closes it, even after email is sent
                        // $(this).dialog("close");
                    },
                    Close: function () {
                        $('#email-share-success, #email-share-error').hide();
                        $(this).dialog("close");
                    }
                }
            });
            return false;
        });
    },

    setupUserMenu: function(){
        // Figure out positionining of absolute on hover menus
        OC.setUpMenuPositioning('nav#user-menu', '#user-dropdown');

        // Re-initialize the menu positioning every single time the window is resized
        $(window).resize(function () {
            OC.setUpMenuPositioning('nav#user-menu', '#user-dropdown');
        });

        $('#user-buttons > ul > li a, nav#user-menu').mouseenter(function () {
            $('#user-buttons > ul > li a .horizontal-caret').addClass('horizontal-caret-hover');
            $('#user-buttons > ul > li a').addClass('hover');
            $('#user-menu').addClass('showMenu');
        }).mouseleave(function () {
            $('#user-buttons > ul > li a .horizontal-caret').removeClass('horizontal-caret-hover');
            $('#user-buttons > ul > li a').removeClass('hover');
            $('#user-menu').removeClass('showMenu');
        });

        // Figure out absolute positioning of share menu
        OC.setUpMenuPositioning('nav#share-menu', 'li.share-action');
    },

    setupShareMenu: function(){
        $('li.share-action, nav#share-menu').mouseenter(function () {
            $('#share-menu').addClass('showMenu');
        }).mouseleave(function () {
            $('#share-menu').removeClass('showMenu');
        });
    },

    projects: {
        addMemberHandler: function(response) {
            if (response.status === 'true') {
                // Create a new <div> object and set the contents to the new
                //     username.
                var newMember = $('<div/>', {
                    text: response.user.username
                });

                var newMemberTemplate = _.template('<div class="member">' +
                        '<div class="member-info"><div class="member-photo">' +
                        '<img src="<%= id %>" /></div><div class="member-description">' +
                        '<a href="/user/<%= username %>"><%= name %></a></div></div>' +
                        '<div class="member-actions"><form>'+
                        '<input type="hidden" name="user_id" value="<%= id %>" />' +
                        '<input type="hidden" name="project_id" value="' + getProjectID() + '" />' +
                        '<button class="btn dull-button admin-toggle make-admin">Make admin</button>' +
                        '</form></div></div>');

                // TODO(Varun): Attach the event handler to this new member object.

                // Add this member to the top of the list of members.
                $('#member-list').prepend(newMemberTemplate(response.user));
            } else {
                popup(response.message, response.title);
            }
        },

        addAdminHandler: function(response, target) {
            if (response.status === 'true') {
                // Change button text to represent that the user is now an admin.
                target.html('Remove admin');

                target.removeClass('make-admin');
                target.addClass('remove-admin');
            } else {
                popup(response.message, response.title);
            }
        },

        removeAdminHandler: function(response, target) {
            if (response.status === 'true') {
                // Change button text to represent that the user is now an admin.
                target.html('Make admin');

                target.removeClass('remove-admin');
                target.addClass('make-admin');
            } else {
                popup(response.message, response.title);
            }
        },

        getProjectID: function(){
            return $('#project-add-member input[name=project_id]').val();
        },

        adminToggleHandler: function(){
            $('button.admin-toggle').click(function (e) {
                // Show the spinner as soon as the 'Add' button is clicked.
                var spinner = $('#revision-comment .form-spinner');
                spinner.show();

                var userID = $(this).parent().children('input[name=user_id]').val();
                var projectID = $(this).parent().children('input[name=project_id]').val();

                var target = $(this);

                if ($(this).hasClass('make-admin')) {
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

                e.stopPropagation();
                e.preventDefault();
                return false;
            });
        },

        initAddMemberAutocomplete: function(){
            $('#project-add-member input[name=add-member]').autocomplete({
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

                    var projectID = OC.getProjectID();

                    // Submit the add request through the project API        
                    $.get('/project/' + projectID + '/add/' + ui.item.id + '/',
                        function (response) {
                        OC.projects.addMemberHandler(response);
                        spinner.hide();
                    }, 'json');
                }
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
    },

    articleCenter: {
        registrationInit: function(){
            $(window).bind('scroll', function(e){
                scrollMoe();
            });

            var moeWrapper = $('.animating-panda-wrapper > div');

            var scrollMoe = function(){
                var scrolled = $(window).scrollTop();

                if (scrolled > 400 && scrolled < 1399) {
                    moeWrapper.removeClass();
                    moeWrapper.addClass('eating-panda');
                } else if (scrolled > 1400){
                    moeWrapper.removeClass();
                    moeWrapper.addClass('sleeping-panda');
                } else {
                    moeWrapper.removeClass();
                }
            };
        }
    }
};

jQuery(document).ready(function ($) {
    // Set up search box effect.
    OC.renderSearch();

    OC.setupUserMenu();

    // Set up flashing (liffect) article panel.
    OC.renderArticlePanel();

    // Instantiate AJAX submit handler for invite sign-ups
    OC.initInviteSignup();

    OC.initRegistrationForm();


    /** Article specific initializers and other functions */

    // Initialize chapter dropdown change behavior
    OC.renderSelectRedirector();

    // Render animation of difficulty level "thermometer"
    OC.renderThermometer();

    // Resize images assuming their original scale is 150%
    OC.resizeArticleImages();

    OC.setupShareMenu();

    $('#submission-info').animate({
        top: "0px"
    }, 1000);

    $('.edit-dropdown').click(function () {
        $(this).toggleClass('edit-dropdown-opened');
        $(this).parent().children('.edit-dropped').toggleClass('show-dropped');
    });

    // Bind the email share option to a handler.
    OC.emailShareHandler();

    // Bind the comment 'Post' button to a handler.
    OC.commentHandler();


    /* Category specific initializers and renderers */

    // Initialize live update on category article panel.
    OC.initCategoryLiveFilter();

    OC.renderCategoryArticles();


    /* 'About' pages specific initializers and renderers */

    // Setup image hover description panels
    OC.initImageHoverDescriptions();

    // Instantiate jobs page carousel
    OC.renderJobsCarousel();

    $('#philosophy-button').click(function () {
        $('html, body').animate({
            scrollTop: $("#our-philosophy").offset().top
        }, 1000);
    });


    /* Projects specific initializers/renderers */

    // Initialize Projects' launch page.
    OC.projects.launch.init();

    // Bind admin click events with handler function.
    OC.projects.adminToggleHandler();

    // Setup autocomplete for add member functionality.
    OC.projects.initAddMemberAutocomplete();


    /* Other initializers/renderers/handlers */

    OC.renderShowMore();
});

$(document).ajaxSend(function (event, xhr, settings) {
    function getCookie(name) {
        var cookieValue = null, cookies, i, cookie;
        if (document.cookie && document.cookie !== '') {
            cookies = document.cookie.split(';');
            for (i = 0; i < cookies.length; i++) {
                cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(
                        cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    function sameOrigin(url) {
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
    }
    function safeMethod(method) {
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }

    if (!safeMethod(settings.type) && sameOrigin(settings.url)) {
        xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
    }
});


/* All IIFEs below */

// Initialize WebFont from typography website.
var WebFontConfig = { fontdeck: { id: '25967' } };
(function(){
    var wf = document.createElement('script'),
        s = document.getElementsByTagName('script')[0];
    wf.src = ('https:' === document.location.protocol ? 'https' : 'http') +
        '://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js';
    wf.type = 'text/javascript';
    wf.async = 'true';
    s.parentNode.insertBefore(wf, s);
})();


// Function to initialize the Google+ login button.
(function () {
    var po = document.createElement('script'),
        s = document.getElementsByTagName('script')[0];
    po.type = 'text/javascript';
    po.async = true;
    po.src = 'https://plus.google.com/js/client:plusone.js?onload=start';
    s.parentNode.insertBefore(po, s);
})();

/*jslint nomen: true */
// Initialize Google Analytics.
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-23974225-1']);
_gaq.push(['_setDomainName', 'theopencurriculum.org']);
_gaq.push(['_trackPageview']);

(function() {
    var ga = document.createElement('script');
    ga.type = 'text/javascript'; ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(ga, s);
})();
/*jslint nomen: false */


/* All jQuery extension functions below */

jQuery.fn.shuffleElements = function () {
    var o = $(this), j, x, i;
    for (j, x, i = o.length; i; j = parseInt(Math.random() * i,
            10), x = o[--i], o[i] = o[j], o[j] = x) {};
    return o;
};

jQuery.fn.selectRange = function (start, end) {
    return this.each(function () {
        if (this.setSelectionRange) {
            this.focus();
            this.setSelectionRange(start, end);
        } else if (this.createTextRange) {
            var range = this.createTextRange();
            range.collapse(true);
            range.moveEnd('character', end);
            range.moveStart('character', start);
            range.select();
        }
    });
};

/**
    Live search filter written by the great John Resig, himself. See
        http://ejohn.org/blog/jquery-livesearch/
*/
jQuery.fn.liveUpdate = function (list) {
    list = jQuery(list);

    if (list.length) {
        var rows = list.children('li'),
            cache = rows.map(function () {
                return this.innerHTML.toLowerCase();
            });
        this
            .keyup(filter).keyup()
            .parents('form').submit(function () {
                return false;
            });
    }

    return this;

    function filter() {
        var term = jQuery.trim(jQuery(this).val().toLowerCase()), scores = [];

        if (!term) {
            rows.show();
        } else {
            rows.hide();

            cache.each(function(i){
                var score = this.score(term);
                if (score > 0) { scores.push([score, i]); }
            });

            jQuery.each(
                scores.sort(function(a, b){return b[0] - a[0];}), function(){
                jQuery(rows[ this[1] ]).show();
            });
        }
    }
};

/* Global functions that can't be replaced with modules */

function gPlusSignInCallback(authResult){
    return OC.signInCallback(authResult);
}
