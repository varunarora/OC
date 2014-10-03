define(['jquery', 'core', 'underscore', 'backbone', 'react', 'backboneReact'], function($, OC, _, Backbone, React, BackboneMixin){

    /*BackboneMixin: {
        _backboneForceUpdate: function() {
            this.forceUpdate();
        },
        
        componentDidMount: function() {
            // Whenever there may be a change in the Backbone data, trigger a reconcile.
            this.getBackboneModels().map(function(model) {
                model.on('add change remove', this._backboneForceUpdate, this);
            }.bind(this));
        },

        componentWillUnmount: function() {
            // Ensure that we clean up any dangling references when the component is destroyed.
            this.getBackboneModels().map(function(model) {
                model.off('add change remove', this._backboneForceUpdate, this);
            }.bind(this));
        }
    },*/

    OC.api.standards = {
        fetchStandards: function(id, success){
            $.get('/meta/api/get-nested-child-tags-from-category/' + id + '/',
                function (data){
                    success(data.tags);
                }, 'json');

        },

        mapping: {
            create: function(serializedMapping, success){
                $.post('/meta/api/mapping/create/', serializedMapping,
                    function (response){
                        success(response);
                    }, 'json');
            },
            update: function(serializedNotes, success){
                $.post('/meta/api/mapping/update/', serializedNotes,
                    function (response){
                        success(response);
                    }, 'json');
            },
            delete: function(serializedMapping, success){
                $.post('/meta/api/mapping/delete/', serializedMapping,
                    function (response){
                        success(response);
                    }, 'json');
            }
        }
    };

    _.extend(OC.standards, {
        lastInputTimestamp: null,
        searchFilterTimeout: null,
        loadFreeze: function(){
            var pageLoader = $('.page-loader');

            function resizePageLoader(){
                var categoryBarHeight = $('.category-selection-bar').outerHeight();
                
                pageLoader.css({
                    top: categoryBarHeight,
                    height: $(window).height() - categoryBarHeight
                });
            }
            if (pageLoader.length === 0){
                var newPageLoader = $('<div/>', {
                    'class': 'page-loader'
                });
                $('body').append(newPageLoader);

                pageLoader = $('.page-loader');
                
                resizePageLoader();
                $(window).resize(resizePageLoader);
            }

            pageLoader.addClass('load');
        },

        endLoadFreeze: function(){ $('.page-loader').removeClass('load'); },

        Grade: Backbone.Model.extend({
            id: '',
            title: '',
            position: '',
            sync: function(method, model, options){
                function getGradeSuccess(rawStandards){
                    standards = new OC.standards.Standards();
                    var newStandard;

                    _.each(rawStandards, function(standard){
                        newStandard = new OC.standards.Standard(standard);
                        newStandard.set('mappings', new OC.standards.Mappings());
                        newStandard.set('links', new OC.standards.Objectives());
                        newStandard.set('objectives', []);

                        standards.add(newStandard);
                    });

                    model.set('standards', standards);
                    options.success();
                }

                switch(method) {
                    case 'read':
                        OC.api.standards.fetchStandards(this.get('id'), getGradeSuccess);
                        break;
                }
            }
        }),
        GradeView: React.createClass({
            mixins: [BackboneMixin],
            getInitialState: function() {
                return { loading: false };
            },
            renderStandards: function(event){
                var view = this;

                function groupStandards(collection){
                    // Split standards from grade fetch into multiple categories.
                    var groupedStandards = _.groupBy(collection.models, function(
                        resource){ return resource.get('domain'); });

                    OC.standards.domains.reset();

                    // Build categories from resource results 'domain' fields.
                    var domain, j = 0;
                    _.each(groupedStandards, function(value, key, list){
                        domain = new OC.standards.Domain({ title: key, id: j++ });
                        domain.set('standards', new OC.standards.Standards(value));
                        OC.standards.domains.add(domain);
                    });
                }

                function updateStandardsUI(){
                    groupStandards(view.getModel().get('standards'));

                    React.renderComponent(OC.standards.DomainsView(
                        {models: OC.standards.domains}), $('.middle-menu').get(0));
                }

                if (view.getModel().has('standards')){
                    updateStandardsUI();
                } else {
                    this.loading();
                    this.getModel().fetch({
                        success: function(){
                            updateStandardsUI();
                        },
                        error: function(){
                            view.stopLoading();
                        }
                    });
                }
                
            },

            loading: function(){
                // Set universal standards view state.
                React.renderComponent(OC.standards.StandardsView(
                    {collection: OC.standards.standardsCollection, loading: true }), $('.middle-menu').get(0));
            },
            stopLoading: function(){
                 React.renderComponent(OC.standards.StandardsView(
                    {collection: OC.standards.standardsCollection, loading: false }), $('.middle-menu').get(0));
            },
            render: function(){
                return React.DOM.li({onClick: this.renderStandards}, this.props.title);
            }
        }),

        Grades: Backbone.Collection.extend({
            model: OC.standards.Grade
        }),

        GradesView: React.createClass({
            mixins: [BackboneMixin],
            render: function(){
                var gradeMap = {};
                this.props.models.forEach(function(grade){
                    gradeMap['react-' + grade.get('id')] = OC.standards.GradeView({model: grade});
                });
                return React.DOM.ul({className: 'category-grades'}, gradeMap);
            },
        }),


        Standard: Backbone.Model.extend({
            id: '',
            fetchMappings: function(options){
                function success(response){ return options.success(response); }

                $.get('/meta/api/get-mappings-from-standard/' + this.get('id') + '/',
                    function (response){
                        success(response);
                    }, 'json');
            },
            fetchLinks: function(options){
                function success(response){ return options.success(response); }

                $.get('/meta/api/get-links-from-standard/' + this.get('id') + '/',
                    function (response){
                        success(response);
                    }, 'json');
            }
        }),
        Standards: Backbone.Collection.extend({
            model: OC.standards.Standard,
        }),

        StandardView: React.createClass({
            mixins: [BackboneMixin],
            renderStandardInfo: function(){
                var standard = this.getModel();

                $('.right-menu').addClass('loading');

                standard.fetchMappings({
                    success: function(response){
                        _.each(response.mappings, function(mapping){
                            standard.get('mappings').add(new OC.standards.Mapping(mapping));
                        });

                        standard.fetchLinks({
                            success: function(response){
                                _.each(response.links, function(link){
                                    standard.get('links').add(new OC.standards.Objective(link));
                                });

                                _.each(response.objectives, function(objective){
                                    standard.get('objectives').push(objective);
                                });

                                React.renderComponent(OC.standards.StandardInfoView(
                                    {model: standard }), $('.right-menu').get(0), function(){
                                    $('.right-menu').removeClass('loading');
                                });
                            }
                        });
                    }
                });
            },
            render: function(){
                var shortenedDescription = this.props.description;

                if (shortenedDescription.length > 200)
                    shortenedDescription = shortenedDescription.substring(0, 150) + '\u2026';

                return React.DOM.li({onClick: this.renderStandardInfo, className: 'standards-listing-item'}, this.props.title + ': ' + shortenedDescription);
            }
        }),

        StandardsView: React.createClass({
            mixins: [BackboneMixin],
            /*getInitialState: function() {
                return { loading: false, empty: false };
            },*/
            renderStandards: function(standard){
                return OC.standards.StandardView({model: standard});
            },
            render: function(){
                var ulClass = this.props.loading ? 'loading' : '';

                if (!this.props.collection) return React.DOM.ul({className: 'empty'});
                else return React.DOM.ul(
                    {className: ulClass}, this.props.collection.map(this.renderStandards));
            }
        }),
        Domain: Backbone.Model.extend({
            id: '',
            title: '',
            position: '',
            standards: '',
        }),

        DomainView: React.createClass({
            mixins: [BackboneMixin],
            renderStandard: function(standard){
                return OC.standards.StandardView({ model: standard });
            },
            render: function(){
                return React.DOM.div({className: 'domain'}, [
                    React.DOM.div({className: 'domain-title'}, this.props.title),
                    React.DOM.ul({className: 'standards-listing'}, this.props.standards.map(this.renderStandard))
                ]);
            }
        }),

        Domains: Backbone.Collection.extend({
            model: OC.standards.Domain,
        }),

        DomainsView: React.createClass({
            mixins: [BackboneMixin],
            renderDomain: function(domain){
                return OC.standards.DomainView({model: domain});
            },
            render: function(){
                return React.DOM.div({className: 'domains-listing'}, this.props.models.map(this.renderDomain));
            }
        }),

        StandardInfoView: React.createClass({
            mixins: [BackboneMixin],
            render: function(){
                return React.DOM.div({className: 'standard-info'}, [
                    React.DOM.div({className: 'standard-code'}, this.props.title),
                    React.DOM.div({className: 'standard-description'}, this.props.description),
                    OC.standards.StandardsMappingView({ mappings: this.props.mappings, standard: this.props.id }),
                    OC.standards.CurriculumObjectivesLinksView({
                        links: this.props.links,
                        standard: this.props.id,
                        objectives: this.props.objectives
                    })
                    /*OC.standards.StandardsMappingView({
                        mappings: OC.standards.mappings.findWhere({
                            baseStandard: this.props.title})
                    })*/
                ]);
            }
        }),

        Mapping: Backbone.Model.extend({
            id: '',
            standard: '',
            notes: '',
            sync: function(method, model, options){
                function success(response){ return options.success(response); }

                switch(method) {
                    case 'update':
                        OC.api.standards.mapping.update({
                            notes: this.get('notes'), id: this.get('id'), to: this.get('standard')}, success);
                        break;
                    case 'create':
                        OC.api.standards.mapping.create({
                            from: options.attrs.from, to: this.get('standard')}, success);
                        break;
                    case 'delete':
                        OC.api.standards.mapping.delete({
                            id: this.get('id')}, success);
                        break;
                }
            }
        }),

        Mappings: Backbone.Collection.extend({
            model: OC.standards.Mapping,
        }),

        MappingView: React.createClass({
            setupSuggest: function(event) {
                // Setup the suggestions.
                var suggestionContainer = $('.standard-mapping-suggestions'),
                    currentCell = $(event.target).parent('td');

                if (suggestionContainer.length === 0){
                    $('body').append($(
                        '<ul/>', {'class': 'standard-mapping-suggestions'}));
                    suggestionContainer = $('.standard-mapping-suggestions');
                }

                suggestionContainer.css({
                    top: currentCell.offset().top + currentCell.outerHeight(),
                    left: currentCell.offset().left,
                    width: currentCell.outerWidth(),
                    'min-height': currentCell.outerHeight()
                });
                suggestionContainer.addClass('show');

                $('body').unbind('click');
                $('body').click(function(){
                    suggestionContainer.removeClass('show');
                });
            },
            searchStandards: function(event){
                var currentCell = $(event.target),
                    currentInput = currentCell.text(),
                    mappingSuggestions = $('.standard-mapping-suggestions'),
                    ignoreEvents = [37, 38, 39, 40],
                    view = this;

                //this.props.mapping.set('standardTitle', currentInput);

                if (ignoreEvents.indexOf(event.which) === -1){
                    if (currentInput.length > 1) {
                        mappingSuggestions.addClass('loading');

                        var currentTime = new Date().getTime();
                        if (OC.standards.lastInputTimestamp){
                            delta = (currentTime - OC.standards.lastInputTimestamp) / 1000;
                            if (delta < 0.5){
                                clearTimeout(OC.standards.searchFilterTimeout);
                            }

                            OC.standards.searchFilterTimeout = setTimeout(function(){
                                // Perform search.
                                $.get('/meta/api/standard/search/' + currentInput  + '/?limit=10',
                                    function(response){
                                        mappingSuggestions.html('');
                                        mappingSuggestions.removeClass('loading');

                                        _.map(response, function(item){
                                             mappingSuggestions.append(
                                                $('<li/>', {text: item.title, id: 'standard-' + item.id})
                                            );
                                        });

                                        $('li', mappingSuggestions).click(function(event){
                                            //currentCell.text($(event.target).text());
                                            mappingSuggestions.removeClass('show');

                                            // Get the ID of the standard.
                                            var standardID = parseInt(
                                                $(event.target).attr('id').substring(9), 10);

                                            view.props.mapping.set('standardTitle', $(event.target).text());
                                            view.props.mapping.set('standard', standardID);
                                            view.props.mapping.save(null, {
                                                attrs: { from : view.props.from },
                                                success: function(){}
                                            });
                                        });
                                    },
                                'json');
                            }, 500);
                        }
                        OC.standards.lastInputTimestamp = currentTime;
                    } else {
                        clearTimeout(OC.standards.searchFilterTimeout);
                        mappingSuggestions.html('');
                        mappingSuggestions.removeClass('loading');
                    }
                }
            },
            saveNotes: function(event){
                newNotes = $(event.target).text();

                if (this.props.mapping.get('notes') !== newNotes){
                    this.props.mapping.set('notes', newNotes);
                    this.props.mapping.save(null, {
                        success: function(){}
                    });
                }
            },
            deleteMapping: function(event){
                this.props.mapping.destroy();
            },
            render: function(){
                return React.DOM.tr(null, [
                    React.DOM.td({ className: 'standard-mapping-to' }, [
                        React.DOM.div({
                            contentEditable: true,
                            onClick: this.setupSuggest,
                            className: 'standard-mapping-to-title',
                            onKeyUp: this.searchStandards
                        }, this.props.mapping.get('standardTitle')),

                        React.DOM.div({
                            className: 'delete-mapping',
                            onClick: this.deleteMapping
                        }, ''),
                    ]),
                    React.DOM.td({
                        contentEditable: true,
                        onBlur: this.saveNotes,
                        className: 'standard-mapping-notes'
                    }, this.props.mapping.get('notes')),
                ]);
            },
        }),

        StandardsMappingView: React.createClass({
            _forceUpdate: function() {
                this.forceUpdate();
            },
            componentDidMount: function() {
                this.props.mappings.on('add change remove', this._forceUpdate, this);
            },
            componentDidUpdate: function() {
                this.props.mappings.off('add change remove', this._forceUpdate, this);
                this.props.mappings.on('add change remove', this._forceUpdate, this);
            },
            addMapping: function(event){
                this.props.mappings.add(new OC.standards.Mapping({}));
            },
            renderMapping: function(mapping){
                return OC.standards.MappingView({ mapping: mapping, from: this.props.standard });
            },
            render: function(){
                return React.DOM.div({className: 'standard-mapping'}, [
                    React.DOM.table(null, [
                        React.DOM.colgroup(null, [
                            React.DOM.col({className: 'standard-mapping-to-column'}, ''),
                            React.DOM.col({className: 'standard-mapping-notes-column'}, ''),
                        ]),
                        React.DOM.tbody(null, [
                            React.DOM.tr(null, [
                                React.DOM.th(null, 'Mapped to'),
                                React.DOM.th(null, 'Notes'),
                            ]),
                            this.props.mappings.map(this.renderMapping)
                        ]),
                    ]),
                    React.DOM.div({className: 'standard-mapping-actions'}, [
                        React.DOM.button({
                            className: 'standard-mapping-actions-add',
                            onClick: this.addMapping
                        }, '+ Add mapping')
                    ])
                ]);
            }
        }),

        CurriculumObjectivesLinkView: React.createClass({
            getInitialState: function(){
                return {curriculum: null, link: this.props.link};
            },
            changeCurriculum: function(event){
                // Populate the objectives.
                var currentCurriculum = _.findWhere(this.props.objectives, {
                    id: parseInt($(event.target).attr('value'), 10) });
                this.replaceState({curriculum: currentCurriculum.id});
            },
            changeObjective: function(event){
                function success(){}

                var $select = $(event.target),
                    newLinkID = parseInt($select.attr('value'), 10),
                    view = this;

                // Check if this objective has already been mapped to this standard.
                if (this.props.links.findWhere({id: newLinkID})){
                    alert('You have already linked this objective to the current standard.');
                    $select.attr('value', this.state.link.id);
                } else {
                    // Check if this objective has already been mapped to any standard.

                    serializedLink = {
                        'objective_id': newLinkID,
                        'standard_id': this.props.standard,
                        'remove_objective_id': this.state.link.id
                    };

                    $.ajax({
                        type: 'POST',
                        url: '/meta/api/link-objective/create-update/',
                        data: serializedLink,
                        success: function(response){
                            success(response);
                            view.replaceState({link: {id: newLinkID}});
                        },
                        error: function(xhr, status, error){
                            var response = JSON.parse(xhr.responseText);
                            $select.attr('value', view.state.link.id);
                            alert('This objective is already linked to the standard' + response.standard_title +
                                    '. You need to remove that link before establishing this.');
                        }
                    });
                }

            },
            renderCurriculumOptions: function(curriculum){
                return React.DOM.option({
                    className: 'standard-links-curriculum-select-option',
                    value: curriculum.id
                }, curriculum.curriculumGrade + ': ' + curriculum.curriculumSubject);
            },
            renderCurriculumObjectivesOptions: function(objective){
                return React.DOM.option({
                    className: 'standard-links-objectives-select-option',
                    value: objective.id
                }, objective.description.substring(0, 55) +
                    (objective.description.length > 55? '…': ''));
            },
            renderCurriculaConditionally: function(curriculumSelected){
                if (curriculumSelected){
                    return this.props.objectives.map(this.renderCurriculumOptions);
                } else {
                    return _.union(React.DOM.option({
                        value: 0,
                    }, 'Select a curriculum'),
                    this.props.objectives.map(this.renderCurriculumOptions));
                }
            },
            renderObjectivesConditionally: function(curriculumSelected, currentCurriculum){
                if (curriculumSelected){
                    return currentCurriculum.objectives.map(this.renderCurriculumObjectivesOptions);
                } else {
                    return React.DOM.option({
                        value: 0,
                    }, 'Select an objective');
                }
            },
            render: function(){
                var props = this.props, state = this.state, curriculumSelected,currentCurriculum;
                // Find curricula which contains the objective. with id = link.id
                
                if (this.state.curriculum){
                    currentCurriculum = _.findWhere(this.props.objectives, {id: this.state.curriculum});
                    curriculumSelected = true;
                } else {
                    currentCurriculum = _.find(this.props.objectives, function(curriculum){
                        return _.findWhere(curriculum['objectives'], {id: state.link.id});
                    });
                    curriculumSelected = true;
                }
                
                if (!currentCurriculum){
                    currentCurriculum = this.props.objectives[0];
                    curriculumSelected = false;
                }

                return React.DOM.tr({className: 'standard-link'}, [
                    React.DOM.td({ className: 'standard-links-curriculum' }, [
                        React.DOM.select({
                            className: 'standard-links-curriculum-select',
                            defaultValue: curriculumSelected? currentCurriculum.id: 0,
                            onChange: this.changeCurriculum
                        }, this.renderCurriculaConditionally(curriculumSelected)),

                        /*React.DOM.div({
                            className: 'delete-mapping',
                            onClick: this.deleteMapping
                        }, ''),*/
                    ]),
                    React.DOM.td({className: 'standard-links-objective'}, [
                        React.DOM.select({
                            className: 'standard-links-objectives',
                            onChange: this.changeObjective,
                            defaultValue: state.link.id ? state.link.id : 0
                        }, this.renderObjectivesConditionally(curriculumSelected, currentCurriculum))
                    ]),
                ]);
            },
        }),

        CurriculumObjectivesLinksView: React.createClass({
            _forceUpdate: function() {
                this.forceUpdate();
            },
            componentDidMount: function() {
                this.props.links.on('add change remove', this._forceUpdate, this);
            },
            componentDidUpdate: function() {
                this.props.links.off('add change remove', this._forceUpdate, this);
                this.props.links.on('add change remove', this._forceUpdate, this);
            },
            addLink: function(){
                this.props.links.add(new OC.standards.Objective());
            },
            renderLink: function(link){
                return OC.standards.CurriculumObjectivesLinkView({
                    link: link,
                    objectives: this.props.objectives,
                    standard: this.props.standard,
                    links: this.props.links
                });
            },
            render: function(){
                if (OC.config.user.id){
                    return React.DOM.div({className: 'standard-links'}, [
                        React.DOM.table(null, [
                            React.DOM.colgroup(null, [
                                React.DOM.col({className: 'standard-links-curriculum-column'}, ''),
                                React.DOM.col({className: 'standard-links-objective-column'}, ''),
                            ]),
                            React.DOM.tbody(null, [
                                React.DOM.tr(null, [
                                    React.DOM.th(null, 'Curriculum'),
                                    React.DOM.th(null, 'Objective'),
                                ]),
                                this.props.links.map(this.renderLink)
                            ]),
                        ]),
                        React.DOM.div({className: 'standard-links-actions'}, [
                            React.DOM.button({
                                className: 'standard-links-actions-add',
                                onClick: this.addLink
                            }, '+ Add link')
                        ])
                    ]);
                } else {
                    return React.DOM.div({className: 'standard-links'},
                        'You need to be logged in to view and modify links.');
                }
            }
        }),

        Objective: Backbone.Model.extend({
            id: '',
            description: '',
        }),

        Objectives: Backbone.Collection.extend({
            model: OC.standards.Objective,
        }),

    });
    
    OC.standards.grades = new OC.standards.Grades();

    _.each(OC.standards.rawGrades, function(grade){
        OC.standards.grades.add(new OC.standards.Grade(grade));
    });

    OC.standards.domains = new OC.standards.Domains();

    $(document).ready(function($){
        function resizeApp(){
            $('.category-standards-body').height(
                $(window).height() - $('.category-selection-bar').outerHeight()
            );
        }

        resizeApp();
        $(window).resize(resizeApp);
    
        // Render the grades collection.
        React.renderComponent(OC.standards.GradesView(
            {models: OC.standards.grades}), $('.left-menu').get(0));

        OC.standards.standardsCollection = new OC.standards.Standards();
        OC.standards.mappings = new OC.standards.Mappings();

        // React on change in selection of standard.
        $('select[name="standard"]').change(function(event){
            // Put app in loading / freeze state.
            OC.standards.loadFreeze();

            var selectedSubjectID = $('option:selected', this).attr('name').substring(9);

            function rerender(response){
                var i; OC.standards.grades.reset();
                for (i = 0; i < response.grades.length; i++)
                    OC.standards.grades.add(new OC.standards.Grade(response.grades[i]));

                React.renderComponent(OC.standards.GradesView(
                    {models: OC.standards.grades}), $('.left-menu').get(0));

                // Subjects.
                var j, li, gradeSelector = $('select[name="grade"]');
                gradeSelector.empty();
                for (j = 0; j < response.subjects.length; j++){
                    li = $('<option/>', {
                        name: 'category-' + response.subjects[j].id,
                        html: response.subjects[j].title
                    });

                    gradeSelector.append(li);
                }
                

                // Clean the standards view.
                OC.standards.standardsCollection.reset();
                React.renderComponent(OC.standards.StandardsView(
                    {collection: OC.standards.standardsCollection}), $('.middle-menu').get(0));

            }

            // Fetch the standard categories and child grades,
            //     and rerender / bind parts of the app.
            $.get('/meta/api/standard/' + selectedSubjectID + '/',
                function (response){
                    rerender(response);
                    OC.standards.endLoadFreeze();
                }, 'json');
        });

        window.$ = $;
    });
});