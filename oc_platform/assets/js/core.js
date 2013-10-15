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
                email: 'input[name=email]',
                username: 'input[name=username]',
                socialLogin: '.social-login-hide',
                profilePicture: 'input[name=profile_pic]',
                socialFlag: 'form#signup-form input[name=social_login]',
                socialID: 'form#signup-form input[name=social_id]'
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
                        offsetSelector).outerWidth())/2);
            } else {
                $(menu).css('left', loginPosition.left - (
                    $(menu).outerWidth() - $(offsetSelector).outerWidth(true)));
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

    customPopup: function(blockToPopup, options){
        var closeCallback = null;
        if (options){
            closeCallback = options.closeCallback || closeCallback;
        }

        // Unbind old events from popup escape/background click.
        $('.oc-popup-exit', blockToPopup).unbind('click');
        $('.popup-background').unbind('click');

        // Launch popup on init.
        launchPopup($(blockToPopup));

        // Attach handler to close popup.
        attachEscapePopupHandler($(blockToPopup));

        return {
            close: closePopup
        };

        function launchPopup(blockToPopup){
            $('.popup-background').addClass('show-popup-background');
            blockToPopup.addClass('show-popup');

            adjustPopupPosition(blockToPopup);

            // Dismiss current message boxes.
            OC.dismissMessageBox();

            // On window resize, adjust the position of the theater
            $(window).resize(function(){
                adjustPopupPosition(blockToPopup);
            });

            $('.popup-background').click(closePopup);
        }

        function adjustPopupPosition(popup) {
            var windowWidth = $(window).width();
            var windowHeight = $(window).height();

            // With an assumption that the block is smaller than the window size
            $('.oc-popup').css('left', (windowWidth - popup.width()) / 2);
            $('.oc-popup').css('top', (windowHeight - popup.height()) / 2.5);
        }

        function attachEscapePopupHandler(popup){
            $('.oc-popup-exit', popup).click(function(){
                closePopup();
            });

            $(document).keyup(function(event) {
                if ($('.oc-popup').hasClass('show-popup')){
                    if (event.which == 27) { // 'Esc' on keyboard
                        closePopup();
                    }
                }
            });
        }

        function closePopup(){
            $('.oc-popup').removeClass('show-popup');
            $('.popup-background').removeClass('show-popup-background');

            if (closeCallback){
                closeCallback();
            }
        }
    },

    tabs: function(tabsWrapperClass, options){
        /**
         *  Tab and click handler for everything tabs
         */
        var tabNumber = 0, showOnly = null;
        if (options){
            tabNumber = options.tab || tabNumber;
            showOnly = options.showOnly || showOnly;
        }

        var tabbedUploader = $(tabsWrapperClass);
        tabbedUploader.addClass('oc-tabs');

        var tabs = $('nav > ul > li > a', tabbedUploader);

        var i;
        for (i = 0; i < tabs.length; i++){
            // Add a unique class to all blocks represented by the navigation
            var contentBlock = $(tabs[i]).attr('href');
            $(contentBlock).addClass('tab-content');
        }

        var contentBlocks = $('.tab-content', tabbedUploader);

        tabs.click(function(event){
            if (! $(this).hasClass('selected')){
                // Unselect all the other navigation items
                tabs.removeClass('selected');
                $(this).addClass('selected');

                var blockToDisplay = $(this).attr('href');

                // Hide all the other open blocks
                $(contentBlocks).hide();
                $(blockToDisplay).show();
            }

            event.preventDefault();
            event.stopPropagation();
            return false;

        });

        if (showOnly){
            $('> nav', tabbedUploader).addClass('hide-tabs');
        }

        // Set the selected tab as the first one
        $(tabs[tabNumber]).click();
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
        $(OC.config.catalog.filterInput).fastLiveFilter(
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
    },

    /*jslint nomen: true */
    expediteGLogin: function(profile) {
        console.log(profile);
        var first_name = profile.name.givenName || "",
            last_name = profile.name.familyName || "";

        var location;
        if (profile.placesLived) {
            var place = _.where(profile.placesLived, {primary : true})[0];
            location = place.value || "";
        } else {
            location = '';
        }

        // Fill editable inputs
        $(OC.config.registration.fields.first_name).attr(
            'value', first_name);
        $(OC.config.registration.fields.last_name).attr(
            'value', last_name);

        $(OC.config.registration.fields.location).attr('value', location);

        // Hide fields that do not need to be filled
        $(OC.config.registration.fields.socialLogin).slideUp('slow');

        // Set the hidden field value for profile picture with the URL from gapi
        $(OC.config.registration.fields.profilePicture).attr(
            'value', profile.image.url);

        // Set the user email address & username
        $(OC.config.registration.fields.email).attr('value', profile.email);
        $(OC.config.registration.fields.username).attr(
            'value', profile.email.substring(0, profile.email.indexOf('@')));

        // Set a new hidden form item to communicate to the server that no
        //    reCaptcha verification is required
        $(OC.config.registration.fields.socialFlag).attr('value', 'true');
        $(OC.config.registration.fields.socialID).attr('value', profile.id);
    },
    /*jslint nomen: false */

    googleRegistrationCallback: function(authResult){
        function success(result, profile){
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
        }
        OC.googleAuthenticationCallback(authResult, success);
    },

    googleSignInCallback: function(authResult) {
        function success(result, profile){
            // Fill the hidden Google form object holding the user Google ID.
            $('.google-plus-login input[name=google_id]').val(
                profile.id);

            // Send a POST request for authenticating the user ID.
            $.post('/glogin/', $('form.google-plus-login').serialize(),
                function(response){
                    // If authentication success, capture the source page and
                    //     redirect the page.
                    if (response.status === "true"){
                        var redirect_to = $(
                            '.google-plus-login input[name=redirect_to]').val();
                        if (redirect_to !== 'False'){
                            window.location.href = redirect_to;
                        } else {
                            window.location.href = '/';
                        }
                    } else {
                        if (authResult['g-oauth-window']){
                            OC.popup('Your Google account is not linked to any user ' +
                                'account. Please signup before you can connect through ' +
                                'Google.', 'Google login failure'
                            );
                        }
                    }
                },
            'json');
        }
        OC.googleAuthenticationCallback(authResult, success);
    },

    googleAuthenticationCallback: function(authResult, successCallback){
        if (authResult.code) {
            authResult.state = $('#session-state').attr('data-state');

            // Get the user's email address from another OAuth2 request
            var userEmail;
            gapi.client.load('oauth2', 'v2', function(){
                var emailRequest = gapi.client.oauth2.userinfo.get();
                emailRequest.execute(function (profile) {
                    userEmail = profile.email;
                });
            });

            gapi.client.load('plus', 'v1', function () {
                var request = gapi.client.plus.people.get({'userId' : 'me'});

                request.execute(function (profile) {
                    var authObject = {
                        code : authResult.code,
                        state : authResult.state, gplus_id : profile.id
                    };

                    // Add the user email address to the profile object
                    profile.email = userEmail;

                    // Send the code to the server
                    $.ajax({
                        type: 'POST',
                        url: OC.config.registration.googleAuthURL,
                        dataType: 'json',
                        contentType: 'application/octet-stream; charset=utf-8',
                        success: function(result){
                            successCallback(result, profile);
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
        // Setup tipsy info on username and password
        $('#signup-form input[title]').tipsy({trigger: 'focus', gravity: 'w'});

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
                'from_address': fromAddress
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
                    $('#email-share-error').fadeIn('fast');
                }
            }
        });
    },

    commentSubmissionHandler: function(response, comment_input) {
        if (response.status === "success") {
            // TODO: Change everything resource to comment. Here, and in CSS
            var resource = $('<div/>', { 'class': 'resource' }),
                resourceThumbnail = $('<div/>', {
                    'class': 'resource-thumbnail',
                    style: 'background-image:' +
                        'url(' + response.message.profile_pic + ')'
                }),
                description = $('<div/>', { 'class': 'description' }),
                commentor = $('<span/>', {'class': 'bold', 'text': response.message.name });

            description.append(commentor);
            description.append(' on ' + response.message.created);
            description.append(response.message.body);

            // Build and append the object to the document
            resourceThumbnail.appendTo(resource);
            description.appendTo(resource);

            // Now empty the comment box
            comment_input.text('');
            comment_input.val('');

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

            // Get the comment textarea element.
            var comment_input = $(
                '#revision-comment textarea[name=body_markdown]');

            // Submit the comment through the interactions API        
            $.post('/interactions/comment/', $('#revision-comment').serialize(),
                function (response) {
                    OC.commentSubmissionHandler(response, comment_input);
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

    onFontLoad: function(){
        OC.setupUserMenu();
        OC.initAddResource();

        $('.chief-panel-container-cover').addClass('play');
    },

    setupUserMenu: function(){
        // Figure out positionining of absolute on hover menus
        OC.setUpMenuPositioning('nav#user-menu', '#user-dropdown');

        // Re-initialize the menu positioning every single time the window is resized
        $(window).resize(function () {
            OC.setUpMenuPositioning('nav#user-menu', '#user-dropdown');
        });

        $('#user-buttons > ul > li.user-firstname-wrapper a, nav#user-menu').mouseenter(function () {
            $('#user-buttons > ul > li.user-firstname-wrapper a .horizontal-caret').addClass('horizontal-caret-hover');
            $('#user-buttons > ul > li.user-firstname-wrapper a').addClass('hover');
            $('#user-menu').addClass('showMenu');
        }).mouseleave(function () {
            $('#user-buttons > ul > li.user-firstname-wrapper a .horizontal-caret').removeClass('horizontal-caret-hover');
            $('#user-buttons > ul > li.user-firstname-wrapper a').removeClass('hover');
            $('#user-menu').removeClass('showMenu');
        });

        // Figure out absolute positioning of share menu
        OC.setUpMenuPositioning('nav#share-menu', 'li.share-action', true);
    },

    setupShareMenu: function(){
        // Do not treat the click action as a regular href click
        $('li.share-action > a').click(function(event){
            event.preventDefault();
            event.stopPropagation();
            return false;
        });

        $('li.share-action, nav#share-menu').mouseenter(function () {
            $('#share-menu').addClass('showMenu');
        }).mouseleave(function () {
            $('#share-menu').removeClass('showMenu');
        });
    },

    initShowMoreBlock: function(){
        var blocksToCompress = [
            '.profile-resources-added-list',
            '.profile-contributions-list',
            '.profile-projects-listing',
            '.home-projects-listing'
        ];

        // Compress all blocks.
        var compressedBlocks = compressBlocks(blocksToCompress);

        // Attach a handler to show more buttons.
        bindShowMoreHandler(compressedBlocks);

        function compressBlocks(blocksToCompress){
            var BLOCK_HEIGHT = 200;
            var showMoreWrapper = getShowMoreElement();

            var compressedBlocks = [];
            var i = 0;
            for (i; i < blocksToCompress.length; i++){
                if ($(blocksToCompress[i]).height() > BLOCK_HEIGHT){
                    $(blocksToCompress[i]).parent().append(
                        showMoreWrapper.clone());
                    $(blocksToCompress[i]).addClass('compressed');

                    compressedBlocks.push($(blocksToCompress[i]));
                }
            }
            return compressedBlocks;
        }

        function bindShowMoreHandler(compressedBlocks){
            var i = 0;
            for (i; i < compressedBlocks.length; i++) {
                var showMoreWrapper = $(
                    '.show-more', compressedBlocks[i].parent());
                if (showMoreWrapper.length == 1){
                    $('.show-more-text', showMoreWrapper).click(
                        {block: $(compressedBlocks[i])}, expandBlock
                    );
                }
            }
        }

        function expandBlock(event){
            event.data.block.removeClass('compressed');

            var showMoreWrapper = $(
                '.show-more', event.data.block.parent());

            // Unbind all previously associated event handlers.
            $('.show-more-text', showMoreWrapper).off();

            // Rename 'Show more' button to 'Show less'
            renameShowElement($('.show-more-text', showMoreWrapper), false);

            $('.show-more-text', showMoreWrapper).click(
                {block: event.data.block}, compressBlock
            );
        }

        function compressBlock(event){
            event.data.block.addClass('compressed');

            var showMoreWrapper = $(
                '.show-more', event.data.block.parent());

            // Unbind all previously associated event handlers.
            $('.show-more-text', showMoreWrapper).off();

            // Rename 'Show more' button to 'Show less'
            renameShowElement($('.show-more-text', showMoreWrapper), true);

            $('.show-more-text', showMoreWrapper).click(
                {block: event.data.block}, expandBlock
            );
        }

        function getShowMoreElement(){
            var showMoreWrapper = $('<div/>', {
                class: 'show-more'
            });
            var showMore = $('<span/>', {
                class: 'show-more-text',
                text: 'SHOW MORE'
            });
            showMoreWrapper.append(showMore);

            return showMoreWrapper;
        }

        function renameShowElement(element, more){
            element.text(more ? 'SHOW MORE' : 'SHOW LESS');
        }

    },

    bindEditHeadlineHandler: function(){
        $('.profile-headline').keypress(function(event) {
            if (event.which == 13){
                event.preventDefault();

                // Remove focus from headline input.
                $('.profile-headline').blur();

                // Get new headline.
                var new_headline = $('.profile-headline').val();

                // Compare with previous headline, only if different, call POST
                //     request.
                var old_headline = $('.profile-headline').attr('title');

                // Get the user ID.
                var user_id = $('.profile-headline').parent('form').children(
                    'input[name=user_id]').val();

                if (old_headline != new_headline){
                    // Set spinner on field to indicate change in progress.
                    var spinnerElement = $('.profile-headline').parent(
                        '.profile-headline-wrapper').children('.headline-edit');
                    spinnerElement.addClass('changing');

                    // Make the POST request.
                    $.post('/user/api/headline/' + user_id + '/edit/',
                        {'new_headline': new_headline },
                        function (response) {
                            spinnerElement.removeClass('changing');
                        }, 'json'
                    );
                }
            }
        });
    },

    initNotificationHandler: function(){
        OC.setUpMenuPositioning('nav#notifications-menu', '.user-notification-count');

        $(window).resize(function () {
            OC.setUpMenuPositioning('nav#notifications-menu', '.user-notification-count');
        });

        OC.setupNotificationsMenu();
    },

    setupNotificationsMenu: function(){
        $('nav#user-buttons > ul > li.user-notification-count').click(
            function(e){
                $('#notifications-menu').toggleClass('showMenu');
                $('li.user-notification-count').toggleClass('menu-open');

                var notificationsCount = $('nav#user-buttons > ul > li.user-notification-count');
                if (notificationsCount.hasClass('unread-notifications')){
                    notificationsCount.removeClass('unread-notifications');
                    OC.dismissUnreadNotifications();
                    $('li.user-notification-count').addClass('empty-notifications');
                }

                e.stopPropagation();
                e.preventDefault();
                return false;
            }
        );
        // Bind a click outside handler to close the menu.
        OC.closeMenusHandler();
    },

    dismissUnreadNotifications: function(){
        // Get the IDs of all notifications that are not marked as read.
        var unreadNotifications = $(
            'nav#notifications-menu > ul > li > a.new-notification');
        var unreadNotificationIDs = [];

        var i;
        for (i = 0; i < unreadNotifications.length; i++){
            notification_id =  $(unreadNotifications[i]).attr('id');
            var notification_prefix = 'notification-';
            unreadNotificationIDs.push(
               notification_id.substring(notification_prefix.length)
            );
        }

        // Get logged in user's ID.
        var userID = $('#user-info input[name=user_id]').val();
        $.get(
            '/user/api/notifications/dismiss/' + userID + '?ids=' + unreadNotificationIDs.join(','),
                function (response) {}, 'json'
        );
    },

    closeMenusHandler: function(){
        $('body').on('click', function(){
            // Get all menus with the class 'showMenu'.
            var openMenus = $('.showMenu');

            var i;
            for (i = 0; i < openMenus.length; i++){
                $(openMenus[i]).removeClass('showMenu');
            }

            // Get all target elements with the class 'menu-open'.
            var highlightedMenuTargets = $('.menu-open');
            var j;
            for (j = 0; j < openMenus.length; j++){
                $(highlightedMenuTargets[j]).removeClass('menu-open');
            }

        });
    },

    initArticleCenter: function(){
        OC.tabs('.introduction-contributor-faqs');

        $('.article-labels span').tipsy();

        $('.article-objectives-title').click(function() {
            $(this).parent().toggleClass('show-objectives');
        });
    },

    initAddResource: function(){
        OC.setUpMenuPositioning('nav#add-resource-menu', '.add-resource');

        $(window).resize(function () {
            OC.setUpMenuPositioning('nav#add-resource-menu', '.add-resource');
        });

        OC.setupResourceMenu();
    },

    setupResourceMenu: function(){
        $('.add-resource, nav#add-resource-menu').mouseenter(function () {
            $('#add-resource-menu').addClass('showMenu');
        }).mouseleave(function () {
            $('#add-resource-menu').removeClass('showMenu');
        });
    },

    initCreateCollection: function(){
        $('.new-collection').click(function(){
            $('.new-collection-dialog').dialog({
                modal: true,
                open: false,
                width: 500,
                buttons: {
                    Ok: function () {
                        var newCollectionName = $(
                            'form#new-collection-form input[name=new_collection_name]');

                        if (newCollectionName.val() === ""){
                            newCollectionName.addClass('form-input-error');
                        } else {
                            $(this).dialog("close");
                            $('form#new-collection-form').submit();
                        }
                    },
                    Cancel: function () {
                        $(this).dialog("close");
                    }
                }
            });
        });
    },

    bindDeleteResourceHandler: function(){
        $('.profile-resource-delete, .project-resource-delete').click(function(event){
            var deleteElement = $(this);
            // NOTE(Varun): Given the ID of the resource is of the format
            //     'resource-x', where x is the ID as stored by the server
            var resourceID = deleteElement.attr('id').substring(9);
            $('.delete-resource-dialog').dialog({
                modal: true,
                open: false,
                width: 500,
                buttons: {
                    'Yes, delete': function () {
                        $(this).dialog("close");
                        $.post('/resources/delete-resource/' + resourceID  + '/',
                            function(response){
                                // Hide the resource
                                if (response.status == 'true'){
                                    $(deleteElement).parents('.resource-collection-item').fadeOut();
                                }
                                else {
                                    OC.popup(
                                        'Sorry, the resource could not be deleted. Please try again later.');
                                }
                            },
                        'json');
                    },
                    Cancel: function () {
                        $(this).dialog("close");
                    }
                }
            });

            event.preventDefault();
            event.stopPropagation();
            return false;
        });
    },

    bindDeleteCollectionHandler: function(){
        $('.profile-collection-delete, .project-collection-delete').click(function(event){
            var deleteElement = $(this);
            // NOTE(Varun): Given the ID of the resource is of the format
            //     'resource-x', where x is the ID as stored by the server
            var collectionID = deleteElement.attr('id').substring(11);
            $('.delete-collection-dialog').dialog({
                modal: true,
                open: false,
                width: 500,
                buttons: {
                    'Yes, delete': function () {
                        $(this).dialog("close");
                        $.post('/resources/delete-collection/' + collectionID  + '/',
                            function(response){
                                // Hide the resource
                                if (response.status == 'true'){
                                    $(deleteElement).parents('.resource-collection-item').fadeOut();
                                }
                                else {
                                    OC.popup(
                                        'Sorry, the collection could not be deleted. Please try again later.');
                                }
                            },
                        'json');
                    },
                    Cancel: function () {
                        $(this).dialog("close");
                    }
                }
            });

            event.preventDefault();
            event.stopPropagation();
            return false;
        });
    },

    initCollectionsTree: function(){
        $('nav.collections-navigation ul li.parent-collection > .toggle-collection').click(
            OC.parentCollectionClickHandler);
    },

    initResourcesCollections: function(){
        // Tipsy the collections/resources visibility.
        $('.project-browse-item-visibility, .profile-browse-item-visibility').tipsy(
            {gravity: 'n'});

        // Tipsy the collections/resources item delete button.
        $('.resource-collection-delete').tipsy({gravity: 'n'});

        OC.resourcesCollections.bindItemVisibilityButton();

        OC.resourcesCollectionsActions.initResourcesCollectionsActions();
    },

    resourcesCollections: {
        resourceCollectionCollaboratorTemplate: _.template('<li class="collaborator-item user" id="user-<%= id %>">' +
                '<div class="collaborator-info user-info">' +
                '<div class="collaborator-photo user-photo" style="background-image: url(\'<%= profile_pic %>\')"></div>' +
                '<div class="collaborator-description user-description">' +
                '<a href="/user/<%= username %>"><%= name %></a></div></div>' +
                '<div class="collaborator-actions user-actions">' +
                '<span class="delete-member delete-button" title="Remove collaborator"></span>' +
                '</div></li>'),

        currentResourceCollectionVisibility: '',

        bindItemVisibilityButton: function(){
            $('.collection-visibility-public .browse-item-visibility, ' +
                '.collection-visibility-project .browse-item-visibility').click(function(event){
                // Check to see if the user is allow to change to visibility or members.
                var actionsWrapper = $(event.target).closest('.resource-collection-actions');

                if (actionsWrapper.hasClass('is-owner') || actionsWrapper.hasClass(
                    'is-collaborator')){

                    // Is this resource/collection a part of a project or not.
                    var isProject = $(event.target).hasClass('project-browse-item-visibility');

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
                        $(event.target), isProject);

                    // Empty contents of collaborator input.
                    collaboratorInput.val('');

                    // Get the list of current collaborators and place in popup list.
                    var userList = $('ul.collaborators', collaboratorForm);

                    // Clear current list.
                    userList.children().remove();

                    // Unbind all previously registered events from tabs.
                    $('.resource-collection-visibility-form-tabs li a').unbind('click');

                    if (resourceCollectionItem.hasClass('directory')){
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
                        $.get('/project/' + projectID + '/visibility/',
                            function (response) {
                                if (response.status === 'true'){
                                    // Set the body of the project visibility tab accordingly.
                                    var projectAccessWrapper = $(
                                        '.resource-collection-visibility-form-content .project-access');
                                    if (response.visibility === 'private'){
                                        projectAccessWrapper.text('This project is private, so only ' +
                                            'the members of this project can see this.');
                                    } else if (response.visibility === 'public'){
                                        projectAccessWrapper.text('This project is public, so ' +
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
            });
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
            },

            setPrivateVisibility: function(collectionVisibility, collectionID){
                $.get('/resources/collection/' + collectionID + '/visibility/private/');

                // Remove the private & public visibility class on the collection.
                collectionVisibility.removeClass('visibility-project');
                collectionVisibility.removeClass('visibility-public');

                // Add the project visibility class on the collection.
                collectionVisibility.addClass('visibility-private');
            },

            setPublicVisibility: function(collectionVisibility, collectionID){
                $.get('/resources/collection/' + collectionID + '/visibility/public/');

                // Remove the private visibility class on the collection.
                collectionVisibility.removeClass('visibility-private');

                // Add the public visibility class on the collection.
                collectionVisibility.addClass('visibility-public');
            }
        },

        resourceVisibility: {
            setupToggler: function(resourceID, isProject){
                var resourceVisibility = $('.resources-collections-added #resource-' +
                        resourceID + ' .project-browse-item-visibility');

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
            },

            setPrivateVisibility: function(resourceVisibility, resourceID){
                $.get('/resources/resource/' + resourceID + '/visibility/private/');

                // Remove the private visibility class on the collection.
                resourceVisibility.removeClass('visibility-project');
                resourceVisibility.removeClass('visibility-public');

                // Add the project visibility class on the collection.
                resourceVisibility.addClass('visibility-private');
            },

            setPublicVisibility: function(resourceVisibility, resourceID){
                $.get('/resources/resource/' + resourceID + '/visibility/public/');

                // Remove the private visibility class on the collection.
                resourceVisibility.removeClass('visibility-private');

                // Add the public visibility class on the collection.
                resourceVisibility.addClass('visibility-public');
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
                OC.setMessageBoxMessage(
                    'Changing access control of resources and collections inside...');
                OC.showMessageBox();
                if (collectionID !== ''){
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
    },

    resourcesCollectionsActions: {
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
            $('.resource-collection-item').draggable({ revert: "invalid" });
            $('.resource-collection-item.directory').droppable({
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
                    'Moved resources and collections successfully');
            } else if (movedResources.length >= 1) {
                OC.setMessageBoxMessage(
                    'Moved resource(s) into the collection successfully');
            } else if (movedCollections.length >= 1) {
                OC.setMessageBoxMessage(
                    'Moved collection(s) successfully');
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
            }
        },

        actionButtonsClickHandler: function(){
            var moveButton = $('.collection-actions .move-button');

            moveButton.click(function(event){
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
                            if (resourceCollectionItem.hasClass('directory')){
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
                    $.get('/resources/collection/' + collectionID + '/tree/project/',
                        function(response){
                            if (response.status == 'true'){
                                OC.resourcesCollectionsActions.renderBrowser(response.tree, collectionBrowser);
                                collectionBrowser.removeClass('loading-browser');
                            }
                            else {
                                OC.popup(response.message, response.title);
                            }
                        },
                    'json');
                } else {
                    $.get('/resources/collection/' + collectionID + '/tree/user/',
                        function(response){
                            if (response.status == 'true'){
                                OC.resourcesCollectionsActions.renderBrowser(response.tree, collectionBrowser);
                                collectionBrowser.removeClass('loading-browser');
                            }
                            else {
                                OC.popup(response.message, response.title);
                            }
                        },
                    'json');
                }
            });
        },

        renderBrowser: function(tree, parentElement){
            parentElement.html(tree);

            // Bold the current collection.
            var currentCollectionID = $('.resources-collections-added').attr('id').substring(11);
            parentElement.find('a#collection-' + currentCollectionID).addClass(
                'current-collection');

            // When clicking in whitespace in the move browser, unselect current selection.
            parentElement.click(function(event){
                parentElement.find('a.selected-destination-collection').removeClass(
                        'selected-destination-collection');
            });

            // Bind collection click with selection of collection.
            parentElement.find('a').click(function(event){
                // Remove any other selections previously made.
                var currentlySelectedCollection = parentElement.find(
                    'a.selected-destination-collection');

                if (!$(event.target).hasClass('current-collection')){
                    currentlySelectedCollection.removeClass(
                        'selected-destination-collection');

                    if (currentlySelectedCollection[0] !== event.target){
                        $(event.target).toggleClass('selected-destination-collection');
                    }
                }

                event.stopPropagation();
                event.preventDefault();
                return false;
            });

            // Toggle collections if it has child collections.
            $('ul li.parent-collection > .toggle-collection', parentElement).click(
                OC.parentCollectionClickHandler);
        },

        bindResourceCollectionSelectors: function(){
            $('.resource-collection-item input[type=checkbox]').click(
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
            var moveButton = $('.collection-actions .move-button');
            if (OC.resourcesCollectionsActions.selectedResourcesCollections.length >= 1){
                OC.resourcesCollectionsActions.enableActionButton(moveButton);
                OC.resourcesCollectionsActions.actionButtonsClickHandler();
            } else {
                OC.resourcesCollectionsActions.disableActionButton(moveButton);
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
    },

    initMessageBox: function(){
        var messageElement = $('.login-messages-wrapper');

        if (OC.getMessageBoxMessage() !== ''){
            OC.showMessageBox();
        }

        // Assign click handler to dismiss floating div.
        $('.close-message-box', messageElement).click(OC.dismissMessageBox);
    },

    setMessageBoxMessage: function(newMessage){
        var messageElementText = $('.login-messages');
        messageElementText.text(newMessage);
    },

    getMessageBoxMessage: function(){
        var messageElementText = $('.login-messages');
        return messageElementText.text();
    },

    showMessageBox: function(){
        var messageElement = $('.login-messages-wrapper');
        messageElement.addClass('show-messages');
        OC.repositionMessageBox();
    },

    dismissMessageBox: function(){
        var messageElement = $('.login-messages-wrapper');
        OC.setMessageBoxMessage('');
        messageElement.removeClass('show-messages');
    },

    repositionMessageBox: function(){
        var pageWidth = $(window).width(),
            messageElement = $('.login-messages-wrapper'),
            messageWidth = messageElement.width();

        // Set new position of the login messages floating block
        messageElement.css('left', pageWidth / 2 - messageWidth / 2);
    },

    parentCollectionClickHandler: function(event){
        var listItem = $(event.target).closest('li');

        listItem.toggleClass('opened-collection');
        $('> ul', listItem).toggle();

        event.preventDefault();
        event.stopPropagation();
        return false;
    },

    initForgotAuth: function(){
        $('#forgot-username-password a').click(function(event){
            $('.forgot-username-password-dialog').dialog({
                modal: true,
                open: false,
                width: 500,
                buttons: {
                    Submit: function () {
                        $(this).dialog("close");
                        $('form.forgot-username-password-form').submit();
                    },
                    Cancel: function () {
                        $(this).dialog("close");
                    }
                }
            });

            event.preventDefault();
            event.stopPropagation();
            return false;
        });
    },

    initFavoriteResource: function(){
        // Determine if this user has favorited this resource.
        var resourceID = $('form#resource-form input[name=resource_id]').val(),
            userID = $('form#resource-form input[name=user_id]').val();

        // If this is a user profile, several instances of this form should exist
        //     returning the value of the first form (all having the same user ID).
        var profileUserID = $('form.profile-favorite-form input[name=user_id]').val();

        var resourceFavoriteWrapper = $('li.favorite-action'),
            resourceFavoriteButton = $('a', resourceFavoriteWrapper);

        if (userID){
                $.get('/interactions/favorite/state/resource/' + resourceID + '/user/' + userID + '/',
                    function(response){
                        if (response.status == 'true')
                            if (response.favorite.state == 'true'){
                                resourceFavoriteWrapper.addClass('favorited');
                                resourceFavoriteButton.attr('title', 'Unfavorite');
                            }
                    },
                'json');

                resourceFavoriteButton.click(function(event){
                    $.get('/interactions/favorite/resource/' + resourceID + '/user/' + userID + '/',
                        function(response){
                            if (response.status == 'true'){
                                resourceFavoriteWrapper.addClass('favorited');
                                resourceFavoriteButton.attr('title', 'Unfavorite');
                            }
                            else if (response.status == 'unfavorite success'){
                                resourceFavoriteWrapper.removeClass('favorited');
                                resourceFavoriteButton.attr('title', 'Favorite');
                            }
                        },
                    'json');

                    event.preventDefault();
                    event.stopPropagation();
                    return false;
                });

            // Tipsy the favorite button.
            resourceFavoriteButton.tipsy({ gravity: 's'});
        } else if (profileUserID){
            var profileFavoriteButton = $('.profile-favorite-action');
            profileFavoriteButton.click(function(event){
                var resourceID = $(event.target).closest(
                    '.favorite-resource-item').find(
                    'form.profile-favorite-form input[name=resource_id]').val();

                $.get('/interactions/favorite/resource/' + resourceID + '/user/' + profileUserID + '/',
                    function(response){
                        if (response.status == 'true'){
                            $(event.target).addClass('favorited');
                            $(event.target).attr('title', 'Unfavorite');
                        }
                        else if (response.status == 'unfavorite success'){
                            $(event.target).removeClass('favorited');
                            $(event.target).attr('title', 'Favorite');
                        }
                    },
                'json');
            });

            // Tipsy the favorite button.
            profileFavoriteButton.tipsy({ gravity: 's'});
        } else {
            resourceFavoriteButton.click(function(event){
                OC.popup('You must be logged in to favorite a resource',
                    'Log in to favorite resource');

                event.preventDefault();
                event.stopPropagation();
                return false;
            });
        }
    },

    initUpvoteDownvoteResource: function(){
        // Get the user and resource ID for this resource.
        var resourceID = $('form#resource-form input[name=resource_id]').val(),
            userID = $('form#resource-form input[name=user_id]').val();

        var upvoteContainter = $('.article-community li.thumbs-up-action'),
            downvoteContainter = $('.article-community li.thumbs-down-action'),
            upvoteCountElement = $('.count', upvoteContainter),
            downvoteCountElement = $('.count', downvoteContainter);
        
        if (resourceID){
            $.get('/interactions/votes/count/resource/' + resourceID + '/',
                function(response){
                    if (response.status == 'true'){
                        upvoteCountElement.text(response.upvote_count);
                        downvoteCountElement.text(response.downvote_count);
                    
                        if (response.user_upvoted == 'true'){
                            downvoteContainter.addClass('user-upvoted');
                        }
                        if (response.user_downvoted == 'true'){
                            downvoteContainter.addClass('user-downvoted');
                        }
                    }
                },
            'json');
        }

        if (userID){
            $('a', upvoteContainter).click(function(event){
                $.get('/interactions/vote/up/resource/' + resourceID + '/',
                    function(response){
                        if (response.status == 'true'){
                            upvoteContainter.addClass('user-upvoted');

                            upvoteCountElement.text(
                                parseInt(upvoteCountElement.text(), 10) + 1);
                        } else if (response.status == 'unvote success'){
                            upvoteContainter.removeClass('user-upvoted');

                            upvoteCountElement.text(
                                parseInt(upvoteCountElement.text(), 10) - 1);
                        }
                    },
                'json');

                event.preventDefault();
                event.stopPropagation();
                return false;
            });

            $('a', downvoteContainter).click(function(event){
                $.get('/interactions/vote/down/resource/' + resourceID + '/',
                    function(response){
                        if (response.status == 'true'){
                            downvoteContainter.addClass('user-downvoted');

                            downvoteCountElement.text(
                                parseInt(downvoteCountElement.text(), 10) + 1);
                        } else if (response.status == 'unvote success'){
                            downvoteContainter.removeClass('user-downvoted');

                            downvoteCountElement.text(
                                parseInt(downvoteCountElement.text(), 10) - 1);
                        }
                    },
                'json');

                event.preventDefault();
                event.stopPropagation();
                return false;
            });
        } else {
             $('a', upvoteContainter).click(function(event){
                OC.popup('You must be logged in to upvote a resource',
                    'Log in to upvote resource');

                event.preventDefault();
                event.stopPropagation();
                return false;
             });

            $('a', downvoteContainter).click(function(event){
                OC.popup('You must be logged in to downvote a resource',
                    'Log in to downvote resource');

                event.preventDefault();
                event.stopPropagation();
                return false;
             });
        }
    },

    initPictureManipulation: function(){
        OC.initEditHandlers();

        OC.repositionPictures.initRepositionPictures();
    },

    initEditHandlers: function(){
        $('.change-picture').click(function(){
            $('.picture-upload-dialog').dialog({
                modal: true,
                open: false,
                width: OC.config.popup.width,
                buttons: {
                    Upload: function () {
                        $('.picture-upload-dialog form').submit();
                        $(this).dialog("close");
                    }
                }
            });
        });

        $('.change-picture').tipsy({gravity: 's'});
    },

    repositionPictures: {
        originalRepositionableTop: 0,
        originalRepositionableLeft: 0,

        repositionSetup: false,

        userProfile: {
            selector: '.user-picture-cover',
            positionerSelector: '.user-picture-repositioner',
            container: 'user-picture-repositioner-container',
            wrapperSelector: '.user-profile-picture',
            copy: 'user-profile-picture-copy'
        },

        projectCover: {
            selector: '#project-header',
            positionerSelector: '.project-header-repositioner',
            container: 'project-header-repositioner-container',
            wrapperSelector: '.project-header-wrapper',
            copy: 'project-header-picture-copy'
        },

        image: null,

        initRepositionPictures: function(){
            $('.reposition-picture').tipsy({gravity: 's'});

            // Check to see if this is a user profile page.
            if ($('form#profile-picture-reposition-form').length > 0){
                OC.repositionPictures.image = OC.repositionPictures.userProfile;
            }

            // Check to see if this is a projects page.
            if ($('form#project-cover-reposition-form').length > 0){
                OC.repositionPictures.image = OC.repositionPictures.projectCover;
            }

            if (OC.repositionPictures.image){
                // Bind the repositioning click to a handler.
                $('.reposition-picture').click(OC.repositionPictures.repositionClickHandler);

                // Set current position of image.
                backgroundPosition = OC.repositionPictures.getPictureBackgroundPosition();

                OC.repositionPictures.originalRepositionableTop = backgroundPosition.top;
                OC.repositionPictures.originalRepositionableLeft = backgroundPosition.left;
            }

        },

        getPictureBackgroundPosition: function(){
            var picture = $(OC.repositionPictures.image.selector),
                pictureCopy = $('.' + OC.repositionPictures.image.copy);
            pictureRawBackgroundPosition = picture.css('background-position');
            
            positions = pictureRawBackgroundPosition.split(" ");

            if (positions[0].indexOf('%') === -1){
                leftPxIndex = positions[0].indexOf('px');
                leftPx = parseInt(positions[0].substring(0, leftPxIndex), 10);

                topPxIndex = positions[1].indexOf('px');
                topPx = parseInt(positions[1].substring(0, topPxIndex), 10);

                // Avoid division by zero or Infinity value issues.
                if (pictureCopy.width() === picture.width()){
                    leftPercentage = 0;
                } else {
                    leftPercentage = parseInt((Math.abs(leftPx) / (
                        pictureCopy.width() - picture.width())) * 100, 10);
                }

                if (pictureCopy.height() === picture.height()){
                    topPercentage = 0;
                } else {
                    topPercentage = parseInt((Math.abs(topPx) / (
                        pictureCopy.height() - picture.height())) * 100, 10);
                }
            } else {
                leftPercentageIndex = positions[0].indexOf('%');
                leftPercentage = parseInt(positions[0].substring(0, leftPercentageIndex), 10);

                topPercentageIndex = positions[1].indexOf('%');
                topPercentage = parseInt(positions[1].substring(0, topPercentageIndex), 10);
            }

            return {
                left: leftPercentage,
                top: topPercentage
            };
        },

        repositionClickHandler: function(){
            if (!OC.repositionPictures.repositionSetup){
                OC.repositionPictures.setupReposition();
                OC.repositionPictures.repositionSetup = true;
            }

            $('.reposition-overlay').addClass('show');

            // Show the subtle overlay.
            $('.reposition-overlay').animate({
                'opacity': 0.5,
            }, 500);

            // Pop the image container out.
            var picture = $(OC.repositionPictures.image.selector);
            picture.addClass('reposition-mode');

            // Show the repositioner.
            OC.repositionPictures.showRepositioner();

            // Show the repositioner container.
            $('.' + OC.repositionPictures.image.container).addClass('show');

            // Show the floating actions.
            $('.reposition-floating-actions').addClass('show');

            picture.tipsy('show');
        },

        setupReposition: function(){
            // Set repositioner width and height as the image width/height.
            var picturePositioner = $(
                    OC.repositionPictures.image.positionerSelector),
                picture = $(OC.repositionPictures.image.selector),
                pictureWrapper = $(
                    OC.repositionPictures.image.wrapperSelector);

            // First, fetch the image width and height
            pictureBackgroundImage = picture.css('background-image');
            var pictureCopy = $('<img/>', {
                'src': pictureBackgroundImage.replace(/^url\(["']?/, '').replace(/["']?\)$/, ''),
                'class': OC.repositionPictures.image.copy
            });

            pictureWrapper.append(pictureCopy);

            picturePositioner.height(pictureCopy.height());
            picturePositioner.width(pictureCopy.width());

            // Build a container element and position it.
            var containerElement = $('<div/>', {
                'class': OC.repositionPictures.image.container + " show"
            });
            pictureWrapper.append(containerElement);
            containerElement.height(picture.height() + (
                pictureCopy.height() - picture.height())*2);
            containerElement.width(picture.width() + (
                pictureCopy.width() - picture.width())*2);

            containerElement.css('left', picture.position().left -
                (containerElement.width()/2 - picture.width()/2));
            containerElement.css('top', picture.position().top -
                (containerElement.height()/2 - picture.height()/2));

            // Make the repositioner draggable.
            $(OC.repositionPictures.image.positionerSelector).draggable({
                containment: '.' + OC.repositionPictures.image.container,
                drag: OC.repositionPictures.movePicture,
                start: OC.repositionPictures.onDragStart,
                stop: OC.repositionPictures.onDragComplete
            });

            // Hide the container until it is in reposition mode.
            containerElement.removeClass('show');

            // Prepare page view overlay.
            var repositionOverlay = $('<div/>', {'class': 'reposition-overlay'});
            $('body').append(repositionOverlay);

            // Add and show floating "save"/"cancel" button.
            var repositionFloatingActions = $('<div/>', {'class': 'reposition-floating-actions'}),
                repositionSave = $('<button/>', {
                    'class': 'action-button mini-action-button', 'text': 'Save'}),
                repositionCancel = $('<button/>', {
                    'class': 'action-button mini-action-button', 'text': 'Cancel'});

            // In the case of positioning the action in projects, make them appear
            //     over the project cover picture and not under it.
            if (OC.repositionPictures.image === OC.repositionPictures.projectCover){
                repositionFloatingActions.css('top',
                    picture.position().top + picture.height() - 40);
            } else {
                repositionFloatingActions.css('top',
                    picture.position().top + picture.height() + 10);
            }

            repositionFloatingActions.css('left',
                picture.position().left + 10);

            repositionFloatingActions.append(repositionSave);
            repositionFloatingActions.append(repositionCancel);
            $(OC.repositionPictures.image.wrapperSelector).append(repositionFloatingActions);

            // Give tipsy for dragability of the image.
            picture.tipsy({
                gravity: 's',
                trigger: 'manual',
                fade: 'true'
            });

            // Attach dismiss handler.
            repositionCancel.click(OC.repositionPictures.dismissRepositionMode);

            // Attach save handler.
            repositionSave.click(OC.repositionPictures.savePosition);
        },

        showRepositioner: function(){
            $(OC.repositionPictures.image.positionerSelector).addClass('show');
        },

        hideRepositioner: function(){
            $(OC.repositionPictures.image.positionerSelector).removeClass('show');
        },

        movePicture: function(event, ui){
            $(OC.repositionPictures.image.selector).css('background-position',
                ui.position.left + "px " + ui.position.top+ "px");
        },

        onDragStart: function(event, ui){
            $(OC.repositionPictures.image.selector).tipsy('hide');
        },

        onDragComplete: function(event, ui){},

        dismissRepositionMode: function(){
            // Hide the overlay.
            $('.reposition-overlay').animate({
                'opacity': 0,
            }, 500, function(){
                $(this).removeClass('show');

                // Remove repositioner mode from the image.
                var picture = $(OC.repositionPictures.image.selector);
                picture.removeClass('reposition-mode');
            });

            $('.reposition-floating-actions').removeClass('show');

            // Delete/hide the repositioner.
            OC.repositionPictures.hideRepositioner();

            // Hide the repositioner container.
            $('.' + OC.repositionPictures.image.container).removeClass('show');

            // Hide tipsy, incase the image wasn't repositioned.
            $(OC.repositionPictures.image.selector).tipsy('hide');
        },

        savePosition: function(){
            // Compare to see if the position has changed from where it originally was.
            originalBackgroundPosition = {
                left: OC.repositionPictures.originalRepositionableLeft,
                top: OC.repositionPictures.originalRepositionableTop
            };

            newBackgroundPosition = OC.repositionPictures.getPictureBackgroundPosition();

            // If position changed
            if (originalBackgroundPosition.left !== newBackgroundPosition.left ||
                originalBackgroundPosition.top !== newBackgroundPosition.top){
                // Push the new background position in a GET request.
                if (OC.repositionPictures.image === OC.repositionPictures.userProfile){
                // Get the username.
                var username = $(
                    '#profile-picture-reposition-form input[name=username]').val();
                    $.get('/user/' + username + '/reposition-picture/?left=' +
                        newBackgroundPosition.left + '&top=' + newBackgroundPosition.top,
                        function(response){
                            if (response.status == 'true'){
                                // Clear the reposition mode. 
                                OC.repositionPictures.dismissRepositionMode();
                            } else {
                                OC.popup(response.message, response.title);
                            }
                        },
                    'json');
                } else if (OC.repositionPictures.image === OC.repositionPictures.projectCover){
                    var project_id = $(
                        '#project-cover-reposition-form input[name=project_id]').val();
                    $.get('/project/' + project_id + '/reposition-cover/?left=' +
                        newBackgroundPosition.left + '&top=' + newBackgroundPosition.top,
                        function(response){
                            if (response.status == 'true'){
                                // Clear the reposition mode. 
                                OC.repositionPictures.dismissRepositionMode();
                            } else {
                                OC.popup(response.message, response.title);
                            }
                        },
                    'json');
                }
            } else {
                // Clear the reposition mode. 
                OC.repositionPictures.dismissRepositionMode();
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

    // NOTE: This call has been temporarily moved to the callback from the
    //     WebFont loaded callback.
    // OC.setupUserMenu();

    OC.initShowMoreBlock();

    OC.bindEditHeadlineHandler();

    OC.initNotificationHandler();

    OC.initMessageBox();


    /* Profile specific initializers and other functions */

    OC.initPictureManipulation();

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

    /* Other initializers/renderers/handlers */

    OC.initCreateCollection();

    OC.bindDeleteResourceHandler();

    OC.bindDeleteCollectionHandler();

    OC.initCollectionsTree();

    OC.initResourcesCollections();

    OC.initFavoriteResource();

    OC.initUpvoteDownvoteResource();

    OC.initForgotAuth();

    OC.renderShowMore();

    OC.initArticleCenter();

    $('.new-resource-tags').tagit({
        allowSpaces: true
    });
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
            10), x = o[--i], o[i] = o[j], o[j] = x) {}
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

/*jslint nomen: true */
jQuery.fn.hasClickEventListener = function(eventListener) {
    elementClickEvents = $._data(this[0], "events").click;

    var i = 0;
    for (i; i < elementClickEvents.length; i++){
        if (elementClickEvents[i].handler == eventListener){
            return true;
        }
    }

    return false;
};
/*jslint nomen: false */

/**
 * fastLiveFilter jQuery plugin 1.0.3
 * 
 * Copyright (c) 2011, Anthony Bush
 * License: <http://www.opensource.org/licenses/bsd-license.php>
 * Project Website: http://anthonybush.com/projects/jquery_fast_live_filter/
 **/

jQuery.fn.fastLiveFilter = function(list, options) {
    // Options: input, list, timeout, callback
    options = options || {};
    list = jQuery(list);
    var input = this;
    var timeout = options.timeout || 0;
    var callback = options.callback || function() {};
    
    var keyTimeout;
    
    // NOTE: because we cache lis & len here, users would need to re-init the plugin
    // if they modify the list in the DOM later.  This doesn't give us that much speed
    // boost, so perhaps it's not worth putting it here.
    var lis = list.children();
    var len = lis.length;
    var oldDisplay = len > 0 ? lis[0].style.display : "block";
    callback(len); // do a one-time callback on initialization to make sure everything's in sync
    
    input.change(function() {
        // var startTime = new Date().getTime();
        var filter = input.val().toLowerCase();
        var li;
        var numShown = 0;
        for (var i = 0; i < len; i++) {
            li = lis[i];
            if ((li.textContent || li.innerText || "").toLowerCase().indexOf(filter) >= 0) {
                if (li.style.display == "none") {
                    li.style.display = oldDisplay;
                }
                numShown++;
            } else {
                if (li.style.display != "none") {
                    li.style.display = "none";
                }
            }
        }
        callback(numShown);
        // var endTime = new Date().getTime();
        // console.log('Search for ' + filter + ' took: ' + (endTime - startTime) + ' (' + numShown + ' results)');
        return false;
    }).keydown(function() {
        // TODO: one point of improvement could be in here: currently the change event is
        // invoked even if a change does not occur (e.g. by pressing a modifier key or
        // something)
        clearTimeout(keyTimeout);
        keyTimeout = setTimeout(function() { input.change(); }, timeout);
    });
    return this; // maintain jQuery chainability
};

/* Global functions that can't be replaced with modules */

function gPlusSignInCallback(authResult){
    // Calls the handler specific to logging in with G+.
    return OC.googleSignInCallback(authResult);
}

function gPlusRegistrationCallback(authResult){
    // Calls the handler specific to registration with G+.
    return OC.googleRegistrationCallback(authResult);
}
