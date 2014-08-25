CKEDITOR.plugins.add('lesson', {
    requires: 'widget',
    init: function(editor){
        editor.widgets.add('fiveStepLessonPlan', {
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

        editor.widgets.add('threeActLessonPlan', {
            allowedContent: 'div(!lesson-content); ' +
                'div(!lesson-act-one-resource-suggestion); div(!lesson-act-one-body); ' +
                'div(!lesson-act-two-resource-suggestion); div(!lesson-act-two-body); ' +
                'div(!lesson-act-three-resource-suggestion); div(!lesson-act-three-body); ' +
                'div(!lesson-sequel-resource-suggestion); div(!lesson-sequel-body); ',
            upcast: function(element) {
                return element.name == 'div' && (
                    element.hasClass('lesson-act-one-body') ||
                    element.hasClass('lesson-act-one-resource-suggestion') ||
                    element.hasClass('lesson-act-two-body') ||
                    element.hasClass('lesson-act-two-resource-suggestion') ||
                    element.hasClass('lesson-act-three-body') ||
                    element.hasClass('lesson-act-three-resource-suggestion') ||
                    element.hasClass('lesson-sequel-body') ||
                    element.hasClass('lesson-sequel-resource-suggestion')
                );
            },
            editables: {
                actOne: {
                    selector: '.lesson-act-one-body'
                },
                actTwo: {
                    selector: '.lesson-act-two-body'
                },
                actThree: {
                    selector: '.lesson-act-three-body'
                },
                sequel: {
                    selector: '.lesson-sequel-body'
                }
            }
        });


        editor.widgets.add('ubdLessonPlan', {
            allowedContent: 'div(!lesson-content); ' +
                'div(!lesson-established-goals); div(!lesson-established-goals-body); ' +
                'div(!lesson-understandings-questions-wrapper);' +
                'div(!lesson-understandings); div(!lesson-understandings-body); ' +
                'div(!lesson-questions); div(!lesson-questions-body); ' +
                'div(!lesson-knowledge-ability-wrapper);' +
                'div(!lesson-knowledge); div(!lesson-knowledge-body); ' +
                'div(!lesson-ability); div(!lesson-ability-body); ' +
                'div(!lesson-performance-evidence-wrapper);' +
                'div(!lesson-performance); div(!lesson-performance-body); ' +
                'div(!lesson-evidence); div(!lesson-evidence-body); ' +
                'div(!lesson-activities); div(!lesson-activities-body); ',
            upcast: function(element) {
                return element.name == 'div' && (
                    element.hasClass('lesson-established-goals') ||
                    element.hasClass('lesson-understandings') ||
                    element.hasClass('lesson-questions') ||
                    element.hasClass('lesson-knowledge') ||
                    element.hasClass('lesson-ability') ||
                    element.hasClass('lesson-performance') ||
                    element.hasClass('lesson-evidence') ||
                    element.hasClass('lesson-activities')
                );
            },
            editables: {
                goals: {
                    selector: '.lesson-established-goals-body'
                },
                understandings: {
                    selector: '.lesson-understandings-body'
                },
                essentialQuestions: {
                    selector: '.lesson-questions-body'
                },
                knowledge: {
                    selector: '.lesson-knowledge-body'
                },
                ability: {
                    selector: '.lesson-ability-body'
                },
                performance: {
                    selector: '.lesson-performance-body'
                },
                evidence: {
                    selector: '.lesson-evidence-body'
                },
                activities: {
                    selector: '.lesson-activities-body'
                },
            }
        });


        editor.widgets.add('simpleLessonPlan', {
            allowedContent: 'div(!lesson-content); ' +
                'div(!lesson-question-body); div(!lesson-objectives-body); ' +
                'div(!lesson-activation-body); div(!lesson-activity-body); ' +
                'div(!lesson-guided-practice-body); div(!lesson-independant-practice-body); ' +
                'div(!lesson-assessment-body); div(!lesson-reflection-body); ',
            upcast: function(element) {
                return element.name == 'div' && (
                    element.hasClass('lesson-question-body') ||
                    element.hasClass('lesson-objectives-body') ||
                    element.hasClass('lesson-activation-body') ||
                    element.hasClass('lesson-activity-body') ||
                    element.hasClass('lesson-guided-practice-body') ||
                    element.hasClass('lesson-independant-practice-body') ||
                    element.hasClass('lesson-assessment-body') ||
                    element.hasClass('lesson-reflection-body')
                );
            },
            editables: {
                question: {
                    selector: '.lesson-question-body'
                },
                objectives: {
                    selector: '.lesson-objectives-body'
                },
                activation: {
                    selector: '.lesson-activation-body'
                },
                activity: {
                    selector: '.lesson-activity-body'
                },
                guidedPractice: {
                    selector: '.lesson-guided-practice-body'
                },
                independantPractice: {
                    selector: '.lesson-independant-practice-body'
                },
                assessment: {
                    selector: '.lesson-assessment-body'
                },
                reflection: {
                    selector: '.lesson-reflection-body'
                },
            }
        });

        /*
        editor.widgets.add('weeklyLessonPlan', {
            allowedContent: 'div(!lesson-content); table(!lesson-weekly-table); tr; th;' +
                'td(!lesson-objectives-body); td(!lesson-do-now-body); ' +
                'td(!lesson-introduction-materials-body); td(!lesson-guided-practice-body); ' +
                'td(!lesson-independant-practice-body); td(!lesson-exit-body); ' +
                'td(!lesson-modifications-body);',
            upcast: function(element) {
                return element.name == 'td';
            },
            editables: {
                objectives: {
                    selector: '.lesson-objectives-body'
                },
                doNow: {
                    selector: '.lesson-do-now-body'
                },
                introductionMaterials: {
                    selector: '.lesson-introduction-materials-body'
                },
                guidedPractice: {
                    selector: '.lesson-guided-practice-body'
                },
                independantPractice: {
                    selector: '.lesson-independant-practice-body'
                },
                exitTicket: {
                    selector: '.lesson-exit-body'
                },
                modifications: {
                    selector: '.lesson-modifications-body'
                }
            }
        });
        */
    }
});