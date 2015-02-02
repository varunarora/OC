define(['core_light'], function(OC){
    OC.views = {};

    (function(){
        function resizeMenu(){
            document.querySelector('.org-profile-page').style.height = (
                window.innerHeight + 'px');
        }

        resizeMenu();
        window.addEventListener('resize', resizeMenu);
    })();

    OC.resize = function(){
        document.querySelector('.content-panel').style.width = (
            parseInt(OC.$.css(document.querySelector('body'), 'width'), 10) - 75) + 'px';

        document.querySelector('.content-panel-body-wrapper').style.height = (
            parseInt(window.innerHeight, 10) - parseInt(OC.$.css(document.querySelector('.content-panel header'), 'height'), 10) + 'px');

        var contentPanelBody = document.querySelector('.content-panel-body');
        if (contentPanelBody){
            var headerWrapperWidth = parseInt(OC.$.css(document.querySelector('.content-panel .header-wrapper'), 'width'), 10);

            if (! OC.config.hasOwnProperty('bodyWidth'))
                OC.config.bodyWidth = (parseInt(OC.$.css(document.querySelector('.content-panel header'), 'width'), 10) /
                    headerWrapperWidth).toFixed(2);
        
            contentPanelBody.style.width = (headerWrapperWidth * OC.config.bodyWidth) + 'px';
        }

        OC.$.addClass(document.querySelector('.content-panel'), 'show');

        if (OC.config.page === 'curriculum') OC.curriculum.resized = true;
    };

    OC.spinner = {
        options: {
            lines: 15, // The number of lines to draw
            length: 4, // The length of each line
            width: 2, // The line thickness
            radius: 6, // The radius of the inner circle
            corners: 0.9, // Corner roundness (0..1)
            rotate: 75, // The rotation offset
            direction: 1, // 1: clockwise, -1: counterclockwise
            color: OC.config.palette.dark, // #rgb or #rrggbb or array of colors
            speed: 1, // Rounds per second
            trail: 79, // Afterglow percentage
            shadow: false, // Whether to render a shadow
            hwaccel: false, // Whether to use hardware acceleration
            className: 'spinner', // The CSS class to assign to the spinner
            zIndex: 2, // The z-index (defaults to 2000000000)
            top: '50%', // Top position relative to parent
            left: '50%' // Left position relative to parent
        }
    };

    var search = function(){
        var input = document.querySelector('input[name="q"]'),
            value, ignoreEvents = [37, 38, 39, 40], currentTime,
            lastInputTimestamp, listItem;

        // Setup the search results box.
        var results = document.querySelector('.search-results');

        if (! results){
            var resultList = document.createElement('div');
            resultList.className = 'search-results';

            document.body.appendChild(resultList);

            results = document.querySelector('.search-results');
        }

        results.style.top = input.getBoundingClientRect().top + OC.$.outerHeight(input) + 'px';
        results.style.left = input.getBoundingClientRect().left + 'px';
        results.style.width = '434px';
        results.style.minHeight = OC.$.outerHeight(input) + 'px';

        var searchFilterTimeout;

        function add(item){
            var listItem = document.createElement('a');
            listItem.href = item.url;

            if (item.type === 'resource'){
                listItem.innerHTML = item.title;
            } else {
                var thumbnail = document.createElement('img');
                thumbnail.className = 'search-result-thumbnail';
                thumbnail.src = item.picture;

                var body = document.createElement('div'),
                    title = document.createElement('div'),
                    support = document.createElement('div');

                body.className = 'search-result-body';
                title.className = 'search-result-title';
                support.className = 'search-result-support';

                title.innerHTML = item.name;
                support.innerHTML = item.profession;

                listItem.appendChild(thumbnail);

                body.appendChild(title);
                body.appendChild(support);
                listItem.appendChild(body);
            }
            results.appendChild(listItem);
        }

        function search(value){
            require(['atomic'], function(atomic){
                return setTimeout(function(){
                    // Perform search.
                    atomic.get('/resources/api/search/' + value  + '/')
                    .success(function(response, xhr){
                        results.innerHTML = '';
                        OC.$.removeClass(results, 'loading');

                        response.map(function(item){
                            add(item);
                        });

                        var siteSearch = document.createElement('a');
                        siteSearch.className = 'site-search';
                        siteSearch.innerHTML = 'Search for "' + value + '"';
                        results.appendChild(siteSearch);

                        OC.$.addListener(document.querySelector('.site-search'),
                            'click', function(event){
                                document.getElementById('search-form').submit();
                            });
                    });
                }, 500);
            });
        }

        function seek(event){
            if (ignoreEvents.indexOf(event.which) === -1){
                if (input.value.length > 1) {
                    OC.$.addClass(results, 'show');
                    OC.$.addClass(results, 'loading');

                    currentTime = new Date().getTime();
                    if (lastInputTimestamp){
                        delta = (currentTime - lastInputTimestamp) / 1000;
                        if (delta < 0.5){
                            clearTimeout(searchFilterTimeout);
                        }

                        searchFilterTimeout = search(input.value);
                    }
                        lastInputTimestamp = currentTime;
                } else {
                    clearTimeout(searchFilterTimeout);

                    results.innerHTML = '';
                    OC.$.removeClass(results, 'loading');
                    OC.$.removeClass(results, 'show');
                }
            }
        }

        OC.$.addListener(input, 'keyup', seek);

        OC.$.addListener(document.body, 'click', function(event){
            if (event.target.name !== 'q') OC.$.removeClass(results, 'show');
        });

    };

    function onboard(){
        // Build background.
        var background = document.createElement('div');
        background.className = 'onboard-background';

        // Place message.
        var message = '<div class="onboard-message-body"><div class="onboard-message-body-title">' +
            'Welcome, ' + OC.config.user.name + '!</div>It\'s great to have you here! ' +
            'Learn about all the things you can do by clicking on the icons ' +
            'in the left column.<p>To find ready-made curriculum materials, ' +
            'use the \'Search\' and \'Explore\' options at the top of the page.</p>' +
            '<p>Thank you, and enjoy!</p></div>' + '<button class="oc-button close-onboard-message">Close message</button>',
            messageEl = document.createElement('div');

        messageEl.innerHTML = message;
        messageEl.className = 'onboard-message';

        document.body.appendChild(background);
        document.body.appendChild(messageEl);

        // Set styling on message.
        messageEl = document.querySelector('.onboard-message');
        background = document.querySelector('.onboard-background');

        function position(){
            var leftPanelWidth = parseInt(OC.$.css(background, 'left'), 10),
                halfOfBackground = (window.innerWidth - leftPanelWidth) / 2;

            messageEl.style.left = leftPanelWidth + halfOfBackground - (
                parseInt(OC.$.outerWidth(messageEl), 10) / 2) + 'px';
        }

        position();
        OC.$.addListener(window, 'resize', position);

        // Popout search input and explore button on the top.
        var search = document.querySelector('input[name="q"]'),
            explore = document.querySelector('.content-panel-header-search-bar-explore');

        OC.$.addClass(search, 'pop');
        OC.$.addClass(explore, 'pop');

        // Close the close button to eliminating the two nodes.
        OC.$.addListener(document.querySelector('button.close-onboard-message'), 'click',
            function(event){
                document.body.removeChild(messageEl);
                document.body.removeChild(background);

                OC.$.removeClass(search, 'pop');
                OC.$.removeClass(explore, 'pop');
            }
        );

        // Add gravity tooltips to each of the icons on the left.
        var menuTips = {
            '.menu-logo': '<span class="tip-title">Home</span>Find out what\'s new with ' +
                'people you follow.',
            '.menu-profile-item': '<span class="tip-title">Profile</span>See what you have been upto lately ' +
                'and change what people see about you.',
            '.menu-curricula-item': '<span class="tip-title">Curricula</span>Create, see and manage curricula for your subjects. ',
            '.menu-planner-item': '<span class="tip-title">Planner</span>Classes you teach and units you cover on a calendar.',
            '.menu-files-item': '<span class="tip-title">Files</span>All your documents, uploads and links organized in folders.',
            '.menu-favorites-item': '<span class="tip-title">Favorites</span>Lessons, activities, worksheets and other resources you '+
                'liked across the site.',
            '.menu-groups-item': '<span class="tip-title">Groups</span>Conversations with people you teach with.'
        };

        var tipEl;
        for (var tip in menuTips){
            tipEl = document.querySelector(tip);
            tipEl.title = menuTips[tip];

            OC.utils.tip(tipEl, {gravity: 'e'});
        }
    }

    require(['react'], function(React){
        OC.views = {
            Header: React.createClass({
                render: function(){
                    return React.DOM.header({},
                        React.DOM.div({className: 'content-panel-header'}, [
                            React.DOM.div({className: 'content-panel-header-search-bar'}, [
                                React.DOM.form({id: 'search-form', action: '/search', method: 'GET'},
                                    React.DOM.input({type: 'search', name: 'q', title: 'Search', placeholder: 'Search', autoComplete: 'off'})
                                ),
                                React.DOM.a({className: 'content-panel-header-search-bar-explore'}, 'Explore')
                            ]),
                            OC.config.user.id ? React.DOM.div({className: 'content-panel-header-user'},
                                React.DOM.nav({className: 'content-panel-header-user-buttons'}, OC.views.UserHeader())
                            ) : null
                        ])
                    );
                }
            }),

            Notifications: React.createClass({
                renderNotification: function(notification){
                    return OC.views.Notification({
                        notification: notification,
                        //reviewChange: this.props.reviewChange,
                        //dismissChange: this.props.dismissChange
                    });
                },
                componentDidUpdate: function(){
                    OC.utils.menu(this.getDOMNode(),
                        document.querySelector('.user-notification-count > a'));
                },
                render: function(){
                    return React.DOM.nav({className: 'oc-menu notifications-menu' + (this.props.open ? ' show-menu' : '')}, [
                        React.DOM.div({className: 'floating-menu-spacer'}, null),
                        React.DOM.ul({},
                            this.props.notifications.length > 0 ? (this.props.notifications.map(
                                this.renderNotification)): React.DOM.li({className: 'no-notification-contents'}, 'You have no notifications.')
                        )
                    ]);
                }
            }),


            Notification: React.createClass({
                reviewChange: function(){
                    //this.props.reviewChange(this.props.notification);
                },
                dismissChange: function(){
                    //this.props.dismissChange(this.props.notification);
                },
                render: function(){
                    return React.DOM.li({},
                        React.DOM.a({
                            className: 'notification' + (this.props.notification.read ? '' : ' new-notification'),
                            href: this.props.notification.url
                        }, this.props.notification.description)
                        /*React.DOM.div({
                            className: 'notification' + (this.props.notification.read ? '' : ' new-notification'),
                            href: this.props.notification.url
                        }, [
                            React.DOM.div({className: 'notification-message'}, this.props.notification.description),
                            React.DOM.div({className: 'notification-actions'}, [
                                React.DOM.button({
                                    className: 'notification-action-review explorer-button-small',
                                    onClick: this.reviewChange
                                }, 'Review'),
                                React.DOM.button({
                                    className: 'notification-action-dismiss explorer-button-small explorer-dull-button-small',
                                    onClick: this.dismissChange
                                }, 'Dismiss')
                            ])
                        ])*/
                    );
                }
            }),

            UserMenu: React.createClass({
                render: function(){
                    return React.DOM.nav({className: 'oc-menu user-menu' + (this.props.open ? ' show-menu' : '')}, [
                        React.DOM.div({className: 'floating-menu-spacer'}, null),
                        React.DOM.ul({},
                            React.DOM.li({}, React.DOM.a({
                                href: OC.config.urls.profile
                            }, 'View my profile')),
                            React.DOM.li({}, React.DOM.a({
                                href: OC.config.urls.preferences
                            }, 'My preferences')),
                            React.DOM.li({}, React.DOM.a({
                                href: OC.config.urls.logout
                            }, 'Logout'))
                        )
                    ]);
                }
            }),

            UserHeader: React.createClass({
                getInitialState: function(){
                    return {showNotifications: false, showUserMenu: false, notifications: []};
                },
                fetch: function(){
                    var view = this;
                    (function pollForUpdates(){
                        setTimeout(function(){
                            var serializedRequest = {
                                //curriculum_id: view.props.id,
                                //synced_to_id: syncedTo,
                                //latest_notification_id: view.props.notifications.length > 0 ? (
                                //    view.props.notifications.max(function(n){return n.id;})) : 0
                            };
                            
                            require(['atomic'], function(atomic){
                                atomic.post('/user/api/notifications/', serializedRequest)
                                .success(function(response, xhr){
                                    if (!response.hasOwnProperty('status')){
                                        view.setState({ notifications: response});
                                        //return view.props.notifications.concat(response.notifications);

                                    // Setup the next poll recursively.
                                    // pollForUpdates();
                                    }
                                });
                            });
                        }, 0);
                    })();
                },
                componentDidMount: function(){
                    this.fetch();
                },
                toggleShowNotifications: function(){
                    var view = this;

                    this.setState({showNotifications: !this.state.showNotifications}, function(){
                        if (this.state.showNotifications){
                            this.dismissNotifications();

                            var view = this, body = document.querySelector('body');
                            body.addEventListener('click', function hideNotifications(event){
                                if (view.getDOMNode() !== event.target && !view.getDOMNode(
                                    ).contains(event.target)){
                                    view.setState({showNotifications: false});

                                    body.removeEventListener('click', hideNotifications);
                                }
                            });
                        }
                    });
                },
                toggleUserMenu: function(){
                    var view = this;

                    this.setState({showUserMenu: !this.state.showUserMenu}, function(){
                        if (this.state.showUserMenu){
                            var view = this, body = document.querySelector('body');
                            body.addEventListener('click', function hideMenu(event){
                                if (view.getDOMNode() !== event.target && !view.getDOMNode(
                                    ).contains(event.target)){
                                    view.setState({showUserMenu: false});

                                    body.removeEventListener('click', hideMenu);
                                }
                            });
                        }
                    });
                },
                dismissNotifications: function(){
                    var unreadNotifications = []; notifications = [];
                    this.state.notifications.forEach(function(notification){
                        if (notification.read === false) {
                            unreadNotifications.push(notification.id);
                            notification.read = true;
                        }

                        notifications.push(notification);
                    });
                    this.setState({ notifications: notifications });

                    if (unreadNotifications.length > 0)
                        require(['atomic'], function(atomic){
                            atomic.get('/user/api/notifications/dismiss/' + OC.config.user.id + '/?ids=' + unreadNotifications.join(','))
                            .success(function(response, xhr){});
                        });
                },
                getUnreadCount: function(){
                    var unreadCount = 0;
                    this.state.notifications.forEach(function(notification){
                        if (notification.read === false) unreadCount += 1;
                    });

                    return unreadCount;
                },
                render: function(){
                    var unreadCount = this.getUnreadCount();
                    return React.DOM.ul({},
                        React.DOM.li({
                            className: 'user-notification-count unread-notifications',
                            title: 'Notifications'
                        }, [
                                unreadCount > 0 ? React.DOM.span({className: 'user-notification-count-box'}, unreadCount) : null,
                                React.DOM.a({onClick: this.toggleShowNotifications}, null),
                                OC.views.Notifications({notifications: this.state.notifications, open: this.state.showNotifications})
                            ]
                        ),
                        React.DOM.li({}, [
                            React.DOM.a({onClick: this.toggleUserMenu, className: 'content-panel-header-user-dropdown'}, [
                                React.DOM.span({
                                    className: 'content-panel-header-user-picture',
                                    style: {
                                        backgroundImage: 'url(\'' + OC.config.user.thumbnail + '\')'
                                    }
                                }, null),
                                React.DOM.span({className: 'content-panel-header-user-firstname-assistant'}, null),
                            ]),
                            OC.views.UserMenu({open: this.state.showUserMenu})
                        ])
                    );
                }
            })
        };

        if (OC.config.page !== 'curriculum'){
            React.renderComponent(OC.views.Header(),
                document.querySelector('.header-wrapper'), function(){
                    OC.resize();
                    window.addEventListener('resize', OC.resize);

                    if (OC.config.user.id){
                        OC.utils.menu(document.querySelector('.user-menu'),
                            document.querySelector('.content-panel-header-user-dropdown'));
                    }
                });
        }
        
        search();

        // Onboard if the user hasn't been onboarded; use cookeies to check.
        if (OC.utils.getCookie('onboard') === 'false'){
            onboard();

            var yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            document.cookie = 'onboard=true; ' + yesterday.toUTCString();
        }

        var curriculumCollaborators = document.querySelectorAll(
            '.list-item-collaborator'), i;

        for (i = 0; i < curriculumCollaborators.length; i++){
            OC.utils.tip(curriculumCollaborators[i]);
        }

    });

    return OC.views;
});