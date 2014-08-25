define(['jquery', 'underscore', 'timeago'], function($, _){
    _.extend(OC.feed, {
        wrapper: _.template('<div class="user feed-item">' +
            '<a href="<%= actor_url %>" class="user-photo" style="background-image: url(\'' +
            '<%= actor_thumbnail %>\');" title="<%= actor_name %>"></a>' +
            '<div class="user-description"><a href="<%= actor_url %>">' +
            '<%= actor_name %></a> <%= feed_body %></div></div>'),
        date: _.template(' <span class="feed-item-date" title="<%= target_created %>">' +
            '</span>'),
        url: _.template('<a href="<%= target_url %>"><%= target %></a>'),
        userURL: _.template('<a href="<%= target_user_url %>"><%= target_user %></a>'),
        urlItem: _.template('<div class="oer-external feed-oer-external" style="background-image: url(\'' +
            '<%= target_thumbnail %>\');"><div id="oer-info"><div id="oer-details"><ul>' +
            '<li><span class="oer-info-caption">URL:</span> <span class="oer-info-detail">' +
            '<a href="<%= target_direct_url %>"><%= target_direct_url_trimmed %>...</a></span></li>' +
            '<li><span class="oer-info-caption">License:</span> <span class="oer-info-detail"> <%= target_license %></span></li>' +
            '<li><span class="oer-info-caption">Posted on:</span> <span class="oer-info-detail"> <%= target_created %></span></li>' +
            '</ul></div><div id="oer-get">' +
            '<a href="<%= target_direct_url %>" target="_blank"><button class="action-button">Open website</button></a>' +
            '</div></div></div>'),
        videoItem: _.template('<div class="oer-video feed-oer-video">' +
            '<% if (target_provider === \'youtube\'){ %>' +
            '<iframe width="475" height="267" src="http://www.youtube.com/embed/<%= target_video_tag %>?wmode=opaque" frameborder="0" allowfullscreen></iframe>' +
            '<% } else if (target_provider === \'vimeo\'){ %>' +
            '<iframe src="http://player.vimeo.com/video/<%= target_video_tag %>?title=0&amp;byline=0&amp;portrait=0&amp;badge=0&amp;color=ffffff"' +
            'width="475" height="267" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>' +
            '<% } %></div>'),
        uploadItem: _.template('<div class="activity-object-wrapper"><div class="user-photo" style="background-image: url(\'<%= target_thumbnail %>\');"></div>' +
            '<div class="user-description"><a href="<%= target_url %>"><%= target_title %></a>' +
            '<br/><a href="<%= target_download_url %>" target="_blank">Download</a> &#183; <%= target_size %></div></div>'),

        commentItem: _.template('<div class="activity-object-wrapper">' +
            '<blockquote>"<%= action %>"</blockquote></div>'),
        newPost: _.template('<a href="<%= target_url %>">new post</a>'),
        group: _.template('<a href="<%= context_url %>"><%= context %></a>. '),
        newGroup: _.template('<a href="<%= action_url %>"><%= action %></a>. '),
        membership: _.template('<a href="<%= target_url %>"><%= target %></a>. '),
        post: _.template('<a href="<%= target_url %>">discussion post</a>'),
        discussionItem: _.template('<div class="activity-object-wrapper">' +
            '<div class="user-photo" style="background-image: url(\'<%= target_user_thumbnail %>\');"></div>' +
            '<div class="user-description"><a href="<%= target_user_url %>"><%= target_user %></a><%= target %>' +
            '<blockquote>"<%= action %>"</blockquote></div></div>'),

        groupItem: _.template('<div class="activity-project-wrapper"><div class="projects-item">' +
            '<a href="<%= target_url %>" title="<%= target_description %>">' +
            '<div style="background-image: url(\'<%= target_thumbnail %>\'); background-position: ' +
            '<%= target_thumbnail_position[0] %>% <%= target_thumbnail_position[1] %>%;" class="profile-projects-item-description-wrapper">' +
            '<div class="profile-projects-item-description"><div class="profile-projects-item-title bold">' +
            '<%= target %></div></div></div></a></div></div>'),

        infiniteScroll: function(){
            if (OC.feed.feedCount > 10 && OC.config.user.id){
                var loadButton = $('.lazy-load-button'), i;
                $('.home-profile-content').on('DOMContentLoaded load resize scroll', function(event){
                    // If the load button is attached to the document.
                    if ($.contains(document, loadButton[0])){
                        if (isElementInViewport(loadButton) && !loadButton.hasClass('loading')){
                            loadButton.addClass('loading');

                            $.get('/user/api/load-feed/' + OC.config.profile.id +
                                    '/from/' + OC.feed.currentCount + '/',
                                function(response){
                                    if (response.status == 'true'){
                                        var keys = Object.keys(response.feeds);

                                        if (keys.length !== 0){
                                            var newFeedItem;
                                            for (i = 0; i < keys.length; i++){
                                                newFeedItem = OC.feed.buildFeedItem(response.feeds[keys[i]]);
                                                $('.feed-list').append(newFeedItem);

                                                newAppendedFeedItem = $('.feed-list .feed-item:last');
                                                $('.feed-item-date', newAppendedFeedItem).timeago();
                                            }
                                            OC.feed.currentCount += keys.length;

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

        buildFeedItem: function(raw_item){
            feed_item_body = '';
            if (raw_item.action_type === 'resource'){
                if (raw_item.target_type == 'url'){
                    feed_item_body += 'created a new link ';
                    feed_item_body += OC.feed.url(raw_item);
                    feed_item_body += OC.feed.date(raw_item);

                    raw_item.target_direct_url_trimmed = raw_item.target_direct_url.substring(0, 30);
                    feed_item_body += OC.feed.urlItem(raw_item);
                } else if (raw_item.target_type == 'document'){
                    feed_item_body += 'created a new document ';
                    feed_item_body += OC.feed.url(raw_item);
                    feed_item_body += OC.feed.date(raw_item);
                } else if (raw_item.target_type == 'video'){
                    feed_item_body += 'created a video link ';
                    feed_item_body += OC.feed.url(raw_item);
                    feed_item_body += OC.feed.date(raw_item);

                    feed_item_body += OC.feed.videoItem(raw_item);
                } else if (raw_item.target_type == 'attachment'){
                    feed_item_body += 'uploaded a new file. ';
                    feed_item_body += OC.feed.date(raw_item);

                    feed_item_body += OC.feed.uploadItem(raw_item);
                }
            } else if (raw_item.action_type === 'comment'){
                if (raw_item.target_type === 'resource'){
                    feed_item_body += 'commented on the resource ';
                    feed_item_body += OC.feed.url(raw_item);

                    feed_item_body += OC.feed.commentItem(raw_item);
                } else if (raw_item.target_type === 'comment'){
                    if (raw_item.action_id === raw_item.target_id){
                        feed_item_body += 'wrote a ';
                        feed_item_body += OC.feed.newPost(raw_item);
                        feed_item_body += ' in ';
                        feed_item_body += OC.feed.group(raw_item);
                        feed_item_body += OC.feed.date(raw_item);

                        feed_item_body += OC.feed.commentItem(raw_item);
                    } else {
                        feed_item_body += 'commented on a ';
                        feed_item_body += OC.feed.post(raw_item);
                        feed_item_body += ' in ';
                        feed_item_body += OC.feed.group(raw_item);
                        feed_item_body += OC.feed.date(raw_item);

                        feed_item_body += OC.feed.discussionItem(raw_item);
                    }
                } else if (raw_item.action_type === 'membership'){
                    feed_item_body += 'just joined the group ';
                    feed_item_body += OC.feed.membership(raw_item);
                    feed_item_body += OC.feed.date(raw_item);

                    feed_item_body += OC.feed.groupItem(raw_item);
                } else if (raw_item.action_type === 'project'){
                    feed_item_body += 'created the group ';
                    feed_item_body += OC.feed.membership(raw_item);
                    feed_item_body += OC.feed.date(raw_item);

                    raw_item.target = raw_item.action;
                    raw_item.target_url = raw_item.action_url;
                    raw_item.target_description = raw_item.action_description;
                    raw_item.target_thumbnail = raw_item.action_thumbnail;
                    raw_item.target_thumbnail_position = raw_item.action_thumbnail_position;

                    feed_item_body += OC.feed.groupItem(raw_item);
                } else if (raw_item.action_type === 'favorite'){
                    feed_item_body += 'favorited ';
                    feed_item_body += OC.feed.userURL(raw_item);
                    feed_item_body += '\'s resource ';
                    feed_item_body += OC.feed.url(raw_item);
                    feed_item_body = OC.feed.date(raw_item);

                    switch (raw_item.target_type) {
                        case 'url':
                            raw_item.target_direct_url_trimmed = raw_item.target_direct_url.substring(0, 30);
                            feed_item_body += OC.feed.urlItem(raw_item);
                            break;
                        case 'video':
                            feed_item_body += OC.feed.videoItem(raw_item);
                            break;
                        case 'attachment':
                            feed_item_body += OC.feed.uploadItem(raw_item);
                            break;
                    }
                } else if (raw_item.action_type === 'favorite'){
                    feed_item_body += 'created a folder ';
                    feed_item_body += OC.feed.url(raw_item);
                    feed_item_body += OC.feed.date(raw_item);
                }
            }

            raw_item.feed_body = feed_item_body;
            feed_item_html = OC.feed.wrapper(raw_item);

            // Return the build feed item.
            return feed_item_html;
        }
    });

});