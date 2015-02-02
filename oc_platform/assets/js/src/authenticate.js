define(['core_light'], function(OC){
    var _spinner,
        plusButton = document.querySelector('.google-plus-button'),
        _authenticationLock;

    var Authenticate = {
        organization: {
            hostDomainMap: {
                'curriculum.teachforindia.org': 'teachforindia.org'
            },
            hasPermission: function(domain){
                if (_authenticationLock)
                    return this.hostDomainMap[location.hostname] === domain;
                else return true;
            },
        },
        google: {
            callback: function(response){
                // Did it authenticate?
                // NOTE: Response has a 'status' object with props 'google_logged_in'
                //     and 'signed_in' for better log in checking.
                if (response.error){
                    OC.$.addClass(plusButton, 'show');
                    _spinner.stop();
                } else {
                    Authenticate.google.fetch(response);
                }
            },

            fetch: function(response){
                // Get the user's email address from another OAuth2 request
                var user;

                gapi.client.load('oauth2', 'v2', function(){
                    var emailRequest = gapi.client.oauth2.userinfo.get();
                    emailRequest.execute(function (profile) {
                        user = {
                            id: profile.id,
                            email: profile.email,
                            firstName: profile.given_name,
                            lastName: profile.family_name,
                            profilePic: profile.picture + '?sz=200',
                            url: profile.link,
                            gender: profile.gender,
                            domain: profile.hd
                        };

                        // If the user doesn't belong to this domain.
                        if (! profile.hasOwnProperty('hd') || (
                            ! Authenticate.organization.hasPermission(profile.hd))){
                            OC.utils.messageBox.set('Please sign in with your school / district account and refresh to proceed.');
                            OC.utils.messageBox.show();
                            _spinner.stop();
                        } else {
                            Authenticate.google.login(user);
                        }
                    });
                });
            },

            login: function(user){
                require(['atomic'], function(atomic){
                    atomic.post('/google-login/', user)
                    .success(function(response, xhr){
                        Authenticate.google.loggedIn(response);
                    });
                });
            },

            loggedIn: function(response){
                if (response.hasOwnProperty('new')){
                    var tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);

                    document.cookie = 'onboard=false; expires=' + tomorrow.toUTCString();
                    location.reload();
                }
            }
        },

        spinnerOptions: {
            lines: 15, length: 4, width: 2, radius: 6, corners: 0.9,
            rotate: 75, direction: 1, color: OC.config.palette.dark,
            speed: 1, trail: 79, shadow: false, hwaccel: false,
            className: 'spinner', zIndex: 12, top: '60%', left: '50%'
        }
    };


    window.plusCallback = function(result){
        return Authenticate.google.callback(result);
    };

    window.renderPlus = function(){
        gapi.signin.render('google-plus-button', {
            'callback': 'plusCallback',
            'clientid': '747453362533.apps.googleusercontent.com',
            'cookiepolicy': 'single_host_origin',
            'scope': OC.config.hasOwnProperty('organization') ? 'email https://www.googleapis.com/auth/drive.readonly ' +
                'https://www.googleapis.com/auth/calendar' : 'email',
        });
    };

    // By default, turn on the lock for protected login.
    if (location.search.replace('?', '').split('&').indexOf('lock=false') === -1)
        _authenticationLock = true;
    else _authenticationLock = false;

    require(['spin'], function(Spinner){
        _spinner = new Spinner(Authenticate.spinnerOptions).spin(
            document.querySelector('.login-loader'));

        require(['plus']);
    });
});