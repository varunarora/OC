define(['jquery', 'resources', 'searchResults'], function($, resources){
    $(document).ready(function ($) {
        if (OC.config.user.id){
            // Initialize the favorite state of the search results.
            OC.favorites.initFavoriteState(OC.resources.resultSet);
        }

        // Construct a collection view using the search result objects built in.
        ResultsCollectionView = resources['ResultsCollectionView'];
        OC.resultCollectionView = new ResultsCollectionView({collection: OC.resources.resultSet});

        // Render the collection view
        OC.resultCollectionView.render();
    });
});