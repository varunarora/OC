CKEDITOR.plugins.add('lesson', {
    requires: 'widget',
    init: function(editor){
        editor.widgets.add('lesson', {
            allowedContent: 'div(!lesson-content); ' +
                'div(!lesson-objective-goal-wrapper); ' +
                'div(!lesson-objective); div(!lesson-objective-body); ' +
                'div(!lesson-goal); div(!lesson-goal-body);' +
                'div(!lesson-assessment); div(!lesson-assessment-body);' +
                'div(!lesson-points); div(!lesson-points-body);' +
                'div(!lesson-opening-materials-wrapper); ' +
                'div(!lesson-opening); div(!lesson-opening-body);' +
                'div(!lesson-opening-materials); div(!lesson-opening-materials-body);' +
                'div(!lesson-introduction-materials-wrapper); ' +
                'div(!lesson-introduction); div(!lesson-introduction-body);' +
                'div(!lesson-introduction-materials); div(!lesson-introduction-materials-body);' +
                'div(!lesson-guided-practice-materials-wrapper); ' +
                'div(!lesson-guided-practice); div(!lesson-guided-practice-body);' +
                'div(!lesson-guided-practice-materials); div(!lesson-guided-practice-materials-body);' +
                'div(!lesson-independant-practice-materials-wrapper); ' +
                'div(!lesson-independant-practice); div(!lesson-independant-practice-body);' +
                'div(!lesson-independant-practice-materials); div(!lesson-independant-practice-materials-body);' +
                'div(!lesson-closing-materials-wrapper); ' +
                'div(!lesson-closing); div(!lesson-closing-body);' +
                'div(!lesson-closing-materials); div(!lesson-closing-materials-body);',
            upcast: function(element) {
                return element.name == 'div' && (
                    element.hasClass('lesson-objective') ||
                    element.hasClass('lesson-goal') ||
                    element.hasClass('lesson-assessment') ||
                    element.hasClass('lesson-points') ||
                    element.hasClass('lesson-opening') ||
                    element.hasClass('lesson-opening-materials') ||
                    element.hasClass('lesson-introduction') ||
                    element.hasClass('lesson-introduction-materials') ||
                    element.hasClass('lesson-guided-practice') ||
                    element.hasClass('lesson-guided-practice-materials') ||
                    element.hasClass('lesson-independant-practice') ||
                    element.hasClass('lesson-independant-practice-materials') ||
                    element.hasClass('lesson-closing') ||
                    element.hasClass('lesson-closing-materials')
                );
            },
            editables: {
                objectives: {
                    selector: '.lesson-objective-body'
                },
                goal: {
                    selector: '.lesson-goal-body'
                },
                assessment: {
                    selector: '.lesson-assessment-body'
                },
                points: {
                    selector: '.lesson-points-body'
                },
                opening: {
                    selector: '.lesson-opening-body'
                },
                openingMaterials: {
                    selector: '.lesson-opening-materials-body'
                },
                introduction: {
                    selector: '.lesson-introduction-body'
                },
                introductionMaterials: {
                    selector: '.lesson-introduction-materials-body'
                },
                guidedPractice: {
                    selector: '.lesson-guided-practice-body'
                },
                guidedPracticeMaterials: {
                    selector: '.lesson-guided-practice-materials-body'
                },
                independantPractice: {
                    selector: '.lesson-independant-practice-body'
                },
                independantPracticeMaterials: {
                    selector: '.lesson-independant-practice-materials-body'
                },
                closing: {
                    selector: '.lesson-closing-body'
                },
                closingMaterials: {
                    selector: '.lesson-closing-materials-body'
                }
            }
        });

    }
});