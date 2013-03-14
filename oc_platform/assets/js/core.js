jQuery.fn.shuffleElements = function () {
    var o = $(this);
    for (var j, x, i = o.length; i; j = parseInt(
    	Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};

jQuery.fn.selectRange = function(start, end) {
    return this.each(function() {
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
jQuery.fn.liveUpdate = function(list){
	list = jQuery(list);
	
	if ( list.length ) {
		var rows = list.children('li'),
			cache = rows.map(function(){
				return this.innerHTML.toLowerCase();
			});
		this
			.keyup(filter).keyup()
			.parents('form').submit(function(){
				return false;
			});
	}
		
	return this;
		
	function filter(){
		var term = jQuery.trim( jQuery(this).val().toLowerCase() ), scores = [];
		
		if ( !term ) {
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


WebFontConfig = { fontdeck: { id: '25967' } };

(function() {
	 var wf = document.createElement('script');
	 wf.src = ('https:' == document.location.protocol ? 'https' : 'http') + 
	 	'://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js';
	 wf.type = 'text/javascript';
	 wf.async = 'true';
	 var s = document.getElementsByTagName('script')[0];
	 s.parentNode.insertBefore(wf, s);
})();


jQuery(document).ready(function($) {
	// Set up flashing (liffect) article panel
	init_articlePanel();
	
	// Set up search box effect
	init_searchBox();
	
	/** Article specific initializers and other functions */
	
	// Initialize chapter dropdown change behavior
	init_articleSelector();

	// Render animation of difficulty level "thermometer"
	renderThermometer();

	$("input[name=live-filter]").liveUpdate('.category-article-panel').focus();
	
	init_categoryArticles();
	
	init_showMore();
	
	
	$('#article img').each(function(){
		var imgCaption = $('<div/>');
		imgCaption.addClass('img-caption');
		
		var imgCaptionWrapper = $('<div/>');
		imgCaptionWrapper.addClass('img-caption-wrapper');

		var imgWrapper = $('<div/>');
		imgWrapper.addClass('img-wrapper');
		
		imgCaption.appendTo(imgCaptionWrapper);
		
		var imgSrc = $(this).attr('src');
		
		var lastIndexOfSlash = imgSrc.lastIndexOf('/');
		var lastIndexOfPeriod = imgSrc.lastIndexOf('.');
		
		var imgNum = $(this).attr('src').substring(lastIndexOfSlash+1, lastIndexOfPeriod);
		
		imgCaption.text("Figure " + imgNum);
		
		imgWrapper.insertAfter($(this));
		
		var currentWidth = $(this).css('width')
		$(this).css('width', currentWidth.substring(0, currentWidth.indexOf('px'))*0.5);

		$(this).appendTo(imgWrapper);
		imgCaptionWrapper.appendTo(imgWrapper);
		
	});
	
	
	
	$('.pillar').mouseover(function(){
		var showPillarDescription = function(targetBlock){
			$(targetBlock).fadeIn('fast');
		}
		
		if ($(this).hasClass('pillar-community')){
			showPillarDescription('#pillars-community-description');
		}
		else if ($(this).hasClass('pillar-innovation')){
			showPillarDescription('#pillars-innovation-description');
		}
		else if ($(this).hasClass('pillar-freedom')){
			showPillarDescription('#pillars-freedom-description');
		}
	});
	
	$('.pillar').mouseleave(function(){
		var hidePillarDescription = function(targetBlock){
			$(targetBlock).fadeOut('fast');
		}
		
		if ($(this).hasClass('pillar-community')){
			hidePillarDescription('#pillars-community-description');
		}
		else if ($(this).hasClass('pillar-innovation')){
			hidePillarDescription('#pillars-innovation-description');
		}
		else if ($(this).hasClass('pillar-freedom')){
			hidePillarDescription('#pillars-freedom-description');
		}
	});
	
	$('.license').mouseover(function(){
		var showLicenseDescription = function(targetBlock){
			$(targetBlock).fadeIn('fast');
		}
		
		if ($(this).hasClass('license-cc')){
			showLicenseDescription('#license-cc-description');
		}
		else if ($(this).hasClass('license-by')){
			showLicenseDescription('#license-by-description');
		}
		else if ($(this).hasClass('license-sa')){
			showLicenseDescription('#license-sa-description');
		}
	});
	
	$('.license').mouseleave(function(){
		var hideLicenseDescription = function(targetBlock){
			$(targetBlock).fadeOut('fast');
		}
		
		if ($(this).hasClass('license-cc')){
			hideLicenseDescription('#license-cc-description');
		}
		else if ($(this).hasClass('license-by')){
			hideLicenseDescription('#license-by-description');
		}
		else if ($(this).hasClass('license-sa')){
			hideLicenseDescription('#license-sa-description');
		}
	});
	
	
	$('#philosophy-button').click(function(){
		$('html, body').animate({
			scrollTop: $("#our-philosophy").offset().top
		}, 1000);
	});


	$('.jobs-image-rotator').animate({
		left: "-1950px"
	}, 200000);

	
	/*
	position = 0;

	var init = setInterval(function(){
		
		position -= 1;

		$('.jobs-image-rotator').css("left", position + "px");
		
	}, 200);
	*/
	
	$('#general-invite').submit(function() {
	
		var form = $(this);
		$('.form-spinner').show();
		$('#general-invite-error').slideUp('fast');
		$('#general-invite-success').slideUp('fast');
		
		$.ajax({
			data: $(this).serialize(),
			type: 'POST',
			url: $(this).attr('action'),
			success: function(response) {
				// Hide the spinner
				$('.form-spinner').hide();
				
				// Capture the responses from the JSON objects returned
				status = response['status'];
				message = response['message'];
				
				if (!status){
					$('#general-invite-error').html(message);
					$('#general-invite-error').slideDown('fast');
				}
				else {
					form.fadeOut('fast', function(){
						successImage = '<div class="success-check"></div>'
						$('#general-invite-success').html(successImage + message);
						$('#general-invite-success').slideDown('fast');
					});
				}
			}
		});
		
		return false;
	});
	
});

function init_showMore(){
	// Grab all the excerpt class
	$('.summary-text').add('[class^="showmore"]').each(function () {
	s
		var words = 80;
		
		if ($(this).hasClass('showmore-20')) words = 20;
		else if ($(this).hasClass('showmore-40')) words = 40;
		else if ($(this).hasClass('showmore-60')) words = 60;
		else if ($(this).hasClass('showmore-80')) words = 80;
		else if ($(this).hasClass('showmore-100')) words = 100;
		
		// Run formatWord function and specify the length of words display to viewer
		if ( $.browser.msie ){
			$(this).html(formatWords($(this).html(), words));
		}
		else $(this).html(formatWords($(this).html(), words+5));
			
		// Hide the extra words
		$(this).children('span').hide();
	
		// Apply click event to read more link
		}).click(function () {
			
			// Grab the hidden span and anchor
			var more_text = $(this).children('span.more_text');
			var more_link = $(this).children('a.more_link');
			
			// Toggle visibility using hasClass
			// I know you can use is(':visible') but it doesn't work in IE8 somehow.
			
			if (more_text.hasClass('hide')) {
				if ($(this).hasClass('summary-text')) more_text.show();
				else more_text.slideDown('slow');
	
				more_link.html(' &#171; hide');
				more_text.removeClass('hide');
			} else {
			
				if ($(this).hasClass('summary-text')) more_text.hide();
				else more_text.slideUp('slow');
	
				more_link.html(' Show more...');
				more_text.addClass('hide');
			}
		
			return false;
		});
	
	// Accept a paragraph and return a formatted paragraph with additional html tags
	function formatWords(sentence, show) {
		
		// split all the words and store it in an array
		var words = sentence.split(' ');
		var new_sentence = '';
		
		// loop through each word
		for (i = 0; i < words.length; i++) {
		
			// process words that will visible to viewer
			if (i <= show) {
				new_sentence += words[i] + ' ';
				// process the rest of the words
			} else {
				// add a span at start
				if (i == (show + 1)) new_sentence += '<span class="more_text hide">';
				new_sentence += words[i] + ' ';
				// close the span tag and add read more link in the very end
				if (words[i+1] == null) new_sentence += '</span><a href="#" class="more_link"> Show more...</a>';
			}
		}
	
		return new_sentence;
	}
}

/**
	Randomly assigns a delay to all article panel elements for the home and then renders the
	    animation by adding the new class. Uses a custom randomizer function shuffleElements() to
	    randomly queue elements in the transition
	@param none
	@return none
*/
function init_articlePanel(){
	$("ul#article-panel li").shuffleElements().each(function (i) {
        $(this).attr("style", "-webkit-animation-delay:" + i * 300 + "ms;"
                + "-moz-animation-delay:" + i * 300 + "ms;"
                + "-o-animation-delay:" + i * 300 + "ms;"
                + "animation-delay:" + i * 300 + "ms;");
        if (i == $("ul[data-liffect] li").size() -1) {
            $("ul[data-liffect]").addClass("play");
        }
    });
    
    $('ul#article-panel').attr('data-liffect', 'slideRight');
    $("ul#article-panel").addClass("play");
}

function init_categoryArticles(){

	$("ul.category-article-panel li").each(function (i) {
        var interval = Math.ceil((i+1)/5);
        $(this).attr("style", "-webkit-animation-delay:" + interval * 300 + "ms;"
                + "-moz-animation-delay:" + interval * 300 + "ms;"
                + "-o-animation-delay:" + interval * 300 + "ms;"
                + "animation-delay:" + interval * 300 + "ms;");
        if (interval == $("ul.category-article-panel li").size() -1) {
            $("ul.category-article-panel").addClass("play");
        }
    });
    
    $('ul.category-article-panel').attr('data-liffect', 'slideUp');
    $("ul.category-article-panel").addClass("play");

}

/**
	Initializes the click and styling interaction with the search box in the page header
	@param none
	@return none
*/
function init_searchBox(){
    var searchBox = $('#search-bar input[name=q]');
    var searchBoxDefault = searchBox.attr('data-default');
    var searchButton = $('#search-bar input[type=submit]');
    
    // Disable the search button by default
    searchButton.attr('disabled', 'disabled');
    
    // Initialize with default value and styling
    searchBox.val(searchBoxDefault);
    searchBox.addClass('default');
    
    // When there is focus on the input box, add CSS class. Remove when out of focus
    searchBox.focus(function(){
    	if (searchBox.val() != searchBoxDefault) {
    		searchBox.removeClass('default');
    		searchBox.addClass('typing');
    	}
    	else {
    		searchBox.removeClass('typing');
    		searchBox.addClass('empty');
    		// Move cursor to initial position
    		setTimeout(function() {
    				searchBox.selectRange(0,0);
    		}, 200);
    	}
    });
    
    // When user begins typing, clear the default value and add CSS class
    searchBox.keydown(function(){
    	if (searchBox.val() == searchBoxDefault) {
    		searchBox.val('');
    		searchButton.attr('disabled', 'disabled');
    	} else { searchButton.removeAttr('disabled'); }
    	searchBox.removeClass('default');
	   	searchBox.removeClass('empty');
    	searchBox.addClass('typing');
    });
    
    // When user takes away focus, and leaves input empty, replace with original default text and
    // remove CSS class
    searchBox.blur(function(){
    	if (searchBox.val() == '') {
    		searchBox.val(searchBoxDefault);
    		searchButton.attr('disabled', 'disabled');
    	}
    	searchBox.removeClass('typing');
    	searchBox.removeClass('empty');
		if (searchBox.val() == searchBoxDefault) searchBox.addClass('default');
    });   
}

/**
	Initializes the article/chapter <select> element with on change redirect behavior
	@param none
	@return none
*/
function init_articleSelector(){
	$("#chapter-select").change(function(){
		// Capture slug of article to visit from option attribute
		var url = $("option:selected", this).attr('data-url');
		
		// Emulate a href click behavior by leading browser to slug page
		window.location.href = url;
	});
}

/**
	Renders the animation on the difficulty thermometer on each article on page load
	@param none
	@return none
*/
function renderThermometer(){
	// For every instance of the thermometer
	// HACK: This is done as a class and not as ID because the new added class with transition state
	//     change needs to take precedence over previous styling. IDs don't work as they command
	//     precedence in all cases
	$('.thermometer-difficulty').each(function(){
		// Capture its difficulty level, deduct from 100, and turn into % and apply it to the
		//     width of the rendered meter
		$(this).parent('.thermometer-difficulty-wrapper').css('width', (100 - $(this).attr('data-level')) + "%");
		// Render the animation by applying the transition class
		$(this).addClass("renderDifficulty");
	});
}
