/* global $:false, jQuery:false, filepicker:false, console:false */

/**
 * @file Client-side for file upload using filepicker.io
 * @author sri@theopencurriculum.org (Srinivasan Vijayaraghavan)
 */

// Set global variables, such as the Filepicker.io API key.
uploaded_files = new Object();
filepicker.setKey("AGuSaWwXNQFi60wveigBHz");
//var s3_main_addr = "http://ocstatic.s3.amazonaws.com/";

/** @function upload_cb
 * @desc Callback for POST request from FPpost.<br><br>
 * Updates the HTML to show that the upload was successful.
 * @param {object} response - Response from server.
 * @return none
 */
function upload_cb(response) {
    var title_box, new_files;
    new_files = JSON.parse(response);
    $.extend(window.uploaded_files, new_files);
    $("#file").html("Upload more files");
    console.log(window.uploaded_files);

    for (var key in new_files) {
        var text_box = $("<input>").val(new_files[key]).addClass(key).attr('type', 'text');
        
        var button = $('<button>').html("Update title");
        button.click(function()   {
            var element = $(this);
            var selected = element.parent().attr('class');
            var new_text = $("." + selected + " input").val();
            console.log(selected);
            console.log(new_text);
            window.uploaded_files[selected] = new_text;
        });
        
        title_box = $('<div>').addClass(key).append(text_box).append(button);
        $("#titles").append(title_box);
    }
}

/** @function FPpost
 * @desc Callback for filepicker.pickAndStore. <br><br>
 * Generates key-filename pairs for each file from its FPFile properties.<br>
 * Then POST's a list of these to the server.
 * @param {list} fpfiles - List of FPFile objects from filepicker.io API.
 * @return none
 */
var FPpost = function(fpfiles){
    var data, i, num_files, pair;
    num_files = fpfiles.length;
    data = new Object();

    for (i = 0; i < num_files; i++) {
        key = fpfiles[i].key;
        filename = fpfiles[i].filename;
        
        data[key] = filename;
    }
    
    jQuery.post("/api/fpUpload/", data, upload_cb);
};

/** @function on-click
 * @desc On-click handler for the upload button.
 * @return none
 */
$("#file").click(function() {
    // Allow multiple files at once, store to S3, and the callback is FPpost
    filepicker.pickAndStore({multiple: true},
        {location: "S3", path: "/attachments/", access: 'public'}, FPpost);
});

/*
 * @desc Function to test without polluting the S3 bucket.
 * @return none
 */
function funpost()  {
    var data = { 
            "yolo0": String(Math.round(10000000*Math.random())),
            "yolo1": String(Math.round(10000000*Math.random()))
    };
    
    jQuery.post("/api/fpUpload/", data, function(response)   {
         $("#fpfilebox").append("Upload success!!");
         console.log(response);
    });
}

$(document).ajaxSend(function (event, xhr, settings) {
    function getCookie(name) {
        var cookieValue = null, cookies, i, cookie;
        if (document.cookie && document.cookie !== "") {
            cookies = document.cookie.split(";");
            for (i = 0; i < cookies.length; i++) {
                cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) === (name + "=")) {
                    cookieValue = decodeURIComponent(
                        cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    function sameOrigin(url) {
        // url could be relative or scheme relative or absolute
        var host = document.location.host, // host + port
            protocol = document.location.protocol,
            sr_origin = "//" + host,
            origin = protocol + sr_origin;

        // Allow absolute or scheme relative URLs to same origin
        return (url === origin || url.slice(
            0, origin.length + 1) === origin + "/") ||
            (url === sr_origin || url.slice(
                0, sr_origin.length + 1) === sr_origin + "/") ||
            // or any other URL that isn't scheme relative or absolute i.e
            //     relative.
            !(/^(\/\/|http:|https:).*/.test(url));
    }
    function safeMethod(method) {
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }

    if (!safeMethod(settings.type) && sameOrigin(settings.url)) {
        xhr.setRequestHeader("X-CSRFToken", getCookie("csrftoken"));
    }
});
