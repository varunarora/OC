define(['react',
    'curriculumBootstrap',
    'curriculumActions',
    'curriculumPageView',
    'curriculumWebAPI',
    'curriculumSettingsView', 'reactRouter'],
    function(React, Bootstrap, Actions, Sequence, undefined, Settings, Router){

    Actions.initSettings(OC.curriculum.settings);
    OC.curriculum.loadButton = document.querySelector('.ajax-loader');

    var Route = Router.Route, DefaultRoute = Router.DefaultRoute,
        RouteHandler = Router.RouteHandler;

    var Page = React.createClass({
        render: function(){
            return RouteHandler();
        }
    });

    var routes = (
        Route({ name: 'page', path:'/', handler: Page }, [
            Route({ name: 'settings', path:'/settings', handler: Settings }),
            DefaultRoute({ handler: Sequence })
        ])
    );

    Bootstrap.init(function(){
        Router.run(routes, function(Handler) {
          React.renderComponent(Handler(), document.querySelector('.curriculum'));
        });
    });
});
