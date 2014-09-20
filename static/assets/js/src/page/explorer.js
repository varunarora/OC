define(['jquery', 'core', 'underscore', 'react'], function($, OC, _, React){

    OC.explorer = {
        initGradeSubjectMenu: function(){
            var menuSelector = 'nav.explorer-home-menu',
                menuButtonSelector = 'a.explorer-header-current';

            $(menuSelector).width($('.explorer-header-current').width() - 10);
            $(menuSelector + ' .floating-menu-spacer').width(
                $('.explorer-header-current').width() - 10);

            OC.setUpMenuPositioning(menuSelector, menuButtonSelector, true);
            $(window).resize(function () { OC.setUpMenuPositioning(
                    menuSelector, menuButtonSelector, true); });

            $(menuButtonSelector + ', ' + menuSelector).mouseenter(function () {
                $(menuButtonSelector).addClass('hover');
                $(menuSelector).addClass('show');
            }).mouseleave(function () {
                $(menuButtonSelector).removeClass('hover');
                $(menuSelector).removeClass('show');
            });
        },

        ModuleView: React.createClass({
            render: function(){
                return React.DOM.div({className: 'explorer-resource-module'}, [
                    React.DOM.div({className: 'explorer-resource-module-thumbnail'}, ''),
                    React.DOM.div({className: 'explorer-resource-module-content'}, [
                        React.DOM.div({className: 'explorer-resource-module-content-title'}, this.props.title),
                        React.DOM.div({className: 'explorer-resource-module-content-caption'}, this.props.textbookTitle)
                    ])
                ]);
            }
        }),

        ResourceView: React.createClass({
            renderResource: function(resource){
                return React.DOM.div({className: 'explorer-resource-item'}, [
                    React.DOM.div({className: 'explorer-resource-item-thumbnail-wrapper'}, [
                        React.DOM.div({className: 'explorer-resource-item-thumbnail'}, '')
                    ]),
                    React.DOM.div({className: 'explorer-resource-item-content'}, [
                        React.DOM.div({className: 'explorer-resource-item-content-title'}, [
                            React.DOM.a({href: resource.url, target: '_blank'}, resource.title)
                        ]),
                        React.DOM.div({className: 'explorer-resource-item-content-caption'}, 'Teachers notes: , Related learning outcomes: ')
                    ])
                ]);
            },
            renderObjective: function(objective){
                return React.DOM.div({className: 'explorer-resource-objective-section'}, [
                    React.DOM.div({className: 'explorer-resource-listing-body-fill'}, [
                        React.DOM.div({className: 'explorer-resource-objective'}, objective.title)
                    ]),
                    React.DOM.div({className: 'explorer-resource-listing-body-key'},
                        objective.resources.map(this.renderResource))
                ]);
            },
            render: function(){
                return React.DOM.div({className: 'explorer-resource-objective-sections'},
                    this.props.objectives.map(this.renderObjective));
            }
        }),

        initSideNavigation: function(){
            // Leanring outcomes / Standards.

            var i, j, LOCategories = _.keys(OC.explorer.hctLOs), menu,
                categoryLi, categoryMenu, categoryURL, categoryLOs, LoLi, LoURL;

            menu = $('<ul/>', {
                'class': 'explorer-body-side-menu hidden'
            });
            for (i = 0; i < LOCategories.length; i++){
                categoryLi = $('<li/>');
                categoryURL = $('<a/>', {
                    'href': '',
                    'text': LOCategories[i]
                });
                categoryLi.append(categoryURL);

                categoryMenu = $('<ul/>', {
                    'class': 'explorer-body-side-menu explorer-body-side-menu-light explorer-body-side-menu-light-categorized'
                });

                categoryLOs = OC.explorer.hctLOs[LOCategories[i]];
                for (j = 0; j < categoryLOs.length; j++){
                    LoLi = $('<li/>');
                    LoURL = $('<a/>', {
                        'href': '',
                        'text': categoryLOs[j]
                    });

                    LoLi.append(LoURL);
                    categoryMenu.append(LoLi);
                }

                categoryLi.append(categoryMenu);
                menu.append(categoryLi);
            }

            $('li.learning-outcomes').append(menu);

            // Textbooks / resources.
            var k, l, textbooks = _.keys(OC.explorer.hctTexts), resourcesMenu,
                textbookLi, textbookMenu, textbookURL, textbookChapters, ChapterLi, ChapterURL;

            resourcesMenu = $('<ul/>', {
                'class': 'explorer-body-side-menu'
            });
            for (k = 0; k < textbooks.length; k++){
                textbookLi = $('<li/>');
                textbookURL = $('<a/>', {
                    'href': '',
                    'text': textbooks[k]
                });
                textbookLi.append(textbookURL);

                textbookMenu = $('<ul/>', {
                    'class': 'explorer-body-side-menu explorer-body-side-menu-light'
                });

                textbookChapters = OC.explorer.hctTexts[textbooks[k]];
                for (l = 0; l < textbookChapters.length; l++){
                    ChapterLi = $('<li/>');
                    ChapterURL = $('<a/>', {
                        'href': '',
                        'text': textbookChapters[l].title
                    });

                    ChapterLi.append(ChapterURL);
                    textbookMenu.append(ChapterLi);
                }

                textbookLi.append(textbookMenu);
                resourcesMenu.append(textbookLi);
            }

            $('li.textbooks').append(resourcesMenu);


            // Show on click.
            $('li.learning-outcomes > a, li.textbooks > a').click(function(event){
                $(this).parent().find('.explorer-body-side-menu:first').toggleClass('hidden');

                event.stopPropagation();
                event.preventDefault();
                return false;
            });

            // Bind clicks on the lesson names.
            $('li.textbooks .explorer-body-side-menu-light li a').click(function(event){
                var title = $(this).text(),
                    textbookTitle = $(this).parents('ul:first').parent().find('a:first').text();

                React.renderComponent(OC.explorer.ModuleView(
                    {title: title.toUpperCase(), textbookTitle: textbookTitle.toUpperCase()}), $('.explorer-resource-module-wrapper').get(0));

                var rawObjectives = _.findWhere(OC.explorer.hctTexts[textbookTitle],
                    {title: title}).objectives,
                    objectives = [], resources, url;
                
                _.each(rawObjectives, function(objectiveResources, rawObjective, list){
                    resources = [];
                    objectiveResources.forEach(function(rawResource){
                        url = OC.explorer.hctResources[rawResource.resource_id];
                        resources.push({
                            url: url,
                            title: OC.explorer.hctResourceNames[url]
                        });
                    });

                    objectives.push({
                        title: rawObjective,
                        resources: resources
                    });
                });

                React.renderComponent(OC.explorer.ResourceView(
                    {objectives: objectives}), $('.explorer-resource-listing-body').get(0));

                event.stopPropagation();
                event.preventDefault();
                return false;
            });
        },

        hctLOs: {
            'Writing': [
                'L4W1: Write a problem/solution guided essay in about 150 words and a free essay in about 250 words on a familiar academic/specialised topic with an effective introduction, supporting paragraphs and a conclusion',
                'L4W2: Write a cause and effect guided essay in about 150 words and a free essay in about 250 words on a familiar academic/specialised topic with an effective introduction, supporting paragraphs and a conclusion',
                'L4W3: Write an argument guided essay in about 150 words and a free essay in about 250 words on a familiar academic/specialised topic with an effective introduction, supporting paragraphs and a conclusion',
                'L4W4: Write a division and classification guided essay in about 150 words and a free essay in about 250 words on a familiar academic/specialised topic with an effective introduction, supporting paragraphs and a conclusion',
                'L4W5: Write formal letter to accompany a job application or CV'
            ],

            'Listening': [
                'L4L1: Anticipate and predict the content and meaning of a talk or conversation using prior knowledge and personal experience',
                'L4L2: Use prior knowledge and personal experience to predict content',
                'L4L3: Relate personal experiences to listening topics',
                'L4L4: Integrate information from multiple sources',
                'L4L5: Outline the main ideas and identify the supporting ideas in a talk or conversation',
                'L4L6: Take effective notes from a talk or conversation using symbols and abbreviations',
                'L4L7: Summarize and paraphrase the whole or portions of a talk, lecture or conversation',
                'L4L8: Summarize a discussion in a group',
                'L4L9: Identify tone, nuance and register in a wide variety of listening situations',
                'L4L10: Identify a range of vocabulary, idioms, colloquial expressions and technical terminology to handle most social or study situations typical of an academic environment',
                'L4L11: Identify the transitional words that assist in following the sequence, organization of and relationships among ideas expressed.',
                'L4L12: Evaluate information to identify or infer the purpose, bias, assumptions and motives of the speaker',
                'L4L13: Determine literal and implied meaning of message and draw logical conclusions.',
                'L4L14: Discriminate between facts and opinions, and emotional and logical ideas',
                'L4L15: Integrate information from multiple sources',
                'L4L16: Make inferences to fully understand what a speaker means',
                'L4L17: Listen for opinions to understand a book review',
                'L4L18: Listen for reduced verb forms to understand everyday speech',
                'L4L19: Listen for opinion statements to understand a speaker’s positive and negative attitudes',
                'L4L20: Connect people with ideas to understand their attitudes',
                'L4L21: Listen to personal stories to understand other people’s experiences',
                'L4L22: Listen for intonation to identify a speaker’s level of interest in a topic',
                'L4L23: Listen for exact words or phrases to improve word recognition',
                'L4L24: Listen for modal verbs to understand obligations, prohibitions, and recommendations',
                'L4L25: Listen for intonation to distinguish between statements and questions',
                'L4L26: Listen for a sequence of factors to understand the stages in a process',
                'L4L27: Understand examples to relate them to larger ideas',
                'L4L28: Listen for signposts to understand the structure of a passage',
                'L4L29:  Listen for exact words in a conversation to improve word recognition'
            ],

            'Speaking': [
                'L4S1: Apply basic stress, intonation and phonology to speak intelligibly using high  frequency words about common and familiar topics',
                'L4S2: Interact appropriately at a basic level in routine social and learning contexts by making relevant comments and asking and responding to familiar questions',
                'L4S3: Ask for clarification of unfamiliar language, topics and concepts',
                'L4S4: Express ideas, opinions and plans with examples clearly',
                'L4S5: Demonstrate an awareness that English changes according to purpose and audience by talking and responding appropriately.',
                'L4S7: Give clear oral descriptions of events (present and past), successful and unsuccessful personal experiences, inaccurate first impressions, advantages and disadvantages of change, influence of advertisements on our behavior, and influence of money on happiness.',
                'L4S8: Organize speech using appropriate signal/transitional words when necessary (E.g. in basic chronological order, order of importance etc.)',
                'L4S9: Make notes to prepare for a discussion or presentation',
                'L4S10: Participate in group discussions and projects utilizing leadership skills'
            ],

            'Reading': [
                'L4R1: Read and comprehend a wide variety of authentic texts of various lengths, including general, technical and academic texts',
                'L4R2: Apply appropriate pre-reading strategies to facilitate comprehension',
                'L4R3: Improve comprehension and reading speed through knowledge of complex grammatical structures and rhetorical patterns and devices, a wide range of vocabulary roots and affixes, and the ability to identify context clues to guess meaning',
                'L4R4: Adjust reading rate according to level and length of materials and purpose of reading',
                'L4R5: Identify literary devices, such as parenthesis, footnotes and quotations',
                'L4R6: Skim to identify the main ideas and recognize the organization of ideas',
                'L4R7: Grasp the meaning of text sufficiently to extract the relevant points and paraphrase or summarize the whole text, a specific idea or the underlying idea',
                'L4R8: Read between the lines to infer the unstated ideas that the author wants to depict',
                'L4R9: Read instructions and rubrics carefully and interpret these without difficulty',
                'L4R10: Comprehend a wide variety of conceptual and symbolic language and high frequency idiomatic expressions',
                'L4R11: Distinguish fact from opinion',
                'L4R12: Identify the author’s purpose and tone',
                'L4R13: Understand connotation and denotation'
            ]
        },

        hctTexts: {
            'Ready to Read More': [
                {
                    'title': 'Chapter 3: Use Vocabulary Strategies',
                    'objectives': {
                        'Use Context to Guess Meaning': [],
                    }
                },
                {
                    'title': 'Chapter 4: Understand Supporting Details',
                    'objectives': {
                        'Identifying Supporting Details': [],
                        'Word parts - Adjective Suffixes': [
                            {'resource_id': 1},
                            {'resource_id': 2},
                            {'resource_id': 3},
                            {'resource_id': 4},
                        ]
                    }
                },
                {
                    'title': 'Chapter 5: Analyze the text',
                    'objectives': {
                        'Recognizing Patterns of Organization - Listing': [
                            {'resource_id': 5},
                        ],
                        'Recognizing Patterns of Organization - Sequence': [
                            {'resource_id': 6},
                            {'resource_id': 7},
                        ],
                        'Recognizing Patterns of Organization - Cause and Effect': [
                            {'resource_id': 8},
                            {'resource_id': 9},
                            {'resource_id': 10},
                            {'resource_id': 11},
                            {'resource_id': 12},
                        ],
                        'Recognizing Patterns of Organization - Compare and Contrast': [
                            {'resource_id': 13},
                            {'resource_id': 14},
                            {'resource_id': 15},
                            {'resource_id': 16},
                            {'resource_id': 17},
                            {'resource_id': 18},
                            {'resource_id': 19},
                            {'resource_id': 20},
                            {'resource_id': 21},
                        ],
                        'Word Parts – Verb Suffixes': [
                            {'resource_id': 22},
                        ]
                    }
                },
                {
                    'title': 'Chapter 7: Distinguish Fact from Opinion',
                    'objectives': {
                        'Distinguishing Fact from Opinion': [
                            {'resource_id': 23},
                            {'resource_id': 24},
                            {'resource_id': 25},
                            {'resource_id': 26},
                            {'resource_id': 27},
                            {'resource_id': 28},
                            {'resource_id': 29},
                        ],
                        'Learning Collocations': [
                            {'resource_id': 30},
                            {'resource_id': 31},
                            {'resource_id': 32},
                            {'resource_id': 33},
                            {'resource_id': 34},
                            {'resource_id': 35},
                            {'resource_id': 36},
                            {'resource_id': 37},
                            {'resource_id': 38},
                        ]
                    }
                },
                {
                    'title': 'Chapter 8: Understand the Author\'s purpose and tone',
                    'objectives': {
                        'Understanding the Author\'s Purpose': [
                            {'resource_id': 39},
                            {'resource_id': 40},
                            {'resource_id': 41},
                            {'resource_id': 42},
                            {'resource_id': 43},
                        ],
                        'Connotation and Denotation': [
                            {'resource_id': 45},
                            {'resource_id': 46},
                            {'resource_id': 47},
                            {'resource_id': 48},
                            {'resource_id': 49},
                            {'resource_id': 50},
                            {'resource_id': 51},
                        ],
                        'More Collocations': []
                    }
                },
            ],

            'Q Skills for Success Book 3': [
                {
                    'title': 'Unit 1: Are first impressions accurate?',
                    'objectives': {
                        // Listening.
                        'Use prior knowledge and personal experience to predict content': [],
                        'Listen for main ideas': [],
                        'Listen for details': [],
                        'Make inferences to fully understand what a speaker means': [],
                        'Listen for opinions to fully understand a book review': [],
                        'Listen for reduced verb forms to fully understand everyday speech': [],

                        // Speaking
                        'Take notes to prepare for a presentation of group discussion': [],
                        'Take turns to make a conversation go smoothly': [],
                        'Imply opinions to avoid stating them too directly': [],
                        'Use verb contractions to increase naturalness of speech': [],

                        // Vocabulary
                        '': [],

                        // Grammar
                        'Auxillary verbs do, be, have': [],

                        // Pronunciation
                        'Use contractions with auxillary verbs': [],

                        // Critical thinking.
                        'Assess your prior knowledge of content': [],
                        'Relate personal experiences to listening topics': [],
                        'Integrate information from multiple sources': [],
                        'Evaluate the truthfulness of traditional wisdom': [],
                        'Identify your decision-making process': [],
                        'Examine your reasons for forming impressions of people': [],

                        // Unit Outcome.
                        //'': []
                    }
                },
                {
                    'title': 'Unit 3: What can we learn from success and failure?',
                    'objectives': {
                        // Listening.
                        'Use prior knowledge and personal experience to predict content': [],
                        'Listen for main ideas': [],
                        'Listen for details': [],
                        'Listen for opinion statements to understand a speaker\'s positive and negative attitudes': [],
                        'Match people with ideas to understand their attitudes': [],
                        'Listen for exact words or phrases to improve your word recognition': [],

                        // Speaking
                        'Take notes to prepare for a presentation of group discussion': [],
                        'Ask for clarification so you understand difficult concepts': [],
                        'Include time for questions after a presentation so your audience can ask for clarification': [],
                        'Clarify what you say so others understand you better': [],

                        // Vocabulary
                        '': [],

                        // Grammar
                        //'': [],

                        // Pronunciation
                        //'': [],

                        // Critical thinking.
                        //'': [],

                        // Unit Outcome.
                        //'': []
                    }
                },
                {
                    'title': 'Unit 4: Is change good or bad?',
                    'objectives': {
                        // Listening.
                        'Use prior knowledge and personal experience to predict content': [],
                        'Listen for main ideas': [],
                        'Listen for details': [],
                        'Listen to personal stories to understand their people’s experiences': [],
                        'Use a T-chart to take effective notes': [
                            {'resource_id': 52},
                            {'resource_id': 53}
                        ],
                        'Listen for intonation to identify a speaker’s level of interest in a topic': [],
                        'Listen for exact words or phrases to improve your word recognition': [],

                        // Speaking
                        'Take notes to prepare for a presentation of group discussion': [],
                        'Describe a situation using details so a listener can make inferences about an event': [],
                        'Ask for reasons to understand why something happened': [],
                        'Express reasons to explain why something happened': [],
                        'Use reasons to explain personal beliefs': [],

                        // Vocabulary
                        'Assess your prior knowledge of vocabulary': [],
                        'Understand dictionary entries to diagram meanings in word webs': [
                            {'resource_id': 68},
                            {'resource_id': 69},
                            {'resource_id': 70},
                            {'resource_id': 71},
                            {'resource_id': 72}
                        ],

                        // Grammar
                        'Similar past and present perfect': [
                            {'resource_id': 73},
                            {'resource_id': 74},
                            {'resource_id': 75},
                            {'resource_id': 76},
                            {'resource_id': 77},
                            {'resource_id': 78},
                            {'resource_id': 79},
                            {'resource_id': 80},
                            {'resource_id': 81},
                            {'resource_id': 82},
                            {'resource_id': 83},
                            {'resource_id': 84},
                        ],

                        // Pronunciation
                        'Vary intonation to show interest in a topic': [
                            {'resource_id': 85},
                            {'resource_id': 86},
                            {'resource_id': 87},
                            {'resource_id': 88},
                            {'resource_id': 89},
                            {'resource_id': 90},
                            {'resource_id': 91},
                            {'resource_id': 92},
                            {'resource_id': 93},
                            {'resource_id': 94},
                        ],

                        // Critical thinking.
                        'Assess your prior knowledge of content': [],
                        'Relate personal experiences to listening topics': [],
                        'Integrate information from multiple sources': [],
                        'Recall life experiences and assess their significance': [],
                        'Consider the methods used by reporters to gather information': [
                            {'resource_id': 95},
                            {'resource_id': 96},
                            {'resource_id': 97},
                            {'resource_id': 98},
                            {'resource_id': 99},
                        ],

                        // Unit Outcome
                        'Participate in a group discussion emphasizing the advantages and disadvantages of change': []
                    }
                },
                {
                    'title': 'Unit 5: Are we responsible for the world we live in?',
                    'objectives': {
                        // Listening.
                        'Use prior knowledge and personal experience to predict content': [],
                        'Listen for main ideas': [],
                        'Listen for details': [],
                        'Listen for supporting statements to apply a general concept to real life': [],
                        'Use intonation, volume, and other features to infer a speaker’s attitudes': [
                            {'resource_id': 54},
                        ],
                        'Listen for exact words in a conversation to improve your word cognition': [],

                        // Speaking
                        'Take notes to prepare for a presentation of group discussion': [],
                        'Practice varying intonation and other features to convey your attitudes': [
                            {'resource_id': 65},
                        ],
                        'Add tag questions to statements to find out what someone thinks': [],
                        'Answer tag questions using proper grammar and intonation to accurately express what you think': [],
                        'Lead a discussion so it proceeds smoothly, fairly, and stays on topic': [],

                        // Vocabulary
                        'Assess your prior knowledge of vocabulary': [],
                        'Find the most relevant dictionary definition for a word that has many meanings': [],

                        // Grammar
                        'Tag questions': [
                            {'resource_id': 100},
                            {'resource_id': 101},
                            {'resource_id': 102},
                            {'resource_id': 103},
                            {'resource_id': 104},
                        ],

                        // Pronunciation
                        'Use rising and falling intonation in tag questions to convey meaning': [
                            {'resource_id': 106},
                        ],

                        // Critical thinking.
                        'Assess your prior knowledge of content': [],
                        'Relate personal experiences to listening topics': [],
                        'Integrate information from multiple sources': [],
                        'Consider social responsibility on several levels, including individual, family, and corporate responsibility': [
                            {'resource_id': 107},
                            {'resource_id': 108},
                        ],
                        'Develop skills for leadership in a small group': [],

                        // Unit Outcome
                        'State and explain your opinions about our responsibility for issues impacting our world.': []
                    }
                },
                {
                    'title': 'Unit 6: How can advertisers change our behavior?',
                    'objectives': {
                        // Listening.
                        'Use prior knowledge and personal experience to predict content': [],
                        'Listen for main ideas': [],
                        'Listen for details': [],
                        'Listen for evidence to distinguish fact from opinion': [],
                        'Listen for modal verbs to understand obligations, prohibitions, and recommendations': [],
                        'Listen for intonation to distinguish between statements and questions': [],
                        'Listen for exact words in a conversation to improve your word cognition': [],

                        // Speaking
                        'Take notes to prepare for a presentation of group discussion': [],
                        'Use modals to express obligation, prohibition, and recommendation': [],
                        'Ask questions and make statements with correct intonation to be understood clearly': [],
                        'Give reasons and examples to support opinions you express': [],

                        // Vocabulary
                        'Assess your prior knowledge of vocabulary': [],
                        'Use context to understand the meanings of unfamiliar words or phrases': [
                            {'resource_id': 109},
                            {'resource_id': 110},
                            {'resource_id': 111},
                            {'resource_id': 112},
                            {'resource_id': 113},
                            {'resource_id': 114},
                            {'resource_id': 115},
                            {'resource_id': 116},
                        ],

                        // Grammar
                        'Modals that express attitude': [
                            {'resource_id': 117},
                            {'resource_id': 118},
                            {'resource_id': 119},
                            {'resource_id': 120},
                            {'resource_id': 121},
                            {'resource_id': 122},
                            {'resource_id': 123},
                            {'resource_id': 124},
                            {'resource_id': 125},
                            {'resource_id': 126},
                            {'resource_id': 127},
                        ],

                        // Pronunciation
                        'Correctly use intonation in yes/no and wh- questions': [],
                        'Use information to make statements into questions to express surprise': [],

                        // Critical thinking.
                        'Assess your prior knowledge of content': [
                            {'resource_id': 128},
                            {'resource_id': 129},
                            {'resource_id': 130},
                            {'resource_id': 131},
                            {'resource_id': 132},
                            {'resource_id': 133},
                        ],
                        'Relate personal experiences to listening topics': [],
                        'Integrate information from multiple sources': [],
                        'Assess your personal experiences with advertising and your responses to it': [],
                        'Judge real-life situations according to your ethical standards': [],
                        'Summarize a discussion in a group': [],
                        'Express and support a personal opinion': [],

                        // Unit Outcome
                        'State and support your opinions concerning the influence of advertising on our behaviour.': []
                    }
                },
                {
                    'title': 'Unit 9: Can money buy happiness?',
                    'objectives': {
                        // Listening.
                        'Use prior knowledge and personal experience to predict content': [],
                        'Listen for main ideas': [],
                        'Listen for details': [],
                        'Listen for a sequence of factors to understand the stages in a process': [],
                        'Understand examples to relate them to larger ideas': [],
                        'Listen for signposts to understand the structure of a passage': [
                            {'resource_id': 55},
                            {'resource_id': 56},
                            {'resource_id': 57},
                            {'resource_id': 58},
                            {'resource_id': 59},
                            {'resource_id': 60},
                            {'resource_id': 61},
                            {'resource_id': 62},
                            {'resource_id': 63},
                            {'resource_id': 64},
                        ],
                        'Listen for exact words in a conversation to improve your word cognition': [],

                        // Speaking
                        'Take notes to prepare for a presentation of group discussion': [],
                        'Use expressions to introduce statements of agreement and disagreement': [],
                        'Express reasons to justify statements about personal preferences': [],
                        'Discuss with a partner attitudes about the relationship between money and happiness': [
                            {'resource_id': 66},
                            {'resource_id': 67},
                        ],

                        // Vocabulary
                        'Assess your prior knowledge of vocabulary': [],
                        'Use a dictionary to distinguish among words that are somewhat similar in meaning': [],

                        // Grammar
                        'Sentence types - declarative, interrogatory, imperative, and exclamatory': [
                            {'resource_id': 134},
                            {'resource_id': 135},
                            {'resource_id': 136},
                            {'resource_id': 137},
                            {'resource_id': 138},
                            {'resource_id': 139},
                        ],

                        // Pronunciation
                        'Effectively use intonation in different sentence types': [],

                        // Critical thinking.
                        'Assess your prior knowledge of content': [],
                        'Relate personal experiences to listening topics': [],
                        'Integrate information from multiple sources': [],
                        'Examine your attitudes toward money and happiness': [
                            {'resource_id': 140},
                            {'resource_id': 141},
                            {'resource_id': 142},
                            {'resource_id': 143},
                            {'resource_id': 144},
                        ],
                        'Distinguish between causal relationships and correlations in research results': [],
                        'Support opinions with reasons and examples': [],

                        // Unit Outcome
                        'Participate in a group discussion evaluating this influence money has on happiness.': []
                    }
                },
            ]
        },

        hctResources: [
            '',
            'http://www.grammar-quizzes.com/adj-forms.html',
            'http://college.cengage.com/devenglish/wong/sentence_essentials/1e/students/downloads/ch7wkst1.pdf',
            'http://busyteacher.org/classroom_activities-vocabulary/wordbuilding/prefixessuffixes-worksheets/',
            'http://www.superteacherworksheets.com/prefix-suffix.html',
            'http://busyteacher.org/14461-how-to-teach-reading-skills-10-best-practices.html',
            'http://busyteacher.org/18409-one-two-three-go-six-activities-for-sequencing.html',
            'http://busyteacher.org/8001-sequencing-activity.html',
            'http://www.superteacherworksheets.com/causeeffect.html',
            'https://www.havefunteaching.com/worksheets/reading-worksheets/cause-and-effect-worksheets',
            'http://edhelper.com/Cause_and_Effect.htm',
            'http://www.teachjunkie.com/filing-cabinet/free-download/ela-cause-effect-inferevidence/',
            'http://www.helpteaching.com/questions/Cause_and_Effect',
            'http://www.greatschools.org/worksheets-activities/6666-comparing-two-stories.gs',
            'http://busyteacher.org/6514-write-comparing-contrasting-essay-tips.html',
            'http://busyteacher.org/19003-compare-and-contrast-signal-words.html',
            'http://www.readworks.org/lessons/concepts/compare-and-contrast',
            'http://www.kenbakerbooks.com/lessonplancompare.html',
            'http://www.readwritethink.org/classroom-resources/student-interactives/comparison-contrast-guide-30033.html',
            'http://www.webenglishteacher.com/compare-contrast.html',
            'http://www.internet4classrooms.com/assessment_assistance/assessment_preparation_language_arts_compare_contrast_lesson_plans.htm',
            'http://www.eslflow.com/comparisoncontrast.html',
            'http://busyteacher.org/17125-verb-to-noun-er.html',
            'http://www.readworks.org/lessons/concepts/fact-and-opinion',
            'http://www.ereadingworksheets.com/free-reading-worksheets/fact-and-opinion-worksheets/',
            'http://www.superteacherworksheets.com/factopinion.html',
            'http://www.worksheetplace.com/index.php?function=DisplayCategory&showCategory=Y&links=3&id=318&link1=43&link2=154&link3=318',
            'https://www.havefunteaching.com/worksheets/reading-worksheets/fact-and-opinion-worksheets',
            'http://alex.state.al.us/lesson_view.php?id=29359',
            'http://www.fortheteachers.org/Lesson_Plans/Lesson-Reading_Fact_vs_Opinion.pdf',
            'http://busyteacher.org/classroom_activities-vocabulary/collocations-worksheets/',
            'http://busyteacher.org/6061-10-tips-to-teach-collocations.html',
            'http://www.developingteachers.com/plans/coll1_tanju.htm',
            'http://www.eslflow.com/collocationsandphrasalvebs.html',
            'http://elthq.com/how-to-teach-collocations/',
            'http://www.usingenglish.com/teachers/lesson-plans/grammar-topics/33.html',
            'http://www.esl-galaxy.com/collocation.html',
            'http://www.teachingenglish.org.uk/article/collocation-pelmanism',
            'http://www.washingtonpost.com/lifestyle/travel/oh-man-living-the-high-life-in-oman/2013/05/09/303af378-b346-11e2-bbf2-a6f9e9d79e19_story.html',
            'http://www.ereadingworksheets.com/free-reading-worksheets/authors-purpose-worksheets/',
            'http://www.teach-nology.com/worksheets/language_arts/authors/',
            'http://www.helpteaching.com/questions/Authors_Purpose',
            'http://www.teacherspayteachers.com/Product/FREEBIE-Authors-Purpose-PIEED-Worksheet-869099',
            'http://www.readworks.org/lessons/concepts/authors-purpose',
            'http://www.scholastic.com/teachers/lesson-plan/connotation-effective-word-choice',
            'http://www.teacherspayteachers.com/Product/Denotation-and-Connotation-Activity-345325',
            'http://www.storyboardthat.com/articles/education/grammar/denotation-vs-connotation',
            'http://www.brighthubeducation.com/middle-school-english-lessons/99499-teaching-denotation-and-connotation-through-usage-of-words/',
            'http://www.education.com/study-help/article/denotation-connotation_answer/',
            'http://curriculum.austinisd.org/la/hs/9th/documents/LA_Connotation_and_Denotation_Lesson_9thGr_4th6wks_1011.pdf',
            'http://www.readwritethink.org/classroom-resources/lesson-plans/what-revising-connotation-80.html',
            'http://alex.state.al.us/lesson_view.php?id=33176',
            'http://www.readwritethink.org/classroom-resources/printouts/chart-30225.html',
            'http://busyteacher.org/17903-note-taking-during-lectures-7-ways-to-prepare.html',
            'http://esl.about.com/od/englishlistening/',
            'http://www.learnenglishfeelgood.com/eslvideo/',
            'http://www.esl-lab.com/quizzes.htm',
            'http://www.manythings.org/e/listening.html',
            'http://www.talkenglish.com/Listening/ListenBasic.aspx',
            'http://personal.cityu.edu.hk/~eljohnw/pda/iola/',
            'http://esl.about.com/library/quiz/bllisteningquiz.htm',
            'https://www.englishlistening.com/index.php/listen-to-passages/',
            'http://www.elllo.org/',
            'http://learningenglish.voanews.com/',
            'http://olc.spsd.sk.ca/de/resources/6_9ela/GradeLevelObjectives/Listening.htm',
            'http://www.squ.edu.om/tabid/11969/language/en-US/Default.aspx',
            'http://esl.about.com/od/speakingadvanced/a/timestress.htm',
            'http://www.rong-chang.com/speak/',
            'http://busyteacher.org/classroom_activities-speaking/mingling-activities/',
            'http://www.superteacherworksheets.com/dictionary-skills/printables/dictionary-parts_PARTS.pdf',
            'http://www.superteacherworksheets.com/dictionary-skills/printables/dictionary-skills-guide-words_WORDS.pdf',
            'http://www.oxforddictionaries.com/us/words/11-activities',
            'http://www.classroomfreebies.com/2011/09/3-free-dictionary-worksheets.html',
            'http://www.bellaonline.com/articles/art10770.asp',
            'http://www.englishpage.com/verbpage/presentperfect.html',
            'http://busyteacher.org/20734-irregular-verbs-poem.html',
            'http://busyteacher.org/20680-have-you-ever-coversation-questions.html',
            'http://busyteacher.org/20609-present-perfect.html',
            'http://busyteacher.org/20585-the-old-colonel.html',
            'http://busyteacher.org/classroom_activities-grammar/tenses/present_perfect-worksheets/',
            'http://busyteacher.org/classroom_activities-grammar/tenses/past_perfect-worksheets/',
            'http://esl.about.com/od/Find-the-Mistake/a/Present-Perfect-Worksheets.htm',
            'http://www.ego4u.com/en/cram-up/grammar/simpas-preper',
            'http://www.englishwsheets.com/present_perfect.html',
            'http://busyteacher.org/3681-present-perfect-vs-past-simple.html',
            'http://esl.about.com/od/teaching_tenses/a/How-To-Teach-Present-Perfect.htm',
            'https://www.youtube.com/watch?v=dheCcrv2WZs',
            'http://busyteacher.org/15088-how-to-improve-esl-intonation-stress-7-exercises.html',
            'http://busyteacher.org/classroom_activities-pronunciation/intonation_rhythm_and_stress-worksheets/',
            'http://busyteacher.org/14378-how-to-teach-intonation-6-tips.html',
            'http://busyteacher.org/14856-most-common-stress-intonation-mistakes-esl.html',
            'http://busyteacher.org/14578-teaching-intonation-and-stress.html',
            'http://busyteacher.org/16149-teaching-english-intonation-tips.html',
            'http://busyteacher.org/16030-discrete-speech-sounds-vs-stress-and-intonation.html',
            'http://busyteacher.org/11819-speaking-intonation-and-feelings.html',
            'http://busyteacher.org/14853-correct-esl-students-intonation-7-ways.html',
            'http://www.mediacollege.com/journalism/interviews',
            'https://www.youtube.com/watch?v=4eOynrI2eTM',
            'http://esl.about.com/library/listening/bllis_interview.htm',
            'http://www.manythings.org/b/e/category/interviews/',
            'https://learnenglishteens.britishcouncil.org/skills/listening-skills-practice/interview-swimmer',
            'http://busyteacher.org/10611-hes-funny-isnt-he-tips-to-teaching-tag-questions.html',
            'http://busyteacher.org/classroom_activities-grammar/tag_questions-worksheets/',
            'http://a4esl.org/q/h/mc-bd-tagq.html',
            'http://esl.about.com/library/lessons/bltags.htm',
            'http://www.teach-this.com/resources/question-tags',
            '',
            'http://www.teachingenglish.org.uk/knowledge-database/tag-questions',
            'http://www.carnegiecouncil.org/education/002/lessons/be/be-01-01',
            'http://www.englishcurrent.com/topic-corporate-social-responsibility-csr-upperintermediate-lesson-plan/',
            'http://busyteacher.org/8492-context-clue-notes.html',
            'http://busyteacher.org/13613-new-vocabulary-7-best-sources.html',
            'http://busyteacher.org/14387-how-to-improve-listening-skills-8-activities.html',
            'http://www.readwritethink.org/classroom-resources/lesson-plans/solving-word-meanings-engaging-1089.html?tab=4',
            'http://www.k12reader.com/subject/reading-skills/context-clues/',
            'http://www.ereadingworksheets.com/free-reading-worksheets/reading-comprehension-worksheets/context-clues-worksheets/',
            'http://www.readingrockets.org/article/using-context-clues-understand-word-meanings',
            'https://www.flocabulary.com/context-clues-lesson/',
            'http://www.englishwsheets.com/modals.html',
            'http://www.englishpage.com/modals/modalintro.html',
            'http://busyteacher.org/classroom_activities-grammar/modal_verbs-worksheets/',
            'http://busyteacher.org/17140-how-to-practice-english-modals-5-fantastic.html',
            'http://busyteacher.org/4126-how-to-teach-modal-verbs-4-steps.html',
            'http://busyteacher.org/7763-10-teacher-tested-tricks-to-teach-modal-verbs.html',
            'http://esl.about.com/od/beginningenglish/ig/Basic-English/Modal-Forms.htm',
            'http://www.eslcafe.com/grammar/understanding_and_using_modal_verbs01.htm',
            'http://www.eslflow.com/Modalslessonplans.html',
            'http://www.esltower.com/GRAMMARSHEETS/modals/modals.html',
            'http://www.grammarbank.com/printable-worksheets.html',
            'http://www.admongo.gov/lesson-plans.aspx',
            'http://www.readwritethink.org/classroom-resources/lesson-plans/persuasive-techniques-advertising-1166.html?tab=4',
            'http://www.teachingenglish.org.uk/sites/teacheng/files/Advertising%20lesson%20plan.pdf',
            'http://learning.blogs.nytimes.com/2011/04/25/on-the-market-thinking-critically-about-advertising/?_php=true&_type=blogs&_r=0',
            'http://mediasmarts.ca/lessonplan/advertising-all-around-us-lesson',
            'http://www.eslflow.com/describingproductsandservices.html',
            'http://www.indabook.org/d/Four-Kinds-of-Sentences.pdf',
            'http://www.worksheetworks.com/english/partsofspeech/sentences/identify-types.html',
            'http://www.ereadingworksheets.com/languageartsworksheets/sentence-structure/sentence-structure-worksheets/type-of-sentences-worksheets/',
            'http://www.commoncoresheets.com/Sentence_Types.php',
            'http://edhelper.com/language/sentences.htm',
            'http://www.brainpop.com/educators/community/bp-jr-topic/types-of-sentences/',
            'http://learning.blogs.nytimes.com/2010/10/07/can-money-buy-you-happiness/',
            'http://www.breakingnewsenglish.com/0510/051006-happiness-e.html',
            'http://www.teachingenglish.org.uk/sites/teacheng/files/Money%20conversations%20lesson%20plan.pdf',
            'https://www.compassionateenglish.com/can-money-buy-happiness/',
            'http://talk2meenglish.blogspot.com/2014/01/happiness-intermediate-lesson.html'
        ],

        hctResourceNames: {"http://busyteacher.org/classroom_activities-grammar/modal_verbs-worksheets/": "520 FREE Modal Verbs Worksheets & Exercises", "http://alex.state.al.us/lesson_view.php?id=29359": "Untitled resource", "http://busyteacher.org/classroom_activities-grammar/tenses/past_perfect-worksheets/": "89 FREE Past Perfect Worksheets", "http://www.esl-lab.com/quizzes.htm": "Randall's ESL Vocabulary Quizzes", "http://www.readwritethink.org/classroom-resources/student-interactives/comparison-contrast-guide-30033.html": "Comparison and Contrast Guide - ReadWriteThink", "http://www.k12reader.com/subject/reading-skills/context-clues/": "Context Clues Worksheets | Reading Comprehension Activities", "http://www.readwritethink.org/classroom-resources/lesson-plans/persuasive-techniques-advertising-1166.html?tab=4": "Persuasive Techniques in Advertising - ReadWriteThink", "http://www.education.com/study-help/article/denotation-connotation_answer/": "Denotation and Connotation Practice Exercises | Education.com", "http://personal.cityu.edu.hk/~eljohnw/pda/iola/": "Interactive Online Listening Quizzes: PDA version", "http://www.readworks.org/lessons/concepts/compare-and-contrast": "Compare and Contrast Reading Lesson Plans, Lesson, Plan, Worksheets, Examples, Reading Strategies, Comprehension", "http://www.teacherspayteachers.com/Product/FREEBIE-Authors-Purpose-PIEED-Worksheet-869099": "FREEBIE!  AUTHOR'S PURPOSE PIE'ED WORKSHEET - TeachersPayTeachers.com", "http://www.ereadingworksheets.com/free-reading-worksheets/reading-comprehension-worksheets/context-clues-worksheets/": "Context Clues Worksheets | Reading Worksheets", "http://busyteacher.org/17125-verb-to-noun-er.html": "Verb to Noun with Suffix -Er", "http://www.bellaonline.com/articles/art10770.asp": "Dictionary Skills - Library Sciences", "http://www.superteacherworksheets.com/factopinion.html": "Fact and Opinion Worksheets", "http://www.ereadingworksheets.com/free-reading-worksheets/fact-and-opinion-worksheets/": "Fact and Opinion Worksheets | Reading Worksheets", "http://olc.spsd.sk.ca/de/resources/6_9ela/GradeLevelObjectives/Listening.htm": "Listening Objectives", "http://busyteacher.org/14461-how-to-teach-reading-skills-10-best-practices.html": "How to Teach Reading Skills: 10 Best Practices", "http://esl.about.com/od/Find-the-Mistake/a/Present-Perfect-Worksheets.htm": "Printable Present Perfect Worksheets", "http://www.readworks.org/lessons/concepts/authors-purpose": "Author's Purpose Reading Lesson Plans, Lesson, Plan, Worksheets, Examples, Reading Strategies, Comprehension", "http://www.helpteaching.com/questions/Cause_and_Effect": "Cause and Effect Tests and Worksheets - All Grades", "http://www.eslflow.com/Modalslessonplans.html": "Modal verbs & giving advice lessons for ESL teachers:esflow webguide", "http://busyteacher.org/18409-one-two-three-go-six-activities-for-sequencing.html": "One, Two, Three, Go! 6 Activities for Sequencing", "http://www.grammarbank.com/printable-worksheets.html": "Free Printable English Worksheets For Teachers", "http://www.manythings.org/b/e/category/interviews/": "ESL Videos \u00bb Interviews", "http://busyteacher.org/classroom_activities-vocabulary/wordbuilding/prefixessuffixes-worksheets/": "82 FREE Prefixes/Suffixes Worksheets", "http://busyteacher.org/8492-context-clue-notes.html": "Context Clue Notes", "http://esl.about.com/od/teaching_tenses/a/How-To-Teach-Present-Perfect.htm": "How to Teach the Present Perfect for ESL Students", "http://www.carnegiecouncil.org/education/002/lessons/be/be-01-01": "BE-01-01 Introduction to Business Ethics", "http://www.readwritethink.org/classroom-resources/printouts/chart-30225.html": "T-Chart - ReadWriteThink", "http://www.ego4u.com/en/cram-up/grammar/simpas-preper": "Simple Past vs. Present Perfect Simple", "http://www.indabook.org/d/Four-Kinds-of-Sentences.pdf": "Four Kinds of Sentences", "http://www.eslflow.com/collocationsandphrasalvebs.html": "Collocations\u00a0 exercises & worksheetsfor ESL teachers: eslflow webguide", "http://esl.about.com/library/quiz/bllisteningquiz.htm": "English Listening Quizzes", "http://learningenglish.voanews.com/": "\r\n\tVoice of America - Learn American English with VOA Learning English\r\n", "http://www.webenglishteacher.com/compare-contrast.html": "Compare-Contrast Writing, Lesson Plans @Web English Teacher", "http://www.internet4classrooms.com/assessment_assistance/assessment_preparation_language_arts_compare_contrast_lesson_plans.htm": "Language Arts Compare and Contrast Lesson Plans", "http://www.superteacherworksheets.com/dictionary-skills/printables/dictionary-skills-guide-words_WORDS.pdf": "Untitled resource", "http://busyteacher.org/classroom_activities-speaking/mingling-activities/": "259 FREE Mingling Activities and Find Someone Who", "http://www.breakingnewsenglish.com/0510/051006-happiness-e.html": "Breaking News English ESL Lesson Plan on Happiness", "http://www.teach-nology.com/worksheets/language_arts/authors/": "Author's Purpose Worksheets", "http://www.esltower.com/GRAMMARSHEETS/modals/modals.html": "Modal Verbs, Printable modals exercises and worksheets", "http://busyteacher.org/classroom_activities-grammar/tenses/present_perfect-worksheets/": "241 FREE Present Perfect Worksheets: Teach Present Perfect With Confidence!", "http://busyteacher.org/6061-10-tips-to-teach-collocations.html": "10 Tips to Teach Collocations", "http://www.superteacherworksheets.com/causeeffect.html": "Cause and Effect Worksheets", "http://www.kenbakerbooks.com/lessonplancompare.html": "Compare and Contrast Lesson Plan: Crazy Cow Compares\r\n& Contrasts", "https://www.havefunteaching.com/worksheets/reading-worksheets/cause-and-effect-worksheets": "302 Found", "http://www.teachingenglish.org.uk/article/collocation-pelmanism": "Collocation pelmanism | TeachingEnglish | British Council | BBC", "http://college.cengage.com/devenglish/wong/sentence_essentials/1e/students/downloads/ch7wkst1.pdf": "Untitled resource", "http://busyteacher.org/14856-most-common-stress-intonation-mistakes-esl.html": "Do Your ESL Students Make These Stress and Intonation Mistakes?", "http://www.mediacollege.com/journalism/interviews": "301 Moved Permanently", "http://www.worksheetplace.com/index.php?function=DisplayCategory&showCategory=Y&links=3&id=318&link1=43&link2=154&link3=318": "\n\n\r\n\nWorksheets", "http://www.readworks.org/lessons/concepts/fact-and-opinion": "Fact and Opinion Reading Lesson Plans, Lesson, Plan, Worksheets, Examples, Reading Strategies, Comprehension", "http://edhelper.com/Cause_and_Effect.htm": "Cause and Effect Activities, Worksheets, Printables, and Lesson Plans", "http://busyteacher.org/20734-irregular-verbs-poem.html": "Irregular Verbs Poem", "http://busyteacher.org/20609-present-perfect.html": "Present Perfect", "http://busyteacher.org/20680-have-you-ever-coversation-questions.html": "Have You Ever- Conversation Questions", "http://busyteacher.org/13613-new-vocabulary-7-best-sources.html": "7 Best Sources for New Vocabulary", "http://www.superteacherworksheets.com/prefix-suffix.html": "Prefixes - Suffixes", "http://www.grammar-quizzes.com/adj-forms.html": "Adjective Suffixes \u2014 English Exercises & Practice | Grammar Quizzes", "https://www.compassionateenglish.com/can-money-buy-happiness/": "Untitled resource", "http://www.ereadingworksheets.com/languageartsworksheets/sentence-structure/sentence-structure-worksheets/type-of-sentences-worksheets/": "Type of Sentences Worksheets | Reading Worksheets", "http://www.elllo.org/": "Learn English for Free with elllo!", "http://www.readingrockets.org/article/using-context-clues-understand-word-meanings": "Using Context Clues to Understand Word Meanings | Reading Rockets", "https://www.flocabulary.com/context-clues-lesson/": " Free Context Clues Worksheet & Lesson Plan - Flocabulary ", "http://www.usingenglish.com/teachers/lesson-plans/grammar-topics/33.html": "Collocation - Grammar Topic, Page 1 - ESL Lesson Plans & Worksheets - UsingEnglish.com", "http://www.teach-this.com/resources/question-tags": "Question Tags - ESL EFL Teaching Activities", "http://www.squ.edu.om/tabid/11969/language/en-US/Default.aspx": "\r\n\tLearning Outcomes in Listening and Speaking\r\n", "http://www.brighthubeducation.com/middle-school-english-lessons/99499-teaching-denotation-and-connotation-through-usage-of-words/": "Showing Connotation vs. Denotation Meanings to Students", "http://busyteacher.org/11819-speaking-intonation-and-feelings.html": "Speaking: Intonation and Feelings", "http://www.teacherspayteachers.com/Product/Denotation-and-Connotation-Activity-345325": "DENOTATION AND CONNOTATION ACTIVITY - TeachersPayTeachers.com", "http://www.eslcafe.com/grammar/understanding_and_using_modal_verbs01.htm": "404 Not Found", "http://busyteacher.org/14378-how-to-teach-intonation-6-tips.html": "Avoid Sounding Like a Robot: 6 Top Tips for Teaching Intonation", "http://www.teachingenglish.org.uk/knowledge-database/tag-questions": "Tag questions | TeachingEnglish | British Council | BBC", "http://busyteacher.org/classroom_activities-pronunciation/intonation_rhythm_and_stress-worksheets/": "41 FREE Intonation, Rhythm and Stress Worksheets", "http://elthq.com/how-to-teach-collocations/": "How To Teach Collocations", "https://www.youtube.com/watch?v=4eOynrI2eTM": "Untitled resource", "http://busyteacher.org/16149-teaching-english-intonation-tips.html": "Stress About It: 7 Tips for Teaching English Intonation", "http://www.ereadingworksheets.com/free-reading-worksheets/authors-purpose-worksheets/": "Author's Purpose | Reading Worksheets", "http://www.fortheteachers.org/Lesson_Plans/Lesson-Reading_Fact_vs_Opinion.pdf": "Untitled resource", "http://learning.blogs.nytimes.com/2011/04/25/on-the-market-thinking-critically-about-advertising/?_php=true&_type=blogs&_r=0": "Untitled resource", "http://curriculum.austinisd.org/la/hs/9th/documents/LA_Connotation_and_Denotation_Lesson_9thGr_4th6wks_1011.pdf": "Untitled resource", "http://www.englishwsheets.com/present_perfect.html": "Present Perfect Tense ESL Grammar Worksheets", "http://www.greatschools.org/worksheets-activities/6666-comparing-two-stories.gs": "Comparing two stories - Worksheets & Activities | GreatSchools", "http://busyteacher.org/15088-how-to-improve-esl-intonation-stress-7-exercises.html": "7 Excellent Exercises to Improve ESL Intonation and Stress", "http://www.englishcurrent.com/topic-corporate-social-responsibility-csr-upperintermediate-lesson-plan/": "Corporate Social Responsibility (CSR) (Upper-Intermediate Lesson Plan) English Current", "http://busyteacher.org/7763-10-teacher-tested-tricks-to-teach-modal-verbs.html": "10 Teacher Tested Tricks to Teach Modal Verbs", "http://www.eslflow.com/describingproductsandservices.html": "ESL lessons for advertising & describing products and services : eslflow webguide", "http://busyteacher.org/14853-correct-esl-students-intonation-7-ways.html": "7 Ways to Correct Your ESL Students\u2019 Intonation Once and for All", "http://www.eslflow.com/comparisoncontrast.html": " Comparison Contrast Essay & Paragraph Writing: eslflow webguide", "http://busyteacher.org/classroom_activities-vocabulary/collocations-worksheets/": "54 FREE Collocations Worksheets", "https://learnenglishteens.britishcouncil.org/skills/listening-skills-practice/interview-swimmer": "Interview with a swimmer | LearnEnglishTeens", "http://busyteacher.org/14387-how-to-improve-listening-skills-8-activities.html": "Do You Hear What I Hear? 8 Activities to Improve Listening Skills", "http://www.readwritethink.org/classroom-resources/lesson-plans/what-revising-connotation-80.html": "She Did What? Revising for Connotation - ReadWriteThink", "http://esl.about.com/od/beginningenglish/ig/Basic-English/Modal-Forms.htm": "Basic English - Modal Forms - 30 Essential Lessons for Beginning English Learners", "http://busyteacher.org/19003-compare-and-contrast-signal-words.html": "Compare and Contrast Signal Words", "http://www.readwritethink.org/classroom-resources/lesson-plans/solving-word-meanings-engaging-1089.html?tab=4": "Solving Word Meanings: Engaging Strategies for Vocabulary Development - ReadWriteThink", "https://www.youtube.com/watch?v=dheCcrv2WZs": "Untitled resource", "https://www.havefunteaching.com/worksheets/reading-worksheets/fact-and-opinion-worksheets": "302 Found", "http://esl.about.com/od/englishlistening/": "English Listening Skills and Activities-Effective Listening Practice for ESL EFL Learners and Teachers", "http://busyteacher.org/3681-present-perfect-vs-past-simple.html": "How To Teach Past Simple VS Present Perfect", "http://www.superteacherworksheets.com/dictionary-skills/printables/dictionary-parts_PARTS.pdf": "Untitled resource", "http://busyteacher.org/classroom_activities-grammar/tag_questions-worksheets/": "62 FREE Tag Questions Worksheets", "http://www.manythings.org/e/listening.html": "Listening (For ESL Students)", "https://www.englishlistening.com/index.php/listen-to-passages/": "302 Found", "http://www.developingteachers.com/plans/coll1_tanju.htm": "Tanju's Collocation lesson plan", "http://www.talkenglish.com/Listening/ListenBasic.aspx": "Basic Listening English Lessons with Quiz, Questions, and Answers", "http://www.washingtonpost.com/lifestyle/travel/oh-man-living-the-high-life-in-oman/2013/05/09/303af378-b346-11e2-bbf2-a6f9e9d79e19_story.html": "Oh, man! Living the high life in Oman. - The Washington Post", "http://alex.state.al.us/lesson_view.php?id=33176": "Untitled resource", "http://learning.blogs.nytimes.com/2010/10/07/can-money-buy-you-happiness/": "Untitled resource", "http://www.oxforddictionaries.com/us/words/11-activities": "11+ Activities - Oxford Dictionaries (US)", "http://www.englishwsheets.com/modals.html": "Modals ESL Grammar Worksheets", "http://www.worksheetworks.com/english/partsofspeech/sentences/identify-types.html": "Identifying Sentence Types - WorksheetWorks.com", "http://busyteacher.org/17140-how-to-practice-english-modals-5-fantastic.html": "You Really Should: 5 Fantastic Activities for Practicing English Modals", "http://www.classroomfreebies.com/2011/09/3-free-dictionary-worksheets.html": "Classroom Freebies: 3 Free Dictionary Worksheets!", "http://www.admongo.gov/lesson-plans.aspx": "\n", "http://busyteacher.org/16030-discrete-speech-sounds-vs-stress-and-intonation.html": "Which is More Important? Discrete Speech Sounds v. Stress and Intonation", "http://busyteacher.org/4126-how-to-teach-modal-verbs-4-steps.html": "How to Teach Modal Verbs: 4 Simple Steps", "http://busyteacher.org/20585-the-old-colonel.html": "The Old Colonel", "http://esl.about.com/od/speakingadvanced/a/timestress.htm": "Intonation and Stress in English", "http://www.storyboardthat.com/articles/education/grammar/denotation-vs-connotation": "Teaching Denotations versus Connotations with Storyboards", "http://www.englishpage.com/modals/modalintro.html": "ENGLISH PAGE - Modal Verb Tutorial", "http://busyteacher.org/8001-sequencing-activity.html": "Sequencing Activity", "http://busyteacher.org/14578-teaching-intonation-and-stress.html": "Hearing is Believing: Teaching the Ways of Intonation and Stress", "http://www.commoncoresheets.com/Sentence_Types.php": "Sentence Type Worksheets", "http://www.esl-galaxy.com/collocation.html": "ESL Matching and Collocation Worksheets", "http://www.englishpage.com/verbpage/presentperfect.html": "ENGLISH PAGE - Present Perfect", "http://mediasmarts.ca/lessonplan/advertising-all-around-us-lesson": "Advertising All Around Us - Lesson | MediaSmarts", "http://www.helpteaching.com/questions/Authors_Purpose": "Author's Purpose Tests and Worksheets - All Grades", "http://edhelper.com/language/sentences.htm": "Sentences:\u00a0\u00a0 Activities, Worksheets, Printables, and Lesson Plans", "http://busyteacher.org/10611-hes-funny-isnt-he-tips-to-teaching-tag-questions.html": "He\u2019s Funny, Isn\u2019t He? Tips to Teaching Tag Questions", "http://esl.about.com/library/listening/bllis_interview.htm": "English Listening Exercises - Lower-intermediate to intermediate Level Listening Quiz - Survey Information", "http://busyteacher.org/6514-write-comparing-contrasting-essay-tips.html": "C \u2013 Comparing and Contrasting (And Writing, Too) [Teacher Tips from A to Z]", "http://www.teachingenglish.org.uk/sites/teacheng/files/Advertising%20lesson%20plan.pdf": "Untitled resource", "http://www.learnenglishfeelgood.com/eslvideo/": "ESL Listening Comprehension Exercises: Movie clips to practice English | ELL/ELT", "http://www.teachingenglish.org.uk/sites/teacheng/files/Money%20conversations%20lesson%20plan.pdf": "Untitled resource", "http://busyteacher.org/17903-note-taking-during-lectures-7-ways-to-prepare.html": "Note-Taking During Lectures: 7 Ways to Help Students Prepare", "http://talk2meenglish.blogspot.com/2014/01/happiness-intermediate-lesson.html": "Talk2Me English : Happiness - Intermediate Lesson", "http://www.teachjunkie.com/filing-cabinet/free-download/ela-cause-effect-inferevidence/": "12 Easy Cause and Effect Activities and Worksheets - Teach Junkie", "http://esl.about.com/library/lessons/bltags.htm": "Grammar Lesson Plan - Question Tags", "http://www.rong-chang.com/speak/": "Speak English Fast", "http://www.brainpop.com/educators/community/bp-jr-topic/types-of-sentences/": "Types of Sentences Lesson Plans and Lesson Ideas - BrainPOP Educators", "http://www.scholastic.com/teachers/lesson-plan/connotation-effective-word-choice": "Connotation: Effective Word Choice | Scholastic.com", "http://a4esl.org/q/h/mc-bd-tagq.html": " ESL Quiz - Question Tags (Barbara Donnelly) I-TESL-J"}
    };

    $(document).ready(function($){
        function resizeApp(){
            $('.explorer-body').height(
                $(window).height() - $('.explorer-header').height()
            );
        }

        resizeApp();
        $(window).resize(resizeApp);

        // Main grade-subject menu on home hover.
        OC.explorer.initGradeSubjectMenu();

        OC.explorer.initSideNavigation();
    });
});