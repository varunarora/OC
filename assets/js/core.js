jQuery.fn.shuffleElements = function () {
    var o = $(this);
    for (var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
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

jQuery(document).ready(function($) {
	//Set up flashing (liffect) article panel
	init_articlePanel();
	
	// Set up search box effect
	init_searchBox();
	
	$("#chapter-select").change(function(){
		// Capture slug of article to visit from option attribute
		var slug = $("option:selected", this).attr('data-slug');
		
		// Emulate a href click behavior by leading browser to slug page
		window.location.href = "http://" + location.host + "/articles/english/" + slug;
	});

	$('.thermometer-difficulty').each(function(){
		$(this).parent('.thermometer-difficulty-wrapper').css('width', (100 - $(this).attr('data-level')) + "%");
		$(this).addClass("renderDifficulty");
	});
});

/**

*/
function init_articlePanel(){
	var play = 0;
	$("ul#article-panel li").shuffleElements().each(function (i) {
        $(this).attr("style", "-webkit-animation-delay:" + i * 300 + "ms;"
                + "-moz-animation-delay:" + i * 300 + "ms;"
                + "-o-animation-delay:" + i * 300 + "ms;"
                + "animation-delay:" + i * 300 + "ms;");
        if (i == $("ul[data-liffect] li").size() -1) {
            $("ul[data-liffect]").addClass("play")
        }
    });
    
    $('ul#article-panel').attr('data-liffect', 'slideRight');
    $("ul#article-panel").addClass("play");
}

/**
	Initializes the click and styling interaction with the search box in the page header
	@param none
	@return none
*/
function init_searchBox(){
    var searchBox = $('#search-bar input[name=search-input]');
    var searchBoxDefault = searchBox.attr('data-default');
    
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
    	if (searchBox.val() == searchBoxDefault) searchBox.val('');
    	searchBox.removeClass('default');
	   	searchBox.removeClass('empty');
    	searchBox.addClass('typing');
    });
    
    // When user takes away focus, and leaves input empty, replace with original default text and
    // remove CSS class
    searchBox.blur(function(){
    	if (searchBox.val() == '') searchBox.val(searchBoxDefault);
    	searchBox.removeClass('typing');
    	searchBox.removeClass('empty');
		if (searchBox.val() == searchBoxDefault) searchBox.addClass('default');
    });   
}
