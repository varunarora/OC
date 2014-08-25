define(['jquery', 'underscore', 'backbone', 'core'], function($, _, Backbone, OC){

    // Initialize Search results Model
    OC.Result = Backbone.Model.extend({
        // ID of the search result
        id: "",

        // URL of the search result
        url: "",

        // Title of the search result page
        title: "",

        // Summary of the search result with highlighting
        summary: "",

        // Page created at what time
        created: "",

        // User who created the page
        user: "",

        // Difficulty level of result
        difficulty: "",

        // Visibility of result
        visibility: "",

        // Cost of the search result
        cost: "",

        // License of the result page
        license: "",

        // Type of content
        type: "",

        // Thumbnail of content
        thumbnail: "",

        // Whether or not the resource has been favorited by the logged in user.
        favorited: "",

        // Profile URL of user who created the resource.
        user_url: ''
    });

    // Initialize Search results set Collection
    var ResultsSet = Backbone.Collection.extend({
        model: OC.Result
    });

    // Initialize the search results collection before page loads
    OC.resources.resultSet = new ResultsSet();

    // Initialize the ResultCollectionView global
    // TODO: Making it global is not a great idea; have it passed around correctly
    OC.resultCollectionView = null;

    // Initialize Search results View
    var ResultsView = Backbone.View.extend({
        tagName: "div",
        className: "content-panel-body-listing-thumbnail-item",

        template: _.template(
            '<a href="<%= user_url %>" class="content-panel-body-listing-item-user-picture" ' +
            'style="background-image: url(\'<%= user_thumbnail %>\')"></a>' +
            '<a href="<%= url %>" class="content-panel-body-listing-item-anchor"><div class="content-panel-body-listing-item-label-fold"></div>' +
            '<div class="content-panel-body-listing-item-label"><%= type %></div>' +
            '<div class="content-panel-body-listing-item-favorites<% if (favorited){ %> favorited<% } %>"><%= favorites %></div>' +
            '<div class="content-panel-body-listing-item-thumbnail"' +
            'style="background-image: url(\'<%= thumbnail %>\')"></div>' +
            '<div class="content-panel-body-listing-item-thumbnail-shadow"></div>' +
            '<div class="content-panel-body-listing-item-contents">' +
            '<div class="content-panel-body-listing-item-contents-caption"><%= title %></div>' +
            '<div class="content-panel-body-listing-item-contents-meta"><%= views %> views</div>' +
            '<%= tags %><div class="content-panel-body-listing-item-contents-description"><%= description %></div>' +
            '<% if (review_count !== 0) { %><div class="content-panel-body-listing-item-contents-reviews">' +
            '<div class="content-panel-body-listing-item-contents-review-count">' +
            '(<span class="content-panel-body-listing-item-contents-review-count-value"><%= review_count %></span>)</div>' +
            '</div><% } %></div></a>'),

        events: {
            // Bind the favorite button.
            'click .resource-favorite': 'favorite',
            'click .resource-copy': 'copy'
        },

        initialize: function() {
            this.listenTo(this.model, "change", this.silentRender);
        },

        silentRender: function () {
            this.$el.html(this.template(this.model.toJSON()));
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            $('#search-result-set').append(this.$el);

            return this;
        },

        favorite: function(){
            OC.favoriteClickHandler('resource',
                this.model.get('id'), this.favoriteCallback,
                this.unfavoriteCallback, this.$el.find('.resource-favorite')
            );
        },

        copy: function(){
            var loadingPopup = OC.customPopup('.loading-dialog'),
                resourceView = this;

            $.get('/resources/collection-from-resource/' + resourceView.model.get('id') + '/',
                function(response){
                    if (response.status == 'true'){
                        loadingPopup.close();
                        OC.addCopyClickHandler(
                            'resource', resourceView.model.get('id'), response.collectionID, event);
                    }
                    else {
                        OC.popup(response.message, response.title);
                    }
                },
            'json');
        },

        favoriteCallback: function(resourceFavorite){
            resourceFavorite.text('Favorited');
            resourceFavorite.addClass('favorited');
        },

        unfavoriteCallback: function(resourceFavorite){
            resourceFavorite.text('Favorite');
            resourceFavorite.removeClass('favorited');
        }
    });

    // Initialize the search results collection view
    var ResultsCollectionView = Backbone.View.extend({
        render: function (newCollection) {
            this.clearView();
            this.prepareView();
            var collectionToRender = newCollection || this.collection;
            this.collection = collectionToRender;

            // If no search results found
            if (collectionToRender.length === 0) {
                this.showNullView();
            } else {
            // Create a new view object for each object in the collection and render it
                _.each(collectionToRender.models, function(item) {
                    new ResultsView({model: item}).render();
                });
            }
            this.revealView();
        },

        clearView: function () {
            $('#search-result-set').html('');
        },

        prepareView: function () {
            $('#search-result-set').addClass('spinner-background');
        },

        revealView: function () {
            $('#search-result-set').removeClass('spinner-background');
            $('#search-result-set').css('display', 'none');
            $('#search-result-set').fadeIn("fast");
        },

        showNullView: function () {
            $('#search-result-set').html('<p>No results matching your criteria found.</p>');
        },

        setFavoriteStates: function () {}
    });

    OC.favorites.initFavoriteState = function(resultSet){
        var i, state;
        for (i = 0; i < OC.resources.resultSet.length; i++){
            OC.getFavoriteState('resource', OC.resources.resultSet.models[i].get('id'), setFavoriteState);
        }
    };

    function setFavoriteState(id, state){
        OC.resources.resultSet.get(id).set('favorited', state);
    }

    return {
        ResultsCollectionView: ResultsCollectionView
    };
});