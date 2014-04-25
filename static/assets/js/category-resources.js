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

    // Thumbnail of user who created the resource.
    user_thumbnail: "",

    // Profile URL of user who created the resource.
    user_url: "",

    // The number of favorites the resource has gotten thus far.
    favorites: "",

    // Type of content.
    type: "",

    // Thumbnail of content.
    thumbnail: "",

    // Whether or not the resource has been favorited by the logged in user.
    favorited: "",

    // Epoch date when this resource was created.
    created: ""
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
        return resource.get('created');
    },
    popularityComparator: function(resource){
        return -resource.get('favorites');
    },
});

// Initialize resources view.
var ResourceView = Backbone.View.extend({
    tagName: "div",
    className: "content-panel-body-listing-item",
    template: _.template('<div class="content-panel-body-listing-item-label-fold"></div>' +
        '<div class="content-panel-body-listing-item-label"><%= type %></div>' +
        '<div class="content-panel-body-listing-item-favorites"><%= favorites %></div>' +
        '<div class="content-panel-body-listing-item-thumbnail"' +
        'style="background-image: url(\'<%= thumbnail %>\')"></div>' +
        '<div class="content-panel-body-listing-item-thumbnail-shadow"></div>' +
        '<a href="<%= user_url %>" class="content-panel-body-listing-item-user-picture" ' +
        'style="background-image: url(\'<%= user_thumbnail %>\')"></a>' +
        '<div class="content-panel-body-listing-item-contents">' +
        '<a href="<%= url %>" class="content-panel-body-listing-item-contents-caption">' +
        '<%= title %></a>' +
        '<div class="content-panel-body-listing-item-contents-meta"><%= views %> views</div>' +
        '</div>'),

    events: {
        // Bind the favorite button.
        'click .content-panel-body-listing-item-favorites': 'favorite',
    },

    initialize: function() {
        this.listenTo(this.model, "change", this.render);
    },

    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        $('.content-panel-body-listing-items').append(this.$el);

        return this;
    },

    favorite: function(event){
        OC.favoriteClickHandler(
            'resource', this.model.get('id'),
            OC.config.user.id, event, this.favoriteCallback,
            this.unfavoriteCallback
        );
    },

    favoriteCallback: function(resourceFavorite){
        resourceFavorite.text(parseInt(resourceFavorite.text(), 10) + 1);
    },

    unfavoriteCallback: function(resourceFavoriteWrapper){
        resourceFavorite.text(parseInt(resourceFavorite.text(), 10) - 1);
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
        $('.content-panel-body-listing-items').html('<p>No results matching your criteria found.</p>');
    },
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
        var currentInput = $(this).val();
        var collectionToRender = new ResourceSet(resourceSet.filter(function (resource) {
            return resource.get('title').toLowerCase().indexOf(currentInput.toLowerCase()) !== -1;
        }));

        // Recreate the view (clears previous view)
        resourceCollectionView.render(collectionToRender);
    });

}

jQuery(document).ready(function($){
    // Construct a collection view using the resources objects built in
    resourceCollectionView = new ResourceCollectionView({collection: resourceSet});

    // Render the collection view
    resourceCollectionView.render();

    // Initiatialize the Backbone models/collection/view
    init_mvc();
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