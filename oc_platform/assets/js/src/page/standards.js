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
        read: function(model, success, error){
            $.get('/resources/api/search/' + request.term  + '/',
                function (data){
                    response($.map(data, function(item){
                        return { label: item, value: item };
                    }));
                }, 'json');
        },

        fetchStandards: function(id, success){
            $.get('/meta/api/get-nested-child-tags-from-category/' + id + '/',
                function (data){
                    success(data.tags);
                }, 'json');

        }
    };

    _.extend(OC.standards, {
        loadFreeze: function(){
            var pageLoader = $('.page-loader');
            if (pageLoader.length === 0){
                var newPageLoader = $('<div/>', {
                    'class': 'page-loader'
                });
                $('body').append(newPageLoader);

                var categoryBarHeight = $('.category-selection-bar').outerHeight();

                pageLoader = $('.page-loader');
                pageLoader.css({
                    top: categoryBarHeight,
                    height: $(window).height() - categoryBarHeight
                });
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

                    _.each(rawStandards, function(standard){
                        standards.add(new OC.standards.Standard(standard));
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
            componentDidMount: function(){
                //this.setProps({loading: false});
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
        }),
        Standards: Backbone.Collection.extend({
            model: OC.standards.Standard,
        }),

        StandardView: React.createClass({
            mixins: [BackboneMixin],
            renderStandardInfo: function(){
                React.renderComponent(OC.standards.StandardInfoView(
                    {model: this.getModel() }), $('.right-menu').get(0));
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
                    React.DOM.div({className: 'standard-description'}, this.props.description)
                ]);
            }
        })
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