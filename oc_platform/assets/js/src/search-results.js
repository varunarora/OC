define(['jquery', 'underscore', 'core', 'mathjax', 'resources', 'slider'], function($, _){
    /**
        Initializes the Views for the Backbone collection of search results on the page
        @param none
        @return none
    */

    /**
        Helper function to repopulateSearchResults() that returns whether or not the an integer falls in
            the "range" of two other integers representing a range.
        @param filterRange:Integer[2] Representing the range
        @param currentDifficulty:Integer Representing the ambiguous value whose position in range unknown
        @return Boolean Whether or not currentDifficulty falls in filterRange
    */
    function _fallsInRange(filterRange, currentDifficulty) {
        return (filterRange[1] >= currentDifficulty) && (filterRange[0] <= currentDifficulty);
    }

    /**
        Core function that builds the univeral filters object as search filters are modified. As a
            result of building the filters object, repopulates the search results on the page using a
            new collection of search result objects that meet the criteria of the filters
            TODO: Return collection rather than generating view to maintain separation of concerns
        @param target:Object The target of the user interaction representing the view of the filter
        @param resultCollectionView:Backbone.View View of the search results
        @return none
    */
    function repopulateSearchResults(target, resultCollectionView) {
        /* Filter from current results */
        // Get target filter type and value
        var targetFilterType = $(target).attr("name"),
            targetFilterValue = $(target).attr("value"),

        // Add or remove the value of filter from the filters object based on target modified
            targetType = $(target).attr("type");

        if (typeof targetType !== "undefined" && $(target).attr("type") === "checkbox") {
            if (!target.checked) {
                filters[targetFilterType].push(targetFilterValue);
            } else {
                filters[targetFilterType].splice(
                    _.indexOf(filters[targetFilterType], targetFilterValue), 1);
            }
        } else { // In the case that the target is the difficulty slider
            // Set the filter difficulty level to the values from the slider
            filters.difficulty = target.values; // target here is the UI object
        }

        // From the current result collection, remove all the results that do not meet the filters set.
        //     _.some() returns true on each result only if any filter causes the search result to be
        //     no longer relevant.
        //     TODO: resultSet, the global, should be not referenced this way. Should either be passed
        //     into the function, or gotten reference to using a setter
        var collectionToRender = new ResultsSet(OC.resources.resultSet.reject(function (result) {
            return _.some(filters, function(filterValues, filterType){
                if (filterType == "difficulty") {
                    return !_fallsInRange(filterValues, result.get(filterType));
                } else {
                    return _.indexOf(filterValues, result.get(filterType)) !== -1;
                }
            });
        }));

        // Recreate the view (clears previous view)
        OC.resultCollectionView.render(collectionToRender);
    }

    function init_mvc() {
        // Listen to changes on all options in the filters panel
        var filterCheckboxes = $('.search-filter input:checkbox');

        // Bind change listeners on function that repopulates the search results
        _.each(filterCheckboxes, function (filter) {
            $(filter).change(function () {
                repopulateSearchResults(this, OC.resultCollectionView);
            });
        });
    }

    $(document).ready(function ($) {
        // Initialize the search filter menus.
        initSearchFilterMenus();

        // Initiatilize the search filter slider
        init_slider();

        // Initiatialize the Backbone models/collection/view
        init_mvc();
    });

    /**
        Initializes the jQuery UI slider
        @param none
        @return none
    */
    function init_slider(){
        $("#difficulty-slider-range").slider({
            range: true,
            min: 0,
            max: 100,
            values: [0,100], // Always set slider to full range
            slide: function(event, ui){
                // Fade out the regions on the slider that do not belong to the selected range
                _refadeSliderRegions();
            },
            stop: function(event, ui){
                // Fade out the regions on the slider that do not belong to the selected range
                _refadeSliderRegions();

                // Repopulate search results based on difficulty level filter
                repopulateSearchResults(ui, OC.resultCollectionView);
            }
        });

        // Insert faded region containers before the left slider and after the right slider. These are
        //    brought to their faded stated using _refadeSliderRegions()
        $("<div/>", {
                id: "slider-prefade"
            }).insertBefore(".ui-slider-range");
        $("<div/>", {
                id: "slider-postfade"
            }).insertAfter(".ui-slider-range");
    }

    function initSearchFilterMenus(){
        // Find all menus and assign their 'top' and 'left' properties based on their buttons.
        var filterMenus = $('.search-filter-menu');

        var i, filterMenu, parentFilter, filterTitle;
        for (i = 0; i < filterMenus.length; i++){
            filterMenu = $(filterMenus[i]);
            parentFilter = filterMenu.parent('.search-filter');
            filterTitle = $('.search-filter-title', parentFilter);

            filterMenu.css({
                top: filterTitle.position().top + filterTitle.outerHeight(true) + 8,
                left: filterTitle.position().left
            });
        }

        $('.search-filter-title').click(function(event){
            var filterButton = $(this),
                filter = filterButton.parent(
                    '.search-filter');

            // Close all other menus.
            $('.search-filter').not(filter).removeClass('menu-open');

            filter.toggleClass('menu-open');

            event.stopPropagation();
            event.preventDefault();
            return false;
        });
    }

    /**
        Helper function called in the event that the slider positions change so as to change the faded
            region indicating out of bounds.
        @param none
        @return none
    */
    function _refadeSliderRegions(){
        $('#slider-prefade').css('width', $( "#difficulty-slider-range" ).slider("values", 0) + "%");
        $('#slider-postfade').css('width', (100 - $( "#difficulty-slider-range" ).slider("values", 1)) + "%");
    }

    // The word "filters" is used in the traditional sense here, and not as described in the spec of
        // _.js. Here, the filter is used to eliminate results that don't pass the truth test, as
        // opposed to creating a white list, as in the case of _.js
    var filters = {
        type: [], // Type of the content
        cost: [],
        license: [],
        difficulty: [0,100] // Difficulty range filter, using the slider
    };
});