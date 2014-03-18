OC.worksheets = {
    questionDraggable: function($element){
        $element.on('mousedown', function(event){
            // Make a copy of the original question.
            var originalElement = $(this);
            var $elementShadow = originalElement.clone();

            $elementShadow.css({
                top: originalElement.offset().top,
                left: originalElement.offset().left
            });
            $('.question-clones').append($elementShadow);

            // And place it in the hidden clone DOM element.
            var $newElement = $('.question-clones li:last');

            var newElHeight = $(this).outerHeight(),
                newElWidth = $(this).outerWidth(),
                newElY = $(this).offset().top + newElHeight - event.pageY,
                newElX = $(this).offset().left + newElWidth - event.pageX;

            // Establish the user questions' frame.
            var droppableFrame = {
                top: $('.worksheet-panel-left').offset().top,
                bottom: $('.worksheet-panel-left').offset().top + $('.worksheet-panel-left').outerHeight(true),
                left: $('.worksheet-panel-left').offset().left,
                right: $('.worksheet-panel-left').width()
            };

            $(this).parents('.center-spread').on('mousemove', function(event){
                $newElement.addClass('draggable-shadow');

                $('.draggable-shadow').offset({
                    top: event.pageY + newElY - newElHeight + 40,
                    left: event.pageX + newElX - newElWidth
                });

                $newElement.offset().right = $newElement.offset().left + $newElement.width();

                // TODO(Varun): Needs to account for the case dual case of newElement larger than frame on y-axis.
                if (($newElement.offset().top > droppableFrame.top && $newElement.offset().top < droppableFrame.bottom) && ((
                        $newElement.offset().left < droppableFrame.right && $newElement.offset().left > droppableFrame.left) || (
                        $newElement.offset().right < droppableFrame.right && $newElement.offset().right > droppableFrame.left) || (
                        droppableFrame.left > $newElement.offset().left && droppableFrame.right < $newElement.offset().right)
                    )){
                    $('.worksheet-panel-left').addClass('accepting');
                }
                else {
                    $('.worksheet-panel-left').removeClass('accepting');
                }

            }).on('mouseup', function(){
                $newElement.removeClass('draggable-shadow');

                if ($('.worksheet-panel-left').hasClass('accepting')){
                    var droppedQuestion = $('<li/>', {
                        'html': $newElement.html(),
                        'class': $newElement.attr('class')
                    });

                    if (droppedQuestion.hasClass('section-a')){
                        $('.question-list-a').append(droppedQuestion);
                    } else if (droppedQuestion.hasClass('section-b')){
                        $('.question-list-b').append(droppedQuestion);
                    } else if (droppedQuestion.hasClass('section-c')){
                        $('.question-list-c').append(droppedQuestion);
                    }

                    originalElement.fadeOut('slow');
                    $newElement.remove();

                    // Update score card.
                    OC.worksheets.updateTotals(droppedQuestion);
                } else {
                    $newElement.remove();
                }

                $(this).unbind('mousemove');
                $(this).unbind('mouseup');
            });

            event.preventDefault();
        });
    },

    updateTotals: function(newQuestion){
        if (newQuestion.hasClass('section-a')){
            React.renderComponent(OC.worksheets.marksTally(
                {marks: 1}), $('.marks-tally').get(0));
        } else if (newQuestion.hasClass('section-b')){
            React.renderComponent(OC.worksheets.marksTally(
                {marks: 4}), $('.marks-tally').get(0));
        } else if (newQuestion.hasClass('section-c')){
            React.renderComponent(OC.worksheets.marksTally(
                {marks: 6}), $('.marks-tally').get(0));
        }
    },

    marksTally: React.createClass({
        displayName: 'marksTally',
        getInitialState: function(){
            return {marks: 0};
        },
        componentDidMount: function(){
            this.setState({marks: this.state.marks});
        },
        componentWillReceiveProps: function(nextProps){
            this.setState({marks: this.state.marks + nextProps.marks});
        },
        render: function(){
            return React.DOM.div(null, 'Total: ', this.state.marks);
        }
    })
};

$(document).ready(function(){
    OC.worksheets.questionDraggable($('.sample-question-list li'));

    // Render the counter for total marks.
    React.renderComponent(OC.worksheets.marksTally(
        {marks: 0}), $('.marks-tally').get(0));

    // Attach click handler on download button.
    $('.download-button').click(function(event){
        // Build the question elements by extracting the LaTeX.
        var questions = $(
            '.question-list-a li, .question-list-b li, .question-list-a li');
        var serializedQuestionList = '', questionClone;

        var i;
        for (i = 0; i < questions.length; i++){
            questionClone = $(questions[i]).clone();
            $('.MathJax', questionClone).remove();

            $('script[type="math/tex"]', questionClone).before('$');
            $('script[type="math/tex"]', questionClone).after('$');

            serializedQuestionList += questionClone.text() + '\\\\';
        }

        // Pull up a popup showing progress.
        var exportDialog = OC.customPopup('.export-worksheet-word-dialog'),
            exportProgress = OC.progressBar('.export-worksheet-word-progress', {
                startAt: 30
            }),
            exportStatus = $('.export-worksheet-word-status');

        if ("WebSocket" in window){
            // Update the status and the % progress shown to the user.
            exportStatus.text('Building paper...');
            exportProgress.advanceTo(50);

            var exportSocket = new WebSocket("ws://54.83.44.27:1337/");

            exportSocket.onopen =  function(event){
                exportSocket.send(serializedQuestionList);
            };

            exportSocket.onmessage = function(event){
                data = JSON.parse(event.data);
                if (data.documentReceived){
                    exportStatus.text('Generating downloadable file...');
                    exportProgress.advanceTo(60);

                    // Increment the counter fictitiously.
                    var currentProgress = 60;
                    setInterval(function(){
                        if (currentProgress <= 80)
                            exportProgress.advanceTo(++currentProgress);
                    }, 100);
                } else if (data.documentProcessed){
                    exportStatus.text('Finished! Downloading...');
                    exportProgress.advanceTo(100);

                    setTimeout(function(){
                        // Open the retrieved PDF URL in a new tab / window.
                        window.open(data.url,'_blank');

                        // Close the dialog.
                        exportDialog.close();
                    }, 500);
                }
            };
        }

        event.stopPropagation();
        event.preventDefault();
        return false;
    });
});