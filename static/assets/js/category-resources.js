OC.categoryResources = {
    currentCategoryID: null,
    lastInputTimestamp: null,
    searchFilterTimeout: null,
    filterAsyncSearchOn: false,
    childCategories: [],
    visibleResourceCount: null,
    isCatalog: false,
    isSubjectHome: false,
    gradeCategoryMap: {},

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
            $('.resource-browse').height() - 100
        );
        $('.category-panel-listing-categories').nanoScroller({
            paneClass: 'scroll-pane',
            sliderClass: 'scroll-slider',
            contentClass: 'scroll-content',
            flash: true
        });

        // Clear the filter search box.
       $(OC.config.search.input).val('');

        var sortByTypeMenu = $('.sort-by-type-menu');
        $('.content-panel').on('scroll click', function(event){
            if (sortByTypeMenu.hasClass('show'))
                $('.sort-by-type-menu').removeClass('show');
        });

        $('.sort-by-type').click(function(event){
            $('.sort-by-type-menu').toggleClass('show');

            event.stopPropagation();
            event.preventDefault();
            return false;
        });

        // Add a tooltip to category tag filters.
        $('.category-panel-listing-categories-body-filters-description').tipsy(
            {gravity: 's'});

        // Slide in the empty state placeholder on the home browse page.
        setTimeout(function(){
            $('.content-panel-body-grades-topics-list-empty').animate({
                'left': 0,
                'opacity': 1
            }, 1000);
        }, 500);

        function resizeHeader(){
            // Set header height based on page height.
            var newHeight = $(window).height() - $('body > header').height() - $(
                    '.content-panel-body-grades').height();
            $('.content-panel-body-feature').height(newHeight);

            // Reposition the title.
            $('.content-panel-body-feature-title').css({
                'top': newHeight - $('.content-panel-body-feature-title').height() - 20
            });
        }

        resizeHeader(); $(window).resize(resizeHeader);

        // Bind grade click handler.
        $('ul.content-panel-body-grades li a').click(function(event){
            var currentGrade = $(this),
                childCategoryID = parseInt($(this).attr('id').substring(9), 10);
            
            $('ul.content-panel-body-grades li a').removeClass('current');
            currentGrade.addClass('current');

            OC.categoryResources.setGradeTopicList(
                OC.categoryResources.gradeCategoryMap[childCategoryID]);

            event.stopPropagation();
            event.preventDefault();
            return false;
        });
    },

    setGradeTopicList: function(topics){
        $('.content-panel-body-grades-topics-list-empty').addClass('hidden');

        var listWrapper = $('.content-panel-body-grades-topics-list-filled');
        listWrapper.html('');

        var i, newTopicWrapper, newTopicLink;
        for (i = 0; i < topics.length; i++){
            newTopicWrapper = $('<li/>');
            newTopicLink = $('<a/>', {
                'html': topics[i].title,
                'href': topics[i].url
            });

            newTopicWrapper.append(newTopicLink);
            listWrapper.append(newTopicWrapper);
        }
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
    },

    setVisibleResourceCount: function(){
        var hiddenResourceItem = $('<div>', { 'class' : 'content-panel-body-listing-thumbnail-item' });
        $('body').append(hiddenResourceItem);

        function setCount(){
            var squeezableResourceCount = $('.content-panel-body-listing').width(
                ) / $('.content-panel-body-listing-thumbnail-item').outerWidth(true);
            OC.categoryResources.visibleResourceCount = Math.floor(squeezableResourceCount) - 1;
        }

        setCount();
        $(window).resize(function(){
            setCount();
        });
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

var Category = Backbone.Model.extend(
    { id: '', title: '', resources: '', url: '', position: '', truncated: true });
var CategorySet = Backbone.Collection.extend({
    model: Category,
    comparator: 'position'
});
var CategoryCollectionView = Backbone.View.extend({
    truncatedResourceLimit: 0,
    initialize: function() {
        // Get the number of items that can be displayed based on page width.
        this.truncatedResourceLimit = OC.categoryResources.visibleResourceCount;
        var view = this;

        $(window).resize(function(){
            OC.categoryResources.setVisibleResourceCount();
            view.truncatedResourceLimit = OC.categoryResources.visibleResourceCount;
            view.render();
        });
    },
    render: function (newCollection) {
        this.clearView();
        var collectionToRender = newCollection || this.collection;
        this.collection = collectionToRender;

        // If no resources found.
        if (collectionToRender.length === 0) {
            this.showNullView();
        } else {
            // Create a new view object for each object in the collection and render it
            _.each(collectionToRender.models, function(item) {
                new CategoryView({model: item}).render();
            });
        }
    },

    clearView: function () {
        $('.content-panel-body-listing-items').html('');
    },

    showNullView: function () {
        $('.content-panel-body-listing-items').html('<p class="no-results-message">' +
            'Couldn\'t find a thing! Have you tried requesting for something?</p>');

        if (OC.categoryResources.filterAsyncSearchOn){
            // Prevent showing no results message until search completed.
            $('.no-results-message').addClass('hide');
        }
    },

    hideShowMores: function () {
        $('.content-panel-body-listing-items .content-panel-body-listing-category-show').addClass(
            'hide');
    },
    showShowMores: function () {
        $('.content-panel-body-listing-items .content-panel-body-listing-category-show').removeClass(
            'hide');
    },
    truncateAll: function () {
        _.each(this.collection.models, function(item) {
            item.set('truncated', false);
        });
    },
    resetTruncate: function () {
        _.each(this.collection.models, function(item) {
            item.set('truncated', true);
        });
    }
});
var CategoryView = Backbone.View.extend({
    tagName: 'div',
    className: 'content-panel-body-listing-category',
    events: function(){
        if (OC.categoryResources.isCatalog) return {};
        else return { 'click .content-panel-body-listing-category-show': 'showMore' };
    },
    template: _.template('<div class="content-panel-body-listing-category-title">' +
        '<h3><%= title %></h3></div><div class="content-panel-body-listing-category-resources"></div>'),

    showMore: function(){
        // Add loading to show more.
        var showMore =  this.$('.content-panel-body-listing-category-show');
        showMore.addClass('loading');

        var currentCategory = this;

        $.get('/resources/api/load-category-resources/' + this.model.get('id') +
                '/from/' + this.model.get('resources').models.length + '/',
            function(response){
                if (response.status === 'true'){
                    // Render all hidden resources.
                    currentCategory.model.set('loaded', true);

                    currentCategory.clearResources();
                    currentCategory.renderResources();

                    var keys = Object.keys(response.resources);

                    var newResources = [];
                    for (i = 0; i < keys.length; i++){
                        resource = response.resources[keys[i]];
                        resourceModel = new Resource(resource);

                        // NOTE(Varun): This shouldn't be redundant.
                        currentCategory.model.get('resources').add(resourceModel);

                        // If it passes filter test and is not previously in resource set, add.
                        if (!_.some(filters, function(filterValues, filterType){
                            if (filterType == 'tags') {
                                return _.indexOf(filterValues, resourceModel.get(filterType)) !== -1;
                            } else {
                                return _.indexOf(filterValues, resourceModel.get(filterType).toLowerCase()) !== -1;
                            }
                        }) && ! resourceSet.find(function(resource){
                            return resource.get('id') == resourceModel.get('id'); })){
                            currentCategory.lateRender(resourceModel);
                        }
                        
                        resourceSet.add(resourceModel);
                        newResources.push(resourceModel);
                    }
                    // Add additional category tag filters to list.
                    addTagFiltersFromResources(newResources);

                    showMore.remove();
                }
                else {
                    OC.popup(response.message, response.title);
                }
            },
        'json');

        return false;
    },

    renderResources: function (){
        // Now attach the resources.
        if (this.model.get('truncated') === false || this.model.get('loaded')){
            existingResources = this.model.get('resources').models;
        } else {
            existingResources = this.model.get('resources').models.slice(0,categoryView.truncatedResourceLimit);
        }

        if (existingResources){
            for (i = 0; i < existingResources.length; i++){
                this.$('.content-panel-body-listing-category-resources').append(
                    new ResourceView({
                        model: existingResources[i]
                    }).silentRender()
                );
            }

            if ((this.model.get('count') - categoryView.truncatedResourceLimit) > 0)
                this.$('.content-panel-body-listing-category-resources').append(
                    '<a href="' + this.model.get('url') + '" class="content-panel-body-listing-item-show">' +
                    '<div class="content-panel-body-listing-item-show-count">' + (this.model.get(
                        'count') - categoryView.truncatedResourceLimit) + '</div> more</div>'
                );
        }
    },

    render: function () {
        modelJSON = this.model.toJSON();
        this.$el.html(this.template(modelJSON));

        $('.content-panel-body-listing-items').append(this.$el);
        this.renderResources();
        
        if (this.model.get('truncated') === false || this.model.get('loaded')){
            this.$('.content-panel-body-listing-item-show').remove();
        }

        return this;
    },
    lateRender: function(model) {
        this.$('.content-panel-body-listing-category-resources').append(
            new ResourceView({
                model: model
            }).silentRender()
        );
    },
    clearResources: function() {
        this.$('.content-panel-body-listing-category-resources').html('');
    }
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

// Initialize request Model
var Request = Backbone.Model.extend({
    // URL of the request.
    url: "",

    // Body of the request.
    body: "",

    // User who created the request.
    user: "",

    // Thumbnail of user who created the request.
    user_thumbnail: ""
});


// Initialize requests set Collection
var RequestSet = Backbone.Collection.extend({
    model: Request,
    comparator: function(){
        return -resource.get('created');
    }
});

// Initialize request view.
var RequestView = Backbone.View.extend({
    tagName: "a",
    className: "content-panel-body-listing-request",
    attributes: function(){
        return {
            'href': this.model.get('url'),
        };
    },
    template: _.template('<div style="background-image: url(\'<%= user_thumbnail %>\')" ' +
        'class="content-panel-body-listing-request-thumbnail"></div>' +
        '<div class="content-panel-body-listing-request-body">' +
        '<span class="bold content-panel-body-listing-request-body-user"><%= user %></span>' +
        '<%= body %></div>'),

    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        $('.content-panel-body-listing-requests').append(this.$el);

        return this;
    }
});

// Initialize the request collection view
var RequestCollectionView = Backbone.View.extend({
    requestURL: '',
    render: function (newCollection) {
        this.clearView();
        var collectionToRender = newCollection || this.collection;
        this.collection = collectionToRender;

        // If no resources found.
        if (collectionToRender.length === 0) {
            this.showNullView();
        } else {
            this.showNonNullView();
            // Create a new view object for each object in the collection and render it
            _.each(collectionToRender.models, function(item) {
                new RequestView({model: item}).render();
            });
        }
    },

    clearView: function () {
        $('.content-panel-body-listing-requests').html('');
    },

    showNullView: function () {
        $('.content-panel-body-listing-requests').html('Can\'t find what you are looking ' +
            'for? <span class="no-request-found-message"><span class="no-request-found-teacher-count">' + this.randomUserCount() + '</span> teachers are currently ' +
            'online waiting to help you for free!</span> <a href="' + this.options.requestURL + '" class="no-request-found">Ask for help right now</a>');
    },

    randomUserCount: function () {
        return String(_.random(6, 14));
    },

    showNonNullView: function (){
        $('.content-panel-body-listing-requests').html('<div class="content-panel-body-listing-requests-title">' +
            '<h3>Top requests</h3><a href="' + this.options.requestURL + '" class="action-button mini-action-button content-panel-body-listing-requests-new-request">' +
            'New request</a></div>');
    }
});


// Initialize resources view.
var ResourceView = Backbone.View.extend({
    tagName: "div",
    className: function(){
         return (!OC.categoryResources.isSubjectHome && (
            !OC.categoryResources.isCatalog)) ? "content-panel-body-listing-banner-item" : "content-panel-body-listing-thumbnail-item";
    },
    thumbnailTemplate: _.template(
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
        '</div><% } %></div></a>'
        ),

    bannerTemplate: _.template('<div class="content-panel-body-listing-banner-item">' +
            '<a href="<%= user_url %>" class="content-panel-body-listing-item-user-picture" style="background-image: url(\'<%= user_thumbnail %>\')"></a>' +
            '<div class="content-panel-body-listing-item-label-fold"></div>' +
            '<div class="content-panel-body-listing-item-label"><%= type %></div>' +
            '<a href="<%= url %>" class="content-panel-body-listing-item-anchor">' +
                '<div class="content-panel-body-listing-item-thumbnail-wrapper">' +
                    '<div class="content-panel-body-listing-item-favorites<% if (favorited){ %> favorited<% } %>"><%= favorites %></div>' +
                    '<div class="content-panel-body-listing-item-thumbnail" style="background-image: url(\'<%= thumbnail %>\')"></div>' +
                    '<div class="content-panel-body-listing-item-thumbnail-shadow"></div>' +
                '</div>' +
                '<div class="content-panel-body-listing-item-contents">' +
                    '<div class="content-panel-body-listing-item-contents-caption"><%= title %></div><%= tags %>' +
                    '<div class="content-panel-body-listing-item-contents-meta"><%= views %> views</div>' +
                    '<div class="content-panel-body-listing-item-contents-description"><%= description %></div>' +
                    '<% if (review_count !== 0) { %><div class="content-panel-body-listing-item-contents-reviews">' +
                        '<div class="content-panel-body-listing-item-contents-review-count">' +
                            '(<span class="content-panel-body-listing-item-contents-review-count-value"><%= review_count %></span>)' +
                        '</div>' +
                    '</div><% } %>' +
                '</div>' +
            '</a>' +
        '</div>'),

    events: function(){
        var events = {
            'click .content-panel-body-listing-item-favorites': 'favorite',
            'mouseenter .content-panel-body-listing-item-user-picture': 'showUserTip',
            'mouseleave .content-panel-body-listing-item-user-picture': 'hideUserTip'
        };
        if (!(!OC.categoryResources.isSubjectHome && !OC.categoryResources.isCatalog))
            _.extend(events, {
                'mouseenter .content-panel-body-listing-item-anchor': 'expand',
                'mouseleave .content-panel-body-listing-item-anchor': 'collapse'
            });
        return events;
    },

    expand: function () {
        this.$('.content-panel-body-listing-item-contents-caption').html(
            this.model.get('title'));
        this.$('.content-panel-body-listing-item-contents-description').html(
            this.model.get('description') === '' ? 'No description found.' : this.model.get('description'));

        this.$el.addClass('expanded');
    },

    collapse: function () {
        this.$el.removeClass('expanded');

        this.$('.content-panel-body-listing-item-contents-caption').html(
            this.getTrucatedTitle());
        this.$('.content-panel-body-listing-item-contents-description').html(
            this.getTrucatedDescription());
    },

    getTrucatedTitle: function (){
        var originalTitleLength = this.model.get('title').length;
        if (originalTitleLength > 40)
            return this.model.get('title').substring(0, 40).trim() + '&hellip;';
        
        return this.model.get('title');
    },

    getTrucatedDescription: function (){
        var originalDescriptionLength = this.model.get('description').length;
        if (originalDescriptionLength > 100)
            return this.model.get('description').substring(0, 100).trim() + '&hellip;';
        else if (originalDescriptionLength === 0)
            return 'No description found.';

        return this.model.get('description');
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
            star = $('<span/>', {
                'class': 'content-panel-body-listing-item-contents-review-star'
            });
            starsView.append(star);
        }

        if (trailingHalf){
            starsView.append($('<span/>', {
                'class': 'content-panel-body-listing-item-contents-review-halfstar'
            }));
        }
        this.$starsView = starsView;

        // Set style of template (thumbnail or banner).
        this.template = (!OC.categoryResources.isSubjectHome && (
            !OC.categoryResources.isCatalog)) ? this.bannerTemplate : this.thumbnailTemplate;

        this.listenTo(this.model, "change", this.render);
    },

    render: function () {
        $('.content-panel-body-listing-items').append(this.silentRender());
        return this;
    },

    silentRender: function(elementWrapper){
        modelJSON = this.model.toJSON();
        modelJSON['tags'] = String(this.$tagsView[0].outerHTML);

        if (!(!OC.categoryResources.isSubjectHome && !OC.categoryResources.isCatalog)) {
            modelJSON['title'] = this.getTrucatedTitle();
            modelJSON['description'] = this.getTrucatedDescription();
        } else {
            modelJSON['description'] = this.model.get(
                'description') === '' ? 'No description found.' : this.model.get('description');
        }

        this.$el.html(this.template(modelJSON));
        
        //elementWrapper.append(this.$el);
        this.$('.content-panel-body-listing-item-contents-reviews').prepend(
            this.$starsView);

        return this.el;
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

    // Use filters on the searched content.
    if (searchedResources) filteredCollection = searchedResources;
    else filteredCollection = resourceSet;

    // From the current resource collection, remove all the results that do not meet the filters set.
    //     _.some() returns true on each resource only if any filter causes the resource to be
    //     no longer relevant.
    //     TODO: resourceSet, the global, should be not referenced this way. Should either be passed
    //     into the function, or gotten reference to using a setter
    var collectionToRender = filterResources(filteredCollection);

    // Recreate the view (clears previous view)
    if (!OC.categoryResources.isSubjectHome && !OC.categoryResources.isCatalog)
        resourceCollectionView.render(collectionToRender);
    else reset(collectionToRender);
}

function filterInitialResources(collection){
    // Build filters.
    var filterInputs = $('.sort-by-type-menu input:checkbox, ' +
        '.category-panel-listing-categories-body-filters input:checkbox');
    var i, filterType, filterValue;
    for (i = 0; i < filterInputs.length; i++){
        filterValue = $(filterInputs[i]).val();
        filterType = $(filterInputs[i]).attr('name');
        if (!filterInputs[i].checked) {
            filters[filterType].push(filterValue);
        }
    }

    // Create new collection.
    return filterResources(collection);
}

function filterResources(collection){
    // Create new collection.
    return new ResourceSet(collection.reject(function (resource) {
        return _.some(filters, function(filterValues, filterType){
            if (filterType == 'tags') {
                if (resource.get(filterType).length === 0) return false;
                else return _.every(resource.get(filterType), function(resourceTag){
                    return _.indexOf(filterValues, resourceTag) !== -1;
                });
            } else {
                return _.indexOf(filterValues, resource.get(filterType).toLowerCase()) !== -1;
            }
        });
    }));
}

function addTagFiltersFromResources(resources){
    var i, resourcesTags = _.union(_.flatten(_.map(resources, function(resource) { return resource.get('tags'); } ))),
        currentTags = $('.category-panel-listing-categories-body-filters input[name="tags"]'),
        newResourceTagList = _.map(currentTags, function(tagEl){ return $(tagEl).val(); });

    // Build a checked status map of the original tags.
    var j, currentTagsMap = {};
    for (j = 0; j < currentTags.length; j++){
        currentTagsMap[$(currentTags[j]).val()] = currentTags[j].checked;
    }

    // Add the resourceTags to the current list of tags if not present.
    _.each(resourcesTags, function(resourceTag){
        if (newResourceTagList.indexOf(resourceTag) === -1){
            newResourceTagList.push(resourceTag);
        }
    });

    // Sort the list and clear the existing view.
    newResourceTagList.sort();
    $('.category-panel-listing-categories-body-filters').html('');

    for (i = 0; i < newResourceTagList.length; i++){
        var newLabel = $('<label/>', { 'text': newResourceTagList[i] }),
            newCheckbox = $('<input/>', {
                'type': 'checkbox',
                'name': 'tags',
                'checked': _.has(currentTagsMap, newResourceTagList[i]) ? (
                    currentTagsMap[newResourceTagList[i]]) : 'true',
                'value': newResourceTagList[i],
            }),
            newLabelTip = $('<span/>', {
                'class': 'category-panel-listing-categories-body-filters-description',
                'text': '?',
                'title': ''
            });

        newLabel.prepend(newCheckbox);
        newLabel.append(newLabelTip);

        $('.category-panel-listing-categories-body-filters').append(newLabel);

        // Bind click on label/input checkbox.
        $('.category-panel-listing-categories-body-filters label:last').click(
            filterClickHandler);
    }
}

// Initialize the resource collection view
var ResourceCollectionView = Backbone.View.extend({
    isCatalog: false,
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
        this.isCatalog = OC.categoryResources.isCatalog;
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
    var filterCheckboxes = $('.sort-by-type-menu label, ' +
        '.category-panel-listing-categories-body-filters label');

    // Bind change listeners on function that repopulates the resources
    $(filterCheckboxes).click(filterClickHandler);

    // Bind click listeners on main sorting.
    $('.filter-sort-option').click(function(event){
        // Get the set and filter is.
        if (searchedResources) unfilteredCollection = searchedResources;
        else unfilteredCollection = resourceSet;

        filteredCollection = filterResources(unfilteredCollection);

        if ($(event.target).hasClass('filter-sort-option-newest')){
            filteredCollection.sortByNewest();
        } else {
            filteredCollection.sortByPopularity();
        }
        
        if (!OC.categoryResources.isSubjectHome && !OC.categoryResources.isCatalog)
            resourceCollectionView.render(filteredCollection);
        else reset(filteredCollection);
    });

    var typeTabFilter = $('.content-panel-body-listing-types');
    if (typeTabFilter.length > 0){
        $('.content-panel-body-listing-types ul li a').click(function(event){
            var currentTypeElement = $(event.target),
                currentType = currentTypeElement.parents('li').attr('name');

            $('.content-panel-body-listing-types ul li a').removeClass('current');
            currentTypeElement.addClass('current');

            if (currentType === 'all')
                filters['type'] = [];
            else {
                var otherTypes = _.map($('.content-panel-body-listing-types ul li'), function(type){
                    return $(type).attr('name');
                });

                otherTypes.splice(otherTypes.indexOf('all'), 1);
                otherTypes.splice(otherTypes.indexOf(currentType), 1);
                filters['type'] = otherTypes;
            }

            var collectionToRender = searchedResources ? searchedResources : filterResources(resourceSet);

            resourceCollectionView.render(collectionToRender);

            event.stopPropagation();
            event.preventDefault();
            return false;
        });
    }

    // Bind text input field as filter.
    if (!OC.categoryResources.isSubjectHome){
        $(OC.config.search.input).keyup(function(event){
            var currentInput = $(this).val(),
                loadButton = $('.lazy-load-button');

            // Re-render categories.
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

            var loadingPlaceholder = $('.filter-search-placeholder');

            if (currentInput.length > 0) {
                if (loadButton.length > 0) {
                    loadButton.addClass('hide');
                    loadButton.removeClass('enabled');
                }

                if (!(!OC.categoryResources.isSubjectHome && !OC.categoryResources.isCatalog))
                    // Hide the 'show more's from all categories. 
                    categoryView.truncateAll();

                // If there are categories that haven't been rendered yet.
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
                            categoryID = $('.content-panel-body').attr('id').substring(9),
                            resourceCount = 4;

                        // Perform search.
                        $.get('/resources/api/search-category/' + categoryID + '/query/' +
                                currentInput + '/',
                            function(response){
                                loadingPlaceholder.removeClass('show');
                                OC.categoryResources.filterAsyncSearchOn = false;

                                if (response.status == 'true'){
                                    var keys = Object.keys(response.resources);

                                    if (!OC.categoryResources.isSubjectHome && !OC.categoryResources.isCatalog){
                                        if (resourceCollectionView.collection.length === 0 && (
                                            keys.length === 0))
                                            resourceCollectionView.showNullView();

                                        else if (resourceCollectionView.collection.length === 0)
                                            resourceCollectionView.clearView();

                                    } else {
                                        // Clear nothing found message, if nothing in original collection.
                                        if (collectionToRender.length === 0 && keys.length === 0)
                                            categoryView.showNullView();

                                        else if (collectionToRender.length === 0)
                                            categoryView.clearView();
                                    }
                                    
                                    for (i = 0; i < keys.length; i++){
                                        resource = response.resources[keys[i]];
                                        resourceModel = new Resource(resource);
                                        
                                        if (!OC.categoryResources.isSubjectHome && !OC.categoryResources.isCatalog)
                                            resourceCollectionView.collection.add(resourceModel);

                                        // If the resource isn't in the resource set.
                                        else collectionToRender.add(resourceModel);
                                        
                                        resourceSet.add(resourceModel);
                                    }

                                    if (!(!OC.categoryResources.isSubjectHome && !OC.categoryResources.isCatalog)){
                                        reset(filterResources(collectionToRender));
                                        categoryView.truncateAll();
                                    }
                                    
                                    searchedResources = collectionToRender;
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
            } else {
                clearTimeout(OC.categoryResources.searchFilterTimeout);
                if (loadButton.length > 0) {
                    loadButton.removeClass('hide');
                    loadButton.addClass('enabled');
                }
                OC.categoryResources.filterAsyncSearchOn = false;
                loadingPlaceholder.removeClass('show');

                try {
                    categoryView.resetTruncate();
                    // Show the 'show more's from all categories.
                    categoryView.showShowMores();

                } catch(e){}

                searchedResources = null;
            }
            
            // Recreate the view (clears previous view)
            if (!OC.categoryResources.isSubjectHome && !OC.categoryResources.isCatalog){
                resourceCollectionView.render(filterResources(collectionToRender));
                resourceCollectionView.initialize();
            } else reset(filterResources(collectionToRender));
            
            searchedResources = collectionToRender;

            // Filter the requests.
            var requestsToRender = new RequestSet(requestSet.filter(function (request) {
                return request.get('body').toLowerCase().indexOf(currentInput.toLowerCase()) !== -1;
            }));
            requestCollectionView.render(requestsToRender);

        });
    }
}

function filterClickHandler(event){
    event.stopPropagation();

    var input;
    input = $('input:checkbox', event.target)[0];
    if (!input){
        input = event.target;

    } else {
        input.checked = input.checked === false ? true : false;
        event.preventDefault();
    }
    repopulateResources(input, resourceCollectionView);
}

function reset(collection){
    // Add all categories into the category set.
    categoryView = new CategoryCollectionView({collection: groupResources(collection)});

    categoryView.render();
}

function groupResources(collection){
    // Split resources from resourceSet into multiple categories.
    var groupedResources = _.groupBy(collection.models, function(
        resource){ return resource.get('category'); });

    // Build categories from resource results 'category' fields.
    var category, categorySet = new CategorySet();
    _.each(groupedResources, function(value, key, list){
        category = _.find(OC.categoryResources.childCategories, function(cat){
            return cat.get('title') === key;
        });
        category.set('resources', new ResourceSet(value));
        categorySet.add(category);
    });

    return categorySet;
}

jQuery(document).ready(function($){
    if (!OC.categoryResources.isSubjectHome){
        OC.categoryResources.setVisibleResourceCount();

        // Construct collection views using the resources and requests objects built in
        if (OC.categoryResources.isCatalog){
            reset(filterInitialResources(resourceSet));
        } else {
            resourceCollectionView = new ResourceCollectionView({collection: resourceSet});
            resourceCollectionView.render();
        }

        requestCollectionView = new RequestCollectionView({
            collection: requestSet,
            requestURL: requestURL
        });

        // Render the collection views
        requestCollectionView.render();

        $(OC.config.search.input).autocomplete('disable');

        // Initiatialize the Backbone models/collection/view
        init_mvc();

        // Initialize loading more resources on scroll down.
        OC.categoryResources.initInfiniteScroll();
    }

    OC.categoryResources.initBrowseView();
});

// The word "filters" is used in the traditional sense here, and not as described in the spec of
    // _.js. Here, the filter is used to eliminate results that don't pass the truth test, as
    // opposed to creating a white list, as in the case of _.js
var filters = {
    type: [], // Type of the content
    tags: []
};

// Initialize the resource results collection before page loads.
var resourceSet = new ResourceSet(),
    categorySet = new CategorySet();

// Initialize the requests collection before page loads.
var requestSet = new RequestSet();

// Initialize the ResourceCollectionView, RequestCollectionView global
var resourceCollectionView, RequestCollectionView;
var requestURL;

var searchedResources = null;