define(['jquery', 'core'], function($, OC){

    OC.explorer = {
        initGradeSubjectMenu: function(){
            var menuSelector = 'nav.explorer-home-menu',
                menuButtonSelector = 'a.explorer-header-current';

            $(menuSelector).width($('.explorer-header-current').width() - 10);
            $(menuSelector + ' .floating-menu-spacer').width(
                $('.explorer-header-current').width() - 10);

            OC.setUpMenuPositioning(menuSelector, menuButtonSelector, true);
            $(window).resize(function () { OC.setUpMenuPositioning(
                    menuSelector, menuButtonSelector, true); });

            $(menuButtonSelector + ', ' + menuSelector).mouseenter(function () {
                $(menuButtonSelector).addClass('hover');
                $(menuSelector).addClass('show');
            }).mouseleave(function () {
                $(menuButtonSelector).removeClass('hover');
                $(menuSelector).removeClass('show');
            });
        },
    };

    $(document).ready(function($){
        function resizeApp(){
            $('.explorer-body').height(
                $(window).height() - $('.explorer-header').height()
            );
        }

        resizeApp();
        $(window).resize(resizeApp);

        // Main grade-subject menu on home hover.
        OC.explorer.initGradeSubjectMenu();
    });
});