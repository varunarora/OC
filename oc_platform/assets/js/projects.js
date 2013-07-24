OC.projects = {
    addMemberHandler: function(response) {
        if (response.status === 'true') {
            // Create a new <div> object and set the contents to the new
            //     username.
            var newMember = $('<div/>', {
                text: response.user.username
            });

            var newMemberTemplate = _.template('<div class="member">' +
                    '<div class="member-info"><div class="member-photo">' +
                    '<img src="<%= id %>" /></div><div class="member-description">' +
                    '<a href="/user/<%= username %>"><%= name %></a></div></div>' +
                    '<div class="member-actions"><form>'+
                    '<input type="hidden" name="user_id" value="<%= id %>" />' +
                    '<input type="hidden" name="project_id" value="' + getProjectID() + '" />' +
                    '<button class="btn dull-button admin-toggle make-admin">Make admin</button>' +
                    '</form></div></div>');

            // TODO(Varun): Attach the event handler to this new member object.

            // Add this member to the top of the list of members.
            $('#member-list').prepend(newMemberTemplate(response.user));
        } else {
            popup(response.message, response.title);
        }
    },

    addAdminHandler: function(response, target) {
        if (response.status === 'true') {
            // Change button text to represent that the user is now an admin.
            target.html('Remove admin');

            target.removeClass('make-admin');
            target.addClass('remove-admin');
        } else {
            popup(response.message, response.title);
        }
    },

    removeAdminHandler: function(response, target) {
        if (response.status === 'true') {
            // Change button text to represent that the user is now an admin.
            target.html('Make admin');

            target.removeClass('remove-admin');
            target.addClass('make-admin');
        } else {
            popup(response.message, response.title);
        }
    },

    getProjectID: function(){
        return $('#project-add-member input[name=project_id]').val();
    },

    adminToggleHandler: function(){
        $('button.admin-toggle').click(function (e) {
            // Show the spinner as soon as the 'Add' button is clicked.
            var spinner = $('#revision-comment .form-spinner');
            spinner.show();

            var userID = $(this).parent().children('input[name=user_id]').val();
            var projectID = $(this).parent().children('input[name=project_id]').val();

            var target = $(this);

            if ($(this).hasClass('make-admin')) {
                // Submit the add request through the project API.
                $.get('/project/' + projectID + '/add-admin/' + userID + '/',
                    function (response) {
                        OC.projects.addAdminHandler(response, target);
                        spinner.hide();
                    }, 'json');
            } else {
                // Submit the add request through the project API.
                $.get('/project/' + projectID + '/remove-admin/' + userID + '/',
                    function (response) {
                        OC.projects.removeAdminHandler(response, target);
                        spinner.hide();
                    }, 'json');
            }

            e.stopPropagation();
            e.preventDefault();
            return false;
        });
    },

    initAddMemberAutocomplete: function(){
        $('#project-add-member input[name=add-member]').autocomplete({
            source: function(request, response){
                $.get('/user/api/list/' + request.term,
                    function (data){
                        response($.map(data, function(item){
                            // TODO (Varun): Remove existing users.
                            return {
                                label: item.name,
                                value: item.username,
                                id: item.id
                            };
                        }));
                    }, 'json');
            },
            minLength: 2,
            select: function(event, ui){
                // Show the spinner as soon as the 'Add' button is clicked
                var spinner = $('#revision-comment .form-spinner');
                spinner.show();

                var projectID = OC.getProjectID();

                // Submit the add request through the project API        
                $.get('/project/' + projectID + '/add/' + ui.item.id + '/',
                    function (response) {
                    OC.projects.addMemberHandler(response);
                    spinner.hide();
                }, 'json');
            }
        });
    },

    initCollectionsTree: function(){
        $('nav.collections-navigation ul li').click(function(){
            $('> ul', this).toggle();
        });
    },

    launch: {
        init: function(){
            this.bindClickScrolls();

            this.renderHeaderAnimation();

            this.renderPlayProjectCreate();

            this.setupProjectsSignupForm();

            // Instantiate tipsy for anchors on projects invite page
            $('.anchor-image').tipsy({gravity: 'n'});
        },

        bindClickScrolls: function(){
            // Bind 'Sign up' button click to the form
            OC.scrollBind('#projects-signup-anchor', '#projects-footer');

            // Bind anchor buttons to relevant block sections.
            OC.scrollBind('#anchor-upload', '#create-share');
            OC.scrollBind('#anchor-organize', '#organize-content');
            OC.scrollBind('#anchor-search', '#discover-content');
            OC.scrollBind('#anchor-social', '#social-content');
        },

        renderHeaderAnimation: function(){
            // Animate background of top block on page load.
            $('#chief-panel-container.projects-launch').addClass('play');
            $('#chief-panel-container #project-computer').addClass('play');
            $('#chief-panel-container #project-mobile').addClass('play');
            $('#chief-panel-container #project-tablet').addClass('play');
        },

        renderPlayProjectCreate: function(){
            function playProjectCreate() {
                $('#create-steps-panel #upload-create')
                    .animate({opacity: 1}, 1000, function () {
                        $('#create-steps-panel .hidden-arrow:eq(0)')
                            .animate({opacity: 1}, 1000, function () {
                                $('#create-steps-panel #rename-create')
                                    .animate({opacity: 1}, 1000, function () {
                                        $('#create-steps-panel .hidden-arrow:eq(1)')
                                            .animate({opacity: 1}, 1000, function () {
                                                $('#create-steps-panel #share-create')
                                                    .animate({opacity: 1}, 1000, function () {
                                                        $('#create-steps-panel > div')
                                                            .delay(2000)
                                                            .animate({opacity: 0});
                                                    });
                                            });
                                    });
                            });
                    });
            }

            setInterval(function () {
                playProjectCreate();
            }, 8000);

            playProjectCreate();
        },

        setupProjectsSignupForm: function(){
            // Deprecate placeholders for all IE browsers
            if (!Modernizr.input.placeholder) {

                // Adapted from Dropbox Help page implementation
                var initProjectForm = (function () {
                    // If this page is refresh, set all values of the form to ''
                    $('form#projects-signup input, form#projects-signup textarea').val('');

                    $('form#projects-signup input, form#projects-signup textarea').keyup(function () {
                        if ($(this).val() === '') {
                            $(this).prev('label').removeClass('typing');
                        } else {
                            $(this).prev('label').addClass('typing');
                        }
                    });

                    $('form#projects-signup input, form#projects-signup textarea').focus(function () {
                        $(this).prev('label').addClass('empty');
                    });

                    $('form#projects-signup input, form#projects-signup textarea').blur(function () {
                        $(this).prev('label').removeClass('empty');
                    });
                }());

            }
        }
    }
};

jQuery(document).ready(function ($) {

    /* Projects specific initializers/renderers */

    // Initialize Projects' launch page.
    OC.projects.launch.init();

    // Bind admin click events with handler function.
    OC.projects.adminToggleHandler();

    // Setup autocomplete for add member functionality.
    OC.projects.initAddMemberAutocomplete();

    OC.projects.initCollectionsTree();
});