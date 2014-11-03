define(['jquery', 'core', 'backbone', 'underscore', 'react', 'spin', 'nanoscroller'], function($, OC, Backbone, _, React, Spinner){

    BackbonerMixin = {
        _backboneForceUpdate: function() {
            this.forceUpdate();
        },

        bindModelEvents: function() {
            // Whenever there may be a change in the Backbone data, trigger a reconcile.
            [this.props.model].map(function(model) {
                model.on('add change remove', this._backboneForceUpdate, this);
            }.bind(this));
        },
        
        componentDidMount: function() {
            this.bindModelEvents();
        },

        componentWillUnmount: function() {
            // Ensure that we clean up any dangling references when the component is destroyed.
            [this.props.model].map(function(model) {
                model.off('add change remove', this._backboneForceUpdate, this);
            }.bind(this));
        }
    };


    OC.api.curriculum = {
        /*objective: {
            update: function(serializedObjective, callback){
                $.post('/curriculum/api/objective/update/', serializedObjective,
                    function(response){
                        callback(response);
                    }, 'json');
            },
            create: function(description, callback){
                $.post('/curriculum/api/objective/create/', description,
                    function(response){
                        callback(response);
                    }, 'json');
            }
        },*/
        sectionItem: {
            update: function(serializedObjective, callback){
                $.post('/curriculum/api/section-item/update/', serializedObjective,
                    function(response){
                        callback(response);
                    }, 'json');
            },
            create: function(description, callback){
                $.post('/curriculum/api/section-item/create/', description,
                    function(response){
                        callback(response);
                    }, 'json');
            }
        },
        /*unit: {
            addObjective: function(serializedUnitObjective, callback){
                $.post('/curriculum/api/objective/add-objective-to-unit/', serializedUnitObjective,
                    function(response){
                        callback(response);
                    }, 'json');
            }
        },*/
        section: {
            addItem: function(serializedUnitItem, callback){
                $.post('/curriculum/api/section-item/add-item-to-section/', serializedUnitItem,
                    function(response){
                        callback(response);
                    }, 'json');
            }
        },
        issues: {
            update: function(serializedObjective, callback){
                $.post('/curriculum/api/issue/create-update/', serializedObjective,
                    function(response){
                        callback(response);
                    }, 'json');
            },
        },
        resources: {
            delete: function(serializedObjectiveResource, callback){
                $.post('/curriculum/api/objective/remove-resource/', serializedObjectiveResource,
                    function(response){
                        callback(response);
                    }, 'json');
            }
        }
    };

     _.extend(OC.explorer, {
        /*Settings: Backbone.Model.extend({
            drawerOpen: '',
        }),*/

        App: React.createClass({
            getInitialState: function() {
                return {numWeeks: 0, view: 'overview', drawerView: false};
            },
            getDefaultProps: function() {
                return {units: []};
            },

            getTextbookFromUnitID: function(unitID){
                return _.find(OC.explorer.textbooks, function(textbook){
                    return _.findWhere(textbook.units, {id: unitID});
                });
            },
            componentWillMount: function() {
                var view = this, textbook;

                $('.explorer-loader').addClass('show');
                $.get('/curriculum/api/curriculum/' + this.props.id + '/',
                    function(response){
                        $('.explorer-loader').removeClass('show');

                        OC.explorer.textbooks = response.textbooks;
                        OC.explorer.units = response.units;
                        OC.explorer.standards = response.standards;

                        var newTextbookUnits, textbookUnit;

                        _.each(OC.explorer.textbooks, function(textbook){
                            var newTextbookUnits = [];

                            _.each(textbook.units, function(unit){
                                textbookUnit = _.findWhere(OC.explorer.units, {id: unit.id});
                                textbookUnit['textbook_id'] = unit.textbook_id;

                                newTextbookUnits.push(textbookUnit);
                            });

                            textbook.units = newTextbookUnits;
                        });

                        var unitPeriods;
                        if (view.props.settings.periods.title == 'weekly'){
                            // Go through every textbook / unit and build a period representation.
                            unitPeriods = _.flatten(_.map(OC.explorer.textbooks, function(textbook){
                                return _.map(textbook.units, function(unit){
                                    return {
                                        id: unit.id,
                                        textbook: textbook,
                                        textbookTitle: textbook.title,
                                        title: unit.title,
                                        textbookThumbnail: textbook.thumbnail,
                                        begin: unit.period && _.has(unit.period, 'begin') ? unit.period.begin : null,
                                        end: unit.period && _.has(unit.period, 'end') ? unit.period.end : null,
                                    };
                                });
                            }));
                            var unitsWithPeriods = _.sortBy(_.reject(
                                unitPeriods, function(unitPeriod){ return unitPeriod.end === null; }), function(unit){
                                return unit.begin;
                            });
                            var end = _.max(unitsWithPeriods, function(unitPeriod){ return unitPeriod.end; }).end,
                                begin = _.min(unitsWithPeriods, function(unitPeriod){ return unitPeriod.begin; }).begin;

                            if (end && begin)
                                view.setState({numWeeks: Math.ceil((end - begin) / 7)});
                            else view.setState({numWeeks: 0});

                            view.setProps({units: unitsWithPeriods});
                        } else if (view.props.settings.periods.title == 'terms'){

                            unitPeriods = _.map(OC.explorer.units, function(unit){
                                textbook = view.getTextbookFromUnitID(unit.id);
                                return {
                                    id: unit.id,
                                    title: unit.title,
                                    textbook: textbook,
                                    textbookTitle: textbook ? textbook.title : null,
                                    textbookThumbnail: textbook ? textbook.thumbnail : null,
                                    type: unit.period && _.has(unit.period, 'type') ? unit.period.type : null,
                                    position: unit.period && _.has(unit.period, 'position') ? unit.period.position : null,
                                    parent: unit.period && _.has(unit.period, 'parent') ? unit.period.parent : null,
                                    unit: unit.period && _.has(unit.period, 'unit') ? unit.period.unit : null
                                };
                            });

                            // Determine the number of units associated with each term.
                            var unitData;
                            _.each(unitPeriods, function(unit){
                                unitData = view.props.settings.periods.data[unit.parent];

                                if (! _.has(unitData, 'count')){
                                    unitData['count'] = 1;
                                } else {
                                    unitData['count'] += 1;
                                }
                            });
                            
                            view.setProps({units: unitPeriods});
                        }
                }, 'json');
            },

            initOverview: function() {
                /*function objectiveHasIssues(objective){
                    return objective.get('issue')['id'] !== null;
                }

                $('.explorer-loader').addClass('show');

                $('.explorer-resource-listing').removeClass('show');
                $('.explorer-resource-module-wrapper').removeClass('show');

                $('.explorer-resource-overview').addClass('show');

                // Build list of issues.

                // Go through every text, and every unit and find objectives
                //     with issue objects.
                var m, n, textbookKeys = _.keys(OC.explorer.textbooks), unitKeys,
                    textbook, unit, issueUnits = [];

                for (m = 0; m < OC.explorer.textbooks.length; m++){
                    textbook = OC.explorer.textbooks[m];

                    for (n = 0; n < textbook.units.length; n++){
                        unit = textbook.units[n];

                        issueObjectives = unit.objectives.filter(objectiveHasIssues);
                        if (issueObjectives.length > 0){
                            issueUnits.push({
                                'unitTitle': unit.title,
                                'textbookTitle': textbook.title,
                                'textbookThumbnail': _.findWhere(
                                    OC.explorer.textbooks, {title: textbook.title}).thumbnail,
                                'objectives': issueObjectives
                            });
                        }
                    }
                }

                React.renderComponent(OC.explorer.CurriculumIssuesSet(
                    {units: issueUnits}), $('.explorer-overview-issues-wrapper').get(0),
                    function(){
                        $('.explorer-loader').removeClass('show');
                    }
                );*/


            },

            openOverview: function(event){
                this.setState({view: 'overview'});

                event.stopPropagation();
                event.preventDefault();
                return false;
            },
            
            renderPeriods: function() {
                var view = this;

                if (this.props.settings.periods.title == 'weekly'){
                    return _.times(this.state.numWeeks, function(i){
                        return React.DOM.div(
                            {className: 'explorer-timetable-period explorer-timetable-week'}, 'Week ' + (i + 1));
                    });
                } else if (this.props.settings.periods.title == 'terms'){
                    // Render each term (particularly length) based on unit length.
                    return _.map(view.props.settings.periods.data, function(period){
                        if (period.count && period.count > 0){
                            return React.DOM.div({
                                key: period.title,
                                className: 'explorer-timetable-period',
                                style: {
                                    height: ((period.count * 7 * 11) + 40 * period.count + 1 * period.count) - 29 + 'px'
                                }
                            }, [
                                React.DOM.div({className: 'explorer-timetable-period-title', key: 0}, period.title),
                                React.DOM.div({className: 'explorer-timetable-period-caption', key: 1}, period.caption)
                            ]);
                        } else return null;
                    });
                }
            },

            renderPeriodUnits: function() {
                // Build the time table based on the curriculum period and unit begin -> end.
                var view = this;

                return this.props.units.map(function(unit){
                    return OC.explorer.PeriodUnitItem({
                        unit: unit,
                        click: view.renderUnit,
                        key: unit.id
                    });
                });
            },

            renderTextbooks: function() {
                var view = this;

                return OC.explorer.textbooks.map(function(textbook){
                    return React.DOM.li({
                        className: 'textbooks',
                        key: textbook.id
                    }, [
                        React.DOM.a({href: ''}, textbook.title),
                        React.DOM.ul({className: 'explorer-body-side-menu explorer-body-side-menu-light'},
                            textbook.units.map(function(unit){
                                return OC.explorer.CurriculumUnitItem({
                                    unit: unit,
                                    textbook: textbook,
                                    click: view.renderUnit,
                                    key: unit.id
                                });
                            }))
                    ]);
                });
            },

            renderUnits: function() {
                var view = this;

                return OC.explorer.units.map(function(unit){
                    return OC.explorer.CurriculumUnitItem({
                        key: unit.id,
                        unit: unit,
                        textbook: view.getTextbookFromUnitID(unit.id),
                        click: view.renderUnit,
                        selected: view.props.unit && view.state.view === 'unit' ? view.props.unit === unit : false
                    });
                });
            },

            openStandard: function(standard) {
                var view = this;

                function redoUI(){
                    view.setProps({standard: standard, textbook: null});

                    view.setState({view: 'standard'}, function(){
                        setTimeout(OC.explorer.resetPreHeights, 50);
                    });

                    var objectivePres = $('.explorer-resource-listing-body-pre');
                    objectivePres.height('');
                }

                if (_.has(standard, 'sections')){
                    redoUI();
                } else {
                    $('.explorer-loader').addClass('show');
                    $.get('/curriculum/api/standard/' + standard.id + '/',
                        function(response){
                            $('.explorer-loader').removeClass('show');

                            standard.sections = [];
                            view.buildSections(standard, response);

                            redoUI();
                    }, 'json');
                }
            },

            renderStandards: function() {
                var view = this;

                return OC.explorer.standards.map(function(standard){
                    return OC.explorer.StandardItem({
                        key: standard.id,
                        click: view.openStandard,
                        standard: standard,
                        selected: view.state.view === 'standard' ? view.props.standard : undefined
                    });
                    /*return React.DOM.li({className: 'standards'}, [
                        React.DOM.a({
                            href: '',
                            onClick: view.open
                        }, standard.title),
                        React.DOM.ul({className: 'explorer-body-side-menu explorer-body-side-menu-light'},
                            standard.standards.map(function(subStandard){
                                return OC.explorer.StandardItem({
                                    title: subStandard.title,
                                    click: view.openStandard,
                                    standard: subStandard
                                });
                            }))
                    ]);*/
                });
            },

            renderMenu: function(){
                var view = this;
                var menuItems = this.props.settings.menu.map(function(menuItem){
                    
                    if (menuItem.organization === 'textbook-units'){
                        return React.DOM.li({
                            className: 'textbooks',
                            key: menuItem.title
                        }, [
                            React.DOM.a({href: '', key: 0}, menuItem.title),
                            React.DOM.ul({className: 'explorer-body-side-menu', key: 1}, view.renderTextbooks())
                        ]);
                    } else if (menuItem.organization === 'units') {
                        return React.DOM.li({
                            className: 'units',
                            key: menuItem.title
                        }, [
                            React.DOM.a({href: '', key: 0}, menuItem.title),
                            React.DOM.ul({className: 'explorer-body-side-menu explorer-body-side-menu-parentless-child', key: 1}, view.renderUnits())
                        ]);
                    } else {
                        return React.DOM.li({
                            className: 'domain-clusters',
                            key: menuItem.title
                        }, [
                            React.DOM.a({href: '', key: 0}, [
                                React.DOM.span({key: 0}, menuItem.title),
                                React.DOM.span({className: 'explorer-menu-caret', key: 1}, null)
                            ]),
                            React.DOM.ul({className: 'explorer-body-side-menu explorer-body-side-menu-domain-clusters', key: 1}, view.renderStandards())
                        ]);
                    }
                });

                return menuItems;
            },

            renderUnit: function(unit, textbook){
                var view = this;

                textbook = textbook ? textbook : unit.textbook;

                function redoUI(){
                    view.setProps({unit: unit, textbook: textbook});

                    view.setState({view: 'unit'}, function(){
                        setTimeout(OC.explorer.resetPreHeights, 50);
                    });

                    var objectivePres = $('.explorer-resource-listing-body-pre');
                    objectivePres.height('');
                }

                if (_.has(unit, 'sections')){
                    redoUI();
                } else {
                    $('.explorer-loader').addClass('show');
                    $.get('/curriculum/api/sections/' + unit.id + '/',
                        function(response){
                            $('.explorer-loader').removeClass('show');

                            unit.sections = [];
                            view.buildSections(unit, response);

                            redoUI();
                    }, 'json');
                }
            },

            buildSections: function(parent, response){
                var newSection, newItem, items, sectionItems;
                _.each(response, function(section){

                    items = _.map(
                        section.items, function(ri){
                            newItem = new OC.explorer.SectionItem(ri);

                            newItem.set('issue', {
                                id: ri.issue ? ri.id : null,
                                host_id: ri.issue ? ri.host_id : null,
                                message: ri.issue ? ri.message : null
                            });
                            newItem.set('section_id', section.id);

                            return newItem;
                        });

                    sectionItems = new OC.explorer.SectionItems(items);

                    sectionItems.each(function(item){
                        item.set('resource_sets', _.map(item.get('resource_sets'), function(resourceSet){
                            return {
                                id: resourceSet.id,
                                title: resourceSet.title,
                                resources: new OC.explorer.Resources(_.map(
                                resourceSet.resources, function(rr){ return new OC.explorer.Resource(rr); }))
                            };
                        }));
                    });

                    newSection = {
                        id: section.id,
                        position: section.position,
                        title: section.title,
                        items: sectionItems,
                        type: section.type
                    };

                    parent.sections.push(newSection);
                });
            },

            openDrawer: function() {
                this.setState({drawerView: true});
            },

            render: function(){
                var overviewView = React.DOM.div({className: 'explorer-resource-overview show'}, [
                    React.DOM.div({className: 'explorer-overview-section', key: 0}, [
                        React.DOM.h2({key: 0}, 'Overview'),
                        React.DOM.p({key: 1}, this.props.description),
                    ]),

                    React.DOM.div({className: 'explorer-overview-section', key: 1},
                        React.DOM.div({className: 'explorer-overview-unit-table', key: 0}, [
                            React.DOM.div({className: 'explorer-overview-timetable', key: 0}, this.renderPeriods()),
                            React.DOM.div({className: 'explorer-overview-unitflow', key: 1}, this.renderPeriodUnits()),
                        ])
                    ),

                    /*React.DOM.div({className: 'explorer-overview-section'}, [
                        React.DOM.h2({}, 'Notes and issues'),

                        React.DOM.div({className: 'explorer-overview-issues-wrapper explorer-resource-module'}, [

                        ])
                    ]),*/
                ]);

                var unitView = null;
                if (this.state.view === 'unit' || this.state.view === 'standard'){
                    unitView = React.DOM.div({className: 'explorer-resource-module-wrapper'},
                        OC.explorer.Page({
                            title: this.state.view === 'unit' ? this.props.unit.title.toUpperCase(
                                ) : this.props.standard.title.toUpperCase(),
                            textbookTitle: this.props.textbook ? this.props.textbook.title.toUpperCase() : null,
                            thumbnail: this.props.textbook ? this.props.textbook.thumbnail : null,
                            sections: this.state.view === 'unit' ? this.props.unit.sections : this.props.standard.sections,
                            id: this.state.view === 'unit' ? this.props.unit.id : this.props.standard.id,
                            drawerView: this.state.drawerView,
                            setDrawerOpen: this.openDrawer
                        })
                    );
                }

                return React.DOM.div({className: 'explorer-body'},[
                    React.DOM.div({className: 'explorer-body-side scrollable-block', key: 0},
                        React.DOM.ul({className: 'explorer-body-side-menu explorer-body-side-menu-main scroll-content', key: 0},
                            React.DOM.li({className: 'overview', key: 0},
                                React.DOM.a({
                                    href: '',
                                    onClick: this.openOverview
                                }, 'OVERVIEW')
                            ),
                            this.renderMenu()
                        )
                    ),

                    React.DOM.div({className: 'explorer-body-stage', key: 1},
                        React.DOM.div({className: 'explorer-body-stage-spread'},
                            this.state.view === 'overview' ? overviewView : unitView
                        )
                    )
                ]);
            }
        }),

        /************************END OF APP**********************************/

        StandardItem: React.createClass({
            /*getInitialState: function(){
                return {selected: false};
            },*/
            openStandard: function(event) {
                this.props.click(this.props.standard);

                event.stopPropagation();
                event.preventDefault();
                return false;
            },
            render: function(){
                var view = this;

                return React.DOM.li({
                    className: this.props.selected === this.props.standard ? 'selected' : '',
                    onClick: this.openStandard
                }, [
                    React.DOM.a({href: '', key: 0}, this.props.standard.title),
                    this.props.standard.standards.length > 0 ? (
                    React.DOM.ul({className: 'explorer-body-side-menu explorer-body-side-menu-light', key: 1}, [
                        this.props.standard.standards.map(function(subStandard){
                            return OC.explorer.SubStandardItem({
                                key: subStandard.id,
                                title: subStandard.title,
                                click: view.props.click,
                                standard: subStandard,
                                selected: view.props.selected === subStandard ? true : false
                            });
                        })
                    ])) : null,
                ]);
            }
        }),

        SubStandardItem: React.createClass({
            /*getInitialState: function(){
                return {selected: false};
            },*/
            openStandard: function(event) {
                this.props.click(this.props.standard);

                event.stopPropagation();
                event.preventDefault();
                return false;
            },
            render: function(){
                return React.DOM.li({
                    className: this.props.selected ? 'selected' : '',
                    onClick: this.openStandard
                },
                    React.DOM.a({href: ''}, this.props.title)
                );
            }
        }),

        PeriodUnitItem: React.createClass({
            openUnit: function(){
                this.props.click(this.props.unit, this.props.unit.textbook);
            },
            render: function(){
                return React.DOM.a({
                    className: 'explorer-unitflow-unit',
                    id: 'textbook-unit-' + this.props.unit.id,
                    style: {
                        height: ((( this.props.unit.end - this.props.unit.begin + 1) * 12) - 41) + 'px'
                    },
                    onClick: this.openUnit
                }, OC.explorer.ModuleHeader({
                    title: this.props.unit.title,
                    textbookTitle: this.props.unit.textbookTitle,
                    thumbnail: this.props.unit.textbookThumbnail,
                    pageView: false
                }));
            }
        }),

        CurriculumUnitItem: React.createClass({
            /*getInitialState: function(){
                return {selected: false};
            },*/
            render: function() {
                return React.DOM.li({
                    className: this.props.selected ? 'selected' : '',
                    onClick: this.openUnit
                },
                    React.DOM.a({href: ''}, this.props.unit.title)
                );
            },
            openUnit: function(event, callback){
                //this.setState({selected: true});

                this.props.click(this.props.unit, this.props.textbook);

                // TODO (Varun):  Fix in non-hacky way.
                // $('li.textbooks .explorer-body-side-menu-light li.selected').removeClass('selected');

                event.stopPropagation();
                event.preventDefault();
                return false;
            },

        }),

        /************************END OF OVERVIEW VIEWS***************************/

        Page: React.createClass({
            _backboneForceUpdate: function() {
                this.forceUpdate();
            },
            bindProps: function() {
                _.flatten(this.props.sections.map(function(section){
                    return section.items;
                })).map(function(model){
                    model.on('add change remove', this._backboneForceUpdate, this);
                }.bind(this));
            },
            
            componentDidMount: function() {
                this.bindProps();
            },

            /*componentDidUpdate: function() {
                this.bindProps();
            },*/

            getInitialState: function(){
                return {drawerItem: null};
            },

            getDefaultProps: function() {
                return {objective: null};
            },

            componentWillUnmount: function() {
                _.flatten(this.props.sections.map(function(section){
                    return section.items;
                })).map(function(model){
                    model.off('add change remove', this._backboneForceUpdate, this);
                }.bind(this));
            },

            renderDrawer: function(){
                // Find objective from currently selected.
                var props = this.props;
                var selectedSection = _.find(props.sections, function(section){
                    return section.items.findWhere({selected: true});
                });

                if (selectedSection){
                    return OC.explorer.Context({ item: selectedSection.items.findWhere(
                        {selected: true}) });
                } else {
                    if (this.props.drawerView)
                        return OC.explorer.Context();
                }
            },

            openDrawer: function(item){
                //this.replaceState({selected: true});
                // Remove all objective selecteds.
                var selectedItem = _.find(this.props.sections, function(section){
                    return section.items.findWhere({selected: true});
                });
                if (selectedItem) selectedItem.items.findWhere({selected: true}).set({selected: false});

                /*this.props.objectives.where({selected: true}).forEach(function(objective){
                    objective.set({selected: false});
                });*/

                item.set('selected', true);

                this.props.setDrawerOpen();

                //$('.explorer-resource-module-main').addClass('compress');
                
                //$('.explorer-resource-module-support').addClass('show');
                
                //OC.explorer.settings.set('drawerOpen', true);
            },

            render: function(){
                return React.DOM.div({className: 'explorer-resource-module'}, [
                    React.DOM.div({
                        className: 'explorer-resource-module-main' + (this.props.drawerView ?
                            ' compress' : ''),
                        key: 0
                    }, [
                        OC.explorer.ModuleHeader({
                            key: 0,
                            thumbnail: this.props.thumbnail,
                            title: this.props.title,
                            textbookTitle: this.props.textbookTitle,
                            pageView: true
                        }),

                        React.DOM.div({className: 'explorer-resource-sections', key: 1},
                                OC.explorer.Sections({
                                    //collection: this.props.objectives,
                                    sections: this.props.sections,
                                    openDrawer: this.openDrawer,
                                    drawerOpen: this.props.drawerView
                                })
                                //OC.explorer.ModuleObjectives({
                                //    collection: this.props.objectives,
                                //    openDrawer: this.openDrawer
                                //}),
                        ),
                    ]),
                    React.DOM.div({
                        className: 'explorer-resource-module-support' + (this.props.drawerView ?
                            ' show' : ''),
                        key: 1
                    },
                        this.renderDrawer()
                    ),
                ]);
            }
        }),

        ModuleHeader: React.createClass({
            getInitialState: function(){
                return {thumbnail: this.props.thumbnail};
            },
            componentWillReceiveProps: function(nextProps){
                this.setState({thumbnail: nextProps.thumbnail });
            },
            render: function(){
                return React.DOM.div({className: 'explorer-resource-module-header'}, [
                    React.DOM.div({
                        key: 0,
                        className: 'explorer-resource-module-thumbnail' + (!this.state.thumbnail && this.props.pageView ? ' hide' : ''),
                        style: {
                            backgroundImage: this.state.thumbnail ? 'url(' + this.state.thumbnail + ')' : null
                        }
                    }, ''),
                    React.DOM.div({className: 'explorer-resource-module-content', key: 1}, [
                        React.DOM.div({className: 'explorer-resource-module-content-title', key: 0}, this.props.title),
                        React.DOM.div({className: 'explorer-resource-module-content-caption', key: 1}, this.props.textbookTitle)
                    ])
                ]);
            }
        }),

        Objectives: Backbone.Collection.extend({
            model: OC.explorer.Objective,
            sync: function(method, model, options){
                function success(response){ return options.success(response); }

                switch(method) {
                    case 'update':
                        return OC.api.curriculum.unit.addObjective(
                            {'id': model.get('unit_id'), 'objective_id': model.get('id')}, success);
                }
            }
        }),

        SectionItems: Backbone.Collection.extend({
            model: OC.explorer.SectionItem,
            sync: function(method, model, options){
                function success(response){ return options.success(response); }

                switch(method) {
                    case 'update':
                        return OC.api.curriculum.section.addItem(
                            {'id': model.get('section_id'), 'item_id': model.get('id')}, success);
                }
            }
        }),

        Sections: React.createClass({
            renderSection: function(section){
                return OC.explorer.ModuleSection({
                    key: section.id,
                    id: section.id,
                    collection: section.items,
                    title: section.title,
                    type: section.type,
                    openDrawer: this.props.openDrawer,
                    drawerOpen: this.props.drawerOpen
                });
            },
            render: function(){
                return React.DOM.div({className: 'explorer-resource-section'},
                    this.props.sections.map(this.renderSection)
                );
            }
        }),

        ModuleSection: React.createClass({
            _backboneForceUpdate: function() {
                this.forceUpdate();
            },
            bindProps: function() {
                this.props.collection.on('add change remove', this._backboneForceUpdate, this);
            },
            componentDidMount: function() {
                this.bindProps();
            },
            componentWillUnmount: function() {
                this.props.collection.off('add change remove', this._backboneForceUpdate, this);
            },
            addItem: function(){
                var newItem = new OC.explorer.SectionItem({
                    description: '',
                    resource_sets: [{ id: null, resources: new OC.explorer.Resources() }],
                    meta: {},
                    issue: {
                        id: null, host_id: null, message: null
                    },
                    section_id: this.props.id
                });

                var view = this;
                OC.appBox.saving();

                newCollectionItem = view.props.collection.create(newItem, {
                    success: function(model){
                        view.props.collection.add(model);
                        return OC.api.curriculum.section.addItem(
                            {'id': model.get('section_id'), 'item_id': model.get('id')}, function(){});
                    }
                });

                // Highlight the last objective AFTER rendering completion.
                setTimeout(function(){
                    OC.explorer.resetPreHeights();

                    // Focus on the new item.
                    $('.explorer-resource-section-listing-item:last .explorer-resource-objective').focus();
                }, 20);

                //newCollectionItem.set('selected', true);
                this.props.openDrawer(newCollectionItem);

                /*var newObjective = new OC.explorer.Objective({
                    description: 'New objective',
                    resources: [],
                    issue: {
                        id: null, host_id: null, message: null
                    }
                });

                var view = this;
                OC.appBox.saving();

                view.props.objectives.add(newObjective);

                newObjective.save(null, {
                    attrs: {unit_id: this.props.id},
                    success: function(model){
                        view.props.objectives.sync('update', model, {
                            success: OC.appBox.saved
                        });
                        
                        // Highlight the last objective AFTER rendering completion.
                        setTimeout(function(){
                            OC.explorer.resetPreHeights();
                            //$('.explorer-resource-objective-section:last').addClass('new');
                        }, 100);
                    }
                });*/
            },
            open: function() {
                this.props.openDrawer(this.props.collection.at(0));
            },

            renderItem: function(item) {
                return OC.explorer.ModuleSectionItemWrapper({
                    key: item.id,
                    title: item.get('title'),
                    model: item,
                    collection: this.props.collection,
                    openDrawer: this.props.openDrawer,
                    drawerOpen: this.props.drawerOpen
                });
            },
            render: function(){
                if (this.props.type === 'collection'){
                    var sectionTitle;
                    if (this.props.title == 'Objectives'){
                        sectionTitle = React.DOM.div({className: 'explorer-resource-listing-labels', key: 0}, [
                            React.DOM.div({className: 'explorer-resource-listing-labels-pre', key: 0}, ''),
                            React.DOM.div({className: 'explorer-resource-listing-labels-header', key: 1}, [
                                React.DOM.div({className: 'explorer-resource-listing-labels-header-key' + (this.props.drawerOpen ?
                                    ' expand' : ''), key: 0},
                                    React.DOM.span({className: 'explorer-resource-listing-label'}, 'Objective / Skill')
                                ),
                                React.DOM.div({className: 'explorer-resource-listing-labels-header-fill' + (this.props.drawerOpen ?
                                    ' hide' : ''), key: 1},
                                    React.DOM.span({className: 'explorer-resource-listing-label'}, 'Information')
                                )
                            ])
                        ]);
                    } else {
                        sectionTitle = React.DOM.div(
                            {className: 'explorer-resource-section-listing-title', key: 0}, this.props.title);
                    }
                    return React.DOM.div({className: 'explorer-resource-section-body'}, [
                        sectionTitle,
                        React.DOM.div({className: 'explorer-resource-section-listing-items', key: 1},
                           this.props.collection.map(this.renderItem)),
                        React.DOM.div({className: 'explorer-resource-listing-actions', key: 2},
                            React.DOM.button({
                                id: 'new-item',
                                onClick: this.addItem
                            }, '+ Add new')
                        )
                    ]);
                } else if (this.props.type === 'contextual') {
                    return React.DOM.div({className: 'explorer-resource-section-body'},
                        React.DOM.div({
                            className: 'explorer-resource-section-contextual-listing-title' + (this.props.collection.at(
                                0).get('selected') ? ' selected' : ''),
                            onClick: this.open
                        }, this.props.title)
                    );
                }
            }
        }),

        /*ModuleObjectives: React.createClass({
            mixins: [BackboneMixin],
            componentWillReceiveProps: function(nextProps){
                if (nextProps.collection instanceof Backbone.Collection)
                    this.wrapper.collection = nextProps.collection;
            },
            renderObjective: function(objective){
                return OC.explorer.ObjectiveWrapper({
                    model: objective,
                    objectives: this.getCollection(),
                    openDrawer: this.props.openDrawer
                });
            },
            render: function(){
                return React.DOM.div({className: 'explorer-resource-section-body'}, [
                    React.DOM.div({className: 'explorer-resource-listing-labels'}, [
                        React.DOM.div({className: 'explorer-resource-listing-labels-pre'}, ''),
                        React.DOM.div({className: 'explorer-resource-listing-labels-header'}, [
                            React.DOM.div({className: 'explorer-resource-listing-labels-header-key' + (this.props.openDrawer ?
                                ' expand' : '')}, [
                                React.DOM.span({className: 'explorer-resource-listing-label'}, 'Objective / Skill')
                            ]),
                            React.DOM.div({className: 'explorer-resource-listing-labels-header-fill' + (this.props.openDrawer ?
                                ' hide' : '')}, [
                                React.DOM.span({className: 'explorer-resource-listing-label'}, 'Information')
                            ])
                        ])
                    ]),
                    React.DOM.div({className: 'explorer-resource-objective-sections'},
                        this.getCollection().models.map(this.renderObjective))
                ]);
            }
        }),*/


        /************************END OF MODULE SCAFFOLD VIEWS**********************/
        /*
        ObjectiveWrapper: React.createClass({
            _backboneForceUpdate: function() {
                this.forceUpdate();
            },

            bindProps: function() {
                [this.props.model].map(function(model){
                    model.on('add change remove', this._backboneForceUpdate, this);
                }.bind(this));
            },
            
            componentDidMount: function() {
                this.bindProps();
            },

            componentWillUnmount: function() {
                [this.props.model].map(function(model){
                    model.off('add change remove', this._backboneForceUpdate, this);
                }.bind(this));
            },

            getInitialState: function(){
                return {selected: false};
            },

            setReady: function(){
                if (this.props.objective.get('ready') === undefined) {
                    if (this.props.objective.get('issue').host_id !== null){
                        this.props.objective.set('ready', false);
                    } else this.props.objective.set('ready', true);
                }
            },
            //setMessage: function(){
            //    if (this.props.objective.get('message') === undefined) {
            //        if (this.props.objective.get('issue'))
            //            this.props.objective.set('message', this.props.objective.get('issue')['message']);
            //        else
            //            this.props.objective.set('message', null);
            //    }
            //},
            changeMessage: function(event) {
                var issue = this.props.objective.get('issue');
                issue['message'] = event.target.value;

                this.props.objective.set('issue', issue);
            },
            saveMessage: function(event){
                OC.appBox.saving();
                
                this.turnOffFocus();

                this.props.objective.set('statusPersist', false);
                this.props.objective.set('statusShow', false);

                //this.props.objective.set('message', this.props.objective.get('message'));
                this.props.objective.save(null, {
                    attrs: {'message': this.props.objective.get('issue')['message']},
                    success: function(){
                        OC.appBox.saved();
                    }
                });
            },

            //persist: function(){
            //    this.props.objective.set('statusPersist', true);
            //},
            //letGo: function(){
            //    if (! $('.light-popup-background').hasClass('show-popup-background')){
            //        //this.props.objective.set('statusPersist', false);
            //        //this.props.objective.set('statusShow', false);
            //    }
            //},
            makeReady: function(){
                var props = this.props;

                if (props.objective.get('ready') !== true){
                    OC.appBox.saving();

                    props.objective.set('ready', true);
                    props.objective.save(null, {
                        attrs: {'ready': true},
                        success: function(){
                            OC.appBox.saved();
                        }
                    });
                }

                
            },
            makeUnready: function(event){
                var props = this.props;

                if (props.objective.get('ready') !== false){
                    OC.appBox.saving();

                    props.objective.set('ready', false);
                    props.objective.save(null, {
                        attrs: {'ready': false},
                        success: function(){
                            OC.appBox.saved();
                        }
                    });
                }

                $('.light-popup-background').addClass('show-popup-background');

                this.turnOnFocus();
                //$('.light-popup-background').click(function(event){
                //    OC.explorer.clearStatusFocus(false);
                //    props.objective.set('statusShow', false);
                //    props.objective.set('statusPersist', false);
                //});

                event.stopPropagation();
                return false;
            },
            turnOnFocus: function(event) {
                $('.light-popup-background').addClass('show-popup-background');

                var props = this.props;
                $('.light-popup-background').click(function(event){
                    OC.explorer.clearStatusFocus(false);
                    props.objective.set('statusShow', false);
                    props.objective.set('statusPersist', false);
                });
            },
            turnOffFocus: function(){
                OC.explorer.clearStatusFocus();
                this.props.objective.set('statusPersist', false);
            },

            setStatusProps: function(){
                //this.props.model.set('statusPersist', false);
                //this.props.model.set('statusShow', false);
                //this.props.model.set('selected', false);
                //this.props.model.set('ready', true);
                //this.props.model.set('statusPosition', {
                //    top: 0,
                //    left: 0
                //});
            },
            componentWillMount: function(){
                this.setStatusProps();
            },
            //componentDidUpdate: function(){
            //    if (!this.props.model.has('statusShow'))
            //        this.setStatusProps();

            //    this.bindProps();
            //},
            toggleObjectiveStatus: function(event){
                console.log('aaayyyaaa!!');
                var pre = $(event.target);

                this.props.model.set('statusPosition', {
                    top: pre.offset().top,
                    left: pre.offset().left + (pre.width() / 2) + 7
                });

                var props = this.props;
                
                props.model.set('statusShow', !props.model.get('statusShow'));

                if (props.model.get('statusShow')){
                    // Clicking anywhere on the body except the box should close this.
                    $('body').unbind('click');
                    $('body').click(function(event){
                        props.model.set('statusShow', false);

                        //event.preventDefault();
                        //return false;
                    });
                }

                event.stopPropagation();
                return false;
            },

            openDrawer: function() {
                this.props.openDrawer(this.props.model);
            },

            render: function(){
                return React.DOM.div(
                    {
                        className: 'explorer-resource-objective-section' + (
                            this.props.model.get('selected') ? ' selected' : ''),
                        onClick: this.openDrawer
                    }, [
                    React.DOM.div({
                        className: 'explorer-resource-listing-body-pre' + (
                            this.props.model.get('ready') === undefined ? (
                                this.props.model.get('issue').host_id !== null ? ' has-issue': '') : (
                                this.props.model.get('ready') ? '' : ' has-issue')
                            ),
                        onClick: this.toggleObjectiveStatus
                        //onMouseLeave: this.hideObjectiveStatus
                    }, ''),
                    React.DOM.div({className: 'explorer-resource-listing-body-content'}, [
                        React.DOM.div({className: 'explorer-resource-listing-body-content-key' + (
                            this.props.drawerView ? ' expand' : '')}, [
                            OC.explorer.ObjectiveView({model: this.props.model})
                        ]),
                        React.DOM.div({className: 'explorer-resource-listing-body-content-fill' + (
                            this.props.drawerView ? ' hide' : '')}, [
                        ])
                    ]),
                    OC.explorer.Status({
                        objective: this.props.model,
                        persist: this.props.model.get('statusPersist'),
                        show: this.props.model.get('statusShow'),
                        position: this.props.model.get('statusPosition'),
                        makeReady: this.makeReady,
                        makeUnready: this.makeUnready
                    })
                ]);
            }
        }),*/

        ModuleSectionItemWrapper: React.createClass({
            getInitialState: function(){
                return {selected: false};
            },
            componentDidMount: function() {
                this.setReady();
            },
            setReady: function(){
                if (this.props.model.get('ready') === undefined) {
                    if (this.props.model.get('issue').host_id !== null){
                        this.props.model.set('ready', false);
                    } else this.props.model.set('ready', true);
                }
            },

            changeMessage: function(event) {
                var issue = this.props.model.get('issue');
                issue['message'] = event.target.value;

                this.props.model.set('issue', issue);
            },

            saveMessage: function(event){
                OC.appBox.saving();
                
                this.turnOffFocus();

                this.props.model.set('statusPersist', false);
                this.props.model.set('statusShow', false);

                this.props.model.save(null, {
                    attrs: {'message': this.props.model.get('issue')['message']},
                    success: function(){
                        OC.appBox.saved();
                    }
                });
            },

            makeReady: function(){
                var props = this.props;

                if (props.objective.get('ready') !== true){
                    OC.appBox.saving();

                    props.model.set('ready', true);
                    props.model.save(null, {
                        attrs: {'ready': true},
                        success: function(){
                            OC.appBox.saved();
                        }
                    });
                }
            },

            makeUnready: function(event){
                var props = this.props;

                if (props.model.get('ready') !== false){
                    OC.appBox.saving();

                    props.model.set('ready', false);
                    props.model.set('statusShow', true);
                    props.model.save(null, {
                        attrs: {'ready': false},
                        success: function(){
                            OC.appBox.saved();
                        }
                    });
                }

                $('.light-popup-background').addClass('show-popup-background');

                this.turnOnFocus();

                event.stopPropagation();
                return false;
            },

            turnOnFocus: function(event) {
                $('.light-popup-background').addClass('show-popup-background');

                var props = this.props;
                $('.light-popup-background').click(function(event){
                    OC.explorer.clearStatusFocus(false);
                    props.model.set('statusShow', false);
                    props.model.set('statusPersist', false);
                });
            },

            turnOffFocus: function(){
                OC.explorer.clearStatusFocus();
                this.props.model.set('statusPersist', false);
            },

            componentWillMount: function(){
                //this.setStatusProps();
            },

            toggleStatus: function(event){
                var pre = $(event.target);

                this.props.model.set('statusPosition', {
                    top: pre.offset().top,
                    left: pre.offset().left + (pre.width() / 2) + 7
                });

                var props = this.props;
                
                props.model.set('statusShow', !props.model.get('statusShow'));

                if (props.model.get('statusShow')){
                    // Clicking anywhere on the body except the box should close this.
                    $('body').unbind('click');
                    $('body').click(function(event){
                        if (event.target.type !== 'textarea')
                            props.model.set('statusShow', false);
                    });
                }

                event.stopPropagation();
                return false;
            },

            openDrawer: function() {
                this.props.openDrawer(this.props.model);
            },

            render: function(){
                return React.DOM.div({
                    className: 'explorer-resource-section-listing-item' + (
                        this.props.model.get('selected') ? ' selected' : ''),
                    onClick: this.openDrawer
                }, [
                    React.DOM.div({
                        className: 'explorer-resource-section-listing-item-pre' + (
                            this.props.model.get('ready') === undefined ? (
                                this.props.model.get('issue').host_id !== null ? ' has-issue': '') : (
                                this.props.model.get('ready') ? '' : ' has-issue')
                            ),
                        onClick: this.toggleStatus,
                        key: 0
                    }, ''),
                    
                    React.DOM.div({className: 'explorer-resource-section-listing-item-content', key: 1}, [
                        React.DOM.div({className: 'explorer-resource-section-listing-item-content-key' + (
                            this.props.drawerOpen ? ' expand' : ''), key: 0},
                            OC.explorer.ModuleSectionItem({
                                model: this.props.model,
                                openDrawer: this.openDrawer,
                            })
                        ),
                        React.DOM.div({className: 'explorer-resource-section-listing-item-content-fill' + (
                            this.props.drawerOpen ? ' hide' : ''), key: 1}, null)
                    ]),

                    OC.explorer.Status({
                        key: 2,
                        model: this.props.model,
                        persist: this.props.model.get('statusPersist'),
                        show: this.props.model.get('statusShow'),
                        position: this.props.model.get('statusPosition'),
                        makeReady: this.makeReady,
                        makeUnready: this.makeUnready,
                        turnOnFocus: this.turnOnFocus
                    })

                ]);
            }
        }),

        /*Objective: Backbone.Model.extend({
            id: '',
            description: '',
            sync: function(method, model, options){
                function success(response){ return options.success(response); }

                switch(method) {
                    case 'update':
                        if (_.has(options, 'attrs')){
                            if (_.has(options.attrs, 'ready')){
                                return OC.api.curriculum.issues.update(
                                    {'host_id': this.get('id'), 'ready': options.attrs.ready}, success);
                            } else if (_.has(options.attrs, 'message')){
                                return OC.api.curriculum.issues.update(
                                    {'id': this.get('issue')['id'], 'message': options.attrs.message}, success);
                            } else if (_.has(options.attrs, 'meta')){
                                meta = {};
                                meta[options.attrs.meta] = this.get('meta')[options.attrs.meta];

                                return OC.api.curriculum.objective.update(
                                    {'id': this.get('id'), 'meta': meta}, success);
                            }
                        }
                        return OC.api.curriculum.objective.update(
                            {'id': this.get('id'), 'description': this.get('description')}, success);
                    case 'create':
                        return OC.api.curriculum.objective.create(
                            {'description': this.get('description'), 'unit_id': options.attrs.unit_id}, success);
                }
            }
        }),*/

        SectionItem: Backbone.Model.extend({
            id: '',
            description: '',
            meta: {},
            sync: function(method, model, options){
                function success(response){ return options.success(response); }
                
                switch(method) {
                    case 'update':
                        if (_.has(options, 'attrs')){
                            if (_.has(options.attrs, 'ready')){
                                return OC.api.curriculum.issues.update(
                                    {'host_id': this.get('id'), 'ready': options.attrs.ready}, success);
                            } else if (_.has(options.attrs, 'message')){
                                return OC.api.curriculum.issues.update(
                                    {'id': this.get('issue')['id'], 'message': options.attrs.message}, success);
                            } else if (_.has(options.attrs, 'meta')){
                                meta = {};
                                meta[options.attrs.meta] = this.get('meta')[options.attrs.meta];

                                return OC.api.curriculum.sectionItem.update(
                                    {'id': this.get('id'), 'meta': meta}, success);
                            }
                        }

                        return OC.api.curriculum.sectionItem.update(
                            {'id': this.get('id'), 'description': this.get('description')}, success);

                    case 'create':
                        return OC.api.curriculum.sectionItem.create(
                            {'description': this.get('description'), 'section_id': this.get('section_id')}, success);
                }
            }
        }),

        /*ObjectiveView: React.createClass({
            mixins: [BackbonerMixin],
            save: function(event){
                newDescription = $(event.target).text();

                if (this.props.model.get('description') !== newDescription){
                    OC.appBox.saving();

                    this.props.model.set('description', newDescription);
                    this.props.model.save(null, {
                        success: function(){
                            OC.appBox.saved();
                        }
                    });
                }
            },
            render: function(){
                return React.DOM.div({
                    className: 'explorer-resource-objective',
                    contentEditable: true,
                    title: this.props.model.get('description'),
                    onBlur: this.save
                }, this.props.model.get('description'));
            }
        }),*/

        ModuleSectionItem: React.createClass({
            save: function(event){
                newDescription = $(event.target).text();

                if (this.props.model.get('description') !== newDescription){
                    OC.appBox.saving();

                    this.props.model.set('description', newDescription);
                    this.props.model.save(null, {
                        success: function(){
                            OC.appBox.saved();
                        }
                    });
                }
            },
            render: function(){
                return React.DOM.div({
                    className: 'explorer-resource-objective',
                    contentEditable: true,
                    title: this.props.model.get('description'),
                    onBlur: this.save
                }, this.props.model.get('description'));
            }
        }),


        /************************END OF MODULE OBJECTIVE VIEWS**********************/

        Context: React.createClass({
            componentDidMount: function() {
                /*$(this.getDOMNode()).nanoScroller({
                    paneClass: 'scroll-pane',
                    sliderClass: 'scroll-slider',
                    contentClass: 'scroll-content',
                    flash: true
                });*/
            },

            renderSections: function(){
                var props = this.props;
                var metaLength = _.keys(this.props.item.get('meta')).length;
                if (metaLength > 0){
                    var rawSections = [], sections = [], metaItem;
                    
                    _.each(this.props.item.get('meta'), function(value, key){
                        metaItem = {};
                        metaItem[key] = value;

                        rawSections.push(metaItem);
                    });

                    sections = _.sortBy(rawSections, function(rawSection){
                        return OC.explorer.metaOrder.indexOf(_.keys(rawSection)[0]);
                    });


                    var key, value;
                    return _.map(sections, function(section){
                        key = _.keys(section)[0];
                        value = section[key];

                        return OC.explorer.Meta({
                            key: key,
                            title: _.has(OC.explorer.metaTitles, key) ? OC.explorer.metaTitles[key] : '(Unnamed)',
                            body: value,
                            objective: props.item
                        });
                    });
                } else {
                    return null;
                }
            },

            renderResourceSet: function(resourceSet){
                return OC.explorer.ResourcesView({
                    key: resourceSet.id ? resourceSet.id : 0,
                    id:  resourceSet.id,
                    collection: resourceSet.resources,
                    title: resourceSet.title,
                    item: this.props.item,
                    parent: this.props.item.get('parent')
                });
            },

            render: function(){
                return React.DOM.div({
                    className: 'explorer-resource-module-support-body'/* + 'scrollable-block'*/,
                    style: {
                        height: $('.explorer-body-stage').height() - (parseInt($(
                        '.explorer-body-stage-spread').css('padding-top'), 10) * 2) - 40
                    }
                }, this.props.item ? [
                    React.DOM.div({className: 'explorer-resource-module-support-title', key: 0}, this.props.item.get('description')),
                    React.DOM.div({className: 'explorer-resource-module-support-sections', key: 1}, this.renderSections()),
                    React.DOM.div({className: 'explorer-resource-module-support-resourcesets', key: 2}, this.props.item.get(
                        'resource_sets').map(this.renderResourceSet))
                ]: null);
            }
        }),

        Meta: React.createClass({
            getInitialState: function(){
                return {body: this.props.body};
            },
            componentDidMount: function(){
                $(this.getDOMNode()).on('change keydown keypress input', '*[data-placeholder]', function() {
                    if (this.textContent) {
                        this.setAttribute('data-div-placeholder-content', 'true');
                    }
                    else {
                        this.removeAttribute('data-div-placeholder-content');
                    }
                });
            },
            componentWillReceiveProps: function(nextProps){
                this.setState({body: nextProps.body });
            },
            componentDidUpdate: function(){
                $(this.getDOMNode).find('.explorer-resource-module-support-section-body').trigger('change');
            },
            save: function(event){
                newValue = $(event.target).text();
                currentMetas = this.props.objective.get('meta');

                this.setState({body: newValue});

                if (currentMetas[this.props.key] !== newValue){
                    OC.appBox.saving();

                    currentMetas[this.props.key] = newValue;

                    this.props.objective.set('meta', currentMetas);
                    this.props.objective.save(null, {
                        attrs: {'meta': this.props.key},
                        success: function(){
                            OC.appBox.saved();
                        }
                    });
                }
            },
            render: function(){
                return React.DOM.div({className: 'explorer-resource-module-support-section explorer-resource-module-support-section-' + this.props.key}, [
                    React.DOM.div({className: 'explorer-resource-module-support-section-title', key: 0}, this.props.title),
                    React.DOM.div({
                        className: 'explorer-resource-module-support-section-body',
                        contentEditable: true,
                        onBlur: this.save,
                        'data-placeholder': this.state.body && this.state.body.length > 0 ? '' : '(add something)',
                        key: 1
                    }, this.state.body && this.state.body.length > 0 ? this.state.body : ''),
                ]);
            }
        }),

        Resources: Backbone.Collection.extend({
            model: OC.explorer.Resource
        }),

        ResourcesView: React.createClass({
            _forceUpdate: function() {
                this.forceUpdate();
            },
            componentDidMount: function() {
                this.props.collection.on('add change remove', this._forceUpdate, this);
            },
            componentWillMount: function() {
                if (! _.has(this.props.collection, 'models')){
                    this.props.collection = new OC.explorer.Resources();
                }
            },
            addResource: function(event){
                var view = this;
                OC.shareNewClickHandler(event, {
                    title: 'Add a resource',
                    message: 'What would you like to share today?',
                    urlTitle: 'Add a website URL',
                    addMeta: false,
                    sent: view.resourceSent,
                    callback: view.resourceAdded,
                    urlPostURL: '/curriculum/api/section-item-resources/add-url/',
                    existingPostURL:'/curriculum/api/section-item-resources/add-existing/',
                    uploadPostURL:'/curriculum/api/section-item-resources/add-upload/',
                    toAppendFormData: {
                        section_item_id: this.props.item.get('id'),
                        section_item_resources_id: this.props.id
                    }
                });
            },
            resourceAdded: function(response, resourceReference){
                resourceReference.set(response.resource);

                OC.appBox.saved();

                OC.explorer.resetPreHeights();
            },
            resourceSent: function(resource){
                OC.appBox.saving();

                var newResource = new OC.explorer.Resource(resource);
                this.props.collection.add(newResource);

                return newResource;
            },
            suggest: function(event){
                var view = this;

                suggestionsPopup = OC.customPopup('.explorer-suggest-resources-dialog');
                var resourcesBody = $('.explorer-suggest-resources-body', suggestionsPopup.dialog),
                    resourcesBodyListing = $('.explorer-suggest-resources-listing', resourcesBody);

                resourcesBodyListing.removeClass('failure');
                resourcesBody.addClass('loading');
            
                $.get('/curriculum/api/section-item/' + this.props.item.get('id') + '/suggest-resources/',
                    function(response){
                        resourcesBodyListing.html('');

                        if (response.status === 'false'){
                            resourcesBodyListing.addClass('failure');
                            resourcesBodyListing.html(response.message);
                        } else {
                            // Cache the newly downloaded resources.
                            OC.explorer.cachedResources = _.union(
                                OC.explorer.cachedResources, response.resources);

                            var newResource, appendedResource;

                            _.each(response.resources, function(resource){
                                newResource = OC.explorer.suggestionTemplate(resource);
                                resourcesBodyListing.append(newResource);
                            });
                            appendedResources = $('.explorer-suggest-resources-listing-item',
                                resourcesBodyListing);

                            $('.explorer-suggest-resources-listing-item-action-keep', appendedResources).click(
                                view.keepResource);
                            $('.explorer-suggest-resources-listing-item-action-hide', appendedResources).click(
                                function(event){
                                    $(event.target).parents('.explorer-suggest-resources-listing-item').fadeOut('show');
                            });
                        }

                        resourcesBody.removeClass('loading');
                }, 'json');

            },
            keepResource: function(event){
                var resourceItem = $(event.target).parents('.explorer-suggest-resources-listing-item');
                    resourceID = resourceItem.attr('id').substring(9);

                // Fetch the resource from the cached list of resource objects.
                var resource = OC.explorer.cachedResources[resourceID],
                    view = this;

                var serializedPost = {
                    objective_id: this.props.id,
                    resource_collection_ID: resourceID
                };

                $.post('/curriculum/api/section-item-resources/add-existing/', serializedPost,
                    function(response){
                        var newResource = new OC.explorer.Resource(response.resource);
                        view.props.item.get('resources').push(newResource);
                    }, 'json');
                
                resourceItem.fadeOut('fast');
            },
            renderResource: function(resource){
                return OC.explorer.ResourceView({
                    model: resource,
                    collection: this.props.collection,
                    objective: this.props.objective,
                    key: resource.id
                });
            },
            render: function() {
                return React.DOM.div({className: 'explorer-resource-module-support-section explorer-resource-module-support-section-resources'}, [
                    React.DOM.div({className: 'explorer-resource-module-support-section-title', key: 0}, this.props.title ? this.props.title : 'Resources'),
                    React.DOM.div({className: 'explorer-resource-items', key: 1},
                        this.props.collection.map(this.renderResource)),

                    this.props.parent ? React.DOM.button({
                        className: 'explorer-resource-actions-suggest',
                        onClick: this.suggest,
                        key: 2
                    }, 'SUGGEST MORE RESOURCES') : null,

                    React.DOM.div({className: 'explorer-resource-listing-body-resource-actions', key: 3},
                        React.DOM.button({
                            className: 'explorer-resource-actions-add',
                            onClick: this.addResource
                        }, '+ Add resource')
                    )
                ]);
            }
        }),

        Resource: Backbone.Model.extend({
            id: '',
            title: '',
            url: '',
            sync: function(method, model, options){
                function success(response){ return options.success(response); }

                switch(method) {
                    case 'update':
                        if (_.has(options, 'attrs')){
                            if (_.has(options.attrs, 'remove_resource_from')){
                                return OC.api.curriculum.resources.delete(
                                    {'resource_id': this.get('id'), 'id': options.attrs.remove_resource_from.get('id')}, success);
                            }
                        }
                }
            }
        }),

        ResourceView: React.createClass({
            removeResource: function(){
                OC.appBox.saving();
                this.props.collection.remove(this.props.model);

                this.props.model.save(null, {
                    attrs: {'remove_resource_from': this.props.objective},
                    success: function(){
                        OC.appBox.saved();
                        OC.explorer.resetPreHeights(true);
                    }
                });
            },
            openSesame: function(event){
                OC.explorer.openResourcePreview(
                    this.props.model.get('id'),
                    this.props.model.get('title'),
                    this.props.model.get('user_thumbnail'),
                    this.props.model.get('url'),
                    this.props.model.get('type')
                );

                event.stopPropagation();
                event.preventDefault();
                return false;
            },
            render: function(){
                return React.DOM.div({className: 'explorer-resource-item'}, [
                    React.DOM.div({className: 'explorer-resource-item-thumbnail-wrapper', key: 0},
                        React.DOM.div({
                            className: 'explorer-resource-item-thumbnail',
                            style: {
                                backgroundImage: 'url(\'' + this.props.model.get('thumbnail') + '\')'
                            }
                        }, React.DOM.div({
                            className: 'thumbnail-silhouette thumbnail-' + this.props.model.get('type')
                            })
                        )
                    ),
                    React.DOM.div({className: 'explorer-resource-item-content', key: 1}, [
                        React.DOM.div({className: 'explorer-resource-item-content-body', key: 0}, [
                            React.DOM.div({className: 'explorer-resource-item-content-title', key: 0},
                                React.DOM.a({
                                    href: this.props.model.get('url'), target: '_blank',
                                    onClick: _.contains(
                                        ['pdf', 'document', 'reference'], this.props.model.get('type')) ? this.openSesame : null
                                },  this.props.model.get('title'))
                            ),
                            React.DOM.div({className: 'explorer-resource-item-content-caption', key: 1}, '')
                        ]),
                        React.DOM.div({className: 'explorer-resource-item-content-actions', key: 1},
                            React.DOM.div({
                                className: 'explorer-resource-item-content-action-delete',
                                onClick: this.removeResource,
                                title: 'Remove resource'
                            })
                        )
                    ])
                ]);
            }
        }),

        /************************END OF MODULE CONTEXT VIEWS**********************/


        Status: React.createClass({
            _forceUpdate: function() {
                this.forceUpdate();
            },
            componentDidMount: function() {
                //this.setReady();
                //this.setMessage();

                this.props.model.on('add change remove', this._forceUpdate, this);
            },
            /*componentDidUpdate: function() {
                this.setReady();
                //this.setMessage();

                this.props.objective.off('add change remove', this._forceUpdate, this);
                this.props.objective.on('add change remove', this._forceUpdate, this);
            },*/
            focus: function(event){
                return this.props.turnOnFocus(event);
            },
            componentWillUnmount: function() {
                // Ensure that we clean up any dangling references when the component is destroyed.
                this.props.model.off('add change remove', this._forceUpdate, this);
                        },
            render: function(){
                return React.DOM.div({
                    className: 'objective-status-dialog' + (
                        this.props.model.get('statusPersist') ? ' persist' : '' ) + (
                        this.props.model.get('statusShow') ? ' show' : '' ),
                    
                    /*onMouseOver: this.persist,
                    onMouseLeave: this.letGo,*/
                    style: this.props.model.get('statusPosition')
                }, [
                    React.DOM.div({className: 'objective-status-pointer', key: 0}, ''),
                    React.DOM.div({className: 'objective-status-body', key: 1}, [
                        React.DOM.ul({className: 'objective-status-options', key: 0}, [
                            React.DOM.li({className: 'objective-status-option', key: 0},
                                React.DOM.button({
                                    className: 'objective-ready-status' + (
                                        this.props.model.get('ready') ?  ' selected' : ''),
                                    onClick: this.props.makeReady,
                                }, 'It\'s perfect!')
                            ),
                            React.DOM.li({className: 'objective-status-option', key: 1},
                                React.DOM.button({
                                    className: 'objective-unready-status' + (
                                        this.props.model.get('ready') ? '' : ' selected'),
                                    onClick: this.props.makeUnready,
                                }, 'Needs work')
                            )
                        ]),
                        React.DOM.div({className: 'objective-status-unready-body' + (
                            this.props.model.get('ready') ? '' : ' show'), key: 1}, [
                            React.DOM.textarea({
                                name: 'unready-message',
                                placeholder: 'Add a note...',
                                defaultValue: this.props.model.get('issue')['message'],
                                onChange: this.changeMessage,
                                onFocus: this.focus,
                                key: 0
                            }),
                            React.DOM.div({className: 'action-button', onClick: this.saveMessage, key: 1}, 'Done')
                        ]),
                    ])
                ]);
            }
        }),

        CurriculumIssues: React.createClass({
            renderCurriculumIssues: function(unit){
                return React.DOM.div({className: 'explorer-overview-issues-set'}, [
                    OC.explorer.ModuleHeader({
                        title: unit.unitTitle.toUpperCase(),
                        textbookTitle: unit.textbookTitle.toUpperCase(),
                        thumbnail: unit.textbookThumbnail,
                        pageView: false
                    }),
                    OC.explorer.Issues({objectives: unit.objectives})
                ]);
            },
            render: function(){
                return React.DOM.div({className: 'explorer-overview-issues'},
                    this.props.units.map(this.renderCurriculumIssues));
            }
        }),

        Issues: React.createClass({
            renderIssue: function(objective){
                return OC.explorer.Issue({key: objective.id, objective: objective});
            },
            render: function(){
                return React.DOM.div({className: 'explorer-overview-issues-set-item'}, [
                    React.DOM.div({className: 'explorer-resource-listing-labels'}, [
                        React.DOM.div({className: 'explorer-resource-listing-labels-header-key'}, [
                            React.DOM.span({className: 'explorer-resource-listing-label'}, 'Objective / Skill'),
                        ]),
                        React.DOM.div({className: 'explorer-resource-listing-labels-header-fill'}, [
                            React.DOM.span({className: 'explorer-resource-listing-label'}, 'Issues'),
                        ]),
                    ]),

                    React.DOM.div({className: 'explorer-issue-listing-body'}, [
                        React.DOM.div({className: 'explorer-issue-listing-items'},
                            this.props.objectives.map(this.renderIssue)),
                    ])
                ]);
            }
        }),

        Issue: React.createClass({
            openIssue: function(event){
                var props = this.props;
                event.target = $('a#unit-' + this.props.objective.get('unit_id')).get(0);
                OC.explorer.openUnit(event, function(){
                    var toScrollToUnit = $('div[title="' + props.objective.get('description') + '"]');
                    $('.explorer-body-stage').animate(
                        { scrollTop: toScrollToUnit.offset().top - 100 }, 1000);
                });
            },
            render: function(){
                return React.DOM.div({className: 'explorer-issue-listing-items-item',
                        onClick: this.openIssue
                    }, [
                    React.DOM.div({className: 'explorer-issue-listing-item-content-fill'}, [
                        React.DOM.div({className: 'explorer-issue-listing-item-objective'},
                            this.props.objective.get('description'))
                    ]),
                    React.DOM.div({className: 'explorer-issue-listing-item-content-key'}, [
                        React.DOM.div({className: 'explorer-issue-listing-item-message'},
                            this.props.objective.get('issue')['message'] ? this.props.objective.get('issue')['message'] : '')
                    ])
                ]);
            }
        }),

        /************************END OF ISSUE RELATED VIEWS**********************/


        initSideNavigation: function(){
            // Learning outcomes / Standards.
            /*var i, j, LOCategories = _.keys(OC.explorer.hctLOs), menu,
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
                    'class': 'explorer-body-side-menu explorer-body-side-menu-light'
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

            $('li.learning-outcomes').append(menu);*/






        },

        /*initActions: function(){
            $('button#new-objective').click(function(event){
                // Get currently visible unit.
                var selectedModule = $('li.textbooks .explorer-body-side-menu-light li.selected a'),
                    title = selectedModule.text(),
                    textbookTitle = selectedModule.parents('ul:first').parent().find('a:first').text();

                var newObjective = new OC.explorer.Objective({
                    description: 'New objective',
                    resources: [],
                });

                var unit = _.findWhere(_.findWhere(OC.explorer.textbooks, {
                    title: textbookTitle}).units, {title: title}),
                    unitObjectives = unit.objectives;

                OC.appBox.saving();
                newObjective.save(null, {
                    attrs: {unit_id: unit.id},
                    success: function(model){
                        unit.objectives.add(newObjective);
                        
                        unitObjectives.sync('update', model, {
                            success: OC.appBox.saved
                        });
                        
                        // Highlight the last objective AFTER rendering completion.
                        setTimeout(function(){
                            OC.explorer.resetPreHeights();
                            $('.explorer-resource-objective-section:last').addClass('new');
                        }, 100);
                    }
                });
            });
        },*/

        resetPreHeights: function(reverse) {
            // Set height of pre-columns to 100% of parent - bad CSS problem.
            var objectivePres = $('.explorer-resource-section-listing-item-pre, .explorer-resource-listing-labels-pre');

            var i, objectivePre;
            for (i = 0; i < objectivePres.length; i++){
                objectivePre = $(objectivePres[i]);

                if (reverse && reverse === true){
                    objectivePre.height(objectivePre.parent().find(
                        '.explorer-resource-listing-body-content').height());
                } else {
                    objectivePre.height(objectivePre.parent().height());
                }
            }
        },

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

        clearStatusFocus: function(){
            $('.light-popup-background').removeClass('show-popup-background');
        },

        metaTitles: {
            'methodology': 'Methodology',
            'how': 'The \'How\'',
            'wordwall': 'Word Wall Must Haves',
            'prerequisites': 'Pre-requisites',
            'ccss': 'Common Core State Standards',
            'content': 'Standards for Mathematical Content',
            'practices': 'Standards for Mathematical Practice',
            'big-idea': 'Big Idea',
            'essential-understandings': 'Enduring Understandings',
            'language-objectives-supports': 'Language Objectives and Supports'
        },
        metaOrder: ['methodology', 'how', 'wordwall', 'prerequisite'],

        suggestionTemplate: _.template('<div class="explorer-suggest-resources-listing-item" id="resource-<%= id %>">' +
            '<div class="explorer-suggest-resources-listing-item-thumbnail" style="background-image: url(\'<%= thumbnail %>\')"></div>' +
            '<div class="explorer-suggest-resources-listing-item-content">' +
                '<a href="<%= url %>" target="_blank" class="explorer-suggest-resources-listing-item-content-title"><%= title %></a>' +
                '<div class="explorer-suggest-resources-listing-item-content-description"><%= description %></div>' +
            '</div>' +
            '<div class="explorer-suggest-resources-listing-item-actions">' +
                '<button class="action-button explorer-suggest-resources-listing-item-action-keep">Keep</button>' +
                '<button class="action-button secondary-button explorer-suggest-resources-listing-item-action-hide">Hide</button>' +
            '</div>' +
        '</div>'),

        cachedResources: [],

        openResourcePreview: function(curriculum_resource_id, title, thumbnail, url, type){
            var previewWrapper = $('.explorer-resource-preview-wrapper');

            function close(){
                $('.popup-background').removeClass('show-popup-background');
                previewWrapper.removeClass('show');
            }

            function bindFavorite(element){
                element.unbind('click');
                element.click(function(event){
                    $.get('/curriculum/api/favorite/' + curriculum_resource_id + '/',
                        function(response){
                            element.toggleClass('favorited');
                        },
                    'json');
                });
            }

            function renderResponse(response){
                $('.explorer-resource-header-title').html(title);
                $('.explorer-resource-header-thumbnail').css(
                    {'background-image': 'url(\'' + thumbnail + '\')'});
                $('.explorer-resource-actions-open').attr('href', url);

                $('.explorer-resource-body').append(response);
                $('.explorer-resource-body').addClass('show');

                $('.explorer-resource-preview').addClass('show');

                // Bind favorite.
                bindFavorite($('.explorer-resource-actions-favorite'));
            }

            $('.popup-background').addClass('show-popup-background');
            previewWrapper.addClass('show');

            if (! _.has(OC.explorer, 'spinner')){
                var options = {
                    lines: 15, // The number of lines to draw
                    length: 6, // The length of each line
                    width: 3, // The line thickness
                    radius: 8, // The radius of the inner circle
                    corners: 0.9, // Corner roundness (0..1)
                    rotate: 75, // The rotation offset
                    direction: 1, // 1: clockwise, -1: counterclockwise
                    color: '#fff', // #rgb or #rrggbb or array of colors
                    speed: 1, // Rounds per second
                    trail: 79, // Afterglow percentage
                    shadow: false, // Whether to render a shadow
                    hwaccel: false, // Whether to use hardware acceleration
                    className: 'spinner', // The CSS class to assign to the spinner
                    zIndex: 12, // The z-index (defaults to 2000000000)
                    top: '50%', // Top position relative to parent
                    left: '50%' // Left position relative to parent
                };
                OC.explorer.spinner = new Spinner(options).spin($('.explorer-resource-preview-wrapper').get(0));
            
                // Also setup the tooltips.
                $('.explorer-resource-actions div, a').tipsy({gravity: 'w'});
            } else OC.explorer.spinner.spin($('.explorer-resource-preview-wrapper').get(0));

            // Fetch the resource from the server.
            $('.explorer-resource-body').html('');

            var sectionTemplate = _.template(
                '<div class="reference-preview-wrapper">' +
                    '<div class="reference-preview-thumbnail" style="background-image: url(\'<%= thumbnail %>\');"></div>' +
                    '<div class="reference-preview-contents">' +
                        '<h2><%= textbook_title %></h2>' +
                        '<h3>Chapter <%= chapter %>: <%= title %></h3>' +
                        '<h3>Section <%= section %></h3>' +
                        '<p>No digital preview available.</p>' +
                    '</div>' +
                '</div>');

            var pagesTemplate = _.template(
                '<div class="reference-preview-wrapper">' +
                    '<div class="reference-preview-thumbnail" style="background-image: url(\'<%= thumbnail %>\');"></div>' +
                    '<div class="reference-preview-contents">' +
                        '<h2><%= textbook_title %></h2>' +
                        '<h3>Pages: <%= begin %> - <%= end %></h3>' +
                        '<p>No digital preview available.</p>' +
                    '</div>' +
                '</div>');

            var excerptsTemplate = function(props){
                excerpts = _.reduce(props.excerpts, function(memo, value){
                    return memo ? memo + ', ' + value: value; });

                props._excerpts = excerpts;

                return _.template(
                '<div class="reference-preview-wrapper">' +
                    '<div class="reference-preview-thumbnail" style="background-image: url(\'<%= thumbnail %>\');"></div>' +
                    '<div class="reference-preview-contents">' +
                        '<h2><%= textbook_title %></h2>' +
                        '<h3><%= _excerpts %></h3>' +
                        '<p>No digital preview available.</p>' +
                    '</div>' +
                '</div>')(props);
            };

            var excerptTemplate = _.template(
                '<div class="reference-preview-wrapper">' +
                    '<div class="reference-preview-thumbnail" style="background-image: url(\'<%= thumbnail %>\');"></div>' +
                    '<div class="reference-preview-contents">' +
                        '<h2><%= textbook_title %></h2>' +
                        '<h3><%= excerpt %></h3>' +
                        '<p>No digital preview available.</p>' +
                    '</div>' +
                '</div>');

            if (type == 'reference'){
                $.get('/curriculum/api/reference/' + curriculum_resource_id + '/',
                    function(response){
                        OC.explorer.spinner.stop();

                        if (response.type == 'chapter-section'){
                            renderResponse(sectionTemplate(response));
                        }
                        
                        if (response.type == 'pages'){
                            renderResponse(pagesTemplate(response));
                        }
                        
                        if (response.type == 'excerpts'){
                            renderResponse(excerptsTemplate(response));
                        }

                        if (response.type == 'excerpt'){
                            renderResponse(excerptsTemplate(response));
                        }

                        $('.explorer-resource-contents').removeClass('foreign-resource');
                        $('.explorer-resource-contents').addClass('reference-resource');
                    },
                'json');
            } else {
                $.get('/curriculum/api/resource-view/' + curriculum_resource_id + '/',
                    function(response){
                        OC.explorer.spinner.stop();

                        if (type == 'pdf'){
                            OC.config.pdfjs = true;
                            $('.explorer-resource-body').addClass('pdf');
                        }
                        
                        $('.explorer-resource-contents').removeClass('reference-resource');
                        $('.explorer-resource-contents').addClass('foreign-resource');
                        renderResponse(response);
                    },
                'html');
            }

            $('.explorer-resource-actions-close').unbind('click');
            $('.explorer-resource-actions-close').click(close);

            $(document).keyup(function(event) {
                if (previewWrapper.hasClass('show')){
                    if (event.which == 27) { // 'Esc' on keyboard
                        close();
                    }
                }
            });
        }

    });

    $(document).ready(function($){
        function resizeApp(){
            $('.explorer-body-wrapper').height(
                $(window).height() - $('.explorer-header').height()
            );

            var explorerBody = $('.explorer-body-stage');
            $('.explorer-loader').css({
                top: explorerBody.offset().top,
                left: explorerBody.offset().left,
                width: explorerBody.outerWidth(),
                height: explorerBody.height()
            });
        }

        //OC.explorer.settings = new OC.explorer.Settings({drawerOpen: false});

        OC.explorer.textbooks = [];
        OC.explorer.units = [];
        OC.explorer.standards = [];

        React.renderComponent(OC.explorer.App({
            id: OC.explorer.curriculumSettings.id,
            description: OC.explorer.curriculumSettings.description,
            settings: OC.explorer.curriculumSettings,
        }), $('.explorer-body-wrapper').get(0), function(){
            $('.explorer-body-side').nanoScroller({
                paneClass: 'scroll-pane',
                sliderClass: 'scroll-slider',
                contentClass: 'scroll-content',
                flash: true
            });
            
            setTimeout(function(){
                $('li.domain-clusters > ul').addClass('hidden');
            }, 500);
            // Show on click.

            $('li.domain-clusters > a, li.textbooks > a').click(function(event){
                $(this).parent().find('.explorer-body-side-menu:first').toggleClass('hidden');

                event.stopPropagation();
                event.preventDefault();
                return false;
            });

        });

        resizeApp();
        $(window).resize(resizeApp);


        /*// Build a new Backbone'd object from textbook and chapter names.

        var i, j, k, objective, resources;
        for (i = 0; i < OC.explorer.rawTexts.length; i++){
            rawTextbook = OC.explorer.rawTexts[i];
            rawUnits = [];

            for (j = 0; j < rawTextbook.units.length; j++){
                var rawUnit = rawTextbook.units[j],
                    rawObjectives = rawUnit.objectives;
        
                objectives = _.map(
                    rawObjectives, function(ro){ return new OC.explorer.Objective(ro); });

                rawUnit['objectives'] = new OC.explorer.Objectives(objectives);
                
                rawUnit['objectives'].each(function(objective){
                    rawResources = objective.get('resources');
                    resources = _.map(
                        rawResources, function(rr){ return new OC.explorer.Resource(rr); });

                    objective.set('resources', new OC.explorer.Resources(resources));
                });

                rawUnits.push(rawUnit);
            //});
            }

            rawTextbook['units'] = rawUnits;
            OC.explorer.textbooks.push(rawTextbook);
        }

        */

        // Main grade-subject menu on home hover.
        /*OC.explorer.initGradeSubjectMenu();

        OC.explorer.initSideNavigation();

        OC.explorer.initActions();

        OC.explorer.initOverview();*/
    });
});



/*hctLOs: {
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
        },*/