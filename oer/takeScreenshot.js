var page = require('webpage').create(), system = require('system');

address = system.args[1];
destination = system.args[2];

page.viewportSize = { width: 1024, height: 800 };
page.clipRect = {
  top: 0,
  left: 0,
  width: 1024,
  height: 800
};

page.open(address, function () {
    page.evaluate(function() {
        document.body.bgColor = 'white';
    });

    window.setTimeout(function() {
        page.render(destination);
        phantom.exit();
    }, 100);
});
