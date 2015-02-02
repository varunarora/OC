define(['react', 'core_light'], function(React, OC){
    var Follow = {
        follows: React.createClass({
            componentDidMount: function(){
                var loadButton = document.querySelector('.ajax-loader'),
                loadButtonWrapper = document.querySelector('.ajax-loader-wrapper'),
                view = this, url;

                function loadSpinner(callback){
                    // Set spinner on loading button area.
                    require(['spin'], function(Spinner){
                        if (! Follow.hasOwnProperty('spinner')){
                            Follow.spinner = new Spinner(OC.spinner.options).spin(loadButton);
                        } else Follow.spinner.spin(loadButton);

                        callback();
                    });
                }

                loadSpinner(function(){
                    require(['jquery'], function($){
                        if (Follow.hasOwnProperty('spinner')) Follow.spinner.spin(loadButton);

                        if (OC.follow.context == 'followers') url = '/user/api/followers/';
                        else url = '/user/api/following/';

                        require(['atomic'], function(atomic){
                            atomic.get(url + OC.config.profile.id + '/')
                            .success(function(response, xhr){
                                view.setProps({follows: view.props.follows.concat(response.follows)});
                                
                                OC.$.removeClass(loadButton, 'loading');
                                OC.$.addClass(loadButtonWrapper, 'hide');
                                Follow.spinner.stop();
                            });
                        });
                    });
                });
            },
            renderUser: function(follow){
                return Follow.follow(follow);
            },

            render: function(){
                if (OC.follow.followerCount > 0)
                    return React.DOM.div({},
                        this.props.follows.map(this.renderUser));
                else
                    return React.DOM.div({className: 'empty-state-title empty-state-title-independent'}, 'No followers.');
            }
        }),

        follow: React.createClass({
            getInitialState: function(){
                return {following: this.props.following};
            },
            follow: function(){
                var view = this;
                this.setState({following: !this.state.following}, function(){
                    require(['atomic'], function(atomic){
                        atomic.get('/user/api/subscribe/' + (view.props.id ? view.props.id : OC.config.profile.id) + '/')
                        .success(function(response, xhr){
                            if (response.status !== 'true'){
                                view.setState({following: !view.state.following});
                            }
                        });
                    });
                });
            },
            render: function(){
                return React.DOM.div({className: 'profile-box-social-user'}, [
                    React.DOM.div({className: 'profile-box-social-user-info'}, [
                        React.DOM.div({
                            className: 'profile-box-social-user-thumbnail box-user-thumbnail',
                            style: {
                                backgroundImage: 'url(\'' + this.props.thumbnail + '\')'
                            }
                        }, null),
                        React.DOM.div({className: 'profile-box-social-user-description box-user-description'}, [
                            React.DOM.a({ href: this.props.url }, this.props.name),
                            React.DOM.div({className: 'profile-box-social-user-description-headline box-user-description-headline'}, this.props.headline)
                        ])
                    ]),
                    React.DOM.div({className: 'profile-box-social-user-actions'},
                        React.DOM.button({
                            className: 'oc-button' + (this.state.following ? ' oc-dull-button' : ''),
                            onClick: this.follow
                        }, this.state.following ? 'Unfollow' : 'Follow')
                    )
                ]);
            }
        }),
    };

    React.renderComponent(
        Follow.follows({follows: []}),
        document.querySelector('.profile-box-social-users')
    );

    //return Feed;
});