define(['jquery', 'core', 'resourcesCollections', 'nanoscroller'], function($, OC){
    $(document).ready(function($){
        function resizeFolderNavigation(){
            $('nav.collections-navigation').height(
                $('.category-panel').height() - $('.user-profile-info').outerHeight(true) - 20
            );
        }

        resizeFolderNavigation();
        $(window).resize(resizeFolderNavigation);

        $('nav.collections-navigation > ul').addClass('scroll-content');
        $('nav.collections-navigation').nanoScroller({
            paneClass: 'scroll-pane',
            sliderClass: 'scroll-slider',
            contentClass: 'scroll-content',
            flash: true
        });
    });
});