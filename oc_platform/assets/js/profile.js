/**
 * @file Client-side for the profile page
 * @author sri@theopencurriculum.org (Srinivasan Vijayaraghavan)
 */

 /* global $, OC */

 /* When the subscribe button is clicked, send async POST to the server */
$(document).ready(function() {
    $('.subscribe').on('click', function() {
        var data = {
            'id': OC.profile.id,
        };

        /* When the server responds, change the text */
        $.post('/api/subscribe/', data, function() {
            alert('success!');
        });
    });
});
