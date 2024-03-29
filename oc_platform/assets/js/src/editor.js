define(['jquery', 'core', 'underscore', 'ckeditor', 'dropzone'], function($, OC, _, undefined, Dropzone){
    OC.editor = {
        myImages: [],
        imageUploadCallback: undefined,

        searchCache: {},

        imageHistoryTemplate: _.template('<div class="image">' +
            '<div class="image-info">' +
            '<div class="image-title"><%= title %></div>' +
            '<div class="image-path"><%= path %></div>' +
            '</div>' +
            '<div class="image-insert-button">' +
            '<button class="btn dull-button" value="<%= path %>">Insert image</button>' +
            '</div></div>'),

        editorSearchItemTemplate: _.template('<div class="editor-search-result" id="<%= id %>">' +
            '<div class="editor-search-result-handle"></div>' +
            '<div class="editor-search-result-thumbnail" style="background-image: ' +
            'url(\'<%= thumbnail %>\');"></div><div class="editor-search-result-description">' +
            '<div class="editor-search-result-description-title"><%= title %></div>'+
            '<div class="editor-search-result-description-meta"><%= views %> views &#183;' +
            'By <a href="<%= user_url %>"><%= user %></a></div></div>' +
            '<div class="editor-search-result-preview"></div>' +
            '</div>'),

        youtubeVideoTemplate: _.template('<iframe width="573" height="322" ' +
            'src="http://www.youtube.com/embed/<%= video_tag %>?wmode=opaque&rel=0" frameborder="0" '+
            'allowfullscreen></iframe>'),

        vimeoVideoTemplate: _.template('<iframe src="http://player.vimeo.com/video/<%= video_tag %>' +
            '?title=0&amp;byline=0&amp;portrait=0&amp;badge=0&amp;color=ffffff" width="573" ' +
            'height="322" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>'),

        attachUserID: function(file, xhr, formData){
            formData.append('user', $('form.document-edit-form input[name=user]').val());
        },

        onTemplateLoad: function(tips, lpMap){
            // Attach focus handler with fields with suggestions.
            OC.editor.attachLPWidgetFocusHandler(tips);

            if (OC.editor.lwOptions.standards) OC.editor.prefillLPContent(lpMap);

            // Scroll the editor to the top.
            OC.editor.editorFrame.animate({ scrollTop: 0 }, 500);
        },

        insertFiveStepLessonTemplate: function(editor, callback){
            $.get('/resources/template/five-step-lesson-plan/',
                function(response){
                    var hiddenTemplates = $('.hidden-templates');
                    hiddenTemplates.append(response);

                    editor.insertHtml((hiddenTemplates.html()));
                    
                    // Clear all contents.
                    $('div', hiddenTemplates).remove();
                    
                    var lpMap = {
                        'standards': $('.cke_widget_editable.lesson-objectives-body')
                    };
                    callback(OC.editor.fiveStepLessonPlanTips, lpMap);
                },
            'html');
        },

        insertThreeActLessonTemplate: function(editor, callback){
            $.get('/resources/template/three-act-lesson/',
                function(response){
                    var hiddenTemplates = $('.hidden-templates');
                    hiddenTemplates.append(response);

                    editor.insertHtml((hiddenTemplates.html()));
                    
                    // Attach click handlers on add widget buttons.
                    OC.editor.bindAddWidgetClickHandler('.insert-widget');

                    // Clear all contents.
                    $('div', hiddenTemplates).remove();

                    callback(OC.editor.threeActLessonTips);
                },
            'html');
        },

        insertUnderstandingByDesignLessonTemplate: function(editor, callback){
            $.get('/resources/template/understanding-by-design-lesson-plan/',
                function(response){
                    var hiddenTemplates = $('.hidden-templates');
                    hiddenTemplates.append(response);

                    editor.insertHtml((hiddenTemplates.html()));

                    // Clear all contents.
                    $('div', hiddenTemplates).remove();

                    var lpMap = {
                        'standards': $('.cke_widget_editable.lesson-established-goals-body')
                    };
                    callback(OC.editor.understandingByDesignLessonTips, lpMap);
                },
            'html');
        },

        insertWeeklyLessonTemplate: function(editor, callback){
            $.get('/resources/template/weekly-lesson-plan/',
                function(response){
                    var hiddenTemplates = $('.hidden-templates');
                    hiddenTemplates.append(response);

                    editor.insertHtml((hiddenTemplates.html()));

                    // Clear all contents.
                    $('div', hiddenTemplates).remove();

                    callback(OC.editor.weeklyLessonTips);
                },
            'html');
        },

        insertSimpleLessonTemplate: function(editor, callback){
            $.get('/resources/template/simple-lesson-plan/',
                function(response){
                    var hiddenTemplates = $('.hidden-templates');
                    hiddenTemplates.append(response);

                    editor.insertHtml((hiddenTemplates.html()));

                    // Clear all contents.
                    $('div', hiddenTemplates).remove();

                    var lpMap = {
                        'standards': $('.cke_widget_editable.lesson-objectives-body')
                    };
                    callback(OC.editor.simpleLessonTips, lpMap);
                },
            'html');
        },
        fiveStepLessonPlanTips: {
            'lesson-objectives-body': 'What will your student be able to do?',
            'lesson-goal-body': 'How does the objective connect to the summer (big) goal?',
            'lesson-assessment-body': 'How will you know whether your students have made ' +
            'progress toward the objective? How and when will you assess mastery?',
            'lesson-points-body': 'What three-five key points will you emphasize?',

            'lesson-opening-tip': [
                'How will you communicate <em>what</em> is about to happen? ' +
                'How will you communicate <em>how</em> it will happen?',

                'How will you communicate its <em>importance?</em> ' +
                'How will you communicate <em>connections</em> to previous lessons?',

                'How will you engage students and capture their interest?'
            ],

            'lesson-introduction-tip': [
                'What key points will you emphasize and reiterate? ',
                'How will you ensure that students actively take-in information?',
                'How will you vary your approach to make information accessible to all students?',
                'Which potential misunderstandings will you anticipate?'
            ],

            'lesson-guided-practice-tip': [
                'How will you clearly state and model behavioral expectations?',
                'How will you ensure that all students have multiple opportunities to practice?',
                'How will you scaffold practice exercises from easy to hard?',
                'How will you monitor and correct student performance?'
            ],

            'lesson-independant-practice-tip': [
                'How will you clearly state and model behavioral expectations?',
                'In what ways will students attempt to demonstrate independent mastery of the objective?',
                'How will you provide opportunities for extension?'
            ],

            'lesson-closing-tip': [
                'How will students summarize what they learned?',
                'How will students be asked to state the significance of what they learned?',
                'How will you provide all students with opportunities to demonstrate mastery of (or progress toward) the objective?'
            ]
        },

        threeActLessonTips: {
            'lesson-act-one-body': '<strong>Introduce the central conflict of your story/task clearly,' +
                'visually, viscerally, using as few words as possible.</strong>' +
                '<p>With <em>Jaws</em> your first act looks something like this:</p>' +
                '<p><img src="/static/assets/images/templates/act-one-1.jpg"></p>' +
                '<p>The visual is clear. The camera is in focus. It isn\'t bobbing around so much ' +
                'that you can\'t get your bearings on the scene. There aren\'t any words. And it\'s ' +
                'visceral. It strikes you right in the terror bone.</p>' +
                'With <em>math</em>, your first act looks something like this: ' +
                '<p><img src="/static/assets/images/templates/act-one-2.jpg"></p>' +
                'The visual is clear. The camera is locked to a tripod and focused. No words are necessary. ' +
                'I\'m not saying anyone is going to shell out ten dollars on date night to do this math problem ' +
                'but you have a visceral reaction to the image. It strikes you right in the curiosity bone.' +
                '<p>Leave no one out of your first act. Your first act should impose as few demands on the students ' +
                'as possible — either of language or of math. It should ask for little and offer a lot.</p>',

            'lesson-act-two-body': '<strong>The protagonist/student overcomes obstacles, looks for resources, and develops new tools.</strong>' +
                '<p>Before he resolves his largest conflict, Luke Skywalker resolves a lot of smaller ones — find a pilot, ' +
                'find a ship, find the princess, get the Death Star plans back to the Rebellion, etc. He builds a ' +
                'team. He develops new skills.</p>' +
                '<p><img src="/static/assets/images/templates/act-two-1.jpg"></p>' +
                'So it is with your second act. What resources will your students need before they can resolve their conflict? ' +
                'The height of the basketball hoop? The distance to the three-point line? The diameter of a basketball?' +
                '<p><img src="/static/assets/images/templates/act-one-2.jpg"></p>' +
                'What tools do they have already? What tools can you help them develop? They\'ll need quadratics, for ' +
                'instance. Help them with that.',

            'lesson-act-three-body': '<strong>Resolve the conflict and set up a sequel/extension.</strong>' +
                '<p>The third act pays off on the hard work of act two and the motivation of act one. Here\'s act three ' +
                'of Star Wars.</p>' +
                '<p><img src="/static/assets/images/templates/act-three-1.jpg"></p>' +
                'That\'s a resolution right there. Imagine, though, that Luke fired his last shot and instead of watching ' +
                'the Death Star explode, we cut to a scene inside the Rebellion control room. No explosion. Just one of ' +
                'the commanders explaining that "the mission was a success."' +
                '<p>That what it\'s like for students to encounter the resolution of their conflict in the back of the ' +
                'teacher\'s edition of the textbook.</p>' +
                '<p><img src="/static/assets/images/templates/act-three-2.jpg"></p>' +
                'If we\'ve successfully motivated our students in the first act, the payoff in the third act needs to ' +
                'meet their expectations. Something like this:' +
                '<p><img src="/static/assets/images/templates/act-three-3.jpg"></p>' +
                'Now, remember Vader spinning off into the distance, hurtling off to set the stage for ' +
                '<em>The Empire Strikes Back</em>. You need to be Vader. Make sure you have extension problems ' +
                '(sequels, right?) ready for students as they finish.',
            'lesson-sequel-body': ''
        },

        understandingByDesignLessonTips: {
            'lesson-established-goals-body': 'What relevant goals (e.g., Content Standards, Course or Program ' +
                'Objectives, Learning Outcomes etc.) will this design address?',
            'lesson-understandings-body': [
                'What are the "big ideas"?',
                'What specific understandings about them are desired?',
                'What misunderstandings are predictable?'
            ],
            'lesson-questions-body': 'What provocative questions will foster inquiry, understanding, and ' +
                'transfer of learning?',
            'lesson-knowledge-body': 'What key knowledge and skills will students acquire as a result of this unit?',
            'lesson-ability-body': 'What should they eventually be able to do as a result of such knowledge and skill?',
            'lesson-performance-body': [
                'Through what authentic performance task(s) will students demonstrate the desired understandings?',
                'By what criteria will "performances of understanding" be judged?'
            ],
            'lesson-evidence-body': [
                'Through what other evidence (e.g. quizzes, tests, academic prompts, observations, homework, '+
                    'journals, etc.) will students demonstrate achievement of the desired results?',
                'How will students reflect upon and self-assess their learning?'
            ],
            'lesson-activities-body': [
                '<strong>W</strong> = help the students know where the unit is going and what is expected? Help the teacher' +
                    'know where the students are coming from (prior knowledge, interests)?',
                '<strong>H</strong> = hook all students and hold their interest?',
                '<strong>E</strong> = equip students, help them experience the key ideas, and explore the issues?',
                '<strong>R</strong> = provide opportunities to rethink and revise their understandings and work?',
                '<strong>E</strong> = allow students to evaluate their work and its implications?',
                '<strong>T</strong> = be tailored (personalized) to the different needs, interests, abilities of learners',
                '<strong>O</strong> = be organized to maximize initial and sustained engagement as well as effective learning?'
            ]
        },

        weeklyLessonTips: {
            'lesson-objectives-body': [
                'What will your students be able to do?',
                'What relevant content standards and learning outcomes will this address?'
            ],
            'lesson-do-now-body': [
                'What activity will your students do at the beginning of the class to gauge for prior ' +
                    'knowledge and misunderstandings',
                'What activity will help you set the tone for the class?'
            ],
            'lesson-introduction-materials-body': [
                'What key points will you emphasize and reiterate? ',
                'How will you ensure that students actively take-in information?',
                'What key knowledge and skills will students will you introduce in this lesson?'
            ],
            'lesson-guided-practice-body': [
                'How will you clearly state and model behavioral expectations?',
                'How will you ensure that all students have multiple opportunities to practice?',
                'How will you scaffold practice exercises from easy to hard?',
                'How will you monitor and correct student performance?'
            ],
            'lesson-independant-practice-body': [
                'How will you clearly state and model behavioral expectations?',
                'In what ways will students attempt to demonstrate independent mastery of the objective?',
                'How will you provide opportunities for extension?'
            ],
            'lesson-exit-body': [
                'What low-stress assessment questions will you give your students to assess for misconceptions ' +
                    'and clarity of understanding?',
                    'How will determine if all all students understood what you taught in the lesson?'
            ],
            'lesson-homework-body': 'How will you help students practice at home what you taught in the class?',
            'lesson-materials-body': 'What materials would you require to conduct the planned class activities',
            'lesson-modifications-body': ''
        },

        simpleLessonTips: {
            'lesson-question-body': 'Big and high-level topical question that helps provoke and foster thought ' +
                'and guides the lesson',
            'lesson-objectives-body': [
                'What will your students be able to do?',
                'What relevant content standards and learning outcomes will this address?'
            ],
            'lesson-activation-body': 'How can you open the lesson by helping students recall their prior knowledge ' +
                ' and skills to help lead into the topic for the current lesson?' ,
            'lesson-activity-body': [
                'How will you engage students in an exercise that directly applies the core essence of your ' +
                    'instruction for the lesson?',
                'How can students directly apply their thinking and understanding of the topic?'
            ],
            'lesson-guided-practice-body': [
                'How will you clearly state and model behavioral expectations?',
                'How will you ensure that all students have multiple opportunities to practice?',
                'How will you scaffold practice exercises from easy to hard?',
                'How will you monitor and correct student performance?'
            ],
            'lesson-independant-practice-body': [
                'How will you clearly state and model behavioral expectations?',
                'In what ways will students attempt to demonstrate independent mastery of the objective?',
                'How will you provide opportunities for extension?'
            ],
            'lesson-assessment-body': [
                'Through what task(s) will students demonstrate the desired understandings?',
                'By what criteria will students\'s understanding be judged be judged?',
                'Examples of kinds of assessments include tests/quizzes, oral response, individual products, etc.'
            ],
            'lesson-reflection-body': [
                'What worked in this lesson and what did not work so well?',
                'Were you able to meet the students where they were and then advance them in adherance to the ' +
                    'objectives you hoped to accomplish?',
                'Was the perceived understanding of the students reflected in their performance in classroom ' +
                'activities and formative assessment?'
            ]
        },

        lessonAssist: '',
        lessonAssistPullout: '',
        lessonAssistBody: '',
        editorFrame: '',
        editorBodyWrapper: '',
        editorBody: '',

        cke: '',
        lwOptions: {},

        onImageInsert: function(url){
            var image = $('<img/>', {
                'src': url
            });
            OC.editor.cke.insertHtml(image[0].outerHTML);
        },

        onLinkInsert: function(urlElement, text){
            var url = $('<a/>', {
                'href': urlElement.attr('href'),
                'text': text ? text : urlElement.text()
            });
            OC.editor.cke.insertHtml(url[0].outerHTML);
        },

        onUploadInsert: function(url, text){
            var urlElement = $('<a/>', {
                'href': url,
                'text': text
            });
            OC.editor.cke.insertHtml(urlElement[0].outerHTML);
        },

        init: function(){
            var editorFrame = $('.editor-frame'),
                editorBodyWrapper = $('.editor-body-wrapper'),
                editorBody = $('.editor-body');

            OC.editor.editorFrame = editorFrame;
            OC.editor.editorBodyWrapper = editorBodyWrapper;
            OC.editor.editorBody = editorBody;

            function setEditorFrameHeight(){
                editorFrame.height(
                    $(window).height() - ($(
                        '.editor-header').outerHeight(true) + $(
                        '.editor-toolbar-wrapper').height() + parseInt($('.editor-toolbar-wrapper').css(
                        'padding-top'), 10) + parseInt(editorFrame.css(
                        'padding-top'), 10) + parseInt(editorFrame.css(
                        'padding-bottom'), 10)) + 'px');
            }
            setEditorFrameHeight();
            $(window).resize(setEditorFrameHeight);

            OC.editor.cke = editorBody.ckeditor({
                extraPlugins: 'internallink,sharedspace,resources,' +
                    'lesson,upload,video,tableresize,differentiate,toggle',
                startupFocus: true,
                sharedSpaces: {
                    top: 'editor-toolbar'
                },
                toolbar: 'Full',
                customConfig: staticURL + 'js/lib/ckeditor/config.js'
            }).ckeditorGet();

            // Turn off browser table resize.
            document.execCommand("enableInlineTableEditing", false, "false");

            OC.editor.cke.on('instanceReady', function(){
                // Attach click handlers on add widget buttons.
                OC.editor.bindAddWidgetClickHandler('.insert-widget');

                // Bind all toggle clicks.
                $('.toggle-content-title-wrapper').click(OC.togglerClickHandler);
            });

            // Open dialog to ask for path choice.
            if (OC.document_type == 'lesson'){
                // Initialize lesson assist panel.
                OC.editor.lessonAssist = $('.lesson-assist');

                if (OC.document_act == 'edit' || OC.document_act == 'remix') {
                    OC.editor.lessonAssist.addClass('hide');

                } else if (OC.document_act == 'add') {
                    OC.editor.lessonAssistPullout = $('.lesson-assist-pullout');
                    OC.editor.lessonAssistBody = $('.lesson-assist-body');
                    
                    var UPPER_SPACE = 40;

                    OC.editor.lessonAssist.css({
                        'top': OC.editor.editorFrame.outerHeight(
                            true) + OC.editor.editorFrame.offset().top - OC.editor.lessonAssistPullout.outerHeight(true)
                    });

                    OC.editor.lessonAssistBody.css({
                        'height': OC.editor.editorFrame.outerHeight(true) - (
                            UPPER_SPACE + OC.editor.lessonAssistPullout.outerHeight(true))
                    });

                    OC.editor.lessonAssistPullout.click(function(event){
                        if (OC.editor.lessonAssist.hasClass('open')){
                            OC.editor.closeLessonAssist(true);
                        } else {
                            OC.editor.openLessonAssist();
                        }
                    });

                    var lessonPathDialog = OC.customPopup('.lesson-path-dialog');
                    var lessonTemplateDialog;

                    $('.lesson-path-blank', lessonPathDialog.dialog).click(function(event){
                        lessonPathDialog.close();

                        lessonTemplateDialog = OC.customPopup('.lesson-template-dialog');

                        $('.lesson-template-option', lessonTemplateDialog.dialog).click(function(){
                            // Remove all the selected options.
                            $('.lesson-template-option.selected').removeClass('selected');

                            $(this).addClass('selected');
                        });

                        $('.lesson-template-submit-button', lessonTemplateDialog.dialog).click(function(){
                            lessonTemplateDialog.close();

                            // Initialize the document with the lesson plan template.
                            var editor = editorBody.ckeditorGet();

                            // Get the selected template option.
                            var selectedTemplateOption = $(
                                '.lesson-template-option.selected', lessonTemplateDialog.dialog);
                            
                            if (selectedTemplateOption.hasClass('lesson-template-option-five-step')) {
                                OC.editor.insertFiveStepLessonTemplate(editor, OC.editor.onTemplateLoad);
                            } else if (selectedTemplateOption.hasClass('lesson-template-option-three-acts')) {
                                OC.editor.insertThreeActLessonTemplate(editor, OC.editor.onTemplateLoad);
                            } else if (selectedTemplateOption.hasClass('lesson-template-option-ubd')) {
                                OC.editor.insertUnderstandingByDesignLessonTemplate(editor, OC.editor.onTemplateLoad);
                            } else if (selectedTemplateOption.hasClass('lesson-template-option-weekly')) {
                                OC.editor.insertWeeklyLessonTemplate(editor, OC.editor.onTemplateLoad);
                            } else if (selectedTemplateOption.hasClass('lesson-template-option-simple')) {
                                OC.editor.insertSimpleLessonTemplate(editor, OC.editor.onTemplateLoad);
                            }
                        });
                    });
        
                    $('.lesson-path-wizard', lessonPathDialog.dialog).click(function(event){
                        lessonPathDialog.close();

                        lessonWizardDialog = OC.customPopup('.lesson-wizard-dialog');

                        var standards;
                        function moveTo(step, callback){
                            steps = ['one', 'two', 'three', 'four', 'five'];

                            // Hide all bodies and deselect all steps.
                            var stepBodies = $('.lesson-wizard-step-body'),
                                stepsIndicators = $('.lesson-wizard-steps-step');

                            stepBodies.removeClass('visible');
                            stepsIndicators.removeClass('selected');

                            var currentStepIndicator = $('.lesson-wizard-step-' + steps[step - 1]),
                                currentStepBody = $('.lesson-wizard-step-' + steps[step - 1] + '-body');

                            currentStepIndicator.addClass('selected');
                            currentStepBody.addClass('visible');

                            // Mark previous indicator as complete.
                            var previousStepIndicator = $('.lesson-wizard-step-' + steps[step - 2]);
                            if (previousStepIndicator.length !== 0) previousStepIndicator.addClass('completed');

                            if (callback) callback();
                        }

                        function renderTopicsBrowser(list, browser){
                            // Clear browser.
                            browser.html('');

                            // Create new list in browser.
                            var browserList = $('<ul/>', {
                                'class': 'lesson-wizard-grade-level-topic-list'
                            });
                            var i;
                            for (i = 0; i < list.length; i++){
                                browserList.append($('<li/>', {
                                    'text': list[i].title,
                                    'id': list[i].id,
                                    'class': 'lesson-wizard-grade-level-topic-list-item'
                                }));
                            }

                            browser.append(browserList);

                            // Handle clicks for subjects.                        
                            $('.lesson-wizard-grade-level-topic-list-item').click(
                                bindTopicClickHandler);
                        }

                        function bindTopicClickHandler(event){
                            $('.lesson-wizard-grade-level-topic-list-item').removeClass('selected');
                            var topicSelected = $(event.target);
                            topicSelected.addClass('selected');

                            var nextButton = $('.lesson-wizard-step-three-body .lesson-wizard-next-button');
                            nextButton.removeClass('disabled-action-button');
                            nextButton.removeAttr('disabled');
                        }


                        function gradeTopicClickHandler(event){
                            $('.lesson-wizard-grade-level-list-item').removeClass('selected');
                            var gradeSelected = $(event.target);
                            gradeSelected.addClass('selected');

                            // Render the tree in the browser.
                            var topicBrowser = $('.lesson-wizard-grade-level-topic-browser');
                            topicBrowser.addClass('loading-browser');

                            $.get('/resources/api/get-child-categories/' + gradeSelected.attr('id') + '/',
                                function(response){
                                    if (response.status == 'true'){
                                        renderTopicsBrowser(_.values(response.categories), topicBrowser);
                                        topicBrowser.removeClass('loading-browser');
                                    }
                                    else {
                                        OC.popup(response.message, response.title);
                                    }

                                },
                            'json');
                        }

                        // Handle clicks for standards..
                        function renderGrades(){
                            // Get subject from standardID.
                            standardSubjectID = _.find(_.find(standards, function(standard){
                                return standard.id === OC.editor.lwOptions['standardID'];
                            }).subjects, function(subject) { return subject.title === OC.editor.lwOptions['subject']; }).id;

                            // Find the subject title in the standards list.
                            $.get('/resources/api/get-child-categories/' + standardSubjectID + '/',
                                function(response){
                                    if (response.status == 'true'){
                                        var list = response.categories,
                                            i,
                                            gradeList = $('.lesson-wizard-grade-level-list');
                                        for (i = 0; i < list.length; i++){
                                            gradeList.append($('<li/>', {
                                                'class': 'lesson-wizard-grade-level-list-item',
                                                'id': list[i].id,
                                                'text': list[i].title,
                                            }));
                                        }
                                        // Handle clicks for grade & topic.
                                        $('.lesson-wizard-grade-level-list-item').click(
                                            gradeTopicClickHandler);
                                    }
                                    else {
                                        OC.popup(response.message, response.title);
                                    }

                                },
                            'json');
                        }

                        function standardsClickHandler(event){
                            var standardSelected = $(event.target);

                            if (standardSelected.hasClass('selected'))
                                standardSelected.removeClass('selected');
                            else standardSelected.addClass('selected');

                            var nextButton = $('.lesson-wizard-step-four-body .lesson-wizard-next-button');
                            nextButton.removeClass('disabled-action-button');
                            nextButton.removeAttr('disabled');
                        }

                        // Bind click on next button on the topic -> standards option.
                        $('.lesson-wizard-step-three-body .lesson-wizard-next-button').click(function(event){
                            if (! $(event.target).hasClass('disabled-action-button')){
                                moveTo(4, function(){
                                    var topicCategory = $('.lesson-wizard-grade-level-topic-list-item.selected').attr('id');

                                    var standardsBrowser = $('.lesson-wizard-standards-browser');
                                    standardsBrowser.addClass('loading-browser');
                                    $.get('/meta/api/get-child-tags-from-category/' + topicCategory + '/',
                                        function(response){
                                            if (response.status == 'true'){
                                                standardsBrowser.removeClass('loading-browser');
                                                var list = _.values(response.tags),
                                                    i,
                                                    standardsList = $('.lesson-wizard-standards-list');
                                                for (i = 0; i < list.length; i++){
                                                    standardsList.append($('<li/>', {
                                                        'class': 'lesson-wizard-standards-list-item',
                                                        'id': list[i].id,
                                                        'title': list[i].description,
                                                        'name': list[i].title,
                                                        'data-url': list[i].url,
                                                        'html': '<span class=\"bold\">' + list[i].title + '</span>: ' +
                                                            list[i].description,
                                                    }));
                                                }
                                                // Handle clicks for standards.
                                                $('.lesson-wizard-standards-list-item').click(
                                                    standardsClickHandler);
                                            }
                                            else {
                                                OC.popup(response.message, response.title);
                                            }

                                        },
                                    'json');
                                });
                            }
                        });

                        $('.lesson-wizard-step-four-body .lesson-wizard-next-button').click(function(event){
                            if (! $(event.target).hasClass('disabled-action-button')){
                                moveTo(5, function(){
                                    // Set the selected standards.
                                    OC.editor.lwOptions['standards'] = [];
                                    var selectedStandards =  $('.lesson-wizard-standards-list-item.selected');

                                    var  i, currentStandard;
                                    for (i = 0; i < selectedStandards.length; i++){
                                        currentStandard = $(selectedStandards[i]);
                                        OC.editor.lwOptions['standards'].push({
                                            'url': currentStandard.attr('data-url'),
                                            'title': $(selectedStandards[i]).attr('name'),
                                            'description': $(selectedStandards[i]).attr('title')
                                        });
                                    }

                                    // Bind click handler with options.
                                    $('.lesson-wizard-lesson-type').click(function(event){
                                        // Remove the class 'selected' from all buttons.
                                        $('.lesson-wizard-lesson-type').removeClass('selected');
                                        $(event.target).addClass('selected');
                                        
                                        $('.lesson-wizard-templates-browser-wrapper').addClass('show');
                                    
                                        // Activate 'Done'.
                                        var doneButton = $('.lesson-wizard-step-five-body .lesson-wizard-done-button');
                                        doneButton.removeClass('disabled-action-button');
                                        doneButton.removeAttr('disabled');

                                        $('.lesson-wizard-templates-browser .lesson-template-option').click(function(){
                                            // Remove all the selected options.
                                            $('.lesson-template-option.selected').removeClass('selected');
                                            $(this).addClass('selected');
                                        });
                                    });
                                });
                            }
                        });

                        // Bind the Done button the final screen.
                        $('.lesson-wizard-step-five-body .lesson-wizard-done-button').click(function(event){
                            lessonWizardDialog.close();

                            // Determine the template and insert it.
                            var editor = editorBody.ckeditorGet(),
                                selectedTemplateOption = $(
                                '.lesson-wizard-templates-browser .lesson-template-option.selected');

                            if (selectedTemplateOption.hasClass('lesson-template-option-five-step')) {
                                OC.editor.insertFiveStepLessonTemplate(editor, OC.editor.onTemplateLoad);
                            } else if (selectedTemplateOption.hasClass('lesson-template-option-ubd')) {
                                OC.editor.insertUnderstandingByDesignLessonTemplate(editor, OC.editor.onTemplateLoad);
                            } else if (selectedTemplateOption.hasClass('lesson-template-option-simple')) {
                                OC.editor.insertSimpleLessonTemplate(editor, OC.editor.onTemplateLoad);
                            }
                        });

                        function subjectClickHandler(){
                            // Find all standards which have the subject.
                            filteredStandards = _.filter(standards, function(standard){
                                return _.filter(standard.subjects, function(subject){
                                    return subject.title === OC.editor.lwOptions['subject'];
                                }).length !== 0;
                            });
                            var stepTwoBodyContent = $(
                                '.lesson-wizard-step-two-body .lesson-wizard-step-body-content');
                            var i;
                            for (i = 0; i < filteredStandards.length; i++){
                                stepTwoBodyContent.append($('<button/>', {
                                    'class': 'lesson-wizard-button',
                                    'text': filteredStandards[i].title
                                }));
                            }
                            // Attach click handler with buttons.
                            stepTwoBodyContent.find(
                                '.lesson-wizard-button').click(function(){
                                    OC.editor.lwOptions['standard'] = $(this).text();

                                    // Find ID from the list standard.
                                    OC.editor.lwOptions['standardID'] = _.find(standards, function(standard){
                                        return standard.title === OC.editor.lwOptions['standard'];
                                    }).id;
                                    moveTo(3, renderGrades);
                            });
                        }


                        moveTo(1, function(){
                            $.get('/meta/api/standards/',
                                function(response){
                                    if (response.status == 'true'){
                                        standards = _.values(response.standards);
                                        var i, j, subjects = [];
                                        for (i = 0; i < standards.length; i++){
                                            subjects = _.union(_.pluck(standards[i].subjects, 'title'));
                                        }

                                        // Render the subjects as buttons.
                                        var stepOneBodyContent = $(
                                            '.lesson-wizard-step-one-body .lesson-wizard-step-body-content');
                                        for (j = 0; j < subjects.length; j++){
                                            stepOneBodyContent.append($('<button/>', {
                                                'class': 'lesson-wizard-button',
                                                'text': subjects[j]
                                            }));
                                        }
                                        // Attach click handler with buttons.
                                        stepOneBodyContent.find(
                                            '.lesson-wizard-button').click(function(){
                                                OC.editor.lwOptions['subject'] = $(this).text();
                                                moveTo(2, subjectClickHandler);
                                        });
                                    }
                                    else {
                                        OC.popup(response.message, response.title);
                                    }

                                },
                            'json');
                        });

                    });
                }
            }

            // -----------------------------------------------------

            var scrollbarWidth = getScrollbarWidth();

            // Prepare the internal search visuals.
            var editorSearch = $('.editor-search'),
                editorSearchPullout = $('.editor-search-pullout');

            if (editorSearch.length > 0){
                editorSearchPullout.css({
                    'margin-right': scrollbarWidth
                });

                editorSearch.css({
                    'top': $('.editor-toolbar-wrapper').outerHeight(true) + $(
                        '.editor-toolbar-wrapper').offset().top + 5
                });

                editorSearchPullout.click(function(event){
                    if (!$(this).hasClass('pulled-out')){
                        editorSearch.animate({
                            right: scrollbarWidth,
                        }, {
                            duration: 'slow'
                        });
                        editorSearchPullout.css({
                            'margin-right': 0
                        });
                        $(this).addClass('pulled-out');
                    } else {
                        editorSearch.animate({
                            right: '-' + $('.editor-search-main-panel').width(),
                        }, {
                            duration: 'slow',
                            complete: function(){
                                editorSearchPullout.css({
                                    'margin-right': scrollbarWidth
                                });
                            }
                        });
                        $(this).removeClass('pulled-out');
                    }
                });

                $('.editor-search-body').css({
                    'height': editorFrame.outerHeight(true) - $(
                        '.editor-search-bar').height() - 5
                });

                // Initialize side search experience.
                OC.tabs('.editor-search-body', { tab: 1 });
                OC.editor.initEditorSearchAutocomplete();

                $('.editor-search-tabs .editor-search-tab').parent('li').addClass('hide-tab');

                var editorFavoritesBrowser = $('.editor-favorites-browser');
                if (editorFavoritesBrowser.children().length === 0){
                    $.get('/interactions/favorites/list/',
                        function(response){
                            if (response.status == 'true'){
                                OC.editor.renderListings(response.favorites, editorFavoritesBrowser);
                                editorFavoritesBrowser.removeClass('loading-browser');
                            }
                            else {
                                OC.popup(response.message, response.title);
                            }
                        },
                    'json');
                }


                var projectBrowserTab = $('.editor-search-tabs li a[href=".my-projects"]'),
                    profileBrowserTab = $('.editor-search-tabs li a[href=".my-profile"]');

                if (!projectBrowserTab.hasClickEventListener()){
                    projectBrowserTab.click(OC.editor.searchProjectsTabClickHandler);
                }

                if (!profileBrowserTab.hasClickEventListener()){
                    profileBrowserTab.click(OC.editor.searchProfileTabClickHandler);
                }
            }
        },

        attachLPWidgetFocusHandler: function(tips){
            function assist(editableElement){
                if (!OC.editor.lessonAssist.hasClass('open') && !OC.editor.lessonAssist.hasClass(
                    'force-closed')){
                    OC.editor.openLessonAssist();
                }

                // Update the tips box.

                // Check if this has a class that is also there in the tips {}.
                lessonClasses = editableElement.attr('class').split(' ');
                var i;
                for (i = 0; i < lessonClasses.length; i++){
                    // Allow looping till the last class, as that is most likely the tip class.
                    if (lessonClasses[i].match('^lesson-')){
                        lessonClass = lessonClasses[i];
                    }
                }

                var tip = tips[lessonClass];
                if (tip){
                    if (_.isArray(tip)){
                        var list = $('<ul/>'), j;
                        for (j = 0; j < tip.length; j++){
                            list.append('<li>' + tip[j] + '</li>');
                        }
                        $('.lesson-assist-body').html(list);
                    } else
                        $('.lesson-assist-body').html(tip);
                } else {
                    $('.lesson-assist-body').html('(no tips found)');
                }

                $(this).addClass('assist-setup');
            }

            var lessonClasses, lessonClass, i;
            $('.cke_widget_editable').click(function(event){
                if ($(this).hasClass('cke_widget_editable_focused') && !$(this).hasClass('assist-setup')){
                    assist($(this));
                } else {
                    // Remove all assist setups.
                    $('.assist-setup').each(function(){
                        $(this).removeClass('assist-setup');
                    });
                }
            });

            // Account for table templates.
            $('table.lesson-editable td').click(function(event){
                if ($(this).hasClass('editable-block') && !$(this).hasClass('assist-setup')){
                    assist($(this));
                } else {
                    // Remove all assist setups.
                    $('.assist-setup').each(function(){
                        $(this).removeClass('assist-setup');
                    });
                }
            });

        },

        openLessonAssist: function(){
            var UPPER_SPACE = 40;
            // Move the editor body to the left edge.
            OC.editor.editorBodyWrapper.addClass('assisted');

            OC.editor.lessonAssist.css({
                'top': OC.editor.editorFrame.offset().top + UPPER_SPACE
            });
            OC.editor.lessonAssistBody.show();
            OC.editor.lessonAssist.addClass('open');
        },

        closeLessonAssist: function(force){
            OC.editor.lessonAssistBody.hide();
            OC.editor.lessonAssist.css({
                'top': OC.editor.editorFrame.outerHeight(true) + OC.editor.editorFrame.offset(
                    ).top - OC.editor.lessonAssistPullout.outerHeight(true)
            });
            OC.editor.lessonAssist.removeClass('open');
            OC.editor.lessonAssist.addClass('force-closed');

            OC.editor.editorBodyWrapper.removeClass('assisted');
        },

        prefillLPContent: function(lpMap){

            /************* Standards *****************/

            // Map the standards field to objectives determined from the standards
            //     and insert the objectives, standards.
            lpMap.standards.html(
                '<p>(enter objectives here)</p><p><span class="bold">Standards</span></p>');
            var i;
            for (i = 0; i < OC.editor.lwOptions['standards'].length; i++){
                lpMap.standards.append('<p><a href="' + OC.editor.lwOptions['standards'][i].url +
                    '" target="_blank">' + OC.editor.lwOptions['standards'][i].title +
                    '</a>: ' + OC.editor.lwOptions['standards'][i].description + '</p>');
            }
        },

        searchProjectsTabClickHandler: function(event){
            var projectsEditorBrowser = $('.editor-project-browser');

            if (projectsEditorBrowser.children().length === 0){
                $.get('/resources/raw-tree/all/projects/',
                    function(response){
                        if (response.status == 'true'){
                            OC.editor.renderTree('projects', response.tree, projectsEditorBrowser);
                            projectsEditorBrowser.removeClass('loading-browser');
                        }
                        else {
                            OC.popup(response.message, response.title);
                        }
                    },
                'json');
            }
        },

        searchProfileTabClickHandler: function(event){
            var projectsEditorBrowser = $('.editor-profile-browser');

            if (projectsEditorBrowser.children().length === 0){
                $.get('/resources/raw-tree/all/user/',
                    function(response){
                        if (response.status == 'true'){
                            OC.editor.renderTree('user', response.tree, projectsEditorBrowser);
                            projectsEditorBrowser.removeClass('loading-browser');
                        }
                        else {
                            OC.popup(response.message, response.title);
                        }
                    },
                'json');
            }
        },

        renderListings: function(response, listingBrowser){
            var i;
            for (i = 0; i < response.length; i++){
                result = OC.editor.editorSearchItemTemplate(response[i]);
                listingBrowser.append(result);
            }
        },

        renderTree: function(host, tree, listingBrowser){
            var key;
            if (host == 'projects'){
                console.log(tree[0]);
            } else {
                for (key in tree){
                    if (tree.hasOwnProperty(key)){
                        resources = _.pluck(_.where(tree[key].items, {type:'resource'}), 'resource');
                        OC.editor.renderListings(resources, listingBrowser);
                    }
                }
            }
        },

        searchDraggable: function($el){
            $el.on('mousedown', function(event){
                var originalEl = $(this);
                var $elShadow = originalEl.clone();

                $elShadow.css({
                    top: originalEl.offset().top - 10,
                    left: originalEl.offset().left
                });
                $('.editor-frame-result-clones').append($elShadow);

                var $newEl = $('.editor-frame-result-clones .editor-search-result:last');

                var newElHeight = $(this).outerHeight(),
                    newElWidth = $(this).outerWidth(),
                    newElY = $(this).offset().top + newElHeight - event.pageY,
                    newElX = $(this).offset().left + newElWidth - event.pageX;


                // Establish the editor frame.
                var droppableFrame = {
                    top: $('.editor-frame').offset().top,
                    bottom: $('.editor-frame').offset().top + $('.editor-frame').outerHeight(true),
                    left: $('.editor-body').offset().left,
                    right: $('.editor-frame').width() - $('.editor-search').offset().left
                };

                $(this).parents('.editor-frame').on('mousemove', function(event){
                    $newEl.addClass('draggable-shadow');
                    $('.draggable-shadow').offset({
                        top: event.pageY + newElY - newElHeight,
                        left: event.pageX + newElX - newElWidth
                    });

                    $newEl.offset().right = $newEl.offset().left + $newEl.width();

                    // TODO(Varun): Needs to account for the case dual case of newEl larger than frame on y-axis.
                    if (($newEl.offset().top > droppableFrame.top && $newEl.offset().top < droppableFrame.bottom) && ((
                            $newEl.offset().left < droppableFrame.right && $newEl.offset().left > droppableFrame.left) || (
                            $newEl.offset().right < droppableFrame.right && $newEl.offset().right > droppableFrame.left) || (
                            droppableFrame.left > $newEl.offset().left && droppableFrame.right < $newEl.offset().right)
                        )){
                        $('.editor-body').addClass('accepting');
                    }
                    else {
                        $('.editor-body').removeClass('accepting');
                    }

                }).on('mouseup', function(){
                    $newEl.removeClass('draggable-shadow');

                    if ($('.editor-body').hasClass('accepting')){
                        var editor = $('.editor-body').ckeditorGet();
                        var resultData = {
                            id: $newEl.attr('id'),
                            title: $('.editor-search-result-description-title', $newEl).text(),
                            thumbnail: $('.editor-search-result-thumbnail', $newEl).css('background-image').replace(/"/g, '\'')
                        };

                        editor.insertHtml(
                            _.template(OC.editor.insertedSearchResultTemplate)(resultData)
                        );
                        $newEl.remove();
                    }

                    $(this).unbind('mousemove');
                    $(this).unbind('mouseup');
                });

                event.preventDefault();
            });
        },

        insertedSearchResultTemplate: '<div class="foreign-document-element" id="<%= id %>">' +
            '<div class="foreign-document-element-thumbnail" style="background-image: <%= thumbnail %>"></div>' +
            '<div class="foreign-document-element-description">' +
                '<div class="foreign-document-element-description-title"><%= title %></div>' +
                '<div class="foreign-document-element-description-preview"><a href="">Preview</a></div>' +
            '</div>' +
            '</div>',

        initEditorSearchAutocomplete: function(){
            var searchInput = $('.editor-search-bar input[type="search"]'),
                searchResults = $('.my-search-results'),
                i, resultsHTML;

            var editorSearchTab = $('nav.editor-search-tabs .editor-search-tab').parent(
                'li');

            searchInput.bind('paste keyup', function(){
                var currentValue = $(this).val();
                if (currentValue.length > 2){
                    $('.search-query', editorSearchTab).text(currentValue);

                    // Check if the search tab has been opened.
                    if (editorSearchTab.hasClass('hide-tab')){
                        editorSearchTab.removeClass('hide-tab');
                        $('a', editorSearchTab).click();
                    }

                    if (OC.editor.searchCache.hasOwnProperty(currentValue)){
                        searchResults.html(OC.editor.searchCache[currentValue]);
                    } else {
                        $.get('/resources/api/editor-search/' + currentValue.trim() + '/',
                            function(response){
                                searchResults.html('');
                                resultsHTML = '';
                                for (i = 0; i < response.length; i++){
                                    result = OC.editor.editorSearchItemTemplate(response[i]);
                                    
                                    resultsHTML += result;
                                    searchResults.append(result);

                                    OC.editor.searchDraggable(
                                        $('.editor-search-result:last', searchResults));
                                }
                                
                                OC.editor.searchCache[currentValue] = resultsHTML;
                            },
                        'json');
                    }

                } else {
                    searchResults.html('');
                }
            });
        },

        initDropMenus: function(){
            OC.setUpMenuPositioning('nav#license-menu', '.editor-button-wrapper .license-button');
            OC.setUpMenuPositioning('nav#tags-menu', '.editor-button-wrapper .tags-button', true);

            $(window).resize(function () {
                OC.setUpMenuPositioning('nav#license-menu', '.editor-button-wrapper .license-menu');
                OC.setUpMenuPositioning('nav#tags-menu', '.editor-button-wrapper .tags-menu', true);
            });

            // Now bind the click button with the menus.
            $('.editor-button-wrapper button.license-button').click(
                function(event){
                    $('#license-menu').toggleClass('showMenu');
                    $('button.license-button').toggleClass('menu-open');

                    event.stopPropagation();
                    event.preventDefault();
                    return false;
                }
            );

            $('.editor-button-wrapper button.tags-button').click(
                function(event){
                    $('#tags-menu').toggleClass('showMenu');
                    $('button.tags-button').toggleClass('menu-open');

                    event.stopPropagation();
                    event.preventDefault();
                    return false;
                }
            );

            $('.editor-button-wrapper button.share-document-button').click(
                function(event){
                    function resourceVisibilityToggler(resourceID, isProject){}
                    function collectionVisibilityToggler(collectionID, isProject){}

                    function closeCollaboratorPopupCallback(){
                        $('input[name="visibility"]').val(
                            OC.collaborators.currentResourceCollectionVisibility);
                    }

                    // Auto-save the document using a POST async request.
                    var resourceID = $('input[name="resource_id"]').val();

                    OC.collaborators.currentResourceCollectionVisibility =  $('input[name="visibility"]').val();

                    // Show auto-save loader before transitioning to popup.
                    if (resourceID === ''){
                        OC.setMessageBoxMessage('Auto-saving your document to turn sharing on...');
                        OC.showMessageBox();

                        serializeDocument();
                        var newDocumentForm = $('#new-resource-document-form');

                        $.post('/resources/api/auto-save-document/', newDocumentForm.serialize(),
                            function(response){
                                // Hide the resource
                                if (response.status == 'true'){
                                    OC.dismissMessageBox();

                                    // If not set already, set document ID.
                                    $('input[name="resource_id"]').val(response.resource.id);

                                    OC.collaborators.init({ type: 'resource', id: response.resource.id }, resourceVisibilityToggler,
                                        collectionVisibilityToggler, closeCollaboratorPopupCallback, true);
                                }
                                else {
                                    OC.popup(response.message, response.title);
                                    OC.dismissMessageBox();
                                }
                            },
                        'json');
                    } else {
                        OC.collaborators.init({ type: 'resource', id: resourceID }, resourceVisibilityToggler,
                            collectionVisibilityToggler, closeCollaboratorPopupCallback, true);
                    }


                    event.stopPropagation();
                    event.preventDefault();
                    return false;
                }
            );
        },

        initImageUploadDialog: function(callback) {
            OC.editor.setImageUploadCallback(callback);

            var insertImagePopup = OC.customPopup('.image-upload-dialog');

            imageWidgetSubmit = $('.image-upload-submit-button');
            imageWidgetSubmit.unbind('click');

            // Bind the 'Done' button on the popup.
            imageWidgetSubmit.click(function(event){
                // Close the popup.
                insertImagePopup.close();
            });

            Dropzone.forElement('.image-upload-dialog .upload-drag-drop').on('success', function(file, response){
                if (response.status !== "false") {
                    // Make the name of the file content editable.
                    $('.dz-filename span', file.previewElement).attr(
                        'contenteditable', true);

                    var newFileElement = $(this.element).children().last();
                    var insertImageWrapper = $('<div/>', {
                        'class': 'image-insert-button'
                    });

                    var insertImageButton = $('<button/>', {
                        'text': 'Insert image',
                        'class': 'btn dull-button'
                    });
                    insertImageButton.attr('value', JSON.parse(response).url);

                    OC.editor.bindClickWithImageInsert(
                        insertImageButton, OC.editor.getImageUploadCallback(),
                        insertImagePopup
                    );

                    insertImageWrapper.append(insertImageButton);
                    newFileElement.append(insertImageWrapper);
                } else {
                    OC.popup('The upload process failed due to some errors. ' +
                        'Contact us if the problem persists. Error description below:' +
                        response.error, 'Upload image failed'
                    );
                }

            });

            // API to get a list of user images
            if (OC.editor.myImages.length === 0) {
                // Get User ID from editor
                var userID = $('.document-edit-form input[name=user]').val();

                var imageHistoryWrapper = $('.show-image-history .image-history-set');

                $.get('/api/list-user-images/' + userID, function(response){
                    var i;
                    for (i = 0; i < response.length; i++){
                        OC.editor.myImages.push(response[i]);
                        var newImageElement = OC.editor.imageHistoryTemplate(response[i]);
                        imageHistoryWrapper.append(newImageElement);
                    }

                    OC.editor.bindClickWithImageInsert(
                        $('.image-history-set .image-insert-button button'),
                        OC.editor.getImageUploadCallback(),
                        insertImagePopup
                    );
                }, 'json');
            }

            return insertImagePopup;
        },

        getImageUploadCallback: function(){
            return OC.editor.imageUploadCallback;
        },

        setImageUploadCallback: function(callback){
            OC.editor.imageUploadCallback = callback;
        },

        bindClickWithImageInsert: function(button, callback, popup){
            button.click(function(){
                callback(button.val());
                popup.close();
            });
        },

        bindClickWithFileInsert: function(button, callback, popup){
            button.click(function(){
                callback(button.val(), button.attr('name'));
                popup.close();
            });
        },

        initUploadDialog: function(callback){
            var uploadPopup = OC.customPopup('.upload-widget-dialog');

            uploadWidgetSubmit = $('.upload-widget-submit-button');
            uploadWidgetSubmit.unbind('click');

            // Bind the 'Done' button on the popup.
            uploadWidgetSubmit.click(function(event){
                // Close the popup.
                uploadPopup.close();
            });

            Dropzone.forElement('.upload-widget-dialog .upload-drag-drop').on('success', function(file, response){
                if (response.status !== "false") {
                    var newFileElement = $(this.element).children().last();
                    var insertUploadWrapper = $('<div/>', {
                        'class': 'upload-insert-button'
                    });

                    var insertUploadButton = $('<button/>', {
                        'text': 'Insert file',
                        'class': 'btn dull-button'
                    });
                    
                    var response_object = JSON.parse(response);
                    var key, uploadedFile;
                    for (key in response_object) {
                        uploadedFile = response_object[key];
                        break;
                    }

                    insertUploadButton.attr('value', uploadedFile['url']);
                    insertUploadButton.attr('name', uploadedFile['title']);

                    OC.editor.bindClickWithFileInsert(
                        insertUploadButton, callback, uploadPopup
                    );

                    insertUploadWrapper.append(insertUploadButton);
                    newFileElement.append(insertUploadWrapper);
                } else {
                    OC.popup('The upload process failed due to some errors. ' +
                        'Contact us if the problem persists. Error description below:' +
                        response.error, 'Upload image failed'
                    );
                }
            });

            return uploadPopup;
        },

        initInsertVideoDialog: function(){
           var addVideoPopup = OC.customPopup('.add-video-widget-dialog');

            videoWidgetSubmit = $('.add-video-widget-submit-button');
            videoWidgetSubmit.unbind('click');

            // Bind the 'Done' button on the popup.
            videoWidgetSubmit.click(function(event){
                // Close the popup.
                addVideoPopup.close();

                // Insert the video based on a _ template in the position
                //     of the old container block for resources.
                var urlInput = $('form#add-video-widget-form input[name=video_url]').val();

                if (urlInput.length > 0){
                    var urlElement =  document.createElement('a');
                    urlElement.href = urlInput;

                    if (urlElement.hostname.indexOf('youtube') != -1){
                        video_tag = urlElement.search.match('v=[^&]*')[0].substring(2);
                        OC.editor.cke.insertHtml(OC.editor.youtubeVideoTemplate({'video_tag': video_tag}));
                    } else if (urlElement.hostname.indexOf('vimeo') != -1) {
                        // Very stupid way to obtain video URL.
                        //     If this pathname has a closing '/', then substring until that, else just an
                        //     open ended substring till the end.
                        video_tag = urlElement.pathname.substring(1).indexOf(
                            '/') == -1 ? urlElement.pathname.substring(1) : urlElement.pathname.substring(
                            1, urlElement.pathname.substring(1).indexOf('/'));
                        OC.editor.cke.insertHtml(OC.editor.vimeoVideoTemplate({'video_tag': video_tag}));
                    }
                }
            });
        },

        initImageUploaderTabs: function(){
            OC.tabs('.article-image-uploader');
        },

        updateBreadcrumb: function(category_id){
            breadcrumb = $('.breadcrumbs-edit');

            // Set a spinner in absolute position inside the category box
            breadcrumbPosition = breadcrumb.position();

            bcRight = breadcrumbPosition.left + breadcrumb.outerWidth();

            if ($('#breadcrumb-spinner').length !== 1) {
                $("<div></div>", {
                    id: 'breadcrumb-spinner',
                    class: 'spinner',
                    style: "position: absolute; top: " + (
                        breadcrumbPosition.top + 8) + "px; left: " + (
                            bcRight - 24) + "px;"
                }).appendTo('#floating-blocks');
            }

            $('#breadcrumb-spinner').fadeIn('fast');

            // Fetch the entire breadcrumb using the API        
            $.ajax({
                type: 'GET',
                url: '/api/getBreadcrumb?category_id=' + category_id,
                dataType: 'json',
                success: function(response) {
                    newBreadcrumb = "";
                    response.forEach(function(element){
                        newBreadcrumb += element;
                        if (element != _.last(response))
                            newBreadcrumb += "<span class=\"vertical-caret breadcrumbs-caret\"></span>";
                    });
                    $('.breadcrumbs-edit').html(newBreadcrumb);

                    // Hide the spinner             
                    $('#breadcrumb-spinner').fadeOut('fast');
                }
            });
        },

        objectiveDeleteHandler: function(){
            // Get delete button and the block
            var deleteButton = $(this);
            var objectiveBlock = deleteButton.parents('.objective-input');

            // Remove the entire block from the DOM
            objectiveBlock.remove();
        },

        initExistingWidgets: function(){
            var widgets = $('.document-element'),
                i, j, k, table, columns, cells, widget,
                widgetElement, moveHandle, documentElementDelete;

            for (i = 0; i < widgets.length; i++){
                widget = $(widgets[i]);

                // Initialize custom widgets.
                // TODO(Varun): This needs to be made "object-oriented".
                if (widget.hasClass('document-table')){
                    tableWrapper = widget;
                    widgetElement = $('table', tableWrapper);

                    // Set table ID.
                    widgetElement.attr('id', 'table-' + i);

                    // Allow resize of the columns.
                    tableWrapper.prepend('<div class="column-resize"></div>');
                    columns = $('col', tableWrapper);
                    for (j = 0; j < columns.length; j++){
                        $(columns[j]).attr('id', 'column-' + i + '-' + j);
                    }
                    OC.editor.initTableResize(tableWrapper);

                    // Add action row to the table.
                    $('tr:last', tableWrapper).after(OC.editor.widgets.tableActionsRowHTML);

                    // Bind table actions with event handlers.
                    OC.editor.bindTableActionHandlers(tableWrapper);

                    // Make all cells editable.
                    cells = $('td, th', tableWrapper).not('td.table-actions-wrapper', tableWrapper);
                    for (k = 0; k < cells.length; k++){
                        $(cells[k]).attr('contenteditable', 'true');
                    }

                    OC.editor.bindWidgetHandlers(widget, widgetElement);
                } else if (widget.hasClass('document-textblock')){
                    var textblockTextarea = $('<textarea/>', {
                        'html': widget.html()
                    });
                    widget.html(textblockTextarea);

                    $('textarea', widget).ckeditor(function(textarea){
                        widgetElement = $('.cke', widget);
                        OC.editor.bindWidgetHandlers(widget, widgetElement);
                    });
                }
            }

            OC.editor.initWidgetSorting(true);
        },

        bindWidgetDelete: function(widgetDeleteButton){
            widgetDeleteButton.click(function(event){
                $('.widget-delete-dialog').dialog({
                    modal: true,
                    open: false,
                    width: 500,
                    buttons: {
                        Yes: function () {
                            widgetDeleteButton.parent('.document-element').remove();
                            $(this).dialog("close");
                        },
                        Cancel: function () {
                            $(this).dialog("close");
                        }
                    }
                });

                event.stopPropagation();
                event.preventDefault();
                return false;
            });
        },

        bindWidgetHandlers: function(widget, widgetElement){
            // Add 'move' and 'delete' widget controls on the elements.
            var deleteButton = $('<div/>', {
                'class': 'document-element-delete-button delete-button',
                'title': 'Delete block'
            });
            deleteButton.css({
                'left': widgetElement.offset().left + widgetElement.width() + 10
            });
            widget.prepend(deleteButton);
            widgetDelete = $('.document-element-delete-button', widget);
            widgetDelete.tipsy({ gravity: 'n' });

            // Bind delete functionality with delete button.
            OC.editor.bindWidgetDelete(widgetDelete);

            var moveHandle = $('<div/>', {
                'class': 'document-element-handle'
            });
            moveHandle.css({
                'height': widget.height(),
                'margin-bottom': widget.height(),
                'left': widgetElement.offset().left - 35
            });

            widget.prepend(moveHandle);
        },

        initWidgetSorting: function(initialize){
            var initializeDocument = initialize || false;

            if (initializeDocument){
                // Make all elements sortable.
                $('.document-body').sortable({
                    axis: 'y',
                    handle: '.document-element-handle',
                    opacity: 0.5,
                    items: '.document-element',

                    start: function(event, ui){
                        var widgetBeingDragged = $(ui.item);
                        if (widgetBeingDragged.hasClass('document-textblock')){
                            // Get the editor instance associated with this object.
                            var editor = $('textarea', widgetBeingDragged).ckeditorGet();
                            editor.destroy();
                        }
                    },

                    stop: function(event, ui){
                        var widgetDragged = $(ui.item);
                        if (widgetDragged.hasClass('document-textblock')){
                            // Create an editor instance from this textarea.
                            var editor = $('textarea', widgetDragged).ckeditor();
                        }
                    }
                });
            } else {
                // Refresh the sortable list by recognizing the new widget.
                $('.document-body').sortable('refresh');
            }
        },

        bindAddWidgetClickHandler: function(targetSelector){
            var addWidgetButton = $(targetSelector);
            addWidgetButton.click(OC.editor.addWidgetClickHandler);
        },

        addWidgetClickHandler: function(event){
            var addPopup = OC.customPopup('.add-document-widget-dialog'),
                insertTarget = $(event.target);

            var widgetOption = $('.add-document-widget-dialog .add-widget-option');
            widgetOption.click(function(event){
                // Remove the 'selected' class from all other widget options.
                $('.add-document-widget-dialog .add-widget-option').removeClass('selected');
                $(event.target).closest('.add-widget-option').addClass('selected');
            });

            var widgetSubmit = $('.add-document-widget-submit-button');
            widgetSubmit.unbind('click');

            var widgetElement;

            // Bind the 'Next' button on the popup.
            widgetSubmit.click(function(event){
                var selectedOption = $(
                    '.add-document-widget-dialog .add-widget-option.selected');

                if (selectedOption.length >= 1){
                    addPopup.close();

                    if (selectedOption.hasClass('video')){
                        OC.editor.initInsertVideoDialog();
                    } else if (selectedOption.hasClass('image')){
                        OC.editor.initImageUploadDialog(OC.editor.onImageInsert);
                    } else if (selectedOption.hasClass('resource')){
                        OC.editor.addInlineLinkPopout(OC.editor.onLinkInsert);
                    }  else if (selectedOption.hasClass('upload')){
                        OC.editor.initUploadDialog(OC.editor.onUploadInsert);
                    }

                    /*
                    if (selectedOption.hasClass('table')){
                        var tables =  $('.document-body .document-table');

                        var newTable = OC.editor.widgets.table({'tableID': tables.length});
                        $('.document-body').append(newTable);
                        var appendedTableWrapper = $('.document-body .document-table:last');

                        // Make cells CKEditor-able.
                        $('td[contenteditable=true], th[contenteditable=true]', appendedTableWrapper).ckeditor();

                        // Focus on the first cell.
                        $('th:first', appendedTableWrapper).focus();

                        // Allow resize of the columns.
                        OC.editor.initTableResize(appendedTableWrapper);

                        // Bind table actions with event handlers.
                        OC.editor.bindTableActionHandlers(appendedTableWrapper);

                        widget = appendedTableWrapper;
                        widgetElement = $('table', appendedTableWrapper);

                        // Add widget handlers.
                        OC.editor.bindWidgetHandlers(widget, widgetElement);
                        OC.editor.initWidgetSorting();
                    } else if (selectedOption.hasClass('text-block')){
                        var newTextBlock = OC.editor.widgets.textBlock();
                        $('.document-body').append(newTextBlock);

                        var appendedTextBlock = $('.document-body .document-textblock:last');
                        $('textarea', appendedTextBlock).ckeditor(function(textarea){
                            widgetElement = $('.cke', appendedTextBlock);
                            widget = appendedTextBlock;

                            // Add widget handlers.
                            OC.editor.bindWidgetHandlers(widget, widgetElement);
                            OC.editor.initWidgetSorting();
                        });
                    }*/
                }

            });

            event.preventDefault();
            event.stopPropagation();
            return false;
        },

        widgets: {
            tableActionsRowHTML: '<tr><td colspan="3" class="table-actions-wrapper"><a class="table-action table-action-new new-row-action">New row</a>' +
                '<a class="table-action table-action-new new-column-action">New column</a></td></tr>',

            table: function(inputs){
                return _.template('<div class="document-table document-element"><div class="column-resize"></div>' +
                '<table id="table-<%= tableID %>"><colgroup><col id="column-<%= tableID %>-0"/><col id="column-<%= tableID %>-1" /><col id="column-<%= tableID %>-2" /></colgroup>' +
                '<tr><th contenteditable="true"></th><th contenteditable="true"></th><th contenteditable="true"></th></tr>' +
                '<tr><td contenteditable="true"></td><td contenteditable="true"></td><td contenteditable="true"></td></tr>' +
                OC.editor.widgets.tableActionsRowHTML + '</table></div>')(inputs);
            },

            tableRow: _.template('<tr><td contenteditable="true"></td><td contenteditable="true"></td><td contenteditable="true"></td></tr>'),

            textBlock: _.template('<div class="document-textblock document-element"><textarea></textarea></div>')
        },

        bindTableActionHandlers: function(tableWrapper){
            var newRowButton = $('.new-row-action', tableWrapper);
            var newColumnButton = $('.new-column-action', tableWrapper);

            newRowButton.click(function(){
                // Add the row.
                var tableRows = $('tr', tableWrapper);
                $(tableRows[tableRows.length - 2]).after(OC.editor.widgets.tableRow());

                // Make it editable.
                tableRows = $('tr', tableWrapper);
                $('td', tableRows[tableRows.length - 2]).ckeditor();
            });

            newColumnButton.click(function(){
                // Add the column.
                var tableRows = $('tr', tableWrapper);
                var tableColumns = $('tr:first th', tableWrapper);

                if (tableColumns.length >= 4){
                    OC.popup('We only permit 4 columns per document at this stage. Sorry ' +
                        'for the inconvenience.', 'Cannot add new column');
                } else {
                    // Append a 'th' to the header row.
                    newCell = $('<th/>', {'contenteditable': 'true'});
                    $(tableRows[0]).append(newCell);
                    $('th:last', tableRows[0]).ckeditor();

                    // TODO(Varun): Append new <col> to the <colgroup>
                    newCol = $('<col/>', {'id': OC.editor.getNewColumnID(tableWrapper) });
                    $('colgroup', tableWrapper).append(newCol);

                    // Add a 'td' to each row except for the first & last one.
                    var i, newCell;
                    for (i = 1; i < tableRows.length - 1; i++){
                        newCell = $('<td/>', {'contenteditable': 'true'});
                        $(tableRows[i]).append(newCell);
                         $('td:last', tableRows[i]).ckeditor();
                    }

                    // Set the colspan of the bottom row to the new column length.
                    $('table tr:last td', tableWrapper).attr('colspan', tableColumns.length + 1);
                }

                // Recalculate and set widths of all columns.
                $('.document-body table col').width((100 / (tableColumns.length + 1)) + '%');
                
                // Adjust the position of the handlers.
                OC.editor.addNewColumnHandle(tableWrapper);
            });
        },

        getNewColumnID: function(tableWrapper){
            var tableID = $('table', tableWrapper).attr('id'),
                tableNumber = tableID.substring(6);

            var columns = $('col', tableWrapper);
            return 'column-' + tableNumber + '-' + (columns.length);
        },

        initTableResize: function(tableWrapper){
            // For every column, create a relatively positioned resize handle,
            //    which is the height of the 'th' row and width of about 4px.
            var columns = $('tr > th', tableWrapper);
            var columnResizeWrapper = $('.column-resize', tableWrapper);

            var table = $('table', tableWrapper),
                tableHeader = $('tr:first', tableWrapper),
                tableNumber = table.attr('id').substring(6);

            var i;
            for (i = 0; i < columns.length - 1; i++){
                var columnHandle = $('<div/>', {
                    'class': 'column-handle', 'id': 'column-' + tableNumber + '-' + i + '-handle'});
                columnResizeWrapper.append(columnHandle);

                var newColumnHandle = $('.column-handle:last', tableWrapper);

                var currentColumn = $(columns[i]);

                // Reposition the handle by using the th left and top positions.

                // Calculate the offset of the column from the left edge of the table.
                var tableLeft = tableWrapper.position().left,
                    columnLeft = currentColumn.position().left;

                var top = currentColumn.position().top,
                    left = (columnLeft - tableLeft) + (
                        currentColumn.outerWidth() - newColumnHandle.width()/2);

                newColumnHandle.css({'left': left + 'px'});

                // Set the handle height.
                var currentColumnHeight = tableHeader.outerHeight();
                newColumnHandle.height(currentColumnHeight);
                newColumnHandle.css('margin-bottom', '-' + currentColumnHeight + 'px');
            }

            columnResizeWrapper.css('margin-bottom', '-' + (
                tableHeader.outerHeight() + parseInt(table.css('margin-top'), 10)) + 'px');

            OC.editor.makeHandlerDraggable($('.column-handle', columnResizeWrapper), tableNumber);
        },

        makeHandlerDraggable: function(elementSelector, tableNumber){
            // Make the resize handle draggable on the x-axis, with the constraint
            //    being the 'th' row width.
            var handleID, endIndex, columnNumber, column;
            elementSelector.draggable({
                axis: 'x',
                containment: '.column-resize',
                start: function(event, ui){
                    // Add class to handle.
                    $(event.target).addClass('dragging');
                },

                stop: function(event, ui){
                    // Remove class from handle.
                    $(event.target).removeClass('dragging');
                },

                // Make the onDrag function resize the <col> while moved.
                drag: function(event, ui){
                    // Get the <col> associated with this handle.
                    handleID = $(event.target).attr('id');
                    endIndex = handleID.indexOf('-handle');
                    columnNumber = parseInt(handleID.substring(
                        handleID.indexOf('-', 7) + 1, endIndex), 10);
                    column = $('#column-' + tableNumber + '-' + columnNumber);

                    // Calculate new column width.
                    var newWidth = ui.offset.left - column.position().left;

                    // Resize the current (left) column and the right column accordingly.
                    column.width(newWidth);

                    var originalWidth = column.width();
                    var rightColumn = $('#column-' + tableNumber + '-' + (columnNumber + 1));
                    rightColumn.width(
                        ((originalWidth - newWidth) + rightColumn.width()));
                }
            });
        },

        addNewColumnHandle: function(tableWrapper){
            var columns = $('tr > th', tableWrapper);

            // Reposition the existing column handles.
            var columnResizeWrapper = $('.column-resize', tableWrapper),
                columnHandles = $('.column-resize .column-handle', tableWrapper);

            var table = $('table', tableWrapper),
                tableHeader = $('tr:first', tableWrapper),
                tableNumber = table.attr('id').substring(6),
                tableLeft = tableWrapper.position().left;

            var i;
            // Don't iterate through the last column.
            for (i = 0; i < columns.length - 2; i++){
                var currentColumn = $(columns[i]),
                    currentColumnHandler = $(columnHandles[i]);

                // Calculate the offset of the column from the left edge of the table.
                var columnLeft = currentColumn.position().left;

                // Set the new left of the handle based on the new column position.
                var left = (columnLeft - tableLeft) + (
                    currentColumn.outerWidth() - currentColumnHandler.width()/2);
                currentColumnHandler.css({ 'left': left });
            }

            var columnHandle = $('<div/>', {
                'class': 'column-handle', 'id': 'column-' + tableNumber + '-' + i + '-handle'});
                columnResizeWrapper.append(columnHandle);

            var appendedColumnHandle = $('.column-handle:last', columnResizeWrapper);

            var appendedColumn = $(columns[i]),
                appendedColumnLeft = appendedColumn.position().left;
            var appendColumnHandleLeft = (appendedColumnLeft - tableLeft) + (
                appendedColumn.outerWidth() - appendedColumnHandle.width()/2);

            appendedColumnHandle.css({'left': appendColumnHandleLeft + 'px'});

            // Set the handle height and left position.
            var currentColumnHeight = tableHeader.outerHeight();
            appendedColumnHandle.height(currentColumnHeight);
            appendedColumnHandle.css('margin-bottom', '-' + currentColumnHeight + 'px');

            OC.editor.makeHandlerDraggable(appendedColumnHandle, tableNumber);
        },

        addInlineLinkPopout: function(callback, currentText, currentURL){
            // Setup the tabs the link-to popup.
            OC.tabs('.link-resource-browser');

            var linkToPopup = OC.customPopup('.link-resource-dialog'),
                profileResourceCollectionBrowser = $('.link-resource-profile-browser'),
                projectsResourceCollectionBrowser = $('.link-resource-project-browser'),
                collectionID = $('form#resource-form input[name=collection_id]').val(),
                toURLInput = $('form#link-to-url-form input[name=resource-url]'),
                toURLTextInput = $('form#link-to-url-form input[name=resource-url-text]');

            profileResourceCollectionBrowser.addClass('loading-browser');
            projectsResourceCollectionBrowser.addClass('loading-browser');

            // If there was a link selected, fill in inputs with original URL values,
            //     else clear their browser cached value.
            if (currentURL && currentText){
                toURLInput.val(currentURL);
                toURLTextInput.val(currentText);
            } else if (currentText) {
                toURLInput.val('');
                toURLTextInput.val(currentText);
            } else {
                toURLInput.val('');
                toURLTextInput.val('');
            }

            // Bind Done button on custom popup.
            $('.link-resource-submit-button').click(function(event){
                // Capture the actively selected tab.
                var activeTab = $('.link-resource-dialog .link-resource-tabs li a.selected');

                var toResourceCollection, toURL;

                // If the active tab is projects.
                if (activeTab.attr('href') === '.my-projects'){
                    // Capture currently selected collection.
                    toResourceCollection = projectsResourceCollectionBrowser.find(
                        '.selected-destination-collection, .selected-destination-resource');
                } else if (activeTab.attr('href') === '.my-profile'){
                    toResourceCollection = profileResourceCollectionBrowser.find(
                        '.selected-destination-collection, .selected-destination-resource');
                } else {
                    toURL = $('form#link-to-url-form input[name=resource-url]').val();
                    toURLText = $('form#link-to-url-form input[name=resource-url-text]').val();
                }

                linkToPopup.close();

                if (toResourceCollection){
                    callback($(toResourceCollection[0]), null);
                } else if (toURL){
                    callback(toURL, toURLText);
                }
            });

            if (profileResourceCollectionBrowser.children().length === 0){
                $.get('/resources/tree/all/user/',
                    function(response){
                        if (response.status == 'true'){
                            OC.renderBrowser(response.tree, profileResourceCollectionBrowser);
                            profileResourceCollectionBrowser.removeClass('loading-browser');
                        }
                        else {
                            OC.popup(response.message, response.title);
                        }
                    },
                'json');
            }

            var projectBrowserTab = $('.link-resource-tabs li a[href=".my-projects"]');

            if (!projectBrowserTab.hasClickEventListener()){
                projectBrowserTab.click(OC.editor.linkToProjectsTabClickHandler);
            }

            var standardsBrowserTab = $('.link-resource-tabs li a[href=".standards"]');

            if (!standardsBrowserTab.hasClickEventListener()){
                standardsBrowserTab.click(OC.editor.linkToStandardsTabClickHandler);
            }
        },

        linkToProjectsTabClickHandler: function(event){
            var projectsResourceCollectionBrowser = $('.link-resource-project-browser'),
                collectionID = $('form#resource-form input[name=collection_id]').val();

            if (projectsResourceCollectionBrowser.children().length === 0){
                $.get('/resources/tree/all/projects/',
                    function(response){
                        if (response.status == 'true'){
                            OC.renderBrowser(response.tree, projectsResourceCollectionBrowser);
                            projectsResourceCollectionBrowser.removeClass('loading-browser');
                        }
                        else {
                            OC.popup(response.message, response.title);
                        }
                    },
                'json');
            }
        },

        linkToStandardsTabClickHandler: function(event){
            var standardsResourceCollectionBrowser = $('.link-resource-standards-browser');

            if (standardsResourceCollectionBrowser.children().length === 0){
                $.get('/meta/standards/tree/',
                    function(response){
                        if (response.status == 'true'){
                            OC.renderBrowser(response.tree, standardsResourceCollectionBrowser);
                            standardsResourceCollectionBrowser.removeClass('loading-browser');
                        }
                        else {
                            OC.popup(response.message, response.title);
                        }
                    },
                'json');
            }
        },

        initEditUnit: function(){
            $('form#edit-unit-form textarea[name=description]').ckeditor({
                skin: 'moono,/static/assets/css/ckeditor/skins/moono/'
            });
        },

        serializeDocument: function(){
            var newDocumentForm = $('#new-resource-document-form'),
                existingSerializedDocumentBody = $(
                    'textarea[name="serialized-document-body"]'),
                serializedDocumentBody;

            if (existingSerializedDocumentBody.length === 0){
                serializedDocumentBody = $('<textarea/>', {
                    'text': JSON.stringify([
                        {
                            type: 'textblock',
                            data: $('.editor-body').ckeditorGet().getData()
                        }
                    ]),
                    'name': 'serialized-document-body'
                });
                newDocumentForm.append(serializedDocumentBody);

            } else {
                serializedDocumentBody = existingSerializedDocumentBody;
                serializedDocumentBody.text = JSON.stringify([
                    {
                        type: 'textblock',
                        data: $('.editor-body').ckeditorGet().getData()
                    }
                ]);
            }

            return serializedDocumentBody;
        }
    };

    $(function() {
        $('.breadcrumbs-edit').click(function () {
            $( "#dialog-message" ).dialog({
                modal: true,
                open: false,
                buttons: {
                    Ok: function() {
                        $(this).dialog( "close" );
                        OC.editor.updateBreadcrumb(
                            $("#category-selection option:selected").attr(
                                'data-id'));
                    },
                    Cancel: function() {
                        $(this).dialog( "close" );
                    }
                }
            });
        });


        $('#article-edit-form #submission-buttons button').click(function (e) {
            var action = $(this).attr('data-action');

            // Populate textarea
            var objectives = [];
            var inputObjs = $('#objectives-inputs input');

            var i;
            for (i = 0; i < inputObjs.length; i++){
                objectives.push("\"" + $(inputObjs[i]).attr('value') + "\"");
            }

            $('textarea[name=objectives]').html("[" + objectives.join(',') + "]");

            // Based on which button was click, set the form input field attribute
            //     for the server to understand which buttonw as clicked
            $('input[name=action]').attr('value', action);

            if (action === "save") {
                $('#article-edit-form').submit();
            }
            else {

                // Launch log prompt dialog box
                $( "#log-message" ).dialog({
                    modal: true,
                    open: false,
                    buttons: {
                        Ok: function() {
                            $(this).dialog( "close" );
                            // HACK: Because fields in display:none aren't passed in the
                            //    POST requests, manually copy log field value to a hidden
                            //    attribute
                            $('input[name=log]').attr('value', $(
                                'input[name=log_message]').attr('value'));

                            $('#article-edit-form').submit();
                        },
                        Cancel: function() {
                            $(this).dialog( "close" );
                            return false;
                        }
                    }
                });
                e.stopPropagation();
                e.preventDefault();

                return false;
            }
        });

        // When "Add objectives" button in clicked, add empty <input> fields
        $('button#add-objective').click(function (e) {
            var inputs_wrapper = $(this).parents(
                '.edit-dropped').find('#objectives-inputs');
            var newObjective = $('<div />', {
                'class': 'objective-input'
            });

            var newInput = $('<input />', {
                'type': 'text',
                'class': 'browser-edit'
            });
            var deleteButton = $('<span />', {
                'class': 'delete-objective'
            });
            // Associate delete handler with button
            $(deleteButton).click(OC.editor.objectiveDeleteHandler);

            // Add the input and the delete button to the new objective block
            newObjective.append(newInput);
            newObjective.append(deleteButton);

            // Add the new objective block to the objectives list
            inputs_wrapper.append(newObjective);
            newInput.focus();
        });
    });

});