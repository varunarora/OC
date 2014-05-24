OC.internal = {
    bindExistingDeleteButtons: function(){
        $('.delete-button').click(function(){
            var metaWrapper = $(this).parents('div[class$="-wrapper"], .prior-topic-pair');

            if (metaWrapper.hasClass('existing-prior-topic-pair')){
                var resourceID = $('form#resource-meta-edit-form input[name="resource-id"]').val();
                $.get('/resources/api/delete-prior/' + metaWrapper.attr('id')  + '/from/' + resourceID + '/',
                    function (response){
                        if (response.status === 'true'){
                            OC.setMessageBoxMessage('Deleted the prior.');
                            OC.showMessageBox();
                        }
                    },
                'json');
            }
            
            metaWrapper.remove();
        });
    },

    bindAddObjectiveClick: function(){
        $('.add-objective-button').click(function(event){
            var newInput = $('<input/>', {
                'type': 'text',
                'name': 'objective',
                'value': 'Students will be able to '
            }),
                newInputDelete = $('<div/>', { 'class': 'delete-button' }),
                newInputWrapper = $('<div/>', { 'class': 'objective-wrapper' });

            newInputWrapper.append(newInput);
            newInputWrapper.append(newInputDelete);

            $('.objective-wrappers').append(newInputWrapper);

            // Bind delete and reposition handlers.
            $('div.objective-wrapper:last .delete-button').click(function(){
                $(this).parents('.objective-wrapper').remove();
            });

            event.preventDefault();
            event.stopPropagation();
            return false;
        });
    },

    bindAddTopicConceptClick: function(){
        $('.add-topic-button').click(function(event){
            var newWrapper = $('<div/>', {
                'class': 'prior-topic-pair'
            }),
                newTopicInput = $('<input/>', {
                'type': 'text',
                'name': 'prior-topic'
            }),
                newConceptInput = $('<input/>', {
                'type': 'text',
                'name': 'prior-concept'
            }),
                newInputDelete = $('<div/>', { 'class': 'delete-button' });

            newWrapper.append(newTopicInput);
            newWrapper.append(newConceptInput);
            newWrapper.append(newInputDelete);

            // Bind delete and reposition handlers.
            $('.prior-topic-pairs').append(newWrapper);
            $('div.prior-topic-pair:last .delete-button').click(function(){
                $(this).parents('.prior-topic-pair').remove();
            });

            // Bind autocomplete handler.
            OC.internal.bindAutocompleteTopic($('div.prior-topic-pair:last input[name="prior-topic"]'));
            OC.internal.bindAutocompleteConcept($('div.prior-topic-pair:last input[name="prior-concept"]'));

            event.preventDefault();
            event.stopPropagation();
            return false;
        });
    },

    bindAddMaterialClick: function(){
        $('.add-material-button').click(function(event){
            var newInput = $('<input/>', {
                'type': 'text',
                'name': 'material'
            }),
                newInputDelete = $('<div/>', { 'class': 'delete-button' }),
                newInputWrapper = $('<div/>', { 'class': 'material-wrapper' });

            newInputWrapper.append(newInput);
            newInputWrapper.append(newInputDelete);

            $('.material-wrappers').append(newInputWrapper);

            // Bind delete and reposition handlers.
            $('div.material-wrapper:last .delete-button').click(function(){
                $(this).parents('.material-wrapper').remove();
            });

            event.preventDefault();
            event.stopPropagation();
            return false;
        });
    },

    bindMetaSubmitButton: function(){
        $('.resource-meta-submit-wrapper button[type="submit"]').click(function(event){
            var objectives = [], materials = [], priors = [];
            var inputObjs = $('input[name="objective"]'),
                inputMaterials = $('input[name="material"]'),
                inputPriors = $('.prior-topic-pair');

            var i, j, k;
            for (i = 0; i < inputObjs.length; i++){
                objectives.push("\"" + $(inputObjs[i]).attr('value') + "\"");
            }
            $('textarea[name=objectives]').html("[" + objectives.join(',') + "]");

            for (j = 0; j < inputMaterials.length; j++){
                materials.push("\"" + $(inputMaterials[j]).attr('value') + "\"");
            }
            $('textarea[name=materials]').html("[" + materials.join(',') + "]");

            for (k = 0; k < inputPriors.length; k++){
                priors.push(
                    {
                        'topic': $('input[name="prior-topic"]', inputPriors[k]).attr('value'),
                        'concept': $('input[name="prior-concept"]', inputPriors[k]).attr('value')
                    }
                );
            }
            $('textarea[name=priors]').html(JSON.stringify(priors));

        });
    },

    bindAutocompleteTopic: function(element){
        element.autocomplete({
            search: function(event, ui){ $(event.target).addClass('loading'); },
            response: function(event, ui){ $(event.target).removeClass('loading'); },
            source: function(request, response){
                $.get('/meta/api/topic/search/' + request.term  + '/',
                    function (data){
                        response($.map(data, function(item){
                            return { label: item, value: item };
                        }));
                    }, 'json');
            },
            minLength: 2,
        });
    },

    bindAutocompleteConcept: function(element){
        element.autocomplete({
            search: function(event, ui){ $(event.target).addClass('loading'); },
            response: function(event, ui){ $(event.target).removeClass('loading'); },
            source: function(request, response){
                $.get('/meta/api/concept/search/' + request.term  + '/',
                    function (data){
                        response($.map(data, function(item){
                            return { label: item, value: item };
                        }));
                    }, 'json');
            },
            minLength: 2,
        });
    },


    autocompleteTopicConcept: function(){
        OC.internal.bindAutocompleteTopic($('input[name="prior-topic"]'));
        OC.internal.bindAutocompleteConcept($('input[name="prior-concept"]'));
    }
};

jQuery(document).ready(function ($) {
    OC.internal.bindExistingDeleteButtons();

    OC.internal.bindAddObjectiveClick();

    OC.internal.bindAddTopicConceptClick();

    OC.internal.bindAddMaterialClick();

    // Hijack the submit button click.
    OC.internal.bindMetaSubmitButton();

    // Bind the topic and concept input handler with AJAX lookups.
    OC.internal.autocompleteTopicConcept();
});
