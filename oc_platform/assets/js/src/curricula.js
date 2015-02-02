define(['core_light'], function(OC){
    var create = document.querySelector('.content-panel-body-create');

    if (create){
        OC.$.addListener(create, 'click', function(event){
            var createPopup = OC.utils.popup('.create-curriculum-dialog', { light: true });

            require(['pikaday'], function(Pikaday){
                var startDate = createPopup.dialog.querySelector('input[name="start_date"]'),
                    endDate = createPopup.dialog.querySelector('input[name="end_date"]');

                var from = new Pikaday({ field: startDate }),
                    to = new Pikaday({ field: endDate });
            });

            var cancel = createPopup.dialog.querySelector('.create-curriculum-button-cancel');
        
            OC.$.addListener(cancel, 'click', function(event){
                createPopup.close();

                event.preventDefault();
                event.stopPropagation();
                return false;
            });
        });
    }

    // Bind all 'Delete' curricula buttons to the popup.
    var deletes = document.querySelectorAll('.curriculum-delete-button'), deletePopup, i;

    function onDeleteClick(event){
        var deletePopup = OC.utils.popup('.delete-curriculum-dialog');

        // Determine the ID of the curriculum to be deleted.
        var curriculumID = event.target.id.substring(18);

        // Set the ID of the curriculum to be deleted.
        deletePopup.dialog.querySelector('input[name="curriculum_id"]').value = curriculumID;

        // Close on clicking 'no'.
        OC.$.addListener(deletePopup.dialog.querySelector('.delete-curriculum-cancel-button'),
            'click', function(event){
                deletePopup.close();

                event.preventDefault();
                event.stopPropagation();
                return false;
            }
        );
    }

    for (i = 0; i < deletes.length; i++){
        OC.$.addListener(deletes[i], 'click', onDeleteClick);
    }

    OC.curriculum = {};
    function onCopyClick(event){
        var copyPopup = OC.utils.popup('.curriculum-copy-dialog', {light: true}),
            cancelButton = copyPopup.dialog.querySelector('.curriculum-copy-button-cancel'),
            copyButton = copyPopup.dialog.querySelector('.curriculum-copy-button-copy'),
            copyButtonSpinner = copyButton.querySelector('.copy-spinner'),
            curriculumID = event.target.id.substring(5);
        
        OC.$.addListener(copyButton, 'click', function(event){
            if (! OC.curriculum.hasOwnProperty('smallSpinner')){
                var options = {
                    lines: 12, // The number of lines to draw
                    length: 4, // The length of each line
                    width: 2, // The line thickness
                    radius: 4, // The radius of the inner circle
                    corners: 0.9, // Corner roundness (0..1)
                    rotate: 75, // The rotation offset
                    direction: 1, // 1: clockwise, -1: counterclockwise
                    color: '#fff', // #rgb or #rrggbb or array of colors
                    speed: 1, // Rounds per second
                    trail: 79, // Afterglow percentage
                    shadow: false, // Whether to render a shadow
                    hwaccel: false, // Whether to use hardware acceleration
                    className: 'inline-spinner', // The CSS class to assign to the spinner
                    zIndex: 12, // The z-index (defaults to 2000000000)
                    top: copyButton.offsetTop, // Top position relative to parent
                    left: copyButton.offsetLeft // Left position relative to parent
                };
                require(['spin'], function(Spinner){
                    OC.curriculum.smallSpinner = new Spinner(options).spin(copyButtonSpinner);
                });
            } else OC.curriculum.smallSpinner.spin(copyButtonSpinner);


            // Animate the header.
            OC.$.addClass(document.querySelector('.curriculum-copy-header-flyer'), 'fly');

            // Make POST request, after putting together serialized form.
            var serializedRequest = {
                curriculum_id: curriculumID,
                title: copyPopup.dialog.querySelector('input[name="curriculum-copy-title"]').value,
                sync: copyPopup.dialog.querySelector('input[name="copy_sync"]').value
            };

            require(['atomic'], function(atomic){
                atomic.post('/curriculum/api/curriculum/copy/', serializedRequest)
                .success(function(response, xhr){
                    var urls = copyPopup.dialog.querySelector('.curriculum-copy-url'),
                        pre = copyPopup.dialog.querySelector('.curriculum-copy-body-pre'),
                        cancel = copyPopup.dialog.querySelector('.curriculum-copy-button-cancel');

                    OC.$.addClass(pre, 'fadeOut');
                    OC.$.addClass(copyPopup.dialog.querySelector('.curriculum-copy-body-post'), 'show');

                    urls.innerHTML = location.hostname + response.url;
                    urls.href = response.url;

                    setTimeout(function(){
                        OC.$.addClass(pre, 'hide');

                        cancel.innerHTML = 'Close';
                        OC.$.addClass(cancel, 'expand');

                        OC.curriculum.smallSpinner.stop();
                        OC.$.addClass(copyButton, 'hide');
                    }, 1000);
                });
            });
        });

        OC.$.addListener(cancelButton, 'click', function(event){
            copyPopup.close();
        });
    }

    var copies = document.querySelectorAll('.curriculum-copy-button'), j;
    for (j = 0; j < copies.length; j++){
        OC.$.addListener(copies[j], 'click', onCopyClick);
    }
});