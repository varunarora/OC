(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object') {
    module.exports = factory;
  } else {
    root.atomic = factory(root);
  }
})(this, function (root) {

  'use strict';

  var exports = {};

  var parse = function (req) {
    var result;
    try {
      result = JSON.parse(req.responseText);
    } catch (e) {
      result = req.responseText;
    }
    return [result, req];
  };

  /* Django CSRF token stuff */

  var getCookie = function (name) {
    var cookieValue = null, cookies, i, cookie;
    if (document.cookie && document.cookie !== '') {
        cookies = document.cookie.split(';');
        for (i = 0; i < cookies.length; i++) {
            cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(
                    cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
  };

  var sameOrigin = function (url) {
    // url could be relative or scheme relative or absolute
    var host = document.location.host, // host + port
        protocol = document.location.protocol,
        sr_origin = '//' + host,
        origin = protocol + sr_origin;

    // Allow absolute or scheme relative URLs to same origin
    return (url === origin || url.slice(
        0, origin.length + 1) === origin + '/') ||
        (url === sr_origin || url.slice(
            0, sr_origin.length + 1) === sr_origin + '/') ||
        // or any other URL that isn't scheme relative or absolute i.e
        //     relative.
        !(/^(\/\/|http:|https:).*/.test(url));
  };

  var safeMethod = function (method) {
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
  };

  /* End of Django CSRF token stuff */

  var xhr = function (type, url, data) {
    var methods = {
      success: function () {},
      error: function () {}
    };
    var XHR = 'ActiveXObject' in window ? ActiveXObject : XMLHttpRequest;
    var request = new XHR('MSXML2.XMLHTTP.3.0');
    request.open(type, url, true);

    if (type === 'POST' || type === 'DELETE' || type === 'UPDATE'){
      if (!safeMethod(type) && sameOrigin(url)) {
        request.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
      }

      data = OC.$.param(data);
    }
    
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

    request.onreadystatechange = function () {
      if (request.readyState === 4) {
        if (request.status >= 200 && request.status < 300) {
          methods.success.apply(methods, parse(request));
        } else {
          methods.error.apply(methods, parse(request));
        }
      }
    };
    request.send(data);
    var callbacks = {
      success: function (callback) {
        methods.success = callback;
        return callbacks;
      },
      error: function (callback) {
        methods.error = callback;
        return callbacks;
      }
    };

    return callbacks;
  };

  exports['get'] = function (src) {
    return xhr('GET', src);
  };

  exports['put'] = function (url, data) {
    return xhr('PUT', url, data);
  };

  exports['post'] = function (url, data) {
    return xhr('POST', url, data);
  };

  exports['delete'] = function (url) {
    return xhr('DELETE', url);
  };

  return exports;

});
