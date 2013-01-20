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
});

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
