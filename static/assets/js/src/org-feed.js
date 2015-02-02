define(['react', 'core_light'], function(React, OC){
    var Feed = {
        items: [],
        fetching: false,
        feeds: React.createClass({
            componentDidUpdate: function(){
                var dates = this.getDOMNode().querySelectorAll('.feed-item-date');
                var i; for (i = 0; i < dates.length; i++) OC.utils.timeago(dates[i]);
            },
            componentWillMount: function(){
                var loadButton = document.querySelector('.ajax-loader'),
                    loadButtonWrapper = document.querySelector('.ajax-loader-wrapper'), i, view = this,
                    wrapper = document.querySelector('.content-panel-body-wrapper'),
                    contentPanel = document.querySelector('.content-panel');

                function loadSpinner(){
                    // Set spinner on loading button area.
                    require(['spin'], function(Spinner){
                        if (! Feed.hasOwnProperty('spinner')){
                            Feed.spinner = new Spinner(OC.spinner.options).spin(loadButton);
                        } else Feed.spinner.spin(loadButton);
                    });
                }

                function loadFeed(event){
                    //contentPanel.style.width = parseInt(contentPanel.style.width, 10) - OC.utils.getScrollbarWidth() + 'px';
                    // If the load button is attached to the document.
                    if (document !== loadButton && document.contains(loadButton)){
                       if ((loadButtonWrapper.offsetTop - (wrapper.offsetTop + parseInt(wrapper.style.height, 10)) < wrapper.scrollTop ) && (
                        !OC.$.hasClass(loadButton, 'loading'))){
                            OC.$.addClass(loadButton, 'loading');

                            if (Feed.hasOwnProperty('spinner')) Feed.spinner.spin(loadButton);
                            
                            if (Feed.fetching === false){
                                Feed.fetching = true;
                                require(['atomic'], function(atomic){
                                    atomic.get('/user/api/load-feed/' + OC.feed.context + '/' + OC.config.profile.id +
                                        '/from/' + OC.feed.currentCount + '/')
                                    .success(function(response, xhr){
                                        if (response.status == 'true'){
                                            view.setProps({items: view.props.items.concat(response.feeds)}, function(){
                                                Feed.fetching = false;
                                            });
                                            OC.feed.currentCount += response.feeds.length;
                                        }
                                        else {
                                            //OC.popup(response.message, response.title);
                                        }
                                        
                                        OC.$.removeClass(loadButton, 'loading');
                                        Feed.spinner.stop();
                                    });
                                });
                            }
                        }
                    }
                }

                if (OC.feed.feedCount > 0){
                    loadSpinner();
                    loadFeed();
                    OC.$.addListener(wrapper, 'scroll', loadFeed);
                }
            },

            renderItem: function(item){
                return Feed.item({item: item});
            },

            render: function(){
                var empty, emptySuggestions = React.DOM.div({}, [
                    React.DOM.div({className: 'empty-state-title empty-state-title-independent empty-state-title-independent-large'},
                        'Subscribe to someone for the latest and greatest'),
                    Feed.subscribeSuggestions({suggestions: OC.feed.suggestions})
                ]);
                if (OC.config.profile.id === OC.config.user.id)
                    empty = React.DOM.div({className: 'empty-state-title empty-state-title-independent'}, 'You have no activity to show');
                else
                    empty = React.DOM.div({className: 'empty-feed empty-external-feed'},
                        React.DOM.div({className: 'empty-state-title'}, 'Looks like ' + (
                            OC.config.profile.name + ' hasn\'t done much on the site lately'))
                    );

                return React.DOM.div({className: 'feed-list'}, OC.feed.feedCount > 0 ? (
                    this.props.items.map(this.renderItem)) : (OC.feed.context === 'profile' ? (
                        empty) : emptySuggestions)
                    );
            }
        }),

        item: React.createClass({
            getInitialState: function(){
                return { videoLoaded: false };
            },
            loadAndPlay: function(){
                this.setState({videoLoaded: true});
            },
            date: function(date){
                return React.DOM.span({className: 'feed-item-date', title: date }, null);
            },
            url: function(url, text){
                return React.DOM.a({href: url}, text);
            },
            urlItem: function(targetThumbnail, target, url, urlHost){
                return React.DOM.a({className: 'feed-link', 'href': url, 'target': '_blank'}, [
                    React.DOM.div({
                        className: 'feed-link-thumbnail',
                        style: {
                            backgroundImage: 'url(\'' + targetThumbnail + '\')'
                        }}),
                    React.DOM.div({
                        className: 'feed-link-link-wrapper'}, [
                        React.DOM.div({className: 'feed-link-link'}, target),
                        React.DOM.div({className: 'feed-link-url'}, urlHost)
                    ])
                ]);
            },

            videoItem: function(videoTag, targetThumbnail, targetProvider, target, url, urlHost){
                return React.DOM.div({className: 'feed-video'}, [
                    this.state.videoLoaded ? (
                        this.props.item.target_provider === 'youtube' ? (
                            React.DOM.iframe({
                                height: 282,
                                width: 502,
                                frameBorder: 0,
                                allowFullScreen: true,
                                src:  'http://www.youtube.com/embed/' + (
                                    this.props.item.target_video_tag + '?wmode=opaque&autoplay=1')
                            })
                        ) : (
                            React.DOM.iframe({
                                height: 282,
                                width: 502,
                                frameBorder: 0,
                                allowFullScreen: true,
                                src: 'http://player.vimeo.com/video/' + this.props.item.target_video_tag + (
                                    '?title=0&amp;byline=0&amp;portrait=0&amp;badge=0&amp;color=ffffff')
                            })
                        )
                    ): (React.DOM.div({
                        className: 'video-placeholder youtube-video-placeholder feed-link-thumbnail',
                        style: {
                            backgroundImage: 'url(\'' + targetThumbnail + '\')'
                        }},
                        React.DOM.div({
                            className: 'video-placeholder-cover',
                            onClick: this.loadAndPlay
                        })
                    )),
                    React.DOM.a({
                        className: 'feed-link-link-wrapper', href: url, target: '_blank'}, [
                        React.DOM.div({className: 'feed-link-link'}, target),
                        React.DOM.div({className: 'feed-link-url'}, urlHost)
                    ])
                ]);
            },

            uploadItem: function(targetThumbnail, target, url, downloadURL, size){
                return React.DOM.div({className: 'feed-upload'}, [
                    React.DOM.div({
                        className: 'feed-upload-thumbnail',
                        style: {
                            backgroundImage: 'url(\'' + targetThumbnail + '\')'
                        }
                    }),
                    React.DOM.div({ className: 'feed-upload-description' }, [
                        React.DOM.a({ href: url, className: 'feed-upload-description-title'}, target),
                        
                        React.DOM.div({ className: 'feed-upload-description-download'}, [
                            React.DOM.a({ href: downloadURL, target: '_blank' }, 'Download'),
                            React.DOM.span({ href: url }, ' · ' + size)
                        ])
                    ])
                ]);
            },

            commentItem: function(comment){
                return React.DOM.div({className: 'feed-comment'},
                    React.DOM.blockquote({
                        dangerouslySetInnerHTML: {
                            __html: comment
                        }
                    })
                );
            },

            newPost: function(url){
                return React.DOM.a({ href: url }, 'new post');
            },
            
            post: function(url){
                return React.DOM.a({ href: url }, 'discussion post');
            },

            group: function(contextURL, context){
                return React.DOM.a({ href: contextURL }, context);
            },

            membership: function(url, text){
                return React.DOM.a({ href: url }, text);
            },

            groupItem: function(url, targetThumbnail, targetThumbnailPosition, target, memberCount){
                return React.DOM.a({className: 'feed-group', href: url}, [
                    React.DOM.div({
                        className: 'feed-group-thumbnail',
                        style: {
                            backgroundImage: 'url(\'' + targetThumbnail + '\')',
                            backgroundPosition: targetThumbnailPosition[0] + '% ' + targetThumbnailPosition[1] + '%'
                        }}),
                    React.DOM.div({
                        className: 'feed-group-link-wrapper'}, [
                        React.DOM.div({className: 'feed-group-link'}, target),
                        React.DOM.div({className: 'feed-group-count'}, memberCount + ' members')
                    ])
                ]);
            },

            folderItem: function(target, url){
                return React.DOM.a({className: 'feed-folder', href: url, }, [
                    React.DOM.div({
                        className: 'feed-folder-thumbnail'
                    }),
                    React.DOM.div({ className: 'feed-folder-description' }, [
                        React.DOM.div({className: 'feed-folder-description-title'}, target),
                    ])
                ]);
            },

            discussionItem: function(targetUserThumbnail, targetUserURL, targetUser, target, action){
                return React.DOM.div({className: 'feed-comment feed-comment-discussion-response'}, [
                    React.DOM.div({
                        className: 'feed-comment-user-photo',
                        style: {
                            backgroundImage: 'url(\'' + targetUserThumbnail + '\')'
                        }
                    }, null),
                    React.DOM.div({className: 'feed-comment-user-description'},
                        React.DOM.a({href: targetUserURL,}, targetUser),
                        React.DOM.span({
                            dangerouslySetInnerHTML: {
                                __html: target
                            }
                        }),
                        React.DOM.blockquote({
                            dangerouslySetInnerHTML: {
                                __html: action
                            }
                        })
                    )
                ]);
            },

            render: function(){
                var feedItemBody, item = this.props.item,
                    actor = parseInt(OC.config.user.id, 10) === parseInt(item.actor_id, 10) ? React.DOM.span(
                    {}, 'You'): React.DOM.a({href: item.actor_url}, item.actor_name);

                if (item.action_type === 'resource'){
                    if (item.target_type == 'url'){
                        feedItemBody = React.DOM.div({className: 'feed-item-description-url'}, [
                            actor,
                            React.DOM.span({}, ' created a new link.'),
                            this.date(item.target_created),
                            this.urlItem(item.target_thumbnail, item.target, item.target_direct_url, item.target_direct_url_host)
                        ]);

                    } else if (item.target_type == 'document'){
                        feedItemBody = React.DOM.div({className: 'feed-item-description-document'}, [
                            actor,
                            React.DOM.span({}, ' created a new document '),
                            React.DOM.a({href: item.target_direct_url}, item.target),
                            this.date(item.target_created)
                        ]);

                    } else if (item.target_type == 'video'){
                        feedItemBody = React.DOM.div({className: 'feed-item-description-video'}, [
                            actor,
                            React.DOM.span({}, ' added a video.'),
                            this.date(item.target_created),
                            this.videoItem(item.target_video_tag, item.target_thumbnail,
                                item.target_provider, item.target, item.target_direct_url, item.target_direct_url_host)
                        ]);

                    } else if (item.target_type == 'attachment'){
                        feedItemBody = React.DOM.div({className: 'feed-item-description-upload'}, [
                            actor,
                            React.DOM.span({}, ' uploaded a new file.'),
                            this.date(item.target_created),
                            this.uploadItem(item.target_thumbnail, item.target,
                                item.target_url, item.target_download_url, item.target_size)
                        ]);
                    }
                } else if (item.action_type === 'comment'){
                    if (item.target_type === 'resource'){
                        feedItemBody = React.DOM.div({className: 'feed-item-description-comment'}, [
                            actor,
                            React.DOM.span({}, ' commented on the resource '),
                            this.url(item.target_url, item.target),
                            React.DOM.span({}, '.'),
                            this.date(item.action_created),
                            this.commentItem(item.action)
                        ]);
                    } else if (item.target_type === 'comment'){
                        if (item.action_id === item.target_id){
                            feedItemBody = React.DOM.div({className: 'feed-item-description-comment'}, [
                                actor,
                                React.DOM.span({}, ' wrote a '),
                                this.newPost(item.target_url),
                                React.DOM.span({}, ' in '),
                                this.group(item.context_url, item.context),
                                React.DOM.span({}, '.'),
                                this.date(item.action_created),
                                this.commentItem(item.action)
                            ]);
                        } else {
                            feedItemBody = React.DOM.div({className: 'feed-item-description-comment'}, [
                                actor,
                                React.DOM.span({}, ' commented on a '),
                                this.post(item.target_url),
                                React.DOM.span({}, ' in '),
                                this.group(item.context_url, item.context),
                                React.DOM.span({}, '.'),
                                this.date(item.action_created),
                                this.discussionItem(item.target_user_thumbnail, item.target_user_url,
                                    item.target_user, item.target, item.action)
                            ]);
                        }
                    }
                } else if (item.action_type === 'membership'){
                    feedItemBody = React.DOM.div({className: 'feed-item-description-membership'}, [
                        actor,
                        React.DOM.span({}, ' just joined the group '),
                        this.membership(item.target_url, item.target),
                        this.date(item.action_joined),
                        this.groupItem(item.target_url, item.target_thumbnail, item.target_thumbnail_position,
                            item.target, item.target_member_count)
                    ]);
                } else if (item.action_type === 'project'){
                    feedItemBody = React.DOM.div({className: 'feed-item-description-group'}, [
                        actor,
                        React.DOM.span({}, ' created the group '),
                        this.membership(item.target_url, item.target),
                        this.date(item.target_created),
                        this.groupItem(item.action_url, item.action_thumbnail, item.action_thumbnail_position,
                            item.action, item.action_member_count)
                    ]);

                } else if (item.action_type === 'favorite'){
                    var foreignItem;
                    switch (item.target_type) {
                        case 'url':
                            foreignItem = this.urlItem(item.target_thumbnail, item.target,
                                item.target_direct_url, item.target_direct_url_host);
                            break;
                        case 'video':
                            foreignItem = this.videoItem(item.target_video_tag, item.target_thumbnail,
                                item.target_provider, item.target, item.target_direct_url, item.target_direct_url_host);
                            break;
                        case 'attachment':
                            foreignItem = this.uploadItem(item.target_thumbnail, item.target,
                                item.target_url, item.target_download_url, item.target_size);
                            break;
                    }

                    feedItemBody = React.DOM.div({className: 'feed-item-description-group'}, [
                        actor,
                        React.DOM.span({}, ' favorited '),
                        this.url(item.target_user_url, item.target_user),
                        React.DOM.span({}, '\'s resource '),
                        this.url(item.target_url, item.target),
                        this.date(item.action_created),
                        foreignItem
                    ]);

                } else if (item.action_type === 'collection'){
                    feedItemBody = React.DOM.div({className: 'feed-item-description-folder'}, [
                        actor,
                        React.DOM.span({}, ' created a new folder.'),
                        this.date(item.target_created),
                        this.folderItem(item.target, item.target_url)
                    ]);
                }

                return React.DOM.div({className: 'feed-item'}, [
                    React.DOM.a({
                        href: item.actor_url,
                        className: 'feed-item-user-thumbnail',
                        style: {
                            backgroundImage: 'url(\'' + item.actor_thumbnail + '\')'
                        },
                        title: item.actor_name
                    }),
                    React.DOM.div({className: 'feed-item-description'},
                        feedItemBody
                    )
                ]);
            },
        }),

        subscribe: React.createClass({
            //<button class="oc-button profile-box-feed-subscribe">Subscribe</button>
            getInitialState: function(){
                return {subscribed: this.props.subscribed};
            },
            subscribe: function(){
                var view = this;
                this.setState({subscribed: !this.state.subscribed}, function(){
                    require(['atomic'], function(atomic){
                        atomic.get('/user/api/subscribe/' + (view.props.id ? view.props.id : OC.config.profile.id) + '/')
                        .success(function(response, xhr){
                            if (response.status !== 'true'){
                                view.setState({subscribed: !view.state.subscribed});
                                //OC.popup(response.message, response.title);
                            }
                        });
                    });
                });
            },
            render: function(){
                return React.DOM.button({
                    className: 'oc-button feed-subscribe' + (
                        this.state.subscribed ? ' feed-unsubscribe' : ''),
                    onClick: this.subscribe
                },
                    this.state.subscribed ? '★ Following' : 'Follow'
                );
            }
        }),

        subscribeSuggestion: React.createClass({
            getInitialState: function(){
                return {subscribed: false};
            },
            render: function(){
                return React.DOM.div({className: 'home-profile-suggestion'}, [
                    React.DOM.a({
                        className: 'home-profile-suggestion-thumbnail',
                        href: this.props.url,
                        style: {
                            borderColor: OC.config.palette.base,
                            backgroundImage: 'url(\'' + this.props.thumbnail + '\')'
                        }
                    }),
                    React.DOM.a({
                        className: 'home-profile-suggestion-cover',
                        href: this.props.url,
                        style: {
                            backgroundColor: OC.config.palette.dark
                        }
                    }, this.props.name),
                    React.DOM.div({className: 'home-profile-suggestion-wrapper-subscribe feed-subscribe-wrapper'},
                        Feed.subscribe({ subscribed: this.state.subscribed, id: this.props.id })
                    )
                ]);
            }
        }),

        subscribeSuggestions: React.createClass({
            renderSuggestion: function(suggestion){
                return Feed.subscribeSuggestion(suggestion);
            },
            render: function(){
                return React.DOM.div({className: 'suggestion-list'},
                    this.props.suggestions.map(this.renderSuggestion)
                );
            }
        }),
    };

    if (OC.config.user.id !== OC.config.profile.id)
        React.renderComponent(
            Feed.subscribe({ subscribed: OC.feed.subscribed }),
            document.querySelector('.profile-box-feed-subscribe-wrapper')
        );

    React.renderComponent(
        Feed.feeds({items: Feed.items}),
        document.querySelector('.feed-list-wrapper')
    );

    return Feed;
});