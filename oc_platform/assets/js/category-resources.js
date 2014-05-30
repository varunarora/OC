OC.categoryResources = {
    currentCategoryID: null,
    lastInputTimestamp: null,
    searchFilterTimeout: null,
    filterAsyncSearchOn: true,

    initBrowseView: function(){
        // Set the height of the page.
        function setBrowseHeight(){
            $('.resource-browse').height(
                $(window).height() - $('header').height()
            );
        }

        setBrowseHeight();
        $(window).resize(setBrowseHeight);

        var scrollbarWidth = getScrollbarWidth();

        /*
        // Set the width of the left panel.
        var leftPanelWidth = ($(window).width() - 960)/2 + 367;
        $('.category-panel').width(leftPanelWidth);

        $('.content-panel').width($(window).width() - leftPanelWidth - scrollbarWidth);*/

        // Setup menu positioning (and adjust for scrollbar width) for content type filter.
        OC.setUpMenuPositioning('.sort-by-type-menu', '.sort-by-type');

        // Make the menu on the left nano'ed, conditional on the size of the content.
        $('.category-panel-listing-categories-body').addClass('scroll-content');

        $('.category-panel-listing-categories').height(
            $('.resource-browse').height() - 200
        );
        $('.category-panel-listing-categories').nanoScroller({
            paneClass: 'scroll-pane',
            sliderClass: 'scroll-slider',
            contentClass: 'scroll-content',
            flash: true
        });

        // Clear the filter search box.
        $('.content-panel-body-listing-filters-search input').val('');

        // Set number of teachers waiting online.
        $('.no-request-found-teacher-count').text(String(_.random(6, 14)));
    },

    initInfiniteScroll: function(){
        if (OC.categoryResources.currentCategoryID){
            var loadButton = $('.lazy-load-button'),
                categoryID, i, resource;
            $('.content-panel').on('DOMContentLoaded load resize scroll', function(event){
                categoryID = $('.content-panel-body').attr('id').substring(9);

                // If the load button is attached to the document.
                if ($.contains(document, loadButton[0]) && loadButton.hasClass('enabled')){
                    if (isElementInViewport(loadButton) && !loadButton.hasClass('loading')){
                        loadButton.addClass('loading');

                        $.get('/resources/api/load-browse-resources/' + categoryID +
                                '/from/' + OC.categoryResources.currentCategoryID + '/',
                            function(response){
                                if (response.status === 'true'){
                                    var keys = Object.keys(response.resources);

                                    if (response.current_category_id){
                                        for (i = 0; i < keys.length; i++){
                                            resource = response.resources[keys[i]];
                                            resourceModel = new Resource(resource);

                                            resourceCollectionView.collection.add(
                                                resourceModel);
                                        }
                                        OC.categoryResources.currentCategoryID = response.current_category_id;

                                    } else {
                                        loadButton.remove();
                                    }
                                }
                                else {
                                    OC.popup(response.message, response.title);
                                }
                                loadButton.removeClass('loading');

                            },
                        'json');
                    }
                }
            });
        }
    }
};

// Initialize Category resources Model
var Resource = Backbone.Model.extend({
    // ID of the resource.
    id: "",

    // URL of the resource.
    url: "",

    // Title of the resource.
    title: "",

    // User who created the resource.
    user: "",

    // ID of user who created the resource.
    user_id: "",

    // Thumbnail of user who created the resource.
    user_thumbnail: "",

    // Profile URL of user who created the resource.
    user_url: "",

    // The number of favorites the resource has gotten thus far.
    favorites: "",

    // Tags associated with this resource.
    tags: "",

    // Type of content.
    type: "",

    // Thumbnail of content.
    thumbnail: "",

    // Whether or not the resource has been favorited by the logged in user.
    favorited: "",

    // Epoch date when this resource was created.
    created: "",

    // Resource rating.
    stars: "",

    // Number of reviews this resource has gotten.
    review_count: ""
});

// Initialize resource results set Collection
var ResourceSet = Backbone.Collection.extend({
    model: Resource,
    sortByPopularity: function(){
        this.comparator = this.popularityComparator;
        this.sort();
    },
    sortByNewest: function(){
        this.comparator = this.newestComparator;
        this.sort();
    },
    newestComparator: function(resource){
        return -resource.get('created');
    },
    popularityComparator: function(resource){
        return -resource.get('favorites');
    },
});

var Tag = Backbone.Model.extend({ tag: '' });
var TagView = Backbone.View.extend({
    tagName: 'span',
    className: 'content-panel-body-listing-item-contents-label label',
    template: _.template('<%= tag %>'),
    render: function(tag){
        this.$el.html(this.template(this.model.toJSON()));
        return this.el;
    }
});

// Initialize resources view.
var ResourceView = Backbone.View.extend({
    tagName: "a",
    className: "content-panel-body-listing-item",
    attributes: function(){
        return {
            'href': this.model.get('url'),
        };
    },
    template: _.template('<div class="content-panel-body-listing-item-label-fold"></div>' +
        '<div class="content-panel-body-listing-item-label"><%= type %></div>' +
        '<div class="content-panel-body-listing-item-favorites<% if (favorited){ %> favorited<% } %>"><%= favorites %></div>' +
        '<div class="content-panel-body-listing-item-thumbnail"' +
        'style="background-image: url(\'<%= thumbnail %>\')"></div>' +
        '<div class="content-panel-body-listing-item-thumbnail-shadow"></div>' +
        '<a href="<%= user_url %>" class="content-panel-body-listing-item-user-picture" ' +
        'style="background-image: url(\'<%= user_thumbnail %>\')"></a>' +
        '<div class="content-panel-body-listing-item-contents">' +
        '<a href="<%= url %>" class="content-panel-body-listing-item-contents-caption">' +
        '<%= title %></a>' +
        '<div class="content-panel-body-listing-item-contents-meta"><%= views %> views</div>' +
        '<%= tags %><div class="content-panel-body-listing-item-contents-description"><%= description %></div>' +
        '<% if (review_count !== 0) { %><div class="content-panel-body-listing-item-contents-reviews"><%= stars %>' +
        '<div class="content-panel-body-listing-item-contents-review-count">' +
        '(<a class="content-panel-body-listing-item-contents-review-count-value"><%= review_count %></a>)</div>' +
        '</div><% } %></div>'),

    events: {
        // Bind the favorite button.
        'click .content-panel-body-listing-item-favorites': 'favorite',
        'mouseenter .content-panel-body-listing-item-user-picture': 'showUserTip',
        'mouseleave .content-panel-body-listing-item-user-picture': 'hideUserTip'
    },

    initialize: function() {
        // Prepare tag labels.
        var i,
            tags = $('<div/>', {
                'class': 'content-panel-body-listing-item-contents-labels'
            });
        existingTags = this.model.get('tags');
        for (i = 0; i < existingTags.length; i++){
            tags.append(new TagView({
                model: new Tag({tag: existingTags[i]})
            }).render());
        }
        this.$tagsView = tags;


        // Prepare review stars.
        var star, j,
            starsView = $('<div/>', {
                'class': 'content-panel-body-listing-item-contents-reviews-stars'
            });

        var stars = this.model.get('stars');
        var trailingHalf = false;

        if (parseInt(stars / 0.5, 10) % 2 !== 0){
            trailingHalf = true;
        }
        for (j = 0; j < parseInt(stars, 10); j++){
            star = $('<div/>', {
                'class': 'content-panel-body-listing-item-contents-review-star'
            });
            starsView.append(star);
        }

        if (trailingHalf){
            starsView.append($('<div/>', {
                'class': 'content-panel-body-listing-item-contents-review-halfstar'
            }));
        }
        this.$starsView = starsView;

        this.listenTo(this.model, "change", this.render);
    },

    render: function () {
        modelJSON = this.model.toJSON();
        modelJSON['tags'] = String(this.$tagsView[0].outerHTML);
 
        modelJSON['stars'] = String(this.$starsView[0].outerHTML);

        var originalTitleLength = modelJSON['title'].length;
        if (originalTitleLength > 40)
            modelJSON['title'] = modelJSON['title'].substring(0, 40).trim() + '&hellip;';

        var originalDescriptionLength = modelJSON['description'].length;
        if (originalDescriptionLength > 100)
            modelJSON['description'] = modelJSON['description'].substring(0, 100).trim() + '&hellip;';
        else if (originalDescriptionLength === 0)
            modelJSON['description'] = 'No description found.';

        this.$el.html(this.template(modelJSON));
        $('.content-panel-body-listing-items').append(this.$el);

        return this;
    },

    favorite: function(){
        OC.favoriteClickHandler(
            'resource', this.model.get('id'), this.favoriteCallback,
            this.unfavoriteCallback, this.$el.find('.content-panel-body-listing-item-favorites')
        );

        return false;
    },

    favoriteCallback: function(resourceFavoriteButton){
        resourceFavoriteButton.text(parseInt(resourceFavoriteButton.text(), 10) + 1);
        resourceFavoriteButton.addClass('favorited');
    },

    unfavoriteCallback: function(resourceFavoriteButton){
        resourceFavoriteButton.text(parseInt(resourceFavoriteButton.text(), 10) - 1);
        resourceFavoriteButton.removeClass('favorited');
    },

    showUserTip: function(){
        // Find if there is already a tooltip generated for the user.
        var userTooltip = $('.user-tooltips #user-' + this.model.get('user_id'));
        var userPicture = this.$el.find('.content-panel-body-listing-item-user-picture');

        function repositionShowTip(element){
            element.css({
                top: userPicture.offset().top - element.outerHeight(true) - 5,
                left: userPicture.offset().left + (userPicture.width() / 2) - (
                    element.width() / 2)
            });
            element.addClass('show');

            // Undelegate all mouseleave and mouseenter events.
            element.undelegate('mouseleave');
            element.undelegate('mouseenter');

            // Bind mouseleave handler on image and tooltip to hide tooltip.
            element.mouseleave(function(event){
                $(this).removeClass('show');
                $(this).removeClass('hovered');
            });

            element.mouseenter(function(event){
                element.addClass('show');
                element.addClass('hovered');
            });

        }

        // If preexisting tooltip generated, reposition and show.
        if (userTooltip.length !== 0){
            repositionShowTip(userTooltip);
        } else {
            // If not preexisting tooltip, generate, reposition and show.
            tooltipTemplate = _.template('<div class="user-tooltip-wrapper" id="user-<%= id %>">' +
                '<div class="floating-tooltip-spacer"></div>' +
                '<div class="user-tooltip">' +
                '<div class="user-tooltip-thumbnail" style="background-image: url(\'<%= thumbnail %>\');"></div>' +
                '<div class="user-tooltip-description">' +
                '<div class="user-tooltip-description-name"><a href="<%= url %>"><%= name %></a></div>' +
                '<div class="user-tooltip-description-subscribe">' +
                    '<button class="btn dull-button subscribe-button">Subscribe</button>' +
                '</div></div></div></div>');

            var userID = this.model.get('user_id');

            var newTooltip = tooltipTemplate({
                id: userID,
                thumbnail: this.model.get('user_thumbnail'),
                url: this.model.get('user_url'),
                name: this.model.get('user'),
            });
            $('.user-tooltips').append(newTooltip);

            var appendedTooltip = $('.user-tooltips #user-' + userID),
                subscribeButton = $('button.subscribe-button', appendedTooltip);

            // Asynchronously determine if the user has subscribed to the resource creator.
            // TODO(Varun): Needs to happen when the page loads before user hovers.
            if (userID === OC.config.user.id){
                subscribeButton.addClass('hide');
            }

            OC.getSubscriptionState([userID], function(states){
                if (states[parseInt(userID, 10)]){
                    subscribeButton.addClass('subscribed');
                    subscribeButton.text('✔ Subscribed');
                }
            });

            // Bind the subscribe button click on the tooltip.
            subscribeButton.click(function(){
                OC.subscribeTo(userID, $(this));
            });

            repositionShowTip(appendedTooltip);
        }
    },

    hideUserTip: function(){
        var element = $('.user-tooltips .user-tooltip-wrapper.show');

        if (! element.hasClass('hovered')){
            element.removeClass('show');
        }
    }
});

/**
    Core function that builds the univeral filters object as search filters are modified. As a
        result of building the filters object, repopulates the search results on the page using a
        new collection of search result objects that meet the criteria of the filters
        TODO: Return collection rather than generating view to maintain separation of concerns
    @param target:Object The target of the user interaction representing the view of the filter
    @param resourceCollectionView:Backbone.View View of the search results
    @return none
*/
function repopulateResources(target, resourceCollectionView) {
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
    }

    // From the current resource collection, remove all the results that do not meet the filters set.
    //     _.some() returns true on each resource only if any filter causes the resource to be
    //     no longer relevant.
    //     TODO: resourceSet, the global, should be not referenced this way. Should either be passed
    //     into the function, or gotten reference to using a setter
    var collectionToRender = new ResourceSet(resourceSet.reject(function (resource) {
        return _.some(filters, function(filterValues, filterType){
            return _.indexOf(filterValues, resource.get(filterType).toLowerCase()) !== -1;
        });
    }));

    // Recreate the view (clears previous view)
    resourceCollectionView.render(collectionToRender);
}

// Initialize the resource collection view
var ResourceCollectionView = Backbone.View.extend({
    render: function (newCollection) {
        this.clearView();
        this.prepareView();
        var collectionToRender = newCollection || this.collection;
        this.collection = collectionToRender;

        // If no resources found.
        if (collectionToRender.length === 0) {
            this.showNullView();
        } else {
        // Create a new view object for each object in the collection and render it
            _.each(collectionToRender.models, function(item) {
                new ResourceView({model: item}).render();
            });
        }
        this.revealView();
    },

    initialize: function() {
        this.listenTo(this.collection, "add", this.lateRender);
    },

    clearView: function () {
        $('.content-panel-body-listing-items').html('');
    },

    prepareView: function () {
        $('.content-panel-body-listing-items').addClass('spinner-background');
    },

    revealView: function () {
        $('.content-panel-body-listing-items').removeClass('spinner-background');
        $('.content-panel-body-listing-items').css('display', 'none');
        $('.content-panel-body-listing-items').fadeIn("fast");
    },

    showNullView: function () {
        $('.content-panel-body-listing-items').html('<p class="no-results-message">' +
            'Couldn\'t find a thing! Have you tried requesting for something?</p>');

        if (OC.categoryResources.filterAsyncSearchOn){
            // Prevent showing no results message until search completed.
            $('.no-results-message').addClass('hide');
        }
    },

    lateRender: function(model, collection, options) {
        new ResourceView({model: model}).render();
    }
});

function init_mvc() {
    // Listen to changes on all options in the filters panel
    var filterCheckboxes = $('.sort-by-type-menu input:checkbox');

    // Bind change listeners on function that repopulates the resources
    _.each(filterCheckboxes, function (filter) {
        $(filter).change(function () {
            repopulateResources(this, resourceCollectionView);
        });
    });

    // Bind click listeners on main sorting.
    $('.filter-sort-option').click(function(event){
        if ($(event.target).hasClass('filter-sort-option-newest')){
            resourceSet.sortByNewest();
            resourceCollectionView.render();
        } else {
            resourceSet.sortByPopularity();
            resourceCollectionView.render();
        }
    });

    // Bind text input field as filter.
    $('.content-panel-body-listing-filters-search input').keyup(function(event){
        var currentInput = $(this).val(),
            loadButton = $('.lazy-load-button');

        var collectionToRender = new ResourceSet(resourceSet.filter(function (resource) {
            return (
                resource.get('title').toLowerCase().indexOf(currentInput.toLowerCase()) !== -1 ||
                resource.get('description').toLowerCase().indexOf(currentInput.toLowerCase()) !== -1 ||
                _.filter(resource.get('tags'), function(tag){
                    return tag.toLowerCase().indexOf(currentInput.toLowerCase()) !== -1;
                }).length !== 0 ||
                _.filter(resource.get('objectives'), function(objective){
                    return objective.toLowerCase().indexOf(currentInput.toLowerCase()) !== -1;
                }).length !== 0);
        }));

        // Recreate the view (clears previous view)
        resourceCollectionView.render(collectionToRender);
        resourceCollectionView.initialize();

        if (currentInput.length > 0) {
            if (loadButton.length > 0) {
                loadButton.addClass('hide');
                loadButton.removeClass('enabled');
            }

            // If there are categories that haven't been rendered yet.
            if (OC.categoryResources.currentCategoryID){
                var loadingPlaceholder = $('.filter-search-placeholder');
                loadingPlaceholder.addClass('show');

                // Calculate time since last key entered.
                currentTime = new Date().getTime();
                if (OC.categoryResources.lastInputTimestamp){
                    // Calculate delta between the current time and last timestamp.
                    delta = (currentTime - OC.categoryResources.lastInputTimestamp) / 1000;

                    if (delta < 1.5){
                        clearTimeout(OC.categoryResources.searchFilterTimeout);
                        OC.categoryResources.filterAsyncSearchOn = false;
                    }

                    OC.categoryResources.searchFilterTimeout = setTimeout(function(){
                        var i, resource, currentCategoryID,
                            categoryID = $('.content-panel-body').attr('id').substring(9);

                        // Perform search.
                        $.get('/resources/api/search-category/' + categoryID +
                                '/from/' + OC.categoryResources.currentCategoryID + '/query/' +
                                currentInput + '/',
                            function(response){
                                loadingPlaceholder.removeClass('show');
                                OC.categoryResources.filterAsyncSearchOn = false;

                                if (response.status == 'true'){
                                    var keys = Object.keys(response.resources);

                                    // Clear nothing found message, if nothing in original collection.
                                    if (resourceCollectionView.collection.length === 0 && (
                                        keys.length === 0))
                                        resourceCollectionView.showNullView();

                                    else if (resourceCollectionView.collection.length === 0)
                                        resourceCollectionView.clearView();

                                    for (i = 0; i < keys.length; i++){
                                        resource = response.resources[keys[i]];
                                        resourceModel = new Resource(resource);

                                        resourceCollectionView.collection.add(
                                            resourceModel);
                                    }
                                }
                                else {
                                    OC.popup(response.message, response.title);
                                }

                                $('.no-results-message').removeClass('hide');

                            },
                        'json');
                    }, 1500);
                    OC.categoryResources.filterAsyncSearchOn = true;
                }
                OC.categoryResources.lastInputTimestamp = currentTime;
            }
        } else {
            clearTimeout(OC.categoryResources.searchFilterTimeout);
            if (loadButton.length > 0) {
                loadButton.removeClass('hide');
                loadButton.addClass('enabled');
            }
            OC.categoryResources.filterAsyncSearchOn = false;
        }
    });

}

jQuery(document).ready(function($){
    // Construct a collection view using the resources objects built in
    resourceCollectionView = new ResourceCollectionView({collection: resourceSet});

    // Render the collection view
    resourceCollectionView.render();

    // Initiatialize the Backbone models/collection/view
    init_mvc();

    // Initialize loading more resources on scroll down.
    OC.categoryResources.initInfiniteScroll();

    OC.categoryResources.initBrowseView();
});

// The word "filters" is used in the traditional sense here, and not as described in the spec of
    // _.js. Here, the filter is used to eliminate results that don't pass the truth test, as
    // opposed to creating a white list, as in the case of _.js
var filters = {
    type: [], // Type of the content
};

// Initialize the resource results collection before page loads.
var resourceSet = new ResourceSet();

// Initialize the ResourceCollectionView global
var resourceCollectionView;