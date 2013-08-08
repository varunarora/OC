var page = require('webpage').create(), system = require('system');

address = system.args[1];
destination = system.args[2];

page.viewportSize = { width: 1024, height: 800 };

page.open(address, function () {
    window.setTimeout(function() {
        page.render(destination);
        phantom.exit();
    }, 200);
});
