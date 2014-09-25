/*jslint plusplus: true, browser: true */
/*jslint nomen: true, multistr: true */
/*global jQuery, $, Modernizr, gapi, _*/
/*jslint nomen: false */

define(['jquery', 'autocomplete', 'tagit', 'tipsy', 'modernizr', 'upload', 'dialog'], function($){
    //window.onerror = function(message, url, lineNumber){
    //    $('')
    //}

    /**
     * fastLiveFilter jQuery plugin 1.0.3
     * 
     * Copyright (c) 2011, Anthony Bush
     * License: <http://www.opensource.org/licenses/bsd-license.php>
     * Project Website: http://anthonybush.com/projects/jquery_fast_live_filter/
     **/

    $.fn.fastLiveFilter = function(list, options) {
        // Options: input, list, timeout, callback
        options = options || {};
        list = $(list);
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

    _.extend(OC.config, {
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
                socialService: 'form#signup-form input[name=social_service]',
                socialID: 'form#signup-form input[name=social_id]'
            },
            googleAuthURL: '/gauth/',
            googleAuthResult: '.google-signin',
            orWrapper: '.or-wrapper',
            ToS: '#agree-terms-conditions',
            signUpButtonID: 'signup-button'
        },
        invite: {
            formSelector: 'form.signup',
            formSpinner: '.form-spinner',
            formError: '.form-error'
        },
    });

    // OpenCurriculum internal API.
    OC.api = {};

    OC.api.UserProfile = function(username, callback){
        this.username = username;
        this.profile = {};

        this.fetchProfile(callback);
        return this;
    };

    OC.api.UserProfile.prototype.fetchProfile = function(callback){
        profile = this.profile;
        $.get('/user/api/get-profile/' +  this.username + '/',
            function(response){
                if (response.status == 'true'){
                    callback(response.user);
                } else {
                    callback(null);
                }
            },
        'json');
    };

    OC.api.User = function(username, callback){
        this.username = username;
        return new OC.api.UserProfile(this.username, callback);
    };

    _.extend(OC, {
        registerationSuccessCallback: '',
        signupDialog: null,

        initSearchOptions: function(){
            $('.search-options-button').click(function(event){
                $('.search-options').toggleClass('show');
            });
        },

        initSearchAutocomplete: function(){
            $(OC.config.search.input).autocomplete({
                source: function(request, response){
                    $.get('/resources/api/search/' + request.term  + '/',
                        function (data){
                            response($.map(data, function(item){
                                return { label: item, value: item };
                            }));
                        }, 'json');
                },
                minLength: 2,
                select: function(event, ui){
                    var searchForm = $('form#search-form'),
                        searchInput = $('input[name=q]', searchForm);

                    searchInput.val(ui.item.label);
                    $('form#search-form').submit();
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

        customPopup: function(elementSelector, options){
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
            }

            function adjustPopupPosition(popup) {
                var windowWidth = $(window).width();
                var windowHeight = $(window).height();

                // With an assumption that the block is smaller than the window size
                $(popup).css('left', (windowWidth - popup.width()) / 2);
                $(popup).css('top', (windowHeight - popup.height()) / 2.5);
            }

            function attachEscapePopupHandler(popup){
                $('.oc-popup-exit', popup.dialog).click(function(){
                    popup.close();
                });

                $(document).keyup(function(event) {
                    if (popup.dialog.hasClass('show-popup')){
                        if (event.which == 27) { // 'Esc' on keyboard
                            popup.close();
                        }
                    }
                });
            }

            function closePopup(){
                this.dialog.removeClass('show-popup');
                $('.popup-background').removeClass('show-popup-background');

                // If any other popup is still open, show popup background again.
                var allPopups = $('.oc-popup'), i;
                for (i = 0; i < allPopups.length; i++){
                    if ($(allPopups[i]).hasClass('show-popup'))
                        $('.popup-background').addClass('show-popup-background');
                }

                if (closeCallback){
                    closeCallback();
                }
            }

            var closeCallback = null;
            if (options){
                closeCallback = options.closeCallback || closeCallback;
            }

            var blockToPopup = $(elementSelector);

            // Unbind old events from popup escape/background click.
            $('.oc-popup-exit', blockToPopup).unbind('click');
            $('.popup-background').unbind('click');

            // Launch popup on init.
            launchPopup(blockToPopup);

            var popup = {
                dialog: blockToPopup,
                close: closePopup
            };

            // Attach handler to close popup.
            attachEscapePopupHandler(popup);

            $('.popup-background').click(function(){
                closePopup(popup);
            });

            return popup;
        },

        tabs: function(tabsWrapperClass, options){
            /**
             *  Tab and click handler for everything tabs
             */
            var tabNumber = 0, showOnly = null, viewOnly = false;
            if (options){
                tabNumber = options.tab || tabNumber;
                showOnly = options.showOnly || showOnly;
                viewOnly = options.viewOnly || viewOnly;
            }

            var tabbedUploader = $(tabsWrapperClass);
            tabbedUploader.addClass('oc-tabs');


            if (!viewOnly){
                var tabs = $('nav > ul > li > a', tabbedUploader);

                var i;
                for (i = 0; i < tabs.length; i++){
                    // Add a unique class to all blocks represented by the navigation
                    var contentBlock = $(tabs[i]).attr('href').replace('#', '.');
                    $(contentBlock).addClass('tab-content');
                }

                var contentBlocks = $('.tab-content', tabbedUploader);

                tabs.click(function(event){
                    if (! $(this).hasClass('selected')){
                        // Unselect all the other navigation items
                        tabs.removeClass('selected');
                        $(this).addClass('selected');

                        var blockToDisplay = $(this).attr('href').replace('#', '.');

                        // Hide all the other open blocks
                        $(contentBlocks).hide();
                        $(blockToDisplay).show();
                    }

                    event.preventDefault();
                    event.stopPropagation();
                    return false;

                });

                // Set the selected tab as the first one
                $(tabs[tabNumber]).click();
            }

            if (showOnly){
                $('> nav', tabbedUploader).addClass('hide-tabs');
            }
        },

        progressBar: function(elementSelector, options){
            var startAt = 0;
            if (options){
                startAt = options.startAt || startAt;
            }

            var progressBarWrapper = $(elementSelector);

            // Move the indicator to the starting position.
            advanceProgressIndicator(progressBarWrapper, startAt);

            return {
                element: progressBarWrapper,
                advanceTo: advanceTo
            };
            
            function advanceTo(value){
                advanceProgressIndicator(this.element, value);
            }

            function advanceProgressIndicator(progressBar, value){
                $('.oc-progressbar-indicator', progressBar).css(
                    {'width': value + '%'});
            }
        },

        tip: function($el, options){
            var gravity = 'n', title = null, description = false, width = null, dismisser = null;
            if (options){
                gravity = options.gravity || gravity;
                title = options.title || title;
                description = options.description || description;
                width = options.width || width;
                dismisser = options.dismisser || dismisser;
            }

            // Set tip body+text.
            var bodyTemplate = _.template('<div class="oc-tip-body-title"><h4><%= title %></h4></div>' +
                '<div class="oc-tip-body-description"><p><%= description %></p></div>' +
                '<button class="action-button mini-action-button">Done</button>');

            var tip = $('<div/>', {'class': 'oc-tip show' }),
                tipBody = $('<div/>', {
                    'class': 'oc-tip-body',
                    'html': bodyTemplate({'title': title, 'description': description})
                }),
                floatingSpacer = $('<div/>', {'class': 'floating-menu-spacer ' + gravity });

            if (width){
                // Adjust width of the body.
                tipBody.width(width);
            }

            var body = $('body'), appendedTip, top, left;
            switch(gravity){
                case 'n':
                    tip.append(floatingSpacer);
                    tip.append(tipBody);
                    body.append(tip);

                    appendedTip = $('body .oc-tip:last');
                    left = $el.offset().left - (
                        (appendedTip.width() - $el.outerWidth()) / 2);
                    top =  $el.offset().top + $el.outerHeight();

                    // Set position.
                    tip.css({
                        'top': top + 10,
                        'left': left
                    });
                    tip.animate({
                        top: top,
                        opacity: 1
                    }, 500);
                    break;

                case 'e':
                    tip.append(tipBody);
                    tip.append(floatingSpacer);
                    body.append(tip);

                    // Set position.
                    appendedTip = $('body .oc-tip:last');
                    tip.css({
                        'top': $el.offset().top,
                        'left': $el.offset().left - appendedTip.width()
                    });
                    break;

                case 's':
                    tip.append(tipBody);
                    tip.append(floatingSpacer);
                    body.append(tip);

                    appendedTip = $('body .oc-tip:last');
                    left = $el.offset().left - (
                        (appendedTip.width() - $el.outerWidth()) / 2);
                    top =  $el.offset().top - appendedTip.height();

                    // Set position.
                    tip.css({
                        'top': top - 10,
                        'left': left
                    });
                    tip.animate({
                        top: top,
                        opacity: 1
                    }, 500);
                    break;

                case 'w':
                    tip.append(floatingSpacer);
                    tip.append(tipBody);
                    body.append(tip);

                    // Set position.
                    tip.css({
                        'top': $el.offset().top,
                        'left': $el.offset().left + $el.outerWidth()
                    });
                    break;
            }

            if (width){
                appendedTipWidth = $('.oc-tip-body', appendedTip).innerWidth();

                var appendedSpacer = $('.floating-menu-spacer', appendedTip);

                appendedSpacer.width(appendedTipWidth);
                appendedSpacer.css('background-position', ((appendedTipWidth / 2) - 8) + 'px bottom');
            }

            function dismissTip(tip){
                tip.removeClass('show');
                tip.remove();
            }

            $('.action-button', appendedTip).click(function(){
                dismisser(tip, dismissTip);
            });

        },

        setupIndex: function(){
            var homePanel = $('#chief-panel-container.home');

            if (homePanel.length > 0){
                var homePanelHeight = $(window).height() - $('footer').outerHeight(true);
                homePanel.height(homePanelHeight);
            }

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

        renderIndexAnimation: function(){
            var words = ['curriculum', 'lesson plans', 'activities', 'worksheets', 'handouts'],
                counter = 0;

            var animationID;

            function stop(){
                clearInterval(animationID);
                
                setTimeout(function(){
                    animationID = animate();
                }, 5000);
            }

            function animate(){
                forward_motion = false;

                return setInterval(function(){
                    var animatedText = $('.animated-learning-item');

                    if (animatedText.text().length > 0 && !forward_motion){
                        // Remove the current word.
                        animatedText.text(
                            animatedText.text().substring(0, animatedText.text().length - 1));
                    } else {
                        if (animatedText.text().length === words[counter].length){
                            forward_motion = false;
                            stop();
                        } else {
                            if (animatedText.text().length === 0){
                                if (counter === (words.length - 1)){
                                    counter = 0;
                                } else {
                                    counter++;
                                }
                                forward_motion = true;
                            }
                            // Add a letter to the tex.
                            animatedText.text(
                                words[counter].substring(0, animatedText.text().length + 1));
                        }
                    }

                }, 200);
            }

            // Start the animation.
            setTimeout(
                function(){
                    animationID = animate();
                },
            3000);
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

        asynchronousLogin: function(service, user_id){
            $.get('/user/api/social-availability/' +  service + '/' + user_id + '/',
                function(response){
                    if (response.status == 'false'){
                        // If this an asynchronous login page.
                        if (OC.signupDialog){
                            OC.config.user.id = response.id;
                            $('input[name="user"]').val(response.id);

                            OC.config.user.username = response.username;

                            // Dismiss login window and proceed to next step.
                            OC.signupDialog.close();

                            OC.registerationSuccessCallback();

                            // Show signed up message.
                            OC.setMessageBoxMessage('You have successfully logged in.');
                            OC.showMessageBox();

                            OC.pushMessageBoxForward();
                        } else {
                            window.location.reload();
                        }
                    }
                },
            'json');
        },

        /*jslint nomen: true */
        expediteGLogin: function(profile) {
            // Check to see if the social ID already has an account linked.
            //    If so, just log them in and redirect to current location.
            OC.asynchronousLogin('plus', profile.id);

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
            // $(OC.config.registration.fields.socialLogin).slideUp('slow');
            $('tr.registration-username-password td:first').attr('colspan', '2');
            $('tr.registration-username-password td:last').remove();

            // Set the hidden field value for profile picture with the URL from gapi
            var smallPicture = profile.image.url,
                mediumPicture = smallPicture.substring(0, smallPicture.indexOf('?sz=') + 4) + '300';
            $(OC.config.registration.fields.profilePicture).attr(
                'value', mediumPicture);


            // Set the user email address & username
            $(OC.config.registration.fields.email).attr('value', profile.email);
            try {
                $(OC.config.registration.fields.username).attr(
                    'value', profile.email.substring(0, profile.email.indexOf('@')));
            } catch (e){}


            // Set a new hidden form item to communicate to the server that no
            //    reCaptcha verification is required
            $(OC.config.registration.fields.socialFlag).attr('value', 'true');
            $(OC.config.registration.fields.socialService).attr('value', 'plus');
            $(OC.config.registration.fields.socialID).attr('value', profile.id);
        },
        /*jslint nomen: false */

        googleSignInCallback: function(authResult){
            var registrationCover = $('.registration-cover'),
                signUpForm = $('#signup-form'),
                signInForm = $('#sign-in-form'),
                loginDialog = $('.login-dialog'),
                loginDialogBody = $('.oc-popup-body', loginDialog);

            function condenseSignup(){
                loginDialogBody.removeClass('faded');

                OC.expediteGLogin(profile);

                OC.highlightAndReturnErroneousInputs(false);
                $('#signup-form input[type="text"]').trigger('change');

                $('.login-dialog #fill-panel').remove();
                $('.login-dialog #key-panel').addClass('center');
            }

            function success(result, profile){
                if (loginDialog.length > 0){
                    loginDialogBody.removeClass('faded');
                }

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
                            if (redirect_to !== 'False' && redirect_to !== undefined){
                                window.location.href = redirect_to;
                            } else if (OC.signupDialog){
                                condenseSignup();
                            } else {
                                window.location.href = '/';
                            }
                        } else {
                            if (loginDialog.length === 0 && authResult['g-oauth-window'] && signInForm.length > 0){
                                OC.customPopup('.new-account-redirect-dialog');
                                
                                // In the synchronous login scenario, redirect to new account
                                //     create functionality where fields are prefilled.
                                setTimeout(function(){
                                    window.location.href = '/signup/?expedite=plus';
                                }, 3000);
                            } else if (loginDialog.length > 0){
                                condenseSignup();
                                return;
                            }

                        }
                    },
                'json');

                if (signUpForm.length > 0 || loginDialog.length > 0){
                    // Handle or verify the server response if
                    //     necessary.

                    // Eliminate fields that aren't required as a part
                    //     of social login and populate hidden fields
                    //     with necessary values
                    OC.expediteGLogin(profile);

                    OC.highlightAndReturnErroneousInputs(false);
                    $('#signup-form input[type="text"]').trigger('change');

                    // Remove the loading spinner.
                    $('.or-wrapper .or-text').removeClass('hidden');
                    $('.or-wrapper .or-loading').removeClass('visible');

                    registrationCover.removeClass('visible');

                    // Set user message conveyed success with Google+
                    //     login
                    $(OC.config.registration.googleAuthResult).html(
                        '<p>You have successfully connected to Google. Just need to ' +
                            'confirm a few more details below...</p>'
                    );
                    $(OC.config.registration.orWrapper).hide();

                    if (loginDialog.length > 0){
                        $('.login-dialog #fill-panel').remove();
                        $('.login-dialog #key-panel').addClass('center');
                    }
                }
            }

            if (authResult['g-oauth-window'] ||
                (registrationCover.length > 0 && registrationCover.attr('title') === 'plus')){
                // Set a loading spinner.
                $('.or-wrapper .or-text').addClass('hidden');
                $('.or-wrapper .or-loading').addClass('visible');

                OC.googleAuthenticationCallback(authResult, success);

                if (loginDialog.length > 0){
                    loginDialogBody.addClass('faded');
                }
            }
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

        facebookRegistrationCallback: function(response){
            var registrationCover = $('.registration-cover');

            if (response.status === 'connected' ||
                (registrationCover.length > 0 && registrationCover.attr('title') === 'facebook')){
                // Set a loading spinner.
                $('.or-wrapper .or-text').addClass('hidden');
                $('.or-wrapper .or-loading').addClass('visible');

                FB.api('/me', function(response) {
                    // Eliminate fields that aren't required as a part
                    //     of social login and populate hidden fields
                    //     with necessary values
                    OC.expediteFbLogin(response);

                    OC.highlightAndReturnErroneousInputs(false);
                    $('#signup-form input[type="text"]').trigger('change');

                    // Remove the loading spinner.
                    $('.or-wrapper .or-text').removeClass('hidden');
                    $('.or-wrapper .or-loading').removeClass('visible');

                    registrationCover.removeClass('visible');
                });

                // Set user message conveyed success with Facebook
                //     login
                $(OC.config.registration.googleAuthResult).html(
                    '<p>You have successfully connected to your Facebook account.  Just need to ' +
                            'confirm a few more details below...</p>'
                );
                $(OC.config.registration.orWrapper).hide();
            }
        },

        expediteFbLogin: function(profile) {
            // Check to see if the social ID already has an account linked.
            //    If so, just log them in and redirect to current location.
            OC.asynchronousLogin('facebook', profile.id);

            var first_name = profile.first_name || "",
                last_name = profile.last_name || "";

            var location;
            if (profile.location) {
                location = profile.location.name || "";
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
            // $(OC.config.registration.fields.socialLogin).slideUp('slow');
            $('tr.registration-username-password td:first').attr('colspan', '2');
            $('tr.registration-username-password td:last').remove();

            // Set the hidden field value for profile picture with the URL from gapi
            FB.api('/me/picture?width=300', function(response) {
                $(OC.config.registration.fields.profilePicture).attr(
                    'value', response.data.url);
            });

            // Set the user email address & username
            $(OC.config.registration.fields.email).attr('value', profile.email);
            $(OC.config.registration.fields.username).attr('value', profile.username);

            // Set a new hidden form item to communicate to the server that no
            //    reCaptcha verification is required
            $(OC.config.registration.fields.socialFlag).attr('value', 'true');
            $(OC.config.registration.fields.socialService).attr('value', 'facebook');
            $(OC.config.registration.fields.socialID).attr('value', profile.id);
        },

        facebookSignInCallback: function() {
            var signUpForm = $('#signup-form'),
                signInForm = $('#sign-in-form'),
                loginDialog = $('.login-dialog'),
                loginDialogBody = $('.oc-popup-body', loginDialog),
                facebookProfile;

            function condenseSignup(){
                loginDialogBody.removeClass('faded');

                OC.expediteFbLogin(facebookProfile);

                OC.highlightAndReturnErroneousInputs(false);
                $('#signup-form input[type="text"]').trigger('change');

                $('.login-dialog #fill-panel').remove();
                $('.login-dialog #key-panel').addClass('center');
            }

            if (loginDialog.length > 0){
                loginDialogBody.addClass('faded');
            }

            FB.login(function(response){
                if (response.status === 'connected'){
                    FB.api('/me', function(profile) {
                        facebookProfile = profile;

                        // Fill the hidden Facebook form object holding the user Fb ID.
                        $('form.facebook-login input[name=facebook_id]').val(
                            profile.id);

                        // Send a POST request for authenticating the user ID.
                        $.post('/fblogin/', $('form.facebook-login').serialize(),
                            function(response){
                                // If authentication success, capture the source page and
                                //     redirect the page.
                                if (response.status === "true"){
                                    var redirect_to = $(
                                        '.facebook-login input[name=redirect_to]').val();
                                    if (redirect_to !== 'False' && redirect_to !== ''){
                                        window.location.href = redirect_to;
                                    } else if (OC.signupDialog){
                                        condenseSignup();
                                    } else {
                                        window.location.href = '/';
                                    }
                                } else {
                                    if (loginDialog.length === 0 && signInForm.length > 0){
                                        OC.customPopup('.new-account-redirect-dialog');
                                        
                                        // In the synchronous login scenario, redirect to new account
                                        //     create functionality where fields are prefilled.
                                        setTimeout(function(){
                                            window.location.href = '/signup/?expedite=facebook';
                                        }, 2000);
                                    } else if (loginDialog.length > 0){
                                        condenseSignup();
                                    }
                                }
                            },
                        'json');
                    });
                }
            }, {
                scope: 'public_profile, email'
            });
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
            $('#signup-form input[title]:not(.form-input-error)').tipsy(
                {trigger: 'focus', gravity: 'n'});

            // Setup tipsy for errors.
            $('#signup-form input[title].form-input-error').tipsy(
                {trigger: 'manual', gravity: 'n', fade: true });

            // Show errors on the page once the G+ button loads.
            $('#signup-form input.form-input-error').each(function(){
                error_input = $(this);
                error_input.change(function(){
                    error_input.removeClass('form-input-error');
                    error_input.tipsy('hide');
                });
                error_input.tipsy('show');
            });

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

            $('.synchronous-signup .facebook-button').click(function(event){
                FB.login(function(response){
                    if (response.status === 'connected')
                        OC.facebookRegistrationCallback(response);
                }, {
                    scope: 'public_profile, email'
                });
            });

            // Check for if there is any fb expediting request.
            if (window.location.search.indexOf('expedite=facebook') !== -1){
                setTimeout(function(){
                    FB.login(function(response){}, {
                        scope: 'public_profile, email'
                    });
                }, 1000);
            }

            $('#sign-in-form .facebook-button, .login-dialog .facebook-button').click(function(event){
                OC.facebookSignInCallback();

                event.stopPropagation();
                event.preventDefault();
                return false;
            });

            $('.google-plus-button').click(function(event){
               
                event.stopPropagation();
                event.preventDefault();
                return false;
            });

            if ($('#session-state').length > 0){
                if ($('#session-state').attr('data-state') !== ''){
                    OC.initializeGooglePlusButtons();
                }
            }

            // Hack submit button.
            $('form#signup-form button.large-action-button').click(function(event){
                var submitButton = $(this);

                var erroneousInputs = OC.highlightAndReturnErroneousInputs(true);

                if (erroneousInputs.length === 0 && OC.signupDialog) {
                    var form = $('form#signup-form').serialize();

                    // Add spinner to submit button.
                    submitButton.addClass('loading');
                    
                    $.post('/user/api/register-asynchronously/', form,
                        function (response) {
                            submitButton.removeClass('loading');
                            OC.signupDialog.close();

                            OC.registerationSuccessCallback();

                            OC.config.user.id = response.id;
                            $('input[name="user"]').val(response.id);

                            OC.config.user.username = response.username;

                            // Show signed up message.
                            OC.setMessageBoxMessage(response.name + ', your account has successfully been set up.');
                            OC.showMessageBox();

                            OC.pushMessageBoxForward();
                        }, 'json');
                } else {
                    if (erroneousInputs.length === 0){
                        $('.page-form-submission-loader').addClass('show');

                        submitButton.parents('form#signup-form').submit();
                    }
                }

                event.stopPropagation();
                event.preventDefault();
                return false;
            });

            // Bind change validation handlers with all fields.
            OC.liveValidateRegistrationForm();
        },

        highlightAndReturnErroneousInputs: function(checkPassword){
            var fields = [
                'input[name="first_name"]', 'input[name="last_name"]',
                'input[name="email"]',
                'input[name="username"]',
                'input[name="dob_date"]', 'input[name="dob_year"]',
                'select[name="dob_month"]'
            ];

            if (checkPassword) fields.push('input[name="password"]');

            var i, element, errorneousInputs = [];
            for (i = 0; i < fields.length; i++){
                element = $('form#signup-form ' + fields[i]);
                if (element.val() === '' || element.val() === '0')
                    element.addClass('form-input-error');

                if (element.hasClass('form-input-error'))
                    errorneousInputs.push(element);
            }

            return errorneousInputs;
        },

        liveValidateRegistrationForm: function(){
            // Bind first name to validation.
            OC.validate.text(
                '#signup-form input[name="first_name"], #signup-form input[name="last_name"]',
                /[A-Za-z-]{1,16}[\s]?/,
                'The name must contain only letters and not be more than 16 letters.'
            );

            // Validate the email address.
            OC.validate.text(
                '#signup-form input[name="email"]',
                /^([a-z0-9_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,6})$/,
                'The email address is invalid'
            );

            // Validate the username.
            $('#signup-form input[name="username"]').blur(function(event) {
                var usernameInput = $(this);
                if (usernameInput.val() !== ''){
                    usernameInput.addClass('loading');

                    $.get('/user/api/username-availability/' +  usernameInput.val() + '/',
                        function(response){
                            usernameInput.removeClass('loading');

                            if (response.status == 'false'){
                                usernameInput.addClass('unavailable');
                                usernameInput.addClass('form-input-error');
                                usernameInput.attr('title', 'This username is not available');
                                usernameInput.tipsy({trigger: 'manual', gravity: 'n', fade: true });
                                usernameInput.tipsy('show');
                            } else {
                                if (!usernameInput.hasClass('form-input-error'))
                                    usernameInput.tipsy('hide');
                                usernameInput.removeClass('unavailable');
                                usernameInput.removeClass('form-input-error');
                                usernameInput.addClass('available');
                            }
                        },
                    'json');
                }
            });

            OC.validate.text(
                '#signup-form input[name="username"]',
                /^[a-z][a-z0-9_\.]{3,30}$/,
                'Username should be all lowercase, cannot begin with ' +
                    'a number and must only have letters and digits and/or underscores.'
            );

            // Validate the password.
            OC.validate.text(
                '#signup-form input[name="password"]',
                /[\w\.\!\@\#\$\%\^\*\&<>]+/,
                'Password should contain valid characters'
            );


            // Validate the birthdate.
            OC.validate.date(
                '#signup-form select[name="dob_month"]', '#signup-form input[name="dob_date"]',
                '#signup-form input[name="dob_year"]',
                {
                    'DOB_OUT_OF_RANGE': 'The date of birth is out of range',
                    'DOB_AFTER_TODAY': 'The date of birth cannot be later than today',
                    'DOB_LESS_THAN_THIRTEEN': 'You need to be above 13 years of age to sign up',
                    'DOB_INCORRECT': 'The date of birth is incorrect',
                    'DOB_NO_MONTH': 'You need to select a month of birth'
                }
            );
        },

        validate: {
            invalidate: function(input, error){
                input.addClass('form-input-error');
                input.attr('title', error);
                input.tipsy({trigger: 'manual', gravity: 'n', fade: true });
                input.tipsy('show');
            },

            pass: function(input){
                input.removeClass('form-input-error');
                input.tipsy('hide');
            },

            text: function(selector, pattern, error){
                var input = $(selector),
                    currentInput;

                function inputKeyup(event){
                    currentInput = $(event.target);
                    if (currentInput.hasClass('form-input-error') && currentInput.val().match(pattern)) {
                        if (currentInput.val().match(pattern)[0] === currentInput.val()){
                            OC.validate.pass(currentInput);
                        }
                    }
                }

                function inputBlur(event){
                    currentInput = $(event.target);
                    if (!currentInput.val().match(pattern)){
                        OC.validate.invalidate(currentInput, error);
                    } else if (currentInput.val().match(pattern)[0] !== currentInput.val()){
                        OC.validate.invalidate(currentInput, error);
                    }
                }

                input.keyup(inputKeyup);
                input.blur(inputBlur);
                input.change(inputBlur);
            },

            confirm: function(selector, baseSelector, error){
                var input = $(selector),
                    baseInput = $(baseSelector),
                    currentInput;

                input.blur(function(event){
                    currentInput = $(event.target);
                    if (currentInput.val() !== baseInput.val()){
                        OC.validate.invalidate(currentInput, error);
                    } else {
                        OC.validate.pass(currentInput);
                    }
                });
            },

            date: function(monthSelector, dateSelector, yearSelector, errorMap){
                var monthInput = $(monthSelector),
                    dateInput = $(dateSelector),
                    yearInput = $(yearSelector),
                    currentInput;

                monthInput.blur(function(event){
                    currentInput = $(event.target);
                    if (parseInt(currentInput.val(), 10) === 0){
                        OC.validate.invalidate(currentInput, errorMap['DOB_NO_MONTH']);
                    } else if (currentInput.hasClass('form-input-error')) {
                        OC.validate.pass(currentInput);
                    }
                });

                // TODO(Varun): Need to have better month/year validation.
                dateInput.blur(function(event){
                    currentInput = $(event.target);
                    if (! dateInput.val().match(/[3][0-1]|[0-2]\d|^[1-9]$/)){
                        OC.validate.invalidate(currentInput, errorMap['DOB_INCORRECT']);
                    } else if (currentInput.hasClass('form-input-error')) {
                        OC.validate.pass(currentInput);
                    }
                });

                yearInput.blur(function(event){
                    currentInput = $(event.target);
                    if (currentInput.val().match(/\d{4}/)){
                        if (currentInput.val().match(/\d{4}/) == currentInput.val()){                 var year = parseInt(currentInput.val(), 10);
                            var currentDate = new Date();

                            if (year < 1900)
                                OC.validate.invalidate(currentInput, errorMap['DOB_OUT_OF_RANGE']);
                            else if (year > currentDate.getFullYear())
                                OC.validate.invalidate(currentInput, errorMap['DOB_AFTER_TODAY']);
                            else if ((currentDate.getFullYear() - year) <= 12)
                                OC.validate.invalidate(currentInput, errorMap['DOB_LESS_THAN_THIRTEEN']);
                            else if (currentInput.hasClass('form-input-error'))
                                OC.validate.pass(currentInput);

                        } else {
                            OC.validate.invalidate(currentInput, errorMap['DOB_INCORRECT']);
                        }
                    }
                });

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
            $('.share-on-email').click(function () {
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
            var sharePopup;

            // Do not treat the click action as a regular href click
            $('button.share-button').click(function(event){
                sharePopup = OC.customPopup('.share-dialog');

                event.preventDefault();
                event.stopPropagation();
                return false;
            });

             $('.share-on-email').click(function(event){
                sharePopup.close();
             });

            /*
            $('li.share-action, nav#share-menu').mouseenter(function () {
                $('#share-menu').addClass('showMenu');
            }).mouseleave(function () {
                $('#share-menu').removeClass('showMenu');
            });*/
        },

        setupAddTo: function(){
            var resourceID = $('form#resource-form input[name="resource_id"]').val(),
                collectionID = $('form#resource-form input[name=collection_id]').val();

            // Bind add action click to popup.
            $('li.add-action a').click(function(event){
                OC.addCopyClickHandler('resource', resourceID, collectionID, event);
            });
        },

        addCopyClickHandler: function(itemType, resourceID, collectionID, event){
            // Setup the tabs the add-to popup.
            OC.tabs('.add-resource-browser');

            var addToPopup = OC.customPopup('.add-resource-dialog'),
                profileCollectionBrowser = $('.add-resource-profile-browser'),
                projectsCollectionBrowser = $('.add-resource-project-browser');

            profileCollectionBrowser.addClass('loading-browser');
            projectsCollectionBrowser.addClass('loading-browser');

            // Bind Done button on custom popup.
            $('.add-resource-submit-button').click(function(event){
                // Capture the actively selected tab.
                var activeTab = $('.add-resource-dialog .add-resource-tabs li a.selected');

                var toCollection;

                // If the active tab is projects.
                if (activeTab.attr('href') === '.my-projects'){
                    // Capture currently selected collection.
                    toCollection = projectsCollectionBrowser.find(
                        '.selected-destination-collection');
                } else {
                    toCollection = profileCollectionBrowser.find(
                        '.selected-destination-collection');
                }

                addToPopup.close();

                if (toCollection){
                    // Launch popup asking the user to choose between copying the
                    //    resource or linking to it.
                    var addActionPopup = OC.customPopup('.add-resource-action-dialog');

                    // Bind Done button on custom popup.
                    $('.add-resource-action-submit-button').click(function(event){
                        addActionPopup.close();

                        // Get the current selected option.
                        var selectedOption = $(
                            '#add-resource-action-form input[name=add-action]:checked');
                        var toCollectionID = toCollection.attr('id').substring(11);

                        if (selectedOption.val() === "copy"){
                            if (itemType == 'collection'){
                                OC.collection.copy(
                                    collectionID, resourceID,
                                    toCollectionID, OC.collection.successfullyCopied
                                );
                            } else {
                                OC.resource.copy(
                                    collectionID, resourceID,
                                    toCollectionID, OC.resource.successfullyCopied
                                );
                            }
                        } else {
                            if (itemType == 'collection'){
                                OC.popup('The feature to link folders does not exist ' +
                                    'at this point. Sorry for the inconvenience',
                                    'Cannot link folders'
                                );
                            }
                            OC.resource.link(
                                collectionID, resourceID,
                                toCollectionID, OC.resource.successfullyLinked
                            );
                        }

                        event.preventDefault();
                        event.stopPropagation();
                        return false;
                    });
                }
            });

            if (profileCollectionBrowser.children().length === 0){
                $.get('/resources/tree/collections/user/',
                    function(response){
                        if (response.status == 'true'){
                            OC.renderBrowser(response.tree, profileCollectionBrowser);
                            profileCollectionBrowser.removeClass('loading-browser');
                        }
                        else {
                            OC.popup(response.message, response.title);
                        }
                    },
                'json');
            }

            var projectBrowserTab = $('.add-resource-tabs li a[href=".my-projects"]');

            if (!projectBrowserTab.hasClickEventListener()){
                projectBrowserTab.click(OC.addToProjectsTabClickHandler);
            }

            event.preventDefault();
            event.stopPropagation();
            return false;
        },

        renderBrowser: function(tree, parentElement, collectionID){
            parentElement.html(tree);

            // Bold the current collection.
            parentElement.find('a#collection-' + collectionID).addClass(
                'current-collection');

            // When clicking in whitespace in the move browser, unselect current selection.
            parentElement.click(function(event){
                parentElement.find('a.selected-destination-collection').removeClass(
                    'selected-destination-collection');
                parentElement.find('a.selected-destination-resource').removeClass(
                    'selected-destination-resource');
            });

            // Bind collection click with selection of collection.
            parentElement.find('a').click(function(event){
                // Remove any other selections previously made.
                var currentlySelectedCollection = parentElement.find(
                    'a.selected-destination-collection, a.selected-destination-resource');

                if (!$(event.target).hasClass('current-collection')){
                    currentlySelectedCollection.removeClass(
                        'selected-destination-collection');
                    currentlySelectedCollection.removeClass(
                        'selected-destination-resource');

                    if (currentlySelectedCollection[0] !== event.target){
                        var newlySelectedCollection = $(event.target);
                        if (newlySelectedCollection.attr('id').indexOf('collection') !== -1){
                            newlySelectedCollection.toggleClass('selected-destination-collection');
                        } else {
                            newlySelectedCollection.toggleClass('selected-destination-resource');
                        }
                    }
                }

                event.stopPropagation();
                event.preventDefault();
                return false;
            });

            // Toggle collections if it has child collections.
            $('ul li.parent-collection > .toggle-collection', parentElement).click(
                OC.parentCollectionClickHandler);

            // Toggle tag categories if it has child tag categories.
            $('ul li.parent-category > .toggle-category', parentElement).click(
                OC.parentCollectionClickHandler);
        },

        addToProjectsTabClickHandler: function(event){
            var projectsCollectionBrowser = $('.add-resource-project-browser'),
                collectionID = $('form#resource-form input[name=collection_id]').val();

            if (projectsCollectionBrowser.children().length === 0){
                $.get('/resources/tree/collections/projects/',
                    function(response){
                        if (response.status == 'true'){
                            OC.renderBrowser(response.tree, projectsCollectionBrowser);
                            projectsCollectionBrowser.removeClass('loading-browser');
                        }
                        else {
                            OC.popup(response.message, response.title);
                        }
                    },
                'json');
            }
        },

        initShowMoreBlock: function(){
            var blocksToCompress = [
                '.profile-contributions-list',
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
                    var new_headline = $('.profile-headline').text();

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
                '/user/api/notifications/dismiss/' + userID + '/?ids=' + unreadNotificationIDs.join(','),
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
                for (j = 0; j < highlightedMenuTargets.length; j++){
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
            OC.setUpMenuPositioning('nav#add-resource-menu', '.create-new-resource-button a');

            $(window).resize(function () {
                OC.setUpMenuPositioning('nav#add-resource-menu', '.create-new-resource-button a');
            });

            OC.setupResourceMenu();
        },

        setupResourceMenu: function(){
            $('.create-new-resource-button a, nav#add-resource-menu').mouseenter(function () {
                $('.create-new-resource-button a').addClass('hover');
                $('#add-resource-menu').addClass('showMenu');
            }).mouseleave(function () {
                $('.create-new-resource-button a').removeClass('hover');
                $('#add-resource-menu').removeClass('showMenu');
            });
        },

        initCreateCollection: function(){
            $('nav#add-resource-menu .add-collection a, nav.profile-resources-collections-actions-menu-add .add-collection a').click(function(event){
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

                event.stopPropagation();
                event.preventDefault();
                return false;
            });
        },

        initCreateGroup: function(){
            $('nav#add-resource-menu .add-group a, .new-group-wrapper, a.new-groups-link').click(function(event){
                var newGroupDialog = OC.customPopup('.new-group-dialog');

                event.stopPropagation();
                event.preventDefault();
                return false;
            });
        },

        initUpload: function(){
            $('nav#add-resource-menu .add-upload a, .profile-resources-collections-actions-menu-add .add-upload a,' +
                'a.new-upload-suggestion').click(function(event){
                var newGroupDialog = OC.customPopup('.post-new-upload-dialog');

                event.stopPropagation();
                event.preventDefault();
                return false;
            });
        },

        getLicenses: function(callback){
            // Get resource licenses if unknown.
            if (!OC.config.licenses){
                $.get('/license/api/list/',
                    function(response){
                        if (response.status === 'true'){
                            OC.config.licenses = response.licenses;
                            callback(response.licenses);
                        } else {
                            OC.popup(response.message, response.title);
                        }
                    },
                'json');
            } else callback(OC.config.licenses);
        },

        initLink: function(){
            $('nav#add-resource-menu .add-link a, .profile-resources-collections-actions-menu-add .add-link a').click(function(event){
                OC.getLicenses(function(licenses){
                    var licenseSelect = $('select[name="license"]'),
                        i, license;

                    for (i = 0; i < licenses.length; i++){
                        license = $('<option/>', {
                            'value': licenses[i].id,
                            'text': licenses[i].title
                        });
                        licenseSelect.append(license);
                    }
                });

                var newGroupDialog = OC.customPopup('.new-link-dialog');

                event.stopPropagation();
                event.preventDefault();
                return false;
            });

        },

        bindDeleteResourceHandler: function(){
            $('.profile-resource-delete, .project-resource-delete').click(
                function(event){
                    function successCallback(resourceID){
                        $('.resource-collection-item#resource-' + resourceID).fadeOut();
                    }
                    var deleteElement = $(this);
                    // NOTE(Varun): Given the ID of the resource is of the format
                    //     'resource-x', where x is the ID as stored by the server
                    
                    var resourceID = deleteElement.attr('id').substring(9),
                        fromCollectionID = $('.resources-collections-added').attr('id').substring(11);
                    OC.resource.delete(resourceID, fromCollectionID, callback);
                
                    event.preventDefault();
                    event.stopPropagation();
                    return false;
                }
            );
        },

        bindDeleteCollectionHandler: function(){
            $('.profile-collection-delete, .project-collection-delete').click(
                function(event){
                    function successCallback(collectionID){
                        $('.resource-collection-item#collection-' + collectionID).fadeOut();
                    }

                    var deleteElement = $(this);

                    // NOTE(Varun): Given the ID of the resource is of the format
                    //     'resource-x', where x is the ID as stored by the server
                    var collectionID = deleteElement.attr('id').substring(11);
                    OC.collection.delete(collectionID, successCallback);
                
                    event.preventDefault();
                    event.stopPropagation();
                    return false;
                }
            );
        },

        initCollectionsTree: function(){
            $('nav.collections-navigation ul li.parent-collection > .toggle-collection').click(
                OC.parentCollectionClickHandler);
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

        pushMessageBoxForward: function(){
            var messageElement = $('.login-messages-wrapper');
            messageElement.addClass('push-forward');
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

        appBox: {
            saving: function(){ $('.state-message').text('Saving...'); },
            saved: function(){ $('.state-message').text('Saved'); }
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

        initChangePassword: function(){
            $('#change-password').click(function(event){
                var changePasswordDialog = OC.customPopup('.change-password-dialog');

                OC.validate.text(
                    '.change-password-dialog input[name="new_password"]',
                    /[\w\.\!\@\#\$\%\^\*\&]+/,
                    'Password should contain valid characters'
                );

                OC.validate.confirm(
                    '.change-password-dialog input[name="confirm_password"]',
                    '.change-password-dialog input[name="new_password"]',
                    'Both passwords do not match'
                );

                $('.change-password-submit-button').click(function(event){
                    var confirmPassword = $('.change-password-dialog input[name="confirm_password"]');
                    if (confirmPassword.hasClass('form-input-error')){
                        event.preventDefault();
                        event.stopPropagation();
                        return false;
                    } else {
                        $('#change-password-form').submit();
                    }
                });

                event.preventDefault();
                event.stopPropagation();
                return false;
            });
        },

        initResourceView: function(){
            // Setup history on the view history button.
            $('.history-action img').tipsy({gravity: 'w'});

            // Setup up/down toggle on all togglable content.
            $('.toggle-content-title-wrapper').click(
                OC.togglerClickHandler);

            // Setup standard tags labels tooltip.
            $('.oer-meta-support-tag').tipsy({gravity: 's'});

            // Animate 'need more info' bar and make useful.
            if (document.referrer.split('/').indexOf('browse') != -1){
                setTimeout(function(){
                    $('.need-more-info').animate({
                        top: 0
                    }, 1500);
                }, 3000);

                var needInfoPanel = $('.need-more-info'),
                    resourceID = $('form#resource-form input[name="resource_id"]').val();

                if (resourceID){
                    $('.need-more-info-button').click(function(){
                        function request(){
                            $.get('/resources/api/request-for-information/' + resourceID + '/',
                                function(response){
                                    if (response.status === 'true'){
                                        needInfoPanel.animate({
                                            opacity: 0,
                                        }, 500, function(){
                                            $(this).text('Your request for more information has been sent. ' +
                                                'You will receive an email once the information is ready for you');
                                        }).animate({
                                            opacity: 1,
                                            height: 28,
                                           'margin-bottom': -40
                                        }, 500, function(){
                                            setTimeout(function(){
                                                needInfoPanel.animate({
                                                    top: -56,
                                                });
                                            }, 6000);
                                        });
                                    }
                                },
                            'json');
                        }
                        if (OC.config.user.id){
                            request();
                        } else {
                            var message = 'We can send you the info only if you have a free account, so please sign up. ' +
                                'It takes only 30 seconds!';
                            OC.launchSignupDialog(message, request);
                        }
                    });

                    // Bring the request to review into view when resource comments are in sight.
                    var resourceComments = $('.resource-comments'),
                        reviewPanel = $('.request-resource-review');
                    $(window).on('DOMContentLoaded load resize scroll', function(event){
                        // If the load button is attached to the document.
                        if (isElementInViewport(resourceComments) && ! resourceComments.hasClass('visible')){
                            reviewPanel.animate({
                                top: -56
                            }, 1500);
                            reviewPanel.addClass('visible');
                        }
                    });

                    // Bind star review click with popups.
                    var allStars = $('.request-resource-review-stars .empty-star');
                    allStars.hover(function(){
                        allStars.removeClass('hover');

                        var hoveredStar = this,
                            i, currentStar;
                        for (i = 0; i < allStars.length; i++){
                            currentStar = $(allStars[i]);
                            currentStar.addClass('hover');

                            if (allStars[i] === hoveredStar) break;
                        }
                        $(this).addClass('');
                    });
                    $('.request-resource-review-stars').mouseleave(function(){
                        allStars.removeClass('hover');
                    });

                    var reviewTemplate = _.template('<div class="resource-review">' +
                        '<div class="resource-review-user">' +
                            '<div class="resource-review-user-thumbnail" style="background-image: url(\'<%= profile_pic %>\');"></div>' +
                            '<div class="resource-review-user-description">' +
                                '<div><a href="<%= user_url %>"><%= name %></a><%= stars %></div>' +
                                '<div class="resource-review-user-date"><%= created %></div>' +
                            '</div></div>' +
                        '<div class="resource-review-body"><%= body %></div></div>');
                    $('.request-resource-review .empty-star').click(function(event){
                        var reviewCommentPopup = OC.customPopup('.review-comment-dialog'),
                            selectedStar = this;

                        var reviewCommentForm = $('form#review-comment-form', reviewCommentPopup.dialog);

                        // Set the number of stars permanently, after finding star position.
                        $('input[name="stars"]', reviewCommentForm).val(allStars.index(selectedStar) + 1);

                        // Bind the 'Done' click button.
                        var submitButton = $('.review-comment-done-button', reviewCommentPopup.dialog);
                        submitButton.click(function(){
                            function review(){
                                reviewCommentPopup.close();

                                $.post('/interactions/review-resource/', reviewCommentForm.serialize(),
                                    function(response){
                                        if (response.status === 'true'){
                                            // Hide the review panel.
                                            reviewPanel.animate({
                                                top: 0,
                                            }, 500);

                                            // Put the review in the reviews section.
                                            var starsWrapper = $('<div/>', {
                                                'class': 'resource-review-user-description-stars'
                                            }), i;
                                            for (i = 0; i < response.review['stars']; i++){
                                                starsWrapper.append($('<span/>', {'class': 'full-star'}));
                                            }

                                            response.review['stars'] = starsWrapper.get(0).outerHTML;

                                            var review = reviewTemplate(response.review);

                                            var resourceReviews = $('.resource-review');
                                            if (resourceReviews.length > 0)
                                                $('.resource-reviews').append(review);
                                            else
                                                $('.resource-reviews').html(review);

                                            // Set message and show box.
                                            OC.setMessageBoxMessage('Successfully posted your review!');
                                            OC.showMessageBox();
                                        } else {
                                            OC.popup(response.message, response.title);
                                        }
                                    },
                                'json');
                            }

                            if (OC.config.user.id){
                                // Perform post of the review with the comment.
                                review();
                            } else {
                                var message = 'Please login or create an account (takes 30 seconds!) to complete ' +
                                'posting of the review.';
                                OC.launchSignupDialog(message, review);
                            }
                        });
                    });
                }
            }
        },

        togglerClickHandler: function(event){
            var titleWrapper = $(this);
                body = titleWrapper.parent('.toggle-content').find(
                    '.toggle-content-body');
            if (titleWrapper.hasClass('open')){
                titleWrapper.removeClass('open');
                body.slideUp();
            } else {
                titleWrapper.addClass('open');
                body.slideDown();
            }
        },

        initFavoriteResource: function(){
            // Determine if this user has favorited this resource.
            var resourceID = $('form#resource-form input[name=resource_id]').val();

            // If this is a user profile, several instances of this form should exist
            //     returning the value of the first form (all having the same user ID).
            var profileUserID = $('form.profile-favorite-form input[name=user_id]').val();

            var resourceFavoriteButton = $('button.favorite-button');

            function setFavoriteUI(state, button){
                if (state){
                    button.addClass('favorited');
                    button.text('Favorited');
                } else {
                    button.removeClass('favorited');
                    button.text('Favorite');
                }
            }

            function setFavoriteState(resourceID, state){
                if (state){
                    resourceFavoriteButton.addClass('favorited');
                    resourceFavoriteButton.text('Favorited');
                }
            }

            if (resourceID){
                OC.getFavoriteState('resource', resourceID, setFavoriteState);

                resourceFavoriteButton.click(function(event){
                    var currentResourceFavoriteButton = $(this),
                        currentState = currentResourceFavoriteButton.hasClass('favorited');

                    setFavoriteUI(! currentState, currentResourceFavoriteButton);

                    OC.favoriteClickHandler(
                        'resource', resourceID, function(success){
                            if (!success) setFavoriteUI(currentState, currentResourceFavoriteButton);
                        });
                });

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

        favoriteClickHandler: function(type, resourceID, callback, element){
            function favorite(){
                $.get('/interactions/favorite/' + type + '/' + resourceID + '/',
                    function(response){
                        if (response.status == 'true' || response.status == 'unfavorite success'){
                            callback(true, element);
                        }
                        else {
                            callback(false, element);
                        }
                    },
                'json');
            }
            
            if (OC.config.user.id){
                favorite();
            } else {
                var message = 'To favorite this resource to your account, please login or create a free account (takes 30 seconds!).';
                OC.launchSignupDialog(message, favorite);
            }
        },

        getFavoriteState: function(type, resourceID, callback){
            $.get('/interactions/favorite/state/' + type + '/' + resourceID + '/',
                function(response){
                    if (response.status == 'true'){
                        var state;
                        if (response.favorite.state == 'true') state = true;
                        else state = false;
                        callback(resourceID, state);
                    }
                },
            'json');
        },

        getSubscriptionState: function(userList, callback){
            var userIDs = userList.join();
            $.get('/user/api/subscribe/state/users/?ids=' + userIDs,
                function(response){
                    if (response.status == 'true'){
                        callback(response.subscription_states);
                    }
                },
            'json');
        },

        initUpvoteDownvoteResource: function(){
            // Get the user and resource ID for this resource.
            var resourceID = $('form#resource-form input[name=resource_id]').val(),
                userID = $('form#resource-form input[name=user_id]').val(),
                revisionID = $('form#resource-form input[name=revision_id]').val();

            var upvoteContainter = $('.article-community li.thumbs-up-action'),
                downvoteContainter = $('.article-community li.thumbs-down-action'),
                upvoteCountElement = $('.count', upvoteContainter),
                downvoteCountElement = $('.count', downvoteContainter);
            
            if (resourceID){
                var voteCountEndpoint;

                if (revisionID){
                    voteCountEndpoint = '/interactions/votes/count/resource/' +
                        resourceID + '/revision/' + revisionID + '/';
                } else {
                    voteCountEndpoint = '/interactions/votes/count/resource/' +
                        resourceID + '/';
                }

                $.get(voteCountEndpoint, function(response){
                        if (response.status == 'true'){
                            upvoteCountElement.text(response.upvote_count);
                            downvoteCountElement.text(response.downvote_count);
                        
                            if (response.user_upvoted == 'true'){
                                downvoteContainter.addClass('user-upvoted');
                            }
                            if (response.user_downvoted == 'true'){
                                downvoteContainter.addClass('user-downvoted');
                            }
                        } else {
                            // TODO(Varun): Deprecate vote count load.
                        }
                    },
                'json');
            }

            if (userID){
                var voteEndpoint;

                $('a', upvoteContainter).click(function(event){
                    if (revisionID){
                        voteEndpoint = '/interactions/vote/up/resource/' +
                            resourceID + '/revision/' + revisionID + '/';
                    } else {
                        voteEndpoint = '/interactions/vote/up/resource/' +
                            resourceID + '/';
                    }

                    $.get(voteEndpoint, function(response){
                            if (response.status == 'true'){
                                if (response.action == 'unvote'){
                                    upvoteContainter.removeClass('user-upvoted');

                                    upvoteCountElement.text(
                                        parseInt(upvoteCountElement.text(), 10) - 1);
                                } else {
                                    upvoteContainter.addClass('user-upvoted');

                                    upvoteCountElement.text(
                                        parseInt(upvoteCountElement.text(), 10) + 1);
                                }
                            } else {
                                OC.popup(response.message, response.title);
                            }
                        },
                    'json');

                    event.preventDefault();
                    event.stopPropagation();
                    return false;
                });

                $('a', downvoteContainter).click(function(event){
                    if (revisionID){
                        voteEndpoint = '/interactions/vote/down/resource/' +
                            resourceID + '/revision/' + revisionID + '/';
                    } else {
                        voteEndpoint = '/interactions/vote/down/resource/' +
                            resourceID + '/';
                    }

                    $.get(voteEndpoint, function(response){
                            if (response.status == 'true'){
                                if (response.action == 'unvote'){
                                    downvoteContainter.removeClass('user-downvoted');

                                    downvoteCountElement.text(
                                        parseInt(downvoteCountElement.text(), 10) - 1);
                                } else {
                                    downvoteContainter.addClass('user-downvoted');

                                    downvoteCountElement.text(
                                        parseInt(downvoteCountElement.text(), 10) + 1);
                                }
                            } else {
                                OC.popup(response.message, response.title);
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

        initPrintResource: function(){
            $('.print-action a').click(function(event){
                window.print();

                event.preventDefault();
                event.stopPropagation();
                return false;
            });
        },

        initExportResource: function(){
            // Do not treat the click action as a regular href click
            $('li.download-as a').click(function(event){
                $('#download-menu').addClass('showMenu');

                event.preventDefault();
                event.stopPropagation();
                return false;
            });

            $('li.download-as, nav#download-menu').mouseenter(function () {
                $('#download-menu').addClass('showMenu');
            }).mouseleave(function () {
                $('#download-menu').removeClass('showMenu');
            });

            OC.setUpMenuPositioning('nav#download-menu', 'li.download-as', false);

            $('.export-action a').click(function(event){
                // Pull up a popup showing progress.
                var exportDialog = OC.customPopup('.export-document-pdf-dialog'),
                    exportProgress = OC.progressBar('.export-document-pdf-progress', {
                        startAt: 30
                    }),
                    exportStatus = $('.export-document-pdf-status'),
                    resourceID = $('form#resource-form input[name=resource_id]').val();

                // Make a GET request for the serialized document.
                $.get('/resources/' + resourceID + '/build-export-document/',
                    function(response){
                        if (response.status == 'true'){
                            // POST the response to the export server for generating a PDF
                            //     if no WebSockets in browser. But if WS support, use WS.
                            if ("WebSocket" in window){
                                // Update the status and the % progress shown to the user.
                                exportStatus.text('Building document...');
                                exportProgress.advanceTo(50);

                                var exportSocket = new WebSocket("ws://services.opencurriculum.org:1337/");

                                exportSocket.onopen =  function(event){
                                    response.type = 'pdf';
                                    exportSocket.send(JSON.stringify(response));
                                };

                                exportSocket.onmessage = function(event){
                                    data = JSON.parse(event.data);
                                    if (data.documentReceived){
                                        exportStatus.text('Generating PDF...');
                                        exportProgress.advanceTo(60);

                                        // Increment the counter fictitiously.
                                        var currentProgress = 60;
                                        setInterval(function(){
                                            if (currentProgress <= 80)
                                                exportProgress.advanceTo(++currentProgress);
                                        }, 100);
                                    } else if (data.documentProcessed){
                                        exportStatus.text('Finished! Opening PDF...');
                                        exportProgress.advanceTo(100);

                                        setTimeout(function(){
                                            // Open the retrieved PDF URL in a new tab / window.
                                            window.open(data.url,'_blank');

                                            // Close the dialog.
                                            exportDialog.close();
                                        }, 500);
                                    }
                                };
                            } else {
                                // Update the status and the % progress shown to the user.
                                exportStatus.text('Generating PDF...');
                                exportProgress.advanceTo(50);

                                /*
                                $.post('/interactions/comment-reference/', response.document,
                                    function (response) {
                                        if (response.status == 'true'){
                                            OC.documentElementCommentSubmissionHandler(
                                                response, cellCommentsForm);
                                        }
                                    },
                                'json');*/
                            }
                        } else {
                            OC.popup(response.message, response.title);
                        }
                    },
                'json');

                event.preventDefault();
                event.stopPropagation();
                return false;
            });

            $('.word-action a').click(function(event){
                // Pull up a popup showing progress.
                var exportDialog = OC.customPopup('.export-document-word-dialog'),
                    exportProgress = OC.progressBar('.export-document-word-progress', {
                        startAt: 30
                    }),
                    exportStatus = $('.export-document-word-status'),
                    resourceID = $('form#resource-form input[name=resource_id]').val();

                // Make a GET request for the serialized document.
                $.get('/resources/' + resourceID + '/build-export-document/',
                    function(response){
                        if (response.status == 'true'){
                            // POST the response to the export server for generating a PDF
                            //     if no WebSockets in browser. But if WS support, use WS.
                            if ("WebSocket" in window){
                                // Update the status and the % progress shown to the user.
                                exportStatus.text('Building document...');
                                exportProgress.advanceTo(50);

                                var exportSocket = new WebSocket("ws://services.opencurriculum.org:1337/");

                                exportSocket.onopen =  function(event){
                                    response.type = 'word';
                                    exportSocket.send(JSON.stringify(response));
                                };

                                exportSocket.onmessage = function(event){
                                    data = JSON.parse(event.data);
                                    if (data.documentReceived){
                                        exportStatus.text('Generating Word file...');
                                        exportProgress.advanceTo(60);

                                        // Increment the counter fictitiously.
                                        var currentProgress = 60;
                                        setInterval(function(){
                                            if (currentProgress <= 80)
                                                exportProgress.advanceTo(++currentProgress);
                                        }, 100);
                                    } else if (data.documentProcessed){
                                        exportStatus.text('Finished! Opening Word file...');
                                        exportProgress.advanceTo(100);

                                        setTimeout(function(){
                                            // Open the retrieved PDF URL in a new tab / window.
                                            window.open(data.url,'_blank');

                                            // Close the dialog.
                                            exportDialog.close();
                                        }, 500);
                                    }
                                };
                            } else {
                                // Update the status and the % progress shown to the user.
                                exportStatus.text('Generating PDF...');
                                exportProgress.advanceTo(50);

                                /*
                                $.post('/interactions/comment-reference/', response.document,
                                    function (response) {
                                        if (response.status == 'true'){
                                            OC.documentElementCommentSubmissionHandler(
                                                response, cellCommentsForm);
                                        }
                                    },
                                'json');*/
                            }
                        } else {
                            OC.popup(response.message, response.title);
                        }
                    },
                'json');

                event.preventDefault();
                event.stopPropagation();
                return false;
            });
        },

        initProfileCreateResource: function(){
            $('.add-unit').click(function(event){
                OC.customPopup('.new-unit-dialog');

                event.preventDefault();
                event.stopPropagation();
                return false;
            });
        },

        initProfileSubscribers: function(){
            var userIDs = [], i;
            function updateSubscribeButton(subscriptionStates){
                var input, button;
                for (i = 0; i < userIDs.length; i++){
                    input = $('.subscribe-suggestion-form input[name=user_id][value=' + userIDs[i] + ']');
                    button = input.parents('form.subscribe-suggestion-form').find(
                        'button.subscribe-button');
                    if (subscriptionStates[parseInt(userIDs[i], 10)]){
                        button.addClass('subscribed');
                        button.text('✔ Subscribed');
                    }
                }
            }

            $('.subscribe-suggestion-form').each(function(){
                if ($('button.subscribe-button', this).length > 0){
                    userIDs.push($('input[name=user_id]', this).val());
                }
            });

            if (userIDs.length > 0) OC.getSubscriptionState(userIDs, updateSubscribeButton);
        },

        initEditResource: function(){
            $('form.resource-create-edit-form #submission-buttons button[type=submit]').click(
                function(event){
            
                    if (action === "save") {
                        $('#article-edit-form').submit();
                    } else {
                            // Launch log prompt dialog box
                            $("#log-message").dialog({
                                modal: true,
                                open: false,
                                buttons: {
                                    Ok: function() {
                                        $(this).dialog( "close" );
                                        // HACK: Because fields in display:none aren't passed in the
                                        //    POST requests, manually copy log field value to a hidden
                                        //    attribute
                                        $('input[name=log]').attr('value', $(
                                            'input[name=log_message]').attr('value'));

                                        $('#article-edit-form').submit();
                                    },
                                    Cancel: function() {
                                        $(this).dialog( "close" );
                                        return false;
                                    }
                                }
                            });
                    }

                    event.stopPropagation();
                    event.preventDefault();
                    return false;
                }
            );
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
                        $.get('/group/' + project_id + '/reposition-cover/?left=' +
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

        comments: {
            newCommentTemplate: _.template('<li class="post-comment" id="comment-<%= id %>">' +
                '<div class="post-comment-user-thumbnail">' +
                '<div style="background-image: url(\'<%= profile_pic %>\')" class="discussion-response-thumbnail"></div>' +
                '</div><div class="delete-button" title="Delete comment"></div>' +
                '<div class="post-comment-body">' +
                '<a href="/user/<%= username %>"><%= name %></a> <%= body %>' +
                '<form><input type="hidden" name="user" value="<%= user_id %>" />' +
                '<input type="hidden" name="parent_type" value="<%= content_type %>" />' +
                '<input type="hidden" name="parent_id" value="<%= id %>" /></form>' +
                '<div class="comment-actions"><div class="reply-to-comment">Reply</div>' +
                '<div class="upvote-comment">0</div><div class="downvote-comment">0</div>' +
                '</div></div></li>'),

            initRenderComments: function(){
                // If this is a resource, render after async load.
                if ($('form#resource-form').length > 0){
                    // OC.renderDocumentComments();
                    
                    OC.comments.renderResourceComments(
                        OC.comments.resourceCommentsSuccess);

                }
                // If this is a discussion board, render now.
                else if ($('.discussion-board').length > 0){
                    OC.comments.resourceCommentsSuccess();
                }

                var commentInput = 'textarea[name=body_markdown]';
                OC.comments.bindCommentsInputClickHandler(commentInput);
            },

            bindCommentsInputClickHandler: function(commentInput){
                $(commentInput).on('focus', OC.comments.focusCommentInput);

                $(commentInput).on('blur',  OC.comments.blurCommentInput);
            },

            focusCommentInput: function(event){
                $(event.target).addClass('expanded');
            },

            blurCommentInput: function(event){
                if ($(event.target).val() === ''){
                    $(event.target).removeClass('expanded');
                }
            },

            resourceCommentsSuccess: function(){
                // Bind comment post button on each post to handler.
                OC.comments.bindNewCommentButton();

                OC.comments.bindCommentReplyButton();

                OC.comments.bindVotingButtons('.comment-thread');

                OC.comments.bindCommentDeleteButtons();
            },

            renderResourceComments: function(callback){
                // Get the resourceID.
                // TODO(Varun): Make a getFunction for getting resourceID on the resource page.
                var resourceID = $('form#resource-form input[name="resource_id"]').val();

                // GET the comment thread from the server.
                var serializedComments;
                $.get('/resources/resource-comments/' + resourceID + '/',
                    function(response){
                        if (response.status == 'true'){
                            // Put the HTML of the serialized comment thread on
                            //     the page.
                            $('.resource-comments').prepend(response.comments);
                            callback();
                        } else {
                            OC.popup(response.message, response.title);
                        }
                    },
                'json');
            },

            bindNewCommentButton: function(){
                $('.post-comment-button-wrapper .post-comment-button').click(
                    OC.comments.postCommentClickHandler);
            },

            postCommentClickHandler:function(event){
                var commentTextarea = $(event.target).parents('.post-comments').find('textarea[name=body_markdown]'),
                    comment = commentTextarea.val(),
                    serializedCommentForm = $(event.target).parents('form').serialize();

                function post(){
                    if (comment !== ''){
                        $.post('/interactions/comment/', serializedCommentForm,
                            function(response){
                                // Hide the resource
                                if (response.status !== 'success'){
                                    OC.comments.commentDeleteHandler(event.target);
                                    OC.popup(
                                        'Sorry, the comment could not be posted. Please try again later.');
                                }
                            },
                        'json');
                    } else {
                        commentTextarea.focus();
                    }
                }

                OC.comments.newCommentSuccessHandler(
                    {
                        message: {
                            user_id: OC.config.user.id,
                            name: OC.config.user.full_name,
                            username: OC.config.user.username,
                            profile_pic: OC.config.user.thumbnail,
                            content_type: 0,
                            id: 0,
                            created: new Date().toISOString(),
                            body: comment
                        }
                    },
                event.target);

                if (OC.config.user.id){
                    post();
                } else {
                    var message = 'Oops - you aren\'t logged in! No worries - let us keep your comment safe, while you ' +
                    'login or create a free account (takes 30 seconds!)';
                    OC.launchSignupDialog(message, post);
                }

            },

            bindCommentReplyButton: function(){
                $('.reply-to-comment').click(OC.comments.commentReplyButtonClickHandler);
            },

            bindVotingButtons: function(targetParent){
                var commentID;
                $('.upvote-post', targetParent).click(
                    OC.comments.upvotePostClickHandler);
                $('.downvote-post', targetParent).click(
                    OC.comments.downvotePostClickHandler);

                $('.upvote-comment', targetParent).click(
                    OC.comments.upvoteCommentClickHandler);
                $('.downvote-comment', targetParent).click(
                    OC.comments.downvoteCommentClickHandler);
            },

            upvotePostClickHandler: function(event){
                function vote(){
                    commentID = OC.projects.getDiscussionID(event.target);
                    OC.comments.newVote(commentID, true, event.target);
                }

                if (OC.config.user.id){
                    vote();
                } else {
                    var message = 'To upvote this post, please login or create a free account instantly.';
                    OC.launchSignupDialog(message, vote);
                }
            },

            downvotePostClickHandler: function(event){
                function vote(){
                    commentID = OC.comments.getCommentID(event.target);
                    OC.comments.newVote(commentID, true, event.target);
                }

                if (OC.config.user.id){
                    vote();
                } else {
                    var message = 'To downvote this post, please login or create a free account instantly.';
                    OC.launchSignupDialog(message, vote);
                }
            },

            upvoteCommentClickHandler: function(event){
                function vote(){
                    commentID = OC.comments.getCommentID(event.target);
                    OC.comments.newVote(commentID, true, event.target);
                }

                if (OC.config.user.id){
                    vote();
                } else {
                    var message = 'To upvote this comment, please login or create a free account instantly.';
                    OC.launchSignupDialog(message, vote);
                }
            },

            downvoteCommentClickHandler: function(event){
                function vote(){
                    commentID = OC.comments.getCommentID(event.target);
                    OC.comments.newVote(commentID, false, event.target);
                }

                if (OC.config.user.id){
                    vote();
                } else {
                    var message = 'To downvote this comment, please login or create a free account instantly.';
                    OC.launchSignupDialog(message, vote);
                }
            },

            getCommentID: function(target){
                return $(target).closest(
                    '.post-comment').attr('id').substring(8);
            },

            bindCommentDeleteButtons: function(){
                $('.comment-thread .delete-button').click(
                    OC.comments.commentDeleteButtonClickHandler);
            },

            commentDeleteButtonClickHandler: function(event){
                var commentID = OC.comments.getCommentID(event.target);
                    
                $.get('/interactions/comment/' + commentID + '/delete/',
                    function(response){
                        if (response.status == 'true'){
                            OC.comments.commentDeleteHandler(event.target);
                        } else {
                            OC.popup(
                                'Sorry, your comment could not be deleted. ' +
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
                            OC.comments.newVoteHandler(target, upvote);
                        } else if (response.status == 'unvote success'){
                            OC.comments.newVoteHandler(target, upvote, true);
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

            addDeleteButtonTooltip: function(deleteParent){
                $('.delete-button', deleteParent).tipsy({gravity: 'n'});
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
                                    OC.comments.newCommentReplySuccessHandler(response, originalComment);

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

            newCommentSuccessHandler: function(response, button){
                var newCommentTemplate = OC.comments.newCommentTemplate;
                var newComment = newCommentTemplate(response.message);

                var postComments = $(button).parents('.comment-thread'),
                    postCommentList = postComments.children('ul');

                if (postCommentList.length === 0){
                    postCommentList = $('<ul/>');
                    // Insert the new comment list BEFORE the input box
                    postComments.prepend(postCommentList);
                }
            
                postCommentList.append(newComment);
                var insertedComment = postCommentList.find('.post-comment:last');

                // Clear the contents of the input box
                var commentTextarea = $(button).parents('.comment-thread').find('textarea[name=body_markdown]');
                commentTextarea.val('');

                // Collapse the textarea
                commentTextarea.removeClass('expanded');
                commentTextarea.blur();

                // TODO(Varun): Attach the event handlers to this response.
                OC.comments.attachNewCommentActions(insertedComment);
            },

            newCommentReplySuccessHandler: function(response, originalComment){
                var newCommentTemplate = OC.comments.newCommentTemplate;
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
                OC.comments.attachNewCommentActions(insertedComment);

                // Empty the contents of the reply textarea
                $('.new-comment-reply-body').val('');
            },

            attachNewCommentActions: function(newComment){
                // Tipsy-fy then new comment's delete button.
                OC.comments.addDeleteButtonTooltip(newComment);

                // Attach the comment delete handler.
                $('.delete-button', newComment).click(
                    OC.comments.commentDeleteButtonClickHandler);

                // Attach the comment reply handler.
                $('.reply-to-comment', newComment).click(
                    OC.comments.commentReplyButtonClickHandler);

                // Attach the comment upvote and downvote handlers.
                OC.comments.bindVotingButtons(newComment);
            },

        },

        renderDocumentComments: function(){
            var documentBody = $('.oer-document.document-body');

            var i, j, documentElement, tableCells, cellComments;

            if (documentBody.length >= 1){
                var documentElements = $('.document-element', documentBody);

                for (i = 0; i < documentElements.length; i++){
                    documentElement = $(documentElements[i]);

                    // Fetch the document element comments.
                    var documentElementForm = $('form.document-element-form', documentElement),
                        documentElementID = $('input[name=document_element_id]', documentElementForm).val();

                    OC.getDocumentElementComments(documentElement, documentElementID);
                }
            }

            OC.closePopoutsHandler();
        },

        getDocumentElementComments: function(documentElement, documentElementID){
            $.get('/resources/document-element/' + documentElementID + '/comments/',
                function(response){
                    OC.getDocumentElementCommentsResponseHandler(
                        response, documentElement, documentElementID);
                },
            'json');
        },

        getDocumentElementCommentsResponseHandler: function(response, documentElement, documentElementID) {
            var documentElementComments =  response.comments;
            if (documentElement.hasClass('document-table')){
                tableCells = $('td, th', documentElement);

                for (j = 0; j < tableCells.length; j++){
                    cellCommentButton = $('<div/>', {
                        'class': 'document-cell-comment-button'});
                    cellCommentsWrapper = $('<div/>', {
                        'class': 'document-cell-comments'});

                    cell = $(tableCells[j]);

                    // Attach the floating comment button to the cell.
                    cell.append(cellCommentButton);
                    cell.append(cellCommentsWrapper);

                    newCommentButton = $('.document-cell-comment-button', cell);
                    newCommentsBox = $('.document-cell-comments', cell);

                    // Fill the comments box with comments.
                    var cellID = cell.attr('id'),
                        cellRowColumn = cellID.substring(('item-' + documentElementID).length + 1).split('-'),
                        cellRow = cellRowColumn[0],
                        cellColumn = cellRowColumn[1];
                    
                    // Find all the commentReferences for this cell, but return a list of
                    //     only their 'comment' sub-objects)
                    cellComments = _.pluck(_.where(documentElementComments, {
                            'reference': 'row#' + cellRow + ',col#' + cellColumn}), 'comment');

                    newCommentsBox.html(
                        OC.cellCommentsView(cellComments, cell));

                    // Bind the comment 'Post' button in the box.
                    $('button.document-element-comment-post', newCommentsBox).click(
                        OC.documentElementCommentPostHandler);

                    // Reposition comment button.
                    newCommentButton.css('left', (
                        cell.width() - newCommentButton.width()) + 'px');

                    // Reposition the comment box.
                    var suggestedCommentBoxLeft = newCommentButton.position().left,
                        expectedCommentBoxRight = suggestedCommentBoxLeft + newCommentsBox.outerWidth();

                    if (expectedCommentBoxRight > ($(window).width() - 10)){
                        // Change suggested comment left pushing the comment in.
                        suggestedCommentBoxLeft -= (expectedCommentBoxRight - ($(
                            window).width() - 10));
                    }

                    newCommentsBox.css({'left':
                        suggestedCommentBoxLeft + 'px',
                        'top': newCommentButton.position().top + 'px'
                    });

                    // Attach click handler with comment button.
                    newCommentButton.click(OC.toggleCellComment);

                    // Add a tooltip on the comment.
                }
            }
        },

        toggleCellComment: function(event){
            var dismissedPopout = $(OC.dismissOpenComment());

            // Find the comment box and toggle 'show' class.
            var commentContainer = $(event.target).closest('td, th');
            var commentsBox = commentContainer.find('.document-cell-comments');

            if (dismissedPopout.get(0) !== commentsBox.get(0)){
                commentsBox.addClass('show-popout');
                $(event.target).addClass('comments-open');

                // Do not dismiss popout when its contents are clicked on.
                commentsBox.click(function(event){
                    if (!$(event.target).is("button")){
                        event.stopPropagation();
                        event.preventDefault();
                        return false;
                    }
                });
            }

            event.stopPropagation();
            event.preventDefault();
            return false;
        },

        closePopoutsHandler: function(){
            $('body').on('click', function(){
                OC.dismissOpenComment();
            });
        },

        dismissOpenComment: function(){
            // Get all menus with the class 'show-popout'.
            var openPopouts = $('.show-popout');

            var i;
            for (i = 0; i < openPopouts.length; i++){
                $(openPopouts[i]).removeClass('show-popout');
            }

            // Get all target elements with the class 'comments-open'.
            var highlightedPopoutTargets = $('.comments-open');
            var j;
            for (j = 0; j < openPopouts.length; j++){
                $(highlightedPopoutTargets[j]).removeClass('comments-open');
            }

            return openPopouts[0];
        },

        documentCommentTemplate: _.template('<div class="document-comment">' +
            '<div class="document-comment-thumbnail" style="background-image: url(\'<%= profile_pic %>\');"></div>' +
            '<div class="document-comment-body"><a href="/user/<%= username %>" class="document-comment-user">' +
            '<%= name %></a><%= body %></div></div>'
        ),

        cellCommentsView: function(cellComments, cell){
            var commentsHTML = '', existingComments = '';
            var commentsHTMLPre = _.template('<form class="document-element-comments-form">' +
                '<input type="hidden" name="document-element-item" value="<%= itemID %>" />' +
                '<input type="hidden" name="user_id" value="<%= userID %>" />'
            );
            var commentsHTMLPost = '</form>';

            // Get document element ID and user ID.
            var documentElementItemID = cell.attr('id'),
                userID = $('.document-body-form input[name="user_id"]').val(),
                userProfilePicWrapper = $('.header-user-picture');

            var userProfilePic;
            if (userProfilePicWrapper.length >= 1)
                userProfilePic = userProfilePicWrapper.css('background-image').replace('"', '\'');

            var i;
            for (i = 0; i < cellComments.length; i++){
                existingComments += OC.documentCommentTemplate(cellComments[i]);
            }

            if (!userProfilePic){
                commentsHTML += commentsHTMLPre({
                    itemID: documentElementItemID,
                    userID: userID
                }) + existingComments + commentsHTMLPost;
            } else {
                // Get user URL, name and profile picture.
                var userTemplate = _.template('<div class="document-comment">' +
                    '<div class="document-comment-thumbnail" style="background-image: <%= profile_pic %>;"></div>' +
                    '<div class="document-comment-body"><textarea name="comment-body" placeholder="Add a comment..."></textarea></div></div>'
                );
                var userComment = userTemplate({'profile_pic' : userProfilePic});

                // Add comment 'Post' button.
                var postButton = _.template(
                    '<div class="document-element-comment-post-wrapper">' +
                    '<button class="document-element-comment-post action-button mini-action-button">' +
                    'Post</button></div>');

                commentsHTML += commentsHTMLPre({
                    itemID: documentElementItemID,
                    userID: userID
                }) + existingComments + userComment + postButton() + commentsHTMLPost;
            }

            return commentsHTML;
        },

        documentElementCommentPostHandler: function(event){
            var cellCommentsForm = $(event.target).closest('form.document-element-comments-form'),
                documentElementForm = $(event.target).closest('.document-element').find('form.document-element-form'),
                documentBodyForm = $('form.document-body-form');

            var commentBody =  $('textarea[name=comment-body]', cellCommentsForm).val().trim();

            // If the comment box is not empty, submit the comment.
            if (commentBody !== ""){
                var cellID = $(event.target).closest('td, th').attr('id'),
                    rowColReference = cellID.substring(cellID.indexOf('-', 5) + 1),
                    row = parseInt(rowColReference.substring(
                        0, rowColReference.indexOf('-')), 10),
                    col = parseInt(rowColReference.substring(
                        rowColReference.indexOf('-') + 1), 10);

                var data = {
                    'body_markdown': commentBody,
                    'owner_id': $('input[name=document_element_id]', documentElementForm).val(),
                    'owner_type': $('input[name=document_element_type]', documentElementForm).val(),
                    'user': $('input[name=user_id]', documentBodyForm).val(),
                    'reference': 'row#' + row + ',col#' + col
                };

                // Submit the comment through the interactions API        
                $.post('/interactions/comment-reference/', data,
                    function (response) {
                        if (response.status == 'true'){
                            OC.documentElementCommentSubmissionHandler(
                                response, cellCommentsForm);
                        }
                    }, 'json');
            }

            event.stopPropagation();
            event.preventDefault();
            return false;
        },

        documentElementCommentSubmissionHandler: function(response, cellCommentsForm){
            var cellComments = $('.document-comment', cellCommentsForm),
                lastComment = $(cellComments[cellComments.length - 2]);
            lastComment.after(OC.documentCommentTemplate(response));

            // Empty the contents of the comment.
            var newCommentInput = $('textarea[name=comment-body]', cellCommentsForm);
            newCommentInput.val('');

            // TODO(Varun): End any kind of animation to show submission of comment.
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
        },

        initSubscribe: function(){
            var userID = $('form.profile-subscribe-form input[name=user_id]').val(),
                button;

            $('.profile-subscribe .page-subscribe-button').click(function(event){
                button = $(this);
                OC.subscribeTo(userID, button);

                event.stopPropagation();
                event.preventDefault();
                return false;
            });

            $('.subscribe-suggestion-form .subscribe-button').click(function(event){
                userID = $(this).parents('.subscribe-suggestion-form').find(
                    'input[name=user_id]').val();
                OC.subscribeTo(userID, $(this));

                event.stopPropagation();
                event.preventDefault();
                return false;
            });
        },

        subscribeTo: function(userID, button){
            function toggleSubscribeUI(){
                if (button.hasClass('subscribed')){
                    button.removeClass('subscribed');
                    button.text('Subscribe');
                } else {
                    button.addClass('subscribed');
                    button.text('✔ Subscribed');
                }
            }

            function subscribe(){
                $.get('/user/api/subscribe/' + userID + '/',
                    function(response){
                        if (response.status !== 'true'){
                            toggleSubscribeUI();
                            OC.popup(response.message, response.title);
                        }
                    },
                'json');
            }

            toggleSubscribeUI();
            if (OC.config.user.id){
                subscribe();
            } else {
                var message = 'To subscribe and get frequent updates, please login or create a free account instantly.';
                OC.launchSignupDialog(message, subscribe);
            }
        },

        initBrowse: function(){
            // Attach click handler with favorite 'heart'.
            $('.content-panel-body-listing-item-favorites').click(function(event){
                $(this).toggleClass('favorited');
            });

            // Attach click handler with share button.
            $('.resource-browse-header-share').click(function(){
                if (OC.config.user.id) OC.initNewPostDialog();
                else {
                    var message = 'To post something into the community, you must ' +
                    'login or create a free account (takes 30 seconds!).';
                    OC.launchSignupDialog(message, function(response){
                        OC.initNewPostDialog();
                    });
                }
            });

            // Attach CSS class toggler on the sort-filter options.
            $('.filter-sort-option').click(function(event){
                var option = $(this);
                if (! option.hasClass('selected')){
                    $('.filter-sort-option').removeClass('selected');
                    option.addClass('selected');
                }
            });

            // Attach tooltip on the Common Core.
            $('.category-choice').tipsy({gravity: 's'});
        },

        initNewPostDialog: function(){
            function bindPostClickHandler(buttonSelector, $dialog, submit){
                $(buttonSelector, $dialog.dialog).click(function(event){
                    $dialog.close();
                    var postTagDialog = OC.customPopup('.post-tag-dialog');

                    $('.post-tag-submit', postTagDialog.dialog).click(function(event){
                        // Add the resource type and tags to the form URL post form.
                        var resourceType = $('select[name=type]', postTagDialog.dialog).val(),
                            newTypeInput = $('<input/>', {
                                'name': 'type',
                                'value': resourceType,
                                'type': 'hidden'
                            });

                        var dialogForm = $('form:first', $dialog.dialog),
                            standardTags = $('input[name="standard"]', postTagDialog.dialog), i;
                        
                        dialogForm.append(standardTags.clone());
                        dialogForm.append(newTypeInput);

                        // Submit the form.
                        if (submit)
                            dialogForm.submit();
                    });
                });
            }

            var postDialog = OC.customPopup('.browse-post-new-dialog');

            var postTagIt = $('.post-tag-dialog .standards-input').tagit({
                fieldName: 'standard',
                autocomplete: {
                    minLength: 2,
                    source: function(request, response){
                        $.get('/meta/api/standard/search/' + request.term + '/?limit=15',
                            function (data){
                                response($.map(data, function(item){
                                    return { label: item, value: item };
                                }));
                            },
                        'json');
                    },
                }
            });

            $('.browse-post-new-option.upload-option', postDialog.dialog).click(function(){
                postDialog.close();

                // Launch the upload popup.
                var uploadPopup = OC.customPopup('.post-new-upload-dialog');

                // Set the popup settings to being 'is_post'.
                $('input[name="post"]', uploadPopup.dialog).val('true');
                OC.upload.isPost = true;

                bindPostClickHandler('form.files-upload-rename button[type="submit"]', uploadPopup, true);
            });

            $('.browse-post-new-option.file-folder-option', postDialog.dialog).click(function(){
                postDialog.close();

                // Launch the upload popup.
                var fileFolderPopup = OC.customPopup('.post-new-file-folder-dialog'),
                    filesBrowser = $('.post-new-file-folder-profile-browser');

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

                bindPostClickHandler('.post-new-file-folder-submit', fileFolderPopup, true);

                // Bind 'attach' button click handler.
                $('.post-new-file-folder-submit').click(function(event){
                    var toResourceCollection;

                    // If the active tab is projects.
                     selectedResourceCollection = filesBrowser.find(
                        '.selected-destination-collection, .selected-destination-resource');

                     if (selectedResourceCollection.length > 0)
                        toResourceCollection = $(selectedResourceCollection[0]);

                    if (toResourceCollection){
                        var elementID = toResourceCollection.attr('id'),
                            resource = elementID.indexOf('resource') != -1;

                        var resourceCollectionID = resource ? elementID.substring(9) : elementID.substring(11);
                        
                        // Append the resource/collection ID to the form.
                        $('#post-new-file-folder-profile-form input[name=is_resource]').val(
                            resource);
                        $('#post-new-file-folder-profile-form input[name=resource_collection_ID]').val(
                            resourceCollectionID);
                    }

                    event.stopPropagation();
                    event.preventDefault();
                    return false;
                });
            });

            $('.browse-post-new-option.url-option', postDialog.dialog).click(function(){
                postDialog.close();

                // Launch the upload popup.
                var newURLPopup = OC.customPopup('.post-new-url-dialog');

                bindPostClickHandler('.post-new-url-submit', newURLPopup, true);
            });
        },

        launchSignupDialog: function(message, successCallback){
            var signupDialog = OC.customPopup('.login-dialog'),
                signinButtons = $('.easy-signup-form, #sign-in-form'),
                sessionStateElement = $('.easy-signup-form #session-state'),
                signupMessage = $('.login-dialog-message', signupDialog.dialog);

            OC.signupDialog = signupDialog;

            // Set the specific context message in the dialog.
            signupMessage.html(message);

            // Load the template for the signup and signin forms.
            $.get('/user/api/registeration-context/',
                function(response){
                    if (response.status == 'true'){
                        // Fill the session state.
                        var i; for (i = 0; i < signinButtons.length; i++){
                            $('#session-state', $(signinButtons[i])).attr('data-state', response.state);

                            // Generate the Google+ button.
                            $('span.g-signin', $(signinButtons[i])).attr('data-clientid', response.client_id);
                        }

                        OC.initializeGooglePlusButtons();

                        OC.registerationSuccessCallback = successCallback;
                    }
                },
            'json');
        },

        initializeGooglePlusButtons: function(){
            var po = document.createElement('script'),
                s = document.getElementsByTagName('script')[0];
            po.type = 'text/javascript';
            po.async = true;
            po.src = 'https://plus.google.com/js/client:plusone.js?onload=renderPlus';
            s.parentNode.insertBefore(po, s);
        },

        signupTour: function(){
            var message, messageEl, signupFloaters, signupFloatersEl,
                background = $('.popup-background'),
                stepMessages = {
                    one: {
                        title: 'Create lessons, units and folders of joy',
                        body: 'Begin by creating a template-based lesson, or create a standards-aligned unit. ' +
                            'Import existing content from Dropbox, Google Drive and other places to build folders for sharing.' +
                            '<div class="signup-tour-buttons"><div class="action-button mini-action-button signup-tour-primary-button">' +
                            'Next &#187;</div><div class="action-button mini-action-button signup-tour-secondary-button">Cancel</div></div>'
                    },

                    two: {
                        title: 'Search from what others are creating',
                        body: 'Hundreds of teachers and content publishers are creating and sharing lessons, worksheets, videos, ' +
                            'student handouts, and activities for you to use. Here is where your quest begins.' +
                            '<div class="signup-tour-buttons"><div class="action-button mini-action-button signup-tour-primary-button">' +
                            'Next &#187;</div><div class="action-button mini-action-button signup-tour-secondary-button">Cancel</div></div>'
                    },

                    three: {
                        title: 'Does that look like you?',
                        body: 'Begin your journey in OpenCurriculum with a new dashing photo of yours and a headline update. ' +
                            'Let all others in the community know you have arrived and are here to stay :)' +
                            '<div class="signup-tour-buttons"><div class="action-button mini-action-button signup-tour-primary-button">' +
                            'Done</div></div>'
                    },
                };

            function setupDialog(){
                var welcomeMessage = '<p>Wohoo! You are almost set. We sent you an email to ' +
                    'confirm your account. When you get a chance, please check your email and confirm the same.</p>' +
                    '<p>For now, please enjoy this little tour we put together for you.</p>' +
                    '<div class="user-welcome-submit-wrapper oc-popup-submit-wrapper"><button class="action-button ' +
                    'user-welcome-submit-button oc-popup-submit-button">Take the mini-tour &#187;</button></div>';

                var welcomeDialogEl = $('<div/>', {
                    'class': 'user-welcome-dialog oc-popup'
                }),
                    welcomeDialogTitleBarEl = $('<div/>', {
                    'class': 'oc-popup-title-bar'
                }),
                    welcomeDialogTitleEl = $('<div/>', {
                    'class': 'oc-popup-title'
                }),
                    welcomeDialogTitleHeaderEl = $('<h3/>', {
                    'text': 'Welcome, ' + OC.config.user.name
                }),
                    welcomeDialogExitButtonEl = $('<div/>', {
                    'class': 'delete-button oc-popup-exit',
                }),
                   welcomeDialogBodyEl = $('<div/>', {
                    'class': 'oc-popup-body',
                    'html': welcomeMessage
                });

                welcomeDialogTitleEl.append(welcomeDialogTitleHeaderEl);
                welcomeDialogTitleBarEl.append(welcomeDialogTitleEl);
                welcomeDialogTitleBarEl.append(welcomeDialogExitButtonEl);

                welcomeDialogEl.append(welcomeDialogTitleBarEl);
                welcomeDialogEl.append(welcomeDialogBodyEl);

                $('body').append(welcomeDialogEl);

                var welcomeDialog = OC.customPopup('.user-welcome-dialog'),
                    startTour = $('.user-welcome-submit-button', welcomeDialog.dialog);

                startTour.click(function(event){
                    welcomeDialog.close();

                    // Update server about having begun welcome tour.
                    $.get('/user/api/onboard/welcome/0.1/', function(
                        r){}, 'json');

                    // Take the user through the tour.
                    signupFloaters = $('<div/>', {
                        'class': 'signup-floaters'
                    });
                    $('body').append(signupFloaters);
                    signupFloatersEl = $('.signup-floaters');

                    signupFloatersEl.css({
                        height: $(window).height(),
                        width: $(window).width()
                    });

                    background.addClass('show-popup-background');

                    // Setup the steps.
                    var signupStepsWrapper = $('<div/>', { 'class': 'signup-steps-wrapper' }),
                        signupSteps = $('<nav/>', { 'class': 'signup-steps' }),
                        signupStepOne = $('<div/>', {
                            'class': 'signup-step signup-step-one selected',
                            'text': '1'
                        }),
                        signupStepTwo = $('<div/>', {
                            'class': 'signup-step signup-step-two',
                            'text': '2'
                        }),
                        signupStepThree = $('<div/>', {
                            'class': 'signup-step signup-step-three',
                            'text': '3'
                        }),
                        signupStepsFlow = $('<div/>', {
                            'class': 'signup-steps-flow'
                        });

                    signupSteps.append(signupStepOne);
                    signupSteps.append(signupStepTwo);
                    signupSteps.append(signupStepThree);
                    
                    signupStepsWrapper.append(signupSteps);
                    signupStepsWrapper.append(signupStepsFlow);

                    signupFloatersEl.append(signupStepsWrapper);

                    signupStepsWrapper.css({
                        top: $(window).height() - signupStepsWrapper.height() - 20
                    });

                    setupStepOne();

                    event.stopPropagation();
                    event.preventDefault();
                    return false;
                });
            }

            function advanceTo(step){
                steps = ['one', 'two', 'three', 'four', 'five'];

                // Hide all bodies and deselect all steps.
                var stepsIndicators = $('.signup-steps-step');
                stepsIndicators.removeClass('selected');

                var currentStepIndicator = $('.signup-step-' + steps[step - 1]);

                currentStepIndicator.addClass('selected');

                // Mark previous indicator as complete.
                var previousStepIndicator = $('.signup-step-' + steps[step - 2]);
                if (previousStepIndicator.length !== 0) previousStepIndicator.addClass('completed');
            }

            function setupStepOne(){
                // Popout and reposition.
                var addResourceButton = $('.create-new-resource-button a'),
                    addResourceMenu = $('#add-resource-menu');

                addResourceButton.css({
                    top: addResourceButton.position().top,
                    left: addResourceButton.position().left
                });
                addResourceButton.addClass('popout');
                addResourceMenu.addClass('popout');
                addResourceMenu.mouseover();

                // Add message around step one.
                message = $('<div/>', { 'class': 'step-one-message step-message' });
                messageTitle = $('<div/>', {
                    'class': 'step-message-title',
                    'text': stepMessages.one.title
                });
                messageBody = $('<div/>', {
                    'class': 'step-message-body',
                    'html': stepMessages.one.body
                });

                message.append(messageTitle);
                message.append(messageBody);

                signupFloatersEl.append(message);
                var messageEl = $('.step-one-message');

                messageEl.css({
                    'top': addResourceButton.position().top,
                    'left': addResourceButton.position().left - messageEl.width() - 80
                });

                // Bind next handler on step one message.
                $('.signup-tour-primary-button', messageEl).click(function(event){
                    // Destroy setup for step one.
                    message.addClass('hide');
                    addResourceButton.removeClass('popout');
                    addResourceMenu.removeClass('popout');

                    // Call setup for step two.
                    setupStepTwo();
                });

                $('.signup-tour-secondary-button', messageEl).click(
                    function(event){ cancelTour(); });
            }

            function setupStepTwo(){
                advanceTo(2);

                var searchBar = $('#search-bar');
                searchBar.css({
                    top: searchBar.position().top,
                    left: searchBar.position().left
                });

                searchBar.addClass('popout');

                // Add message around step one.
                message = $('<div/>', { 'class': 'step-two-message step-message' });
                messageTitle = $('<div/>', {
                    'class': 'step-message-title',
                    'text': stepMessages.two.title
                });
                messageBody = $('<div/>', {
                    'class': 'step-message-body',
                    'html': stepMessages.two.body
                });

                message.append(messageTitle);
                message.append(messageBody);

                signupFloatersEl.append(message);
                var messageEl = $('.step-two-message');

                messageEl.css({
                    'top': searchBar.position().top + 20,
                    'left': searchBar.position().left + 20
                });

                // Bind next handler on step one message.
                $('.signup-tour-primary-button', messageEl).click(function(event){
                    // Destroy setup for step one.
                    message.addClass('hide');
                    searchBar.removeClass('popout');

                    // Call setup for step three.
                    setupStepThree();

                    event.stopPropagation();
                    event.preventDefault();
                    return false;
                });

                $('.signup-tour-secondary-button', messageEl).click(
                    function(event){ cancelTour(); });
            }

            function setupStepThree(){
                advanceTo(3);
                
                var profilePic = $('.user-profile-picture'),
                    profileInfo = $('.user-profile-info-body'),
                    changePictureHandle = $('.edit-profile-picture .change-picture');

                profilePic.css({
                    top: profilePic.position().top,
                    left: profilePic.position().left
                });
                profileInfo.css({
                    top: profileInfo.position().top,
                    left: profileInfo.position().left
                });

                profilePic.addClass('popout');
                profileInfo.addClass('popout');
                changePictureHandle.mouseover();

                // Add message around step one.
                message = $('<div/>', { 'class': 'step-three-message step-message' });
                messageTitle = $('<div/>', {
                    'class': 'step-message-title',
                    'text': stepMessages.three.title
                });
                messageBody = $('<div/>', {
                    'class': 'step-message-body',
                    'html': stepMessages.three.body
                });

                message.append(messageTitle);
                message.append(messageBody);

                signupFloatersEl.append(message);
                var messageEl = $('.step-three-message');

                messageEl.css({
                    'top': profilePic.position().top - 20,
                    'left': profilePic.position().left + profilePic.width() + 20
                });

                // Bind next handler on step one message.
                $('.signup-tour-primary-button', messageEl).click(function(event){
                    // Destroy setup for step one.
                    message.addClass('hide');
                    profilePic.removeClass('popout');
                    profileInfo.removeClass('popout');

                    endTour();
                });
            }

            function endTour(){
                cancelTour();
            }

            function cancelTour(){
                background.removeClass('show-popup-background');
                $('.signup-steps-wrapper').addClass('hide');
                $('.signup-floaters').addClass('hide');

                // Show tooltip for starting off with looking at the content.
                var siteLogo = $('#logo');

                setTimeout(function(){
                    OC.tip(siteLogo, {
                        title: 'Confused about where to begin?',
                        gravity: 'n',
                        width: 220,
                        description: 'Begin by exploring our vast library of content by clicking on the site logo, before ' +
                        'you decide to come back to your profile to make something.',
                        dismisser: function(tip, dismissCallback){
                            dismissCallback(tip);
                        }
                    });
                }, 2500);
            }

            var params = window.location.search === '' ? [] : window.location.search.substring(
                1).split('&');
     
            if (params){
                var newUserParameter = _.find(params, function(param){
                    return param.indexOf('new_user=') !== -1;
                });
                if (newUserParameter && OC.config.user.id){
                    setupDialog();
                }
            }

        },

        validateNewURL: function(){
            // RegExp adopted and modified (to support no protocol)
            //     from https://gist.github.com/dperini/729294
            OC.validate.text(
                '.resource-create-edit-form input[name="url"]',
                /^(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/i,
                'You seem to have a little error in your URL'
            );

            $('form.url-edit-form .action-button').click(function(event){
                var submitButton = $(this);

                var fields = [
                    'input[name="url"]'
                ];

                var i, element, errorneousInputs = [];
                for (i = 0; i < fields.length; i++){
                    element = $('form.resource-create-edit-form ' + fields[i]);
                    if (element.hasClass('form-input-error')){
                        errorneousInputs.push(element);
                    }
                }

                if (errorneousInputs.length === 0) {
                    submitButton.parents('form.resource-create-edit-form').submit();
                } else {
                    event.stopPropagation();
                    event.preventDefault();
                    return false;
                }
            });
        },

        collaborators: {
            currentResourceCollectionVisibility: null,
            template: _.template('<li class="collaborator-item user" id="user-<%= id %>">' +
                '<div class="collaborator-info user-info">' +
                '<div class="collaborator-photo user-photo" style="background-image: url(\'<%= profile_pic %>\')"></div>' +
                '<div class="collaborator-description user-description">' +
                '<a href="/user/<%= username %>"><%= name %></a></div></div>' +
                '<div class="collaborator-actions user-actions">' +
                '<span class="delete-member delete-button" title="Remove collaborator"></span>' +
                '</div></li>'),

            init: function(resourceCollectionItem, setupResourceToggler, setupCollectionToggler, closeCallback, isOwner){
                var collaboratorsPopup = OC.customPopup('.resource-collection-visibility-dialog', {
                    closeCallback: closeCallback
                });

                var collaboratorForm = $('#add-collection-collaborator-form', collaboratorsPopup.dialog);
                var collaboratorInput = $('input[name=add-collaborator]', collaboratorForm);
                collaboratorInput.focus();

                // Empty contents of collaborator input.
                collaboratorInput.val('');

                // Get the list of current collaborators and place in popup list.
                var userList = $('ul.collaborators', collaboratorForm);

                // Clear current list.
                userList.children().remove();

                // Unbind all previously registered events from tabs.
                $('.resource-collection-visibility-form-tabs li a').unbind('click');

                var publicVisibilityTab = $(
                    '.resource-collection-visibility-form-tabs li a[href="#profile-access"]'),
                    projectVisibilityTab = $(
                    '.resource-collection-visibility-form-tabs li a[href="#project-access"]'),
                    privateVisibilityTab = $(
                    '.resource-collection-visibility-form-tabs li a[href="#private-access"]');
                
                if (resourceCollectionItem.type == 'collection'){
                    // Setup the popup.
                    $('input[name=collection_id]', collaboratorForm).val(resourceCollectionItem.id);

                    // Re-initiate autocomplete add-a-collaborator-to-collection
                    //     functionality.
                    OC.collaborators.add(true);

                    userList.addClass('waiting');
                    $.get('/resources/collection/' + resourceCollectionItem.id + '/list-collaborators/',
                        function (response) {
                            if (response.status === 'true'){
                                OC.collaborators.listHandler(response);
                            } else {
                                OC.popup(response.message, response.title);
                            }

                            // Clear spinner from the user listing.
                            userList.removeClass('waiting');
                        },
                    'json');

                    // Make requests everytime the user clicks on a visibility button.
                    publicVisibilityTab.click(function(){
                        OC.collaborators.currentResourceCollectionVisibility = 'public';
                        $.get('/resources/collection/' + resourceCollectionItem.id + '/visibility/public/');
                    });
                    projectVisibilityTab.click(function(){
                        OC.collaborators.currentResourceCollectionVisibility = 'project';
                        $.get('/resources/collection/' + resourceCollectionItem.id + '/visibility/project/');
                    });
                    privateVisibilityTab.click(function(){
                        OC.collaborators.currentResourceCollectionVisibility = 'private';
                        $.get('/resources/collection/' + resourceCollectionItem.id + '/visibility/private/');
                    });

                    setupCollectionToggler(resourceCollectionItem.id, false);

                } else {
                    // Setup the popup.
                    $('input[name=resource_id]', collaboratorForm).val(resourceCollectionItem.id);

                    // Re-initiate autocomplete add-a-collaborator-to-a-resource
                    //     functionality.
                    OC.collaborators.add(false);

                    userList.addClass('waiting');
                    $.get('/resources/resource/' + resourceCollectionItem.id + '/list-collaborators/',
                        function (response) {
                            if (response.status === 'true'){
                                OC.collaborators.listHandler(response);
                            } else {
                                OC.popup(response.message, response.title);
                            }

                            // Clear spinner from the user listing.
                            userList.removeClass('waiting');
                        },
                    'json');

                    // Make requests everytime the user clicks on a visibility button.
                    publicVisibilityTab.click(function(){
                        OC.collaborators.currentResourceCollectionVisibility = 'public';
                        $.get('/resources/resource/' + resourceCollectionItem.id + '/visibility/public/');
                    });
                    projectVisibilityTab.click(function(){
                        OC.collaborators.currentResourceCollectionVisibility = 'project';
                        $.get('/resources/resource/' + resourceCollectionItem.id + '/visibility/project/');
                    });
                    privateVisibilityTab.click(function(){
                        OC.collaborators.currentResourceCollectionVisibility = 'private';
                        $.get('/resources/resource/' + resourceCollectionItem.id + '/visibility/private/');
                    });

                    setupResourceToggler(resourceCollectionItem.id, false);
                }

                OC.tabs('.resource-collection-visibility-form', {
                    // Select the second tab (with index starting at 0)
                    tab: OC.collaborators.currentResourceCollectionVisibility == 'private' ? 1:0,
                    showOnly: isOwner ? null : 1,
                });
            },

            add: function(isCollection){
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
                                    OC.collaborators.addHandler(response.user, userList);
                                
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
                                    OC.collaborators.addHandler(response.user, userList, isCollection);
                                
                                    // Clear contents from the input box
                                    addCollaboratorInput.val('');
                                    addCollaboratorInput.removeClass('waiting');
                                },
                            'json');
                        }

                    }
                });
            },

            listHandler: function(response){
                var userList = $('#add-collection-collaborator-form ul.collaborators');

                var i, collaborator;
                for (i = 0; i < response.users.length; i++){
                    OC.collaborators.addHandler(response.users[i], userList);
                }
            },

            addHandler: function(user, userList, isCollection){
                collaborator = OC.collaborators.template(user);
                userList.append(collaborator);

                // Bind delete action with each user.
                var newUserDeleteButton = userList.find(
                    'li.collaborator-item:last .delete-button');
                newUserDeleteButton.click(function(event){
                    OC.collaborators.removeHandler(event, isCollection);
                });

                // Tipsy the collaborator.
                newUserDeleteButton.tipsy({gravity: 'n'});
            },

            removeHandler: function(event, isCollection){
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
                                OC.collaborators.remove(target);
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
                                OC.remove.remove(target);
                            } else {
                                OC.popup(response.message, response.title);
                            }
                        },
                    'json');
                }
            },

            remove: function(target){
                var collaboratorContainer = $(target).parents('li.collaborator-item');

                // Hide the tipsy on the 'delete' target.
                $(target).tipsy('hide');

                collaboratorContainer.remove();
            },
        },

        resources: {},
        resource: {
            copy: function(fromCollectionID, resourceID, toCollectionID, callback){
                $.get('/resources/resource/' + resourceID + '/copy/from/' +
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

            link: function(fromCollectionID, resourceID, toCollectionID, callback){
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
            },

            delete: function(resourceID, fromCollectionID, callback){
                var deletePopup = OC.customPopup('.delete-resource-collection-dialog');

                $('.delete-resource-collection-submit-button', deletePopup.dialog).click(function(event){
                    deletePopup.close();

                    $.post('/resources/delete-resource/' + resourceID  +
                                '/from/' + fromCollectionID + '/',
                        function(response){
                            if (response.status == 'true'){
                                callback([response.resourceID]);
                            }
                            else {
                                OC.popup(response.message, response.title);
                                OC.dismissMessageBox();
                            }
                        },
                    'json');

                    event.stopPropagation();
                    event.preventDefault();
                    return false;
                });
            },

            deleteMultiple: function(resourceIDList, fromCollectionID, callback){
                var deletePopup = OC.customPopup('.delete-resource-collection-dialog');

                $('.delete-resource-collection-submit-button', deletePopup.dialog).click(function(event){
                    deletePopup.close();
                    var resourceIDs = resourceIDList.join();

                    $.post('/resources/delete-resources/from/' + fromCollectionID + '/?ids=' + resourceIDs,
                        function(response){
                            if (response.status == 'true'){
                                callback(response.resourceIDs);
                            }
                            else {
                                OC.popup(response.message, response.title);
                                OC.dismissMessageBox();
                            }
                        },
                    'json');

                    event.stopPropagation();
                    event.preventDefault();
                    return false;
                });
            },

            rename: function(resourceID, title, callback){
                $.post('/resources/rename/resource/' + resourceID + '/' + encodeURIComponent(title) + '/',
                    function(response){
                        if (response.status == 'true'){
                            callback(response.resourceID, response.title);
                        }
                        else {
                            OC.popup(response.message, response.title);
                            OC.dismissMessageBox();
                        }
                    },
                'json');
            }
        },

        collection: {
            copy: function(fromCollectionID, collectionID, toCollectionID, callback){
                $.get('/resources/collection/' + collectionID + '/copy/to/' +
                    toCollectionID + '/',
                    function(response){
                        if (response.status == 'true'){
                            callback(response.collection, collectionID);
                        } else {
                            OC.popup(response.message, response.title);
                            OC.dismissMessageBox();
                        }
                    },
                'json');
            },

            successfullyCopied: function(copiedCollection, collectionID){
                OC.setMessageBoxMessage('Folder has been copied into your folder successfully.');
                OC.showMessageBox();
            },

            delete: function(collectionID, callback){
                var deletePopup = OC.customPopup('.delete-resource-collection-dialog');

                $('.delete-resource-collection-submit-button', deletePopup.dialog).click(function(event){
                    deletePopup.close();

                    $.post('/resources/delete-collection/' + collectionID  + '/',
                        function(response){
                            if (response.status == 'true'){
                                callback([response.collectionID]);
                            }
                            else {
                                OC.popup(response.message, response.title);
                                OC.dismissMessageBox();
                            }
                        },
                    'json');

                    event.stopPropagation();
                    event.preventDefault();
                    return false;
                });
            },

            deleteMultiple: function(collectionIDList, callback){
                var deletePopup = OC.customPopup('.delete-resource-collection-dialog');

                $('.delete-resource-collection-submit-button', deletePopup.dialog).click(function(event){
                    deletePopup.close();
                    var collectionIDs = collectionIDList.join();

                    $.post('/resources/delete-collections/?ids=' + collectionIDs,
                        function(response){
                            if (response.status == 'true'){
                                callback(response.collectionIDs);
                            }
                            else {
                                OC.popup(response.message, response.title);
                                OC.dismissMessageBox();
                            }
                        },
                    'json');

                    event.stopPropagation();
                    event.preventDefault();
                    return false;
                });
            },

            rename: function(collectionID, title, callback){
                $.post('/resources/rename/collection/' + collectionID + '/' + encodeURIComponent(title) + '/',
                    function(response){
                        if (response.status == 'true'){
                            callback(response.collectionID, response.title);
                        }
                        else {
                            OC.popup(response.message, response.title);
                            OC.dismissMessageBox();
                        }
                    },
                'json');
            }
        },

        // Set the height of the page.
        setPageHeight: function(){
            $('.resource-browse, .profile-page').height(
                $(window).height() - $('header').height()
            );

            $('.profile-content').height(
                $(window).height() - $('header').height() - $(
                    '.profile-tabs').outerHeight(true) - parseInt($(
                    '.profile-content').css('padding-top'), 10)
            );

            if ($('.profile-content').length >0)
                $('.wide-center-stage').height('100%');
        },

        favorites: {},

        attachCSRFToken: function(file, xhr, formData){
            function getCookie(name) {
                var cookieValue = null, cookies, i, cookie;
                if (document.cookie && document.cookie !== '') {
                    cookies = document.cookie.split(';');
                    for (i = 0; i < cookies.length; i++) {
                        cookie = $.trim(cookies[i]);
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

            var url = $(this)[0].options.url;

            // HACK(Varun): Modified from original if statement, because the method
            //     is not available to us here. Original 'if' below:
            //     if (!safeMethod(settings.type) && sameOrigin(url))

            if (sameOrigin(url)) {
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        },

        initUnsubscribe: function(){
            $('.resubscribe-message').click(function(event){
                $('.unsubscribe-title, .unsubscribe-message').fadeOut('slow');

                var button = $(event.target),
                    form = button.parents('form'),
                    userID = $('input[name="user_id"]').val(),
                    service = $('input[name="service"]').val();

                $.get('/user/api/resubscribe/' + userID + '/' + service + '/',
                    function(response){
                        button.text('Re-subscribe success!');
                    },
                'json');

                $('.resubscribe-content').fadeIn();

                // Disable click on the button.
                event.target.disabled = true;

                event.stopPropagation();
                event.preventDefault();
                return false;
            });
        }
    });

    $(document).ready(function ($) {
        OC.setupUserMenu();

        $('.chief-panel-container-cover').addClass('play');

        OC.setPageHeight();
        $(window).resize(OC.setPageHeight);

        OC.initSearchOptions();

        OC.initSearchAutocomplete();

        // NOTE: This call has been temporarily moved to the callback from the
        //     WebFont loaded callback.
        // OC.setupUserMenu();

        OC.initShowMoreBlock();

        OC.bindEditHeadlineHandler();

        OC.initNotificationHandler();

        OC.initMessageBox();

        OC.setupIndex();
        $(window).resize(OC.setupIndex);

        OC.initBrowse();


        /* Profile specific initializers and other functions */

        OC.initPictureManipulation();

        OC.initSubscribe();


        // Instantiate AJAX submit handler for invite sign-ups
        OC.initInviteSignup();


        /** Article specific initializers and other functions */

        // Initialize chapter dropdown change behavior
        OC.renderSelectRedirector();

        // Render animation of difficulty level "thermometer"
        OC.renderThermometer();

        OC.setupShareMenu();

        OC.setupAddTo();

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
        OC.initAddResource();

        OC.initCreateCollection();

        OC.initCreateGroup();

        OC.initUpload();

        OC.initLink();

        OC.bindDeleteResourceHandler();

        OC.bindDeleteCollectionHandler();

        OC.initCollectionsTree();

        OC.initFavoriteResource();

        OC.comments.initRenderComments();

        OC.initUpvoteDownvoteResource();

        OC.initResourceView();

        OC.initPrintResource();

        OC.initExportResource();

        OC.initProfileCreateResource();

        OC.initProfileSubscribers();

        //OC.initEditResource();

        OC.validateNewURL();

        OC.initForgotAuth();

        OC.initChangePassword();

        OC.renderShowMore();

        OC.initArticleCenter();

        $('.new-resource-tags').tagit({
            allowSpaces: true
        });

        OC.initRegistrationForm();

        // Initial tour on signup.
        OC.signupTour();

        // Initialize unsubscription animation.
        OC.initUnsubscribe();
    });

    $(document).ajaxSend(function (event, xhr, settings) {
        function getCookie(name) {
            var cookieValue = null, cookies, i, cookie;
            if (document.cookie && document.cookie !== '') {
                cookies = document.cookie.split(';');
                for (i = 0; i < cookies.length; i++) {
                    cookie = $.trim(cookies[i]);
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

    /*jslint nomen: true */
    // Initialize Google Analytics.
    (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
    })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

    ga('create', 'UA-23974225-2', 'opencurriculum.org');

    if (OC.config.user.id){
        ga('set', '&uid', parseInt(OC.config.user.id, 10));
        ga('set', 'dimension2', OC.config.user.dob);
    }
    ga('send', 'pageview');

    /*jslint nomen: false */


    /* All jQuery extension functions below */

    $.fn.shuffleElements = function () {
        var o = $(this), j, x, i;
        for (j, x, i = o.length; i; j = parseInt(Math.random() * i,
                10), x = o[--i], o[i] = o[j], o[j] = x) {}
        return o;
    };

    $.fn.selectRange = function (start, end) {
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
    $.fn.hasClickEventListener = function(eventListener) {
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

    // Adapted from http://chris-spittles.co.uk/jquery-calculate-scrollbar-width/#sthash.pzDdzxwT.dpuf
    getScrollbarWidth = function() {
        var $inner = $('<div style="width: 100%; height:200px;"></div>'),
            $outer = $('<div style="width:200px;height:150px; position: absolute;' +
                'top: 0; left: 0; visibility: hidden; overflow:hidden;"></div>').append($inner),
            inner = $inner[0],
            outer = $outer[0];
         
        $('body').append(outer);
        var width1 = inner.offsetWidth;
        $outer.css('overflow', 'scroll');

        var width2 = outer.clientWidth;
        $outer.remove();
     
        return (width1 - width2);
    };

    isElementInViewport = function(el){
        if (el instanceof $) {
            el = el[0];
        }

        var rect = el.getBoundingClientRect();

        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
            rect.right <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
        );
    };

    // Include the UserVoice JavaScript SDK (only needed once on a page)
    UserVoice=window.UserVoice||[];(function(){var uv=document.createElement('script');uv.type='text/javascript';uv.async=true;uv.src='//widget.uservoice.com/ZAGIW6Tl7C98iiNDKsLe5g.js';var s=document.getElementsByTagName('script')[0];s.parentNode.insertBefore(uv,s)})();

    // Set colors
    UserVoice.push(['set', {
      accent_color: '#6aba2e',
      trigger_color: 'white',
      trigger_background_color: 'rgba(46, 49, 51, 0.6)'
    }]);

    // Add default trigger to the bottom-right corner of the window:
    UserVoice.push(['addTrigger', { mode: 'contact', trigger_position: 'bottom-right' }]);

    $.fn.animateAuto = function(prop, speed, callback){
        var elem, height, width;
        return this.each(function(i, el){
            el = $(el);
            elem = el.clone().css({"height":"auto","width":"auto"}).appendTo("body");
            
            var height = elem.css("height"),
                width = elem.css("width");
            elem.remove();
            
            if(prop === "height")
                el.animate({"height":height}, speed, callback);
            else if(prop === "width")
                el.animate({"width":width}, speed, callback);
            else if(prop === "both")
                el.animate({"width":width,"height":height}, speed, callback);
        });
    };

    /* Global functions that can't be replaced with modules */

    window.gPlusSignInCallback = function(authResult){
        // Calls the handler specific to logging in with G+.
        return OC.googleSignInCallback(authResult);
    };

    window.renderPlus = function(){
        gapi.signin.render('custom-plus-button', {
          'callback': 'gPlusSignInCallback',
          'clientid': GPlusClientID,
          'cookiepolicy': 'single_host_origin',
          'scope': 'email',
        });
    };

    if (! OC.config.user.id){
        try {
            // Function to initialize the Facebook button.
            window.fbAsyncInit = function() {
                FB.init({
                    appId      : fbAppID,
                    status     : true, // check login status
                    cookie     : true, // enable cookies to allow the server to access the session
                    xfbml      : true  // parse XFBML
                });

                /*FB.Event.subscribe('auth.authResponseChange', function(response) {
                    var registrationCover = $('.registration-cover');
                    if (registrationCover.length > 0 && registrationCover.attr('title') === 'facebook'){
                        OC.facebookRegistrationCallback({'status': 'false'});
                    }
                });*/
                /*
                // Here we subscribe to the auth.authResponseChange JavaScript event. This event is fired
                // for any authentication related change, such as login, logout or session refresh. This means that
                // whenever someone who was previously logged out tries to log in again, the correct case below 
                // will be handled. 
                FB.Event.subscribe('auth.authResponseChange', function(response) {
                    // Here we specify what we do with the response anytime this event occurs. 
                    if (response.status === 'connected') {
                      // The response object is returned with a status field that lets the app know the current
                      // login status of the person. In this case, we're handling the situation where they 
                      // have logged in to the app.
                      //OC.facebookRegistrationCallback();
                    } else if (response.status === 'not_authorized') {
                      // In this case, the person is logged into Facebook, but not into the app, so we call
                      // FB.login() to prompt them to do so. 
                      // In real-life usage, you wouldn't want to immediately prompt someone to login 
                      // like this, for two reasons:
                      // (1) JavaScript created popup windows are blocked by most browsers unless they 
                      // result from direct interaction from people using the app (such as a mouse click)
                      // (2) it is a bad experience to be continually prompted to login upon page load.
                      FB.login();
                    } else {
                      // In this case, the person is not logged into Facebook, so we call the login() 
                      // function to prompt them to do so. Note that at this stage there is no indication
                      // of whether they are logged into the app. If they aren't then they'll see the Login
                      // dialog right after they log in to Facebook. 
                      // The same caveats as above apply to the FB.login() call here.
                      FB.login();
                    }
                });
                */
            };
        } catch (e) {

        }

        // Load the SDK asynchronously
        (function(d){
           var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
           if (d.getElementById(id)) {return;}
           js = d.createElement('script'); js.id = id; js.async = true;
           js.src = "//connect.facebook.net/en_US/all.js";
           ref.parentNode.insertBefore(js, ref);
        }(document));
    }

    return OC;
});
