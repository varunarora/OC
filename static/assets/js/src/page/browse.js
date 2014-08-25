define(['jquery', 'core', 'categoryResources'], function($, OC, categoryResources){
    var ResourceCollectionView = categoryResources['ResourceCollectionView'],
        RequestCollectionView = categoryResources['RequestCollectionView'];

    $(document).ready(function($){
        if (!OC.categoryResources.suggestionMode){
            if (!OC.categoryResources.isSubjectHome){
                OC.categoryResources.setVisibleResourceCount();
                
                // Construct collection views using the resources and requests objects built in
                if (OC.categoryResources.isCatalog){
                    OC.categoryResources.reset(
                        OC.categoryResources.filterInitialResources(OC.categoryResources.resourceSet));
                } else {
                    OC.categoryResources.resourceCollectionView = new ResourceCollectionView({collection: OC.categoryResources.resourceSet});
                    OC.categoryResources.resourceCollectionView.render();
                }

                OC.categoryResources.requestCollectionView = new RequestCollectionView({
                    collection: OC.categoryResources.requestSet,
                    requestURL: OC.categoryResources.requestURL
                });

                // Render the collection views
                OC.categoryResources.requestCollectionView.render();

                
                $(OC.config.search.input).autocomplete('disable');

                // Initiatialize the Backbone models/collection/view
                OC.categoryResources.init_mvc();

                // Initialize toggling between questions view and content.
                OC.categoryResources.initModeToggler();

                // Initialize loading more resources on scroll down.
                OC.categoryResources.initInfiniteScroll();
            }
        } else {
            OC.categoryResources.initSuggestionsView();
        }

        OC.categoryResources.initBrowseView();
    });
});
