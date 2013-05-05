/*jslint plusplus: true, browser: true, todo: true */
/*jslint nomen: true */
var jQuery, $, Modernizr, gapi, _;
/*jslint nomen: false */

'use strict';

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

            jQuery.each(scores.sort(function(a, b){return b[0] - a[0];}), function(){
                jQuery(rows[ this[1] ]).show();
            });
        }
    }

};


var WebFontConfig = { fontdeck: { id: '25967' } };

(function () {
    var wf = document.createElement('script'),
        s = document.getElementsByTagName('script')[0];
    wf.src = ('https:' === document.location.protocol ? 'https' : 'http') +
        '://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js';
    wf.type = 'text/javascript';
    wf.async = 'true';
    s.parentNode.insertBefore(wf, s);
})();

/**
    Randomly assigns a delay to all article panel elements for the home and then renders the
        animation by adding the new class. Uses a custom randomizer function shuffleElements() to
        randomly queue elements in the transition
    @param none
    @return none
*/
function init_articlePanel() {
    if (!Modernizr.cssanimations) {
        $("ul#article-panel li").show();
    } else {
        $("ul#article-panel li").shuffleElements().each(function (i) {
            $(this).attr("style", "-webkit-animation-delay:" + i * 300 + "ms;"
                    + "-moz-animation-delay:" + i * 300 + "ms;"
                    + "-o-animation-delay:" + i * 300 + "ms;"
                    + "animation-delay:" + i * 300 + "ms;");
            if (i === $("ul[data-liffect] li").size() - 1) {
                $("ul[data-liffect]").addClass("play");
            }
        });

        $('ul#article-panel').attr('data-liffect', 'slideRight');
        $("ul#article-panel").addClass("play");
    }
}

/**
    Initializes the click and styling interaction with the search box in the page header
    @param none
    @return none
*/
function init_searchBox() {
    var searchBox = $('#search-bar input[name=q]'),
        searchBoxDefault = searchBox.attr('data-default'),
        searchButton = $('#search-bar input[type=submit]');

    // Disable the search button by default
    searchButton.attr('disabled', 'disabled');

    // Initialize with default value and styling
    searchBox.val(searchBoxDefault);
    searchBox.addClass('default');

    // When there is focus on the input box, add CSS class. Remove when out of focus
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

    // When user takes away focus, and leaves input empty, replace with original default text and
    // remove CSS class
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
}

/**
    Initializes the article/chapter <select> element with on change redirect behavior
    @param none
    @return none
*/
function init_selectRedirector() {
    $("#chapter-select, .revision-selector").change(function () {
        // Capture slug of article to visit from option attribute
        var url = $("option:selected", this).attr('data-url');

        if (url !== undefined) {
            // Emulate a href click behavior by leading browser to slug page
            window.location.href = url;
        }
    });
}

/**
    Renders the animation on the difficulty thermometer on each article on page load
    @param none
    @return none
*/
function renderThermometer() {
    // For every instance of the thermometer
    // HACK: This is done as a class and not as ID because the new added class with transition state
    //     change needs to take precedence over previous styling. IDs don't work as they command
    //     precedence in all cases
    $('.thermometer-difficulty').each(function () {
        // Capture its difficulty level, deduct from 100, and turn into % and apply it to the
        //     width of the rendered meter
        $(this).parent('.thermometer-difficulty-wrapper').css('width', (100 - $(this).attr('data-level')) + "%");
        // Render the animation by applying the transition class
        $(this).addClass("renderDifficulty");
    });
}

function init_categoryArticles() {
    if (!Modernizr.cssanimations) {
        $("ul#article-panel li").show();
    } else {
        $("ul.category-article-panel li").each(function (i) {
            var interval = Math.ceil((i + 1) / 5);
            $(this).attr("style", "-webkit-animation-delay:" + interval * 300 + "ms;"
                    + "-moz-animation-delay:" + interval * 300 + "ms;"
                    + "-o-animation-delay:" + interval * 300 + "ms;"
                    + "animation-delay:" + interval * 300 + "ms;");
            if (interval === $("ul.category-article-panel li").size() - 1) {
                $("ul.category-article-panel").addClass("play");
            }
        });

        $('ul.category-article-panel').attr('data-liffect', 'slideUp');
        $("ul.category-article-panel").addClass("play");
    }
}

function init_showMore() {
    // Accept a paragraph and return a formatted paragraph with additional html tags
    function formatWords(sentence, show) {

        // split all the words and store it in an array
        var words = sentence.split(' '),
            new_sentence = '',
            i;

        // loop through each word
        for (i = 0; i < words.length; i++) {
            // process words that will visible to viewer
            if (i <= show) {
                new_sentence += words[i] + ' ';
                // process the rest of the words
            } else {
                // add a span at start
                if (i === (show + 1)) { new_sentence += '<span class="more_text hide">'; }
                new_sentence += words[i] + ' ';
                // close the span tag and add read more link in the very end
                if (words[i + 1] === null) { new_sentence += '</span><a href="#" class="more_link"> Show more...</a>'; }
            }
        }

        return new_sentence;
    }

    // Grab all the excerpt class
    $('.summary-text').add('[class^="showmore"]').each(function () {

        var words = 80;

        if ($(this).hasClass('showmore-20')) { words = 20;
            } else if ($(this).hasClass('showmore-40')) { words = 40;
            } else if ($(this).hasClass('showmore-60')) { words = 60;
            } else if ($(this).hasClass('showmore-80')) { words = 80;
            } else if ($(this).hasClass('showmore-100')) { words = 100;
            }

        // Run formatWord function and specify the length of words display to viewer
        if ($.browser.msie) {
            $(this).html(formatWords($(this).html(), words));
        } else { $(this).html(formatWords($(this).html(), words + 5)); }

        // Hide the extra words
        $(this).children('span').hide();

        // Apply click event to read more link
    }).click(function () {
        // Grab the hidden span and anchor
        var more_text = $(this).children('span.more_text'),
            more_link = $(this).children('a.more_link');

        // Toggle visibility using hasClass
        // I know you can use is(':visible') but it doesn't work in IE8 somehow.

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
}

function setUpMenuPositioning(menu, offsetSelector, center) {
    var centerMenu = center || false,

        // Returns the position if the button is present, and undefined if not
        loginPosition = $(offsetSelector).position();
    if (loginPosition) {
        $(menu).css('top', loginPosition.top + $(offsetSelector).outerHeight(true));
        if (centerMenu) {
            $(menu).css('left', loginPosition.left -
                ($(menu).outerWidth() - $(offsetSelector).outerWidth(true)));
        } else {
            $(menu).css('left', loginPosition.left);
        }
    }
}

function resize_article_images() {
    // HACK: Because Webkit browsers do not compute image width until it is loaded, this hack
    //     may be used to make an in-memory copy of the image to compute the dimensions
    $('#article img').each(function () {
        var image = $(this);
        $("<img/>").attr("src", $(this).attr('src')).load(function () {
            var imgCaption = $('<div/>'),
                imgCaptionWrapper = $('<div/>'),
                imgWrapper = $('<div/>'),
                imgSrc = image.attr('src'),
                lastIndexOfSlash = imgSrc.lastIndexOf('/'),
                lastIndexOfPeriod = imgSrc.lastIndexOf('.'),
                imgNum = imgSrc.substring(lastIndexOfSlash + 1, lastIndexOfPeriod),
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

}

function init_imageHoverDescriptions() {
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
}

function init_jobs() {
    $('.jobs-image-rotator').animate({
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
}

function init_inviteSignup() {
    $('form.signup').submit(function () {
        var form = $(this),
            formIDWHash = '#' + form.attr('id');
        $('.form-spinner', form).show();

        // Clear previous error/success signals
        $(formIDWHash + '-error').slideUp('fast');
        $('.form-error', form).removeClass('form-error-show');

        $.ajax({
            data: $(this).serialize(),
            type: 'POST',
            url: $(this).attr('action'),
            success: function (response) {
                // Hide the spinner
                $('.form-spinner', form).hide();

                // Capture the responses from the JSON objects returned
                var status = response.status,
                    message = response.message,
                    field_error = false;

                // Webkit and FF interpret the 'false' JSON response differently
                if (status === false || status === 'false') {
                    ['name', 'organization', 'email'].forEach(function (element, index, array) {
                        if (message[element]) {
                            var error = $('.' + element + '-error', form);
                            // TODO: Add support for viewing multiple message errors
                            error.html(message[element][0]);
                            error.addClass("form-error-show");
                            $('#id_' + element, form).addClass("form-input-error");
                            field_error = true;
                        }
                    });
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
}

function init_registrationForm() {
    $('#agree-terms-conditions').change(function () {
        $('#signup-button').toggleClass('disabled');
        var element = document.getElementById('signup-button');
        element.disabled = !element.disabled;
    });

    if ($('form#signup-form input[name=social_login]').length > 0) {
        // If upon document.load, social login is set to true, instantly hide .social-login fields 
        if ($('form#signup-form input[name=social_login]').attr('value').toLowerCase() === "true") {
            $('.social-login-hide').hide();

            // Hide the content block with the Google+ sign in button
            $('aside.content-block.google-signin').hide();

            // Hide the description box
            $('#new-account-signup-info').hide();
        }
    }
}

function emailShare(emailAddress, message, from_name, fromAddress) {
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
}

jQuery(document).ready(function ($) {
    // Set up flashing (liffect) article panel
    init_articlePanel();

    // Set up search box effect
    init_searchBox();

    /** Article specific initializers and other functions */

    // Initialize chapter dropdown change behavior
    init_selectRedirector();

    // Render animation of difficulty level "thermometer"
    renderThermometer();

    $("input[name=live-filter]").liveUpdate('.category-article-panel').focus();

    init_categoryArticles();

    init_showMore();

    // Resize images assuming their original scale is 150%
    resize_article_images();

    // Setup image hover description panels
    init_imageHoverDescriptions();

    $('#philosophy-button').click(function () {
        $('html, body').animate({
            scrollTop: $("#our-philosophy").offset().top
        }, 1000);
    });

    // Instantiate jobs page carousel
    init_jobs();

    // Instantiate AJAX submit handler for invite sign-ups
    init_inviteSignup();

    init_registrationForm();

    // Figure out positionining of absolute on hover menus
    setUpMenuPositioning('nav#user-menu', '#user-dropdown');

    // Re-initialize the menu positioning every single time the window is resized
    $(window).resize(function () {
        setUpMenuPositioning('nav#user-menu', '#user-dropdown');
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
    setUpMenuPositioning('nav#share-menu', 'li.share-action');

    $('li.share-action, nav#share-menu').mouseenter(function () {
        //$('#user-buttons > ul > li a .horizontal-caret').addClass('horizontal-caret-hover');
        //$('#user-buttons > ul > li a').addClass('hover');
        $('#share-menu').addClass('showMenu');
    }).mouseleave(function () {
        //$('#user-buttons > ul > li a .horizontal-caret').removeClass('horizontal-caret-hover');
        //$('#user-buttons > ul > li a').removeClass('hover');
        $('#share-menu').removeClass('showMenu');
    });

    $('#submission-info').animate({
        top: "0px"
    }, 1000);

    $('.edit-dropdown').click(function () {
        $(this).toggleClass('edit-dropdown-opened');
        $(this).parent().children('.edit-dropped').toggleClass('show-dropped');
    });

    $('#share-on-email').click(function () {
        $("#email-share-dialog").dialog({
            modal: true,
            open: false,
            width: 560,
            buttons: {
                Send: function () {
                    emailShare(
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

    // Instantiate tipsy for anchors on projects invite page
    $('.anchor-image').tipsy({gravity: 'n'});

    function scrollBind(target, to) {
        $(target).click(function () {
            $('html, body').animate({
                scrollTop: $(to).offset().top
            }, 1000);
        });
    }

    // Bind 'Sign up' button click to the form
    scrollBind('#projects-signup-anchor', '#projects-footer');

    // Bind anchor buttons to relevant block sections
    scrollBind('#anchor-upload', '#create-share');
    scrollBind('#anchor-organize', '#organize-content');
    scrollBind('#anchor-search', '#discover-content');
    scrollBind('#anchor-social', '#social-content');

    // Animate background of top block on page load
    $('#chief-panel-container.projects-launch').addClass('play');
    $('#chief-panel-container #project-computer').addClass('play');
    $('#chief-panel-container #project-mobile').addClass('play');
    $('#chief-panel-container #project-tablet').addClass('play');

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
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
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
        return (url === origin || url.slice(0, origin.length + 1) === origin + '/') ||
            (url === sr_origin || url.slice(0, sr_origin.length + 1) === sr_origin + '/') ||
            // or any other URL that isn't scheme relative or absolute i.e relative.
            !(/^(\/\/|http:|https:).*/.test(url));
    }
    function safeMethod(method) {
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }

    if (!safeMethod(settings.type) && sameOrigin(settings.url)) {
        xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
    }
});

// Function to initialize the Google+ login button
(function () {
    var po = document.createElement('script'),
        s = document.getElementsByTagName('script')[0];
    po.type = 'text/javascript';
    po.async = true;
    po.src = 'https://plus.google.com/js/client:plusone.js?onload=start';
    s.parentNode.insertBefore(po, s);
})();

/*jslint nomen: true */
function expediteGLogin(profile) {
    // Fill editable inputs
    $('input[name=first_name]').attr('value', profile.name.givenName);
    $('input[name=last_name]').attr('value', profile.name.familyName);

    var place = _.where(profile.placesLived, {primary : true})[0];
    $('input[name=location]').attr('value', place.value);

    // Hide fields that do not need to be filled
    $('.social-login-hide').slideUp('slow');

    // Set the hidden field value for profile picture with the URL from gapi
    $("input[name=profile_pic]").attr('value', profile.image.url);

    // Set a new hidden form item to communicate to the server that no reCaptcha
    //    verification is required
    $('form#signup-form input[name=social_login]').attr('value', 'true');
}
/*jslint nomen: false */

function signInCallback(authResult) {
    if (authResult.code) {
        authResult.state = $('#session-state').attr('data-state');

        gapi.client.load('plus', 'v1', function () {
            var request = gapi.client.plus.people.get({'userId' : 'me'});

            request.execute(function (profile) {
                var authObject = {code : authResult.code, state : authResult.state, gplus_id : profile.id};

                // Send the code to the server
                $.ajax({
                    type: 'POST',
                    url: '/gauth/',
                    dataType: 'json',
                    contentType: 'application/octet-stream; charset=utf-8',
                    success: function (result) {
                        // Handle or verify the server response if necessary.

                        // Eliminate fields that aren't required as a part of social login and
                        //     populate hidden fields with necessary values
                        expediteGLogin(profile);

                        // Set user message conveyed success with Google+ login
                        $('#results').html(
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
}
