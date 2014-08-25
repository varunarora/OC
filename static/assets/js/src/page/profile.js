define(['jquery', 'core', 'feed'], function($, OC){
    $(document).ready(function($){
        OC.feed.infiniteScroll();

        $('.feed-item-date').timeago();

        $('.youtube-video-placeholder').click(function(event){
            var $placeholder = $(this),
                height = $placeholder.css('height'),
                width = $placeholder.css('width'),
                video_tag = $placeholder.attr('name');

            var videoFrame = $('<iframe/>', {
                'height': height,
                'width': width,
                'frameborder': 0,
                'allowfullscreen': true,
                'src': 'http://www.youtube.com/embed/' + video_tag +
                    '?wmode=opaque&autoplay=1'
            });

            $placeholder.replaceWith(videoFrame);
        });
    });
});
