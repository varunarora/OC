/*define(['jquery', 'core', 'backbone', 'underscore', 'react', 'spin', 'showdown', 'nanoscroller'], function($, OC, Backbone, _, React, Spinner, Showdown, undefined){*/
define(['react', 'core_light', 'immutable'], function(React, OC, Immutable){
    OC.api = {
        curriculum: {
            sectionItem: {
                update: function(serializedItem, callback){
                    $.post('/curriculum/api/section-item/update/', serializedItem,
                        function(response){
                            callback(response);
                        }, 'json');
                },
                create: function(description, callback){
                    $.post('/curriculum/api/section-item/create/', description,
                        function(response){
                            callback(response);
                        }, 'json');
                },
                createResourceSet: function(serializedItem, callback){
                    $.post('/curriculum/api/section-item/create-resource-set/', serializedItem,
                        function(response){
                            callback(response);
                        }, 'json');
                }
            },
            section: {
                addItem: function(serializedUnitItem, callback){
                    $.post('/curriculum/api/section-item/add-item-to-section/', serializedUnitItem,
                        function(response){
                            callback(response);
                        }, 'json');
                },
                create: function(serializedSection, callback){
                    $.post('/curriculum/api/section/create/', serializedSection,
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
                    $.post('/curriculum/api/section-item/remove-resource/', serializedObjectiveResource,
                        function(response){
                            callback(response);
                        }, 'json');
                }
            },
            textbook: {
                create: function(serializedTextbook, callback){
                    $.post('/curriculum/api/textbook/create/', serializedTextbook,
                        function(response){
                            callback(response);
                        }, 'json');
                }
            },
            unit: {
                create: function(serializedUnit, callback){
                    $.post('/curriculum/api/unit/create/', serializedUnit,
                        function(response){
                            callback(response);
                        }, 'json');
                }
            },
            settings: {
                update: function(serializedSettings, callback){
                    $.post('/curriculum/api/settings/update/', serializedSettings,
                        function(response){
                            callback(response);
                        }, 'json');
                },
                pushChanges: function(curriculum_id, callback){
                    $.get('/curriculum/api/curriculum/' + curriculum_id + '/push/',
                        function(response){callback(response);}, 'json');
                },
                pauseChanges: function(curriculum_id, callback){
                    $.get('/curriculum/api/curriculum/' + curriculum_id + '/pause/',
                        function(response){callback(response);}, 'json');
                }
            }
        }
    };

    var App = React.createClass({
        getInitialState: function() {
            return {
                numWeeks: 0, view: 'overview',
                drawerView: false, edit: OC.explorer.curriculumSettings.isOwner,
                showNotifications: false
            };
        },
        getDefaultProps: function() {
            return {units: Immutable.List(), textbooks: [], notifications: []};
        },

        getTextbookFromUnitID: function(unitID){
            return OC.explorer.textbooks.find(function(textbook){
                return textbook.units.find(function(unit){ return unit.id === unitID; });
            });
        },
        componentWillMount: function() {
            var view = this, textbook,
                explorerLoader = document.querySelector('.ajax-loader');

            OC.$.addClass(explorerLoader, 'show');

            require(['atomic'], function(atomic){
                atomic.get('/curriculum/api/curriculum/' + view.props.id + '/')
                .success(function(response, xhr){
                    OC.$.removeClass(explorerLoader, 'show');

                    OC.explorer.textbooks = Immutable.fromJS(response.textbooks);
                    view.setProps({textbooks: response.textbooks});

                    OC.explorer.units = Immutable.fromJS(response.units);
                    OC.explorer.standards = Immutable.fromJS(response.standards);

                    var newTextbookUnits, textbookUnit;

                    /*var i, j, textbook, unit;
                    for (i = 0; i < OC.explorer.textbooks.length; i++){
                        textbook = OC.explorer.textbooks[i];

                        newTextbookUnits = [];

                        for (j = 0; j < textbook.units.length; j++){
                            unit = textbook.units[j];
                            textbookUnit = _.findWhere(OC.explorer.units, {id: unit.id});
                            textbookUnit['textbook_id'] = unit.textbook_id;

                            newTextbookUnits.push(textbookUnit);
                        }

                        textbook.units = newTextbookUnits;
                    }

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
                                    from: unit.period && _.has(unit.period, 'from') ? unit.period.from : null,
                                    to: unit.period && _.has(unit.period, 'to') ? unit.period.to : null
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

                    */

                    var textbooks = OC.explorer.textbooks.map(function(textbook){
                        newTextbookUnits = Immutable.List();

                        textbook.get('units').forEach(function(currentUnit){
                            textbookUnit = OC.explorer.units.find(function(unit){
                                return unit.get('id') === currentUnit.get('id');
                            });
                            textbookUnit = textbookUnit.set(
                                'textbook_id', currentUnit.get('textbook_id'));

                            newTextbookUnits = newTextbookUnits.push(textbookUnit);
                        });

                        return textbook.set('units', newTextbookUnits);
                    });

                    var unitPeriods, period;
                    if (view.props.settings.periods.title == 'weekly'){
                        // Go through every textbook / unit and build a period representation.
                        unitPeriods = textbooks.flatMap(function(textbook){
                            return textbook.get('units').map(function(unit){
                                period = unit.get('period');
                                return {
                                    id: unit.get('id'),
                                    textbook: textbook,
                                    textbookTitle: textbook.get('title'),
                                    title: unit.get('title'),
                                    textbookThumbnail: textbook.get('thumbnail'),
                                    begin: period && period.has('begin') ? period.get('begin') : null,
                                    end: period && period.has('end') ? period.get('end') : null,
                                    from: period && period.has('from') ? period.get('from') : null,
                                    to: period && period.has('to') ? period.get('to') : null
                                };
                            });
                        });
                        
                        var unitsWithPeriods = unitPeriods.filter(function(unitPeriod){
                            return unitPeriod.end !== null;
                        }).sortBy(function(unit){ return unit.begin; });

                        var end = unitsWithPeriods.max(function(unitPeriodA, unitPeriodB){ return unitPeriodA.end > unitPeriodB.end; }).end,
                            begin = unitsWithPeriods.min(function(unitPeriodA, unitPeriodB){ return unitPeriodA.begin > unitPeriodB.begin; }).begin;

                        if (end && begin)
                            view.setState({numWeeks: Math.ceil((end - begin) / 7)});
                        else view.setState({numWeeks: 0});

                        view.setProps({units: unitsWithPeriods});
                    } else if (view.props.settings.periods.title == 'terms'){

                        unitPeriods = OC.explorer.units.flatMap(function(unit){
                            textbook = view.getTextbookFromUnitID(unit.get('id'));
                            period = unit.get('period');
                            return {
                                id: unit.get('id'),
                                title: unit.get('title'),
                                textbook: textbook,
                                textbookTitle: textbook ? textbook.get('title') : null,
                                textbookThumbnail: textbook ? textbook.get('thumbnail') : null,
                                type: period && period.has('type') ? period.get('type') : null,
                                position: period && period.has('position') ? period.get('position') : null,
                                parent: period && period.has('parent') ? period.get('parent') : null,
                                unit: period && period.has('unit') ? period.get('unit') : null
                            };
                        });

                        // Determine the number of units associated with each term.
                        var unitData;
                        unitPeriods.forEach(function(unit){
                            unitData = view.props.settings.periods.data[unit.parent];

                            if (! unitData.has('count')){
                                unitData['count'] = 1;
                            } else {
                                unitData['count'] += 1;
                            }
                        });
                        
                        view.setProps({units: unitPeriods});
                    }
                });
            });

            if (OC.explorer.curriculumSettings.synced_to){
                (function(pollForUpdates){
                    setTimeout(function(){
                        var serializedRequest = {
                            curriculum_id: view.props.id,
                            synced_to_id: OC.explorer.curriculumSettings.synced_to,
                            latest_notification_id: view.props.notifications.length > 0 ? (
                                view.props.notifications.max(function(n){return n.id;})) : 0
                        };
                        
                        require(['atomic'], function(atomic){
                            atomic.post('/curriculum/api/notifications/', JSON.stringify(serializedRequest))
                            .success(function(response, xhr){
                                if (!_.has(response, 'status')){
                                    view.setProps({notifications: view.props.notifications.concat(response.notifications)});

                                // Setup the next poll recursively.
                                // pollForUpdates();
                                }
                            });
                        });
                    }, 3000);
                })();
            }
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

        renderTextbooks: function() {
            var view = this;

            return OC.explorer.textbooks.map(function(textbook){
                return React.DOM.li({
                    className: 'textbooks',
                    key: textbook.id
                }, [
                    React.DOM.a({href: ''}, textbook.title),
                    React.DOM.ul({className: 'explorer-body-side-menu explorer-body-side-menu-light'},
                        textbook.get('units').map(function(unit){
                            return CurriculumUnitItem({
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
                require(['atomic'], function(atomic){
                    atomic.get('/curriculum/api/standard/' + standard.id + '/')
                    .success(function(response, xhr){

                    //$('.explorer-loader').addClass('show');
                    /*$.get('/curriculum/api/standard/' + standard.id + '/',
                        function(response){*/
                            //$('.explorer-loader').removeClass('show');

                            standard.sections = [];
                            view.buildSections(standard, response);

                            redoUI();
                    });
                });
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

        renderUnit: function(unit, textbook, callback){
            var view = this;

            textbook = textbook ? textbook : unit.textbook;

            function redoUI(){
                view.setProps({unit: unit, textbook: textbook});

                view.setState({view: 'unit'}, function(){
                    setTimeout(OC.explorer.resetPreHeights, 50);
                    if (callback) callback();
                });

                var objectivePres = $('.explorer-resource-listing-body-pre');
                objectivePres.height('');
            }

            if (unit.hasOwnProperty('sections')){
                redoUI();
            } else {
                //$('.explorer-loader').addClass('show');
                require(['atomic'], function(atomic){
                    atomic.get('/curriculum/api/sections/' + unit.id + '/')
                    .success(function(response, xhr){
                        //$('.explorer-loader').removeClass('show');

                        unit.sections = Immutable.List();
                        view.buildSections(unit, response);

                        redoUI();
                    });
                });
                //$.get('/curriculum/api/sections/' + unit.id + '/',
                //    function(response){

                //}, 'json');
            }
        },

        buildSections: function(parent, response){
            var newSection, newItem, items, sectionItems;
            response.forEach(function(section){

                items = section.items.map(function(ri){
                    newItem = Immutable.Map(ri);

                    newItem = newItem.set('issue', {
                        id: ri.issue ? ri.id : null,
                        host_id: ri.issue ? ri.host_id : null,
                        message: ri.issue ? ri.message : null
                    });
                    newItem = newItem.set('section_id', section.id);

                    return newItem;
                });

                sectionItems = Immutable.List(items);

                sectionItems.forEach(function(item){
                    item.set('resource_sets', item.get('resource_sets').map(function(resourceSet){
                        return {
                            id: resourceSet.id,
                            title: resourceSet.title,
                            position: resourceSet.position,
                            resources: Immutable.List(resourceSet.resources.map(
                                function(rr){ return Immutable.Map(rr); }))
                        };
                    }));
                });

                newSection = Immutable.Map({
                    id: section.id,
                    position: section.position,
                    title: section.title,
                    items: sectionItems,
                    type: section.type
                });

                parent.sections = parent.sections.push(newSection);
            });
        },

        openDrawer: function() {
            this.setState({drawerView: true});
        },

        addSection: function(name, sectionType, parentID, sections, isUnit) {
            // Add the section, mark it as selected.
            var sectionItems = [], newSectionItem;
            if (sectionType === 'contextual'){
                newSectionItem = new OC.explorer.SectionItem({
                    'description': name,
                    'issue': null,
                    'meta': {},
                    'resource_sets': new OC.explorer.Resources(),
                    'parent': name,
                    'selected': false
                });
                sectionItems.push(newSectionItem);
            }

            newSection = {
                // Determine max section position.
                position: _.max(sections, function(s){ return s.position; }).position + 1,
                title: name,
                items: new OC.explorer.SectionItems(sectionItems),
                type: sectionType,
            };
            sections.push(newSection);

            // Make XHR, and update section ID.
            OC.api.curriculum.section.create({
                'parent_id': parentID,
                'is_unit': isUnit,
                'title': newSection.title,
                'position': newSection.position,
                'type': newSection.type
            }, function(response){
                newSection.id = response.id;

                if (sectionType === 'contextual'){
                    newSectionItem.set('section_id', newSection.id);

                    newCollectionItem = newSection.items.create(newSectionItem, {
                        success: function(model){
                            newSection.items.add(model);
                            return OC.api.curriculum.section.addItem(
                                {'id': model.get('section_id'), 'item_id': model.get('id')}, function(){});
                        }
                    });
                }
            });
        },

        addField: function(title, type, position, itemID, sectionID, callback){
            var item = _.findWhere(
                this.props.unit.sections, {id: sectionID}).items.get(itemID),
            attrs = {};

            function save(){
                // Make XHR request.
                OC.appBox.saving();
                item.save(null, {
                    attrs: attrs,
                    success: function(){
                        OC.appBox.saved();
                    }
                });
            }

            if (type === 'text'){
                var slug = OC.slugify(title);

                var meta = item.get('meta');
                meta.push({
                    'slug': slug,
                    'title': title,
                    'body': '',
                    'position': position
                });
                item.set('meta', meta);

                attrs = {'meta': slug};
                save();

                callback();

            } else if (type === 'resources'){
                OC.appBox.saving();

                var newResourceSet = {
                    title: title,
                    position: position,
                    resources: new OC.explorer.Resources()
                };
                var currentResourceSets = item.get('resource_sets');
                currentResourceSets.push(newResourceSet);
                
                //item.set('resource_sets', currentResourceSets);

                OC.api.curriculum.sectionItem.createResourceSet(
                    {'id': itemID, 'title': title, 'position': position}, function(response){
                        OC.appBox.saved();
                        newResourceSet.id = response.id;
                    });

                callback();
            }
        },

        addTextbook: function(title, description){
            var newTextbook = {
                'title': title,
                'description': description
            };

            this.props.textbooks.push(newTextbook);

            // Make XHR request.
            OC.appBox.saving();
            OC.api.curriculum.textbook.create(
                {title: title, description: description, curriculum_id: this.props.id}, function(response){
                    newTextbook.id = response.id;
                    OC.appBox.saved();
                }
            );
        },

        addUnit: function(title, textbook, period){
            var newUnit = {
                title: title,
                textbook: textbook,
                period: period
            };

            this.props.units.push(newUnit);

            // Make XHR request.
            OC.appBox.saving();
            OC.api.curriculum.unit.create(
                _.extend({title: title, textbook_id: textbook.id, curriculum_id: this.props.id}, period), function(response){
                    newUnit.id = response.id;
                    OC.appBox.saved();
                }
            );
        },

        openSettings: function(event){
            this.setState({view: 'settings'}, function(){
                /*require(['pikaday'], function(Pikaday){
                    var from = new Pikaday({ field: $(
                        '.explorer-settings-general-duration-from')[0] }),
                        to = new Pikaday({ field: $(
                        '.explorer-settings-general-duration-to')[0] });
                });*/
            });

            event.stopPropagation();
            event.preventDefault();
            return false;
        },

        moveItemTo: function(itemID, beforeItemID, sectionItems){
            var toMoveSectionitem = sectionItems.get(itemID),
                beforeSectionItem = sectionItems.get(beforeItemID),
                i, toShift = {};

            // Determine the position of each of the models.
            if (toMoveSectionitem.get('position') < beforeSectionItem.get('position')){
                // For each item in the sections Items that is between the two,
                //     reduce position by 1.
                itemsToShift = sectionItems.filter(function(item){ return item.get(
                    'position') > toMoveSectionitem.get('position') && item.get(
                    'position') <= beforeSectionItem.get('position'); });

                for (i = 0; i < itemsToShift.length; i++){
                    itemsToShift[i].set('position', itemsToShift[i].get(
                        'position') - 1);
                }

                toMoveSectionitem.set('position', beforeSectionItem.get('position') + 1);
            } else if (toMoveSectionitem.get('position') > beforeSectionItem.get('position')){
                // For each item in the sections Items that is between the two,
                //     add position by 1.
                itemsToShift = sectionItems.filter(function(item){ return item.get(
                    'position') < toMoveSectionitem.get('position') && item.get(
                    'position') >= beforeSectionItem.get('position'); });

                for (i = 0; i < itemsToShift.length; i++){
                    itemsToShift[i].set('position', itemsToShift[i].get(
                        'position') + 1);
                }

                toMoveSectionitem.set('position', beforeSectionItem.get('position') - 1);
            }
            // Persist the changes with XHR.
            _.each(itemsToShift, function(item){
                toShift[item.get('id')] = item.get('position');
            });
            toShift[toMoveSectionitem.get('id')] = toMoveSectionitem.get('position');

            sectionItems.sort();

            $.post('/curriculum/api/section-items/reposition/', toShift,
                function(response){}, 'json');
        },

        moveSectionTo: function(itemID, beforeItemID, sections){
            var toMoveSection = _.findWhere(sections, {id: itemID}),
                beforeSection = _.findWhere(sections, {id: parseInt(beforeItemID, 10)}),
                i, toShift = {};

            // Determine the position of each of the models.
            if (toMoveSection.position < beforeSection.position){
                // For each section in the sections that is between the two,
                //     reduce position by 1.
                sectionsToShift = _.filter(sections, function(section){
                    return section.position > toMoveSection.position && (
                    section.position <= beforeSection.position); });

                for (i = 0; i < sectionsToShift.length; i++){
                    sectionsToShift[i].position = sectionsToShift[i].position - 1;
                }

                toMoveSection.position = beforeSection.position + 1;
            } else if (toMoveSection.position > beforeSection.position){
                // For each section in the sections that is between the two,
                //     add position by 1.
                sectionsToShift = _.filter(sections, function(section){
                    return section.position < toMoveSection.position && (
                    section.position >= beforeSection.position); });

                for (i = 0; i < sectionsToShift.length; i++){
                    sectionsToShift[i].position = sectionsToShift[i].position + 1;
                }

                toMoveSection.position = beforeSection.position - 1;
            }
            // Persist the changes with XHR.
            _.each(sectionsToShift, function(item){
                toShift[item.id] = item.position;
            });
            toShift[toMoveSection.id] = toMoveSection.position;

            //sections = _.sortBy(sections, function(section){ return section.position; });
            sections.sort(function(a, b){ return a.position - b.position; });

            $.post('/curriculum/api/sections/reposition/', toShift,
                function(response){}, 'json');
        },

        moveMetaTo: function(fieldID, beforeFieldID, item, resourceSets, toMoveIsMeta,
            resourceSet, callback, acceptingElement){
            var toMoveField = toMoveIsMeta ? item.get('meta')[fieldID] : _.findWhere(
                resourceSets, {id: fieldID}),
                toMovePosition = toMoveField.position,
                beforeField = resourceSet ? resourceSet : item.get('meta')[beforeFieldID],
                beforePosition = beforeField.position, i, toShift = {};

            // Determine the position of each of the models.
            if (toMovePosition < beforePosition){
                // For each resource set or meta that is between the two,
                //     reduce position by 1.
                rsToShift = resourceSets.filter(function(rs){
                    return rs.position > toMovePosition && (
                    rs.position <= beforePosition); });

                for (i = 0; i < rsToShift.length; i++){
                    rsToShift[i].position = rsToShift[i].position - 1;
                }

                metasToShift = _.filter(item.get('meta'), function(meta, index){
                    meta.index = index;
                    return meta.position > toMovePosition && (
                    meta.position <= beforePosition); });

                for (i = 0; i < metasToShift.length; i++){
                    metasToShift[i].position = metasToShift[i].position - 1;
                }


                toMoveField.position = beforePosition;
            } else if (toMovePosition > beforePosition){
                // For each resource set or meta that is between the two,
                //     add position by 1.
                rsToShift = resourceSets.filter(function(rs){
                    return rs.position < toMovePosition && (
                    rs.position >= beforePosition); });

                for (i = 0; i < rsToShift.length; i++){
                    rsToShift[i].position = rsToShift[i].position + 1;
                }

                metasToShift = _.filter(item.get('meta'), function(meta, index){
                    meta.index = index;
                    return meta.position < toMovePosition && (
                    meta.position >= beforePosition); });

                for (i = 0; i < metasToShift.length; i++){
                    metasToShift[i].position = metasToShift[i].position + 1;
                }

                toMoveField.position = beforePosition;
            }

            // Persist the changes with XHR.
            if (rsToShift){
                _.each(rsToShift, function(rs){
                    toShift['set-' + rs.id] = rs.position;
                });
            }

            if (metasToShift){
                _.each(metasToShift, function(meta){
                    toShift['meta-' + meta.index] = meta.position;
                });
            }

            if (toMoveIsMeta) toShift['meta-' + fieldID] = toMoveField.position;
            else toShift['set-' + fieldID] = toMoveField.position;

            $.post('/curriculum/api/meta/' + item.get('id') + '/reposition/', toShift,
                function(response){}, 'json');

            // Callback.
            callback(toMoveField.position, resourceSet ? resourceSet.id : beforePosition, acceptingElement);
        },

        openNotificationsMenu: function(event){
            this.setState({showNotifications: !this.state.showNotifications});
        },

        reviewChange: function(notification){
            // Navigate to the context!
            this.setState({showNotifications: false});

            // Navigate to unit.
            this.renderUnit(_.findWhere(
                this.props.units, {id: notification.path.id}), null, function(){
                // Setup shadow.
                $('.popup-background').addClass('show-popup-background');

                // Popout the section in question.
            });
        },

        dismissChange: function(notification){
            this.setState({showNotifications: false});
            alert(notification.path);
        },

        renderPeriods: function() {
            var view = this, i;

            if (this.props.settings.periods.title == 'weekly'){
                var weeks = [];
                for (i = 0; i < this.state.numWeeks; i++){
                    weeks.push(React.DOM.div({className: 'curriculum-calendar-canvas-period'},
                        React.DOM.div({className: 'curriculum-calendar-canvas-period-title'}, 'Week '+ (i + 1))
                    ));

                    /*weeks.push(React.DOM.div(
                        {className: 'explorer-timetable-period explorer-timetable-week'}, 'Week ' + (i + 1)));*/
                }
                return weeks;
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
            return this.props.units.toJS().map(function(unit){
                return PeriodUnitItem({
                    unit: unit,
                    click: view.renderUnit,
                    key: unit.id
                });
            });
        },

        render: function(){
            var overviewView, settingsView, unitView, view = this;

            function getPageSpread(){
                switch (view.state.view){
                    case 'overview':
                        return overviewView;
                    case 'settings':
                        return settingsView;
                    default:
                        return unitView;
                }
            }

            /*overviewView = React.DOM.div({className: 'explorer-resource-overview show'}, [
                React.DOM.div({className: 'explorer-overview-section', key: 1},
                    React.DOM.div({className: 'explorer-overview-unit-table', key: 0}, [
                        React.DOM.div({className: 'explorer-overview-timetable', key: 0}, this.renderPeriods()),
                        React.DOM.div({className: 'explorer-overview-unitflow', key: 1}, this.renderPeriodUnits()),
                    ])
                ),
            ]);*/
            overviewView = React.DOM.div({className: 'curriculum-menu-wrapper card-wrapper'},
                React.DOM.div({className: 'curriculum-menu card'}, [
                    React.DOM.div({className: 'curriculum-pretitle-wrapper card-toolbar card-toolbar-mini', style: { backgroundColor: OC.config.palette.dark }}, [
                        React.DOM.div({className: 'curriculum-pretitle'}, this.props.settings.title + ' - ' + this.props.settings.grade + ' ' + this.props.settings.subject),
                        React.DOM.div({className: 'curriculum-pretitle-options'})
                    ]),
                    React.DOM.div({className: 'curriculum-title-wrapper card-title-wrapper card-title-wrapper-small', style: { backgroundColor: OC.config.palette.base }},
                        React.DOM.div({className: 'curriculum-title card-title'}, 'Unit Sequence & Objectives - Week-by-week')
                    ),
                    React.DOM.div({className: 'curriculum-calendar', style: {height: (this.state.numWeeks * 60) + 'px' }}, [
                        React.DOM.div({className: 'curriculum-calendar-canvas'}, this.renderPeriods()),
                        React.DOM.div({className: 'curriculum-units', style: {marginTop: '-' + (this.state.numWeeks * 60) + 'px' }}, this.renderPeriodUnits())
                    ])
                ])
            );

            if (this.state.view === 'unit' || this.state.view === 'standard'){
                unitView = React.DOM.div({className: 'curriculum-module-wrapper card-wrapper'},
                    Page({
                        title: this.state.view === 'unit' ? this.props.unit.title.toUpperCase(
                            ) : this.props.standard.title.toUpperCase(),
                        textbookTitle: this.props.textbook ? this.props.textbook.get('title').toUpperCase() : null,
                        thumbnail: this.props.textbook ? this.props.textbook.thumbnail : null,
                        sections: this.state.view === 'unit' ? this.props.unit.sections : this.props.standard.sections,
                        id: this.state.view === 'unit' ? this.props.unit.id : this.props.standard.id,
                        drawerView: this.state.drawerView,
                        setDrawerOpen: this.openDrawer,
                        edit: this.state.edit,
                        addSection: this.addSection,
                        addField: this.addField,
                        isUnit: this.state.view === 'unit' ? true : false,
                        moveItemTo: this.moveItemTo,
                        moveSectionTo: this.moveSectionTo,
                        moveMetaTo: this.moveMetaTo,
                        moveResourceSetTo: this.moveResourceSetTo
                    })
                );
            }

            return getPageSpread();
        }
    });

    var Notifications = React.createClass({
        componentDidMount: function(){
            /*OC.setUpMenuPositioning('nav.explorer-notifications-menu', '.explorer-header-actions-notifications');

            $(window).resize(function () {
                OC.setUpMenuPositioning('nav.explorer-notifications-menu', '.explorer-header-actions-notifications');
            });*/
        },
        renderNotification: function(notification){
            return Notification({
                notification: notification,
                reviewChange: this.props.reviewChange,
                dismissChange: this.props.dismissChange
            });
        },
        render: function(){
            return React.DOM.nav({className: 'explorer-notifications-menu' + (this.props.open ? ' show-menu' : '')}, [
                React.DOM.div({className: 'floating-menu-spacer'}, null),
                React.DOM.ul({},
                    this.props.notifications.length > 0 ? (this.props.notifications.map(
                        this.renderNotification)): React.DOM.li({className: 'no-notification-contents'}, 'You have no notifications.')
                )
            ]);
        }
    });

    var Notification = React.createClass({
        reviewChange: function(){
            this.props.reviewChange(this.props.notification);
        },
        dismissChange: function(){
            this.props.dismissChange(this.props.notification);
        },
        render: function(){
            return React.DOM.li({},
                React.DOM.div({
                    className: 'notification' + (this.props.notification.read ? '' : ' new-notification'),
                    href: this.props.notification.url
                }, [
                    React.DOM.div({className: 'notification-message'}, this.props.notification.description),
                    React.DOM.div({className: 'notification-actions'}, [
                        React.DOM.button({
                            className: 'notification-action-review explorer-button-small',
                            onClick: this.reviewChange
                        }, 'Review'),
                        React.DOM.button({
                            className: 'notification-action-dismiss explorer-button-small explorer-dull-button-small',
                            onClick: this.dismissChange
                        }, 'Dismiss')
                    ])
                ])
            );
        }
    });


    /************************END OF APP**********************************/

    var StandardItem = React.createClass({
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
    });

    var SubStandardItem = React.createClass({
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
    });

    var PeriodUnitItem = React.createClass({
        openUnit: function(){
            this.props.click(this.props.unit, this.props.unit.textbook);
        },
        render: function(){
            return React.DOM.div({
                className: 'curriculum-units-unit-wrapper color-' + OC.config.palette.title,
                id: 'textbook-unit-' + this.props.unit.id,
                style: {
                    height: ((( this.props.unit.end - this.props.unit.begin + 1) * 7.428)) + 'px'
                },
                onClick: this.openUnit
            },
                React.DOM.div({
                    className: 'curriculum-units-unit'
                }, [
                    React.DOM.div({className: 'curriculum-units-unit-thumbnail', style: {
                        backgroundImage: 'url(\'' + this.props.unit.textbookThumbnail + '\')'} }),
                    React.DOM.div({className: 'curriculum-units-unit-body'},
                        React.DOM.div({className: 'curriculum-units-unit-body-title'}, this.props.unit.title),
                        React.DOM.div({className: 'curriculum-units-unit-body-textbook'}, this.props.unit.textbookTitle)
                    ),
                    React.DOM.div({className: 'curriculum-units-unit-actions'})
                ])
            );

            /*return React.DOM.a({
                className: 'explorer-unitflow-unit',
                id: 'textbook-unit-' + this.props.unit.id,
                style: {
                    height: ((( this.props.unit.end - this.props.unit.begin + 1) * 12) - 41) + 'px'
                },
                onClick: this.openUnit
            }, ModuleHeader({
                title: this.props.unit.title,
                textbookTitle: this.props.unit.textbookTitle,
                thumbnail: this.props.unit.textbookThumbnail,
                pageView: false
            }));*/
        }
    });

    var CurriculumUnitItem = React.createClass({
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

    });

    /************************END OF OVERVIEW VIEWS***************************/

    var Page = React.createClass({
        _backboneForceUpdate: function() {
            this.forceUpdate();
        },
        bindProps: function() {
            this.props.sections.flatMap(function(section){
                return section.items;
            }).map(function(model){
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
            return {
                drawerItem: null,
                addBlockState: false,
                newSectionName: null,
                newSectionType: 'collection'
            };
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
            var selectedSection = props.sections.find(function(section){
                return section.get('items').find(function(item){
                    return item.get('selected') === true; });
            });

            if (selectedSection){
                return Context({
                    item: selectedSection.items.findWhere(
                        {selected: true}),
                    edit: this.props.edit,
                    addField: this.props.addField,
                    section: selectedSection,
                    moveMetaTo: this.props.moveMetaTo,
                    moveResourceSetTo: this.props.moveResourceSetTo
            });
            } else {
                if (this.props.drawerView)
                    return Context();
            }
        },

        openDrawer: function(item){
            // Remove all objective selecteds.
            var selectedItem = this.props.sections.find(function(section){
                return section.get('items').find(function(item){
                    return item.get('selected') === true; });
            });

            if (selectedItem) {
                var index = null;
                var previouslySelectedItem = selectedItem.get('items').find(function(item, key){
                    index = key; return item.get('selected') === true; });
                
                // COME BACK TO THIS.
                selectedItem.get('items').update(previouslySelectedItem.set(selected, false));
            }

            item = item.set('selected', true);
            this.props.setDrawerOpen();
        },

        addSection: function(event){
            this.setState({addBlockState: true}, function(){
                this.refs.newSectionInput.getDOMNode().focus();
            });
        },

        cancelAddSection: function(event){
            this.setState({addBlockState: false});
        },

        completeAddSection: function(event){
            this.props.addSection(
                this.state.newSectionName,
                this.state.newSectionType,
                this.props.id,
                this.props.sections,
                this.props.isUnit
            );
            this.setState({addBlockState: false});
        },

        updateNewSectionTitle: function(event){
            this.setState({newSectionName: event.target.value});
        },

        updateNewSectionType: function(event){
            this.setState({newSectionType: event.target.value});
        },

        render: function(){
            var addSectionView = React.DOM.div({className: 'explorer-resource-add-section'}, [
                React.DOM.div({className: 'explorer-resource-add-section-title', key: 0}, 'New block'),
                React.DOM.div({className: 'explorer-resource-add-section-name-wrapper', key: 1},
                    React.DOM.input({
                        className: 'explorer-resource-add-section-name',
                        ref: 'newSectionInput',
                        type: 'text',
                        placeholder: 'Name',
                        onBlur: this.updateNewSectionTitle
                    })
                ),
                React.DOM.select({
                    className: 'explorer-resource-add-section-type',
                    key: 2,
                    placeholder: 'Type',
                    onBlur: this.updateNewSectionType
                }, [
                    React.DOM.option({key: 0, value: 'collection'}, 'List'),
                    React.DOM.option({key: 1, value: 'contextual'}, 'Section')
                ]),
                React.DOM.div({className: 'explorer-resource-add-section-actions', key: 3}, [
                    React.DOM.button({
                        className: 'explorer-dull-button explorer-resource-add-section-action-cancel',
                        onClick: this.cancelAddSection
                    }, 'Cancel'),
                    React.DOM.button({
                        className: 'explorer-button',
                        onClick: this.completeAddSection
                    }, 'Finish')
                ]),
            ]);

            return React.DOM.div({className: 'curriculum-module'}, [
                React.DOM.div({
                    className: 'explorer-resource-module-main' + (this.props.drawerView ?
                        ' compress' : ''),
                    key: 0
                }, [
                    /*OC.explorer.ModuleHeader({
                        key: 0,
                        thumbnail: this.props.thumbnail,
                        title: this.props.title,
                        textbookTitle: this.props.textbookTitle,
                        pageView: true
                    }),*/

                    React.DOM.div({className: 'explorer-resource-sections-wrapper', key: 1},
                        Sections({
                            //collection: this.props.objectives,
                            sections: this.props.sections,
                            openDrawer: this.openDrawer,
                            drawerOpen: this.props.drawerView,
                            edit: this.props.edit,
                            moveItemTo: this.props.moveItemTo,
                            moveSectionTo: this.props.moveSectionTo
                        })
                    ),

                    this.props.edit ? this.state.addBlockState ? addSectionView : (
                        React.DOM.div({
                            className: 'curriculum-module-new-section',
                            onClick: this.addSection,
                            key: 2
                        },
                            '+ ADD BLOCK'
                    )) : null,
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
    });

    var ModuleHeader = React.createClass({
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
    });

    /*var Objectives = Backbone.Collection.extend({
        model: OC.explorer.Objective,
        sync: function(method, model, options){
            function success(response){ return options.success(response); }

            switch(method) {
                case 'update':
                    return OC.api.curriculum.unit.addObjective(
                        {'id': model.get('unit_id'), 'objective_id': model.get('id')}, success);
            }
        }
    });*/

    /*var SectionItems = Backbone.Collection.extend({
        model: OC.explorer.SectionItem,
        sync: function(method, model, options){
            function success(response){ return options.success(response); }

            switch(method) {
                case 'update':
                    return OC.api.curriculum.section.addItem(
                        {'id': model.get('section_id'), 'item_id': model.get('id')}, success);
            }
        },

        comparator: function(model){
            return model.get('position');
        }
    });*/

    var Sections = React.createClass({
        sortedRender: function(){
            this.forceUpdate();
        },
        renderSection: function(section){
            return React.DOM.div({
                className: 'explorer-resource-section card', id: 'section-' + section.id},
                ModuleSection({
                    key: section.id,
                    id: section.id,
                    collection: section.get('items'),
                    sections: this.props.sections,
                    title: section.get('title'),
                    type: section.get('type'),
                    openDrawer: this.props.openDrawer,
                    drawerOpen: this.props.drawerOpen,
                    edit: this.props.edit,
                    moveItemTo: this.props.moveItemTo,
                    moveSectionTo: this.props.moveSectionTo,
                    sortedRender: this.sortedRender
                })
            );
        },
        render: function(){
            return React.DOM.div({className: 'explorer-resource-sections'},
                this.props.sections.map(this.renderSection).toJS()
            );
        }
    });

    var ModuleSection = React.createClass({
        _backboneForceUpdate: function() {
            this.forceUpdate();
        },
        bindProps: function() {
            //this.props.collection.on('add change sort remove', this._backboneForceUpdate, this);
        },
        componentDidMount: function() {
            this.bindProps();

            var view = this;

            itemDraggable(
                this.getDOMNode().querySelectorAll('.explorer-resource-listing-labels-handle, .explorer-resource-section-listing-contextual-handle'),
                '.explorer-resource-sections',
                '.explorer-resource-section-body',
                this.props.title,
                function(acceptingElement){
                    // Get item # from its ID.
                    view.props.moveSectionTo(view.props.id,
                        acceptingElement.parents('.explorer-resource-section').attr('id').substring(8),
                        view.props.sections
                    );
                    view.props.sortedRender();
                }
            );
        },
        componentWillUnmount: function() {
            this.props.collection.off('add change sort remove', this._backboneForceUpdate, this);
        },
        addItem: function(){
            // Determine the current max position.
            var maxPositionItem = this.props.collection.max(function(item){
                return item.get('position'); });

            var newItem = new OC.explorer.SectionItem({
                description: '',
                resource_sets: [{ id: null, resources: new OC.explorer.Resources() }],
                meta: [],
                position: maxPositionItem.get('position') + 1,
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
                        {'id': model.get('section_id'), 'item_id': model.get(
                        'id')}, function(){});
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
        },
        open: function() {
            this.props.openDrawer(this.props.collection.get(0));
        },

        renderItem: function(item) {
            return ModuleSectionItemWrapper({
                key: item.id,
                title: item.get('title'),
                model: item,
                collection: this.props.collection,
                openDrawer: this.props.openDrawer,
                drawerOpen: this.props.drawerOpen,
                edit: this.props.edit,
                moveItemTo: this.props.moveItemTo
            });
        },
        render: function(){
            if (this.props.type === 'collection'){
                var sectionTitle;
                /*if (this.props.title == 'Objectives'){
                    sectionTitle = React.DOM.div({className: 'explorer-resource-listing-labels', key: 0}, [
                        React.DOM.div({className: 'explorer-resource-listing-labels-handle-wrapper', key: 0},
                            React.DOM.div({className: 'explorer-resource-listing-labels-handle', key: 0}, '')
                        ),
                        React.DOM.div({className: 'explorer-resource-listing-labels-pre', key: 1}, ''),
                        React.DOM.div({className: 'explorer-resource-listing-labels-header', key: 2}, [
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
                } else {*/
                    sectionTitle = React.DOM.div({className: 'curriculum-module-section-listing-collection', style: { backgroundColor: OC.config.palette.dark }},
                        React.DOM.div({className: 'explorer-resource-section-listing-collection-handle-wrapper', key: 0},
                            React.DOM.div({className: 'explorer-resource-section-listing-collection-handle'}, '')
                        ),
                        React.DOM.div({className: 'curriculum-module-section-listing-collection-title-wrapper', key: 1},
                            React.DOM.div({className: 'curriculum-module-section-listing-collection-title'},
                                this.props.title)
                        )
                    );
                //}
                return React.DOM.div({className: 'explorer-resource-section-body'}, [
                    sectionTitle,
                    React.DOM.div({className: 'explorer-resource-section-listing-items', key: 1},
                       this.props.collection.map(this.renderItem).toJS()),
                    this.props.edit ? React.DOM.div({className: 'explorer-resource-listing-actions', key: 2},
                        React.DOM.button({
                            id: 'new-item',
                            className: 'explorer-dull-button',
                            onClick: this.addItem
                        }, '+ Add new')
                    ) : null
                ]);
            } else if (this.props.type === 'contextual') {
                return React.DOM.div({className: 'explorer-resource-section-body'},
                    //React.DOM.div({
                    //    className: 'explorer-resource-section-contextual-listing-title' + (this.props.collection.at(
                    //        0).get('selected') ? ' selected' : ''),
                    //    onClick: this.open
                    //}, this.props.title),

                    React.DOM.div({className: 'curriculum-module-section-listing-contextual' + (this.props.collection.get(
                            0).get('selected') ? ' selected' : ''), onClick: this.open, style: { backgroundColor: OC.config.palette.dark }},
                        React.DOM.div({className: 'curriculum-module-section-listing-contextual-handle-wrapper', key: 0},
                            React.DOM.div({className: 'curriculum-module-section-listing-contextual-handle'}, '')
                        ),
                        React.DOM.div({className: 'curriculum-module-section-listing-contextual-title-wrapper', key: 1},
                            React.DOM.div({className: 'curriculum-module-section-listing-contextual-title'},
                                this.props.title)
                        )
                    )
                );
            }
        }
    });


    /************************END OF MODULE SCAFFOLD VIEWS**********************/

    var ModuleSectionItemWrapper = React.createClass({
        getInitialState: function(){
            return {selected: false};
        },
        componentDidMount: function() {
            this.setReady();

            var view = this;

            itemDraggable(this.getDOMNode().querySelector('.explorer-resource-section-listing-item-handle'),
                '.explorer-resource-section-listing-items',
                '.explorer-resource-section-listing-item',
                this.props.model.get('description'),
                function(acceptingElement){
                    // Get item # from its ID.
                    view.props.moveItemTo(view.props.model.get('id'),
                        acceptingElement.attr('id').substring(5),
                        view.props.collection
                    );
                }
            );
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
                onClick: this.openDrawer,
                id: 'item-' + this.props.model.get('id')
            }, [
                React.DOM.div({className: 'explorer-resource-section-listing-item-handle-wrapper'},
                    React.DOM.div({className: 'explorer-resource-section-listing-item-handle'}, null)
                ),
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
                        ModuleSectionItem({
                            model: this.props.model,
                            openDrawer: this.openDrawer,
                            edit: this.props.edit
                        })
                    ),
                    React.DOM.div({className: 'explorer-resource-section-listing-item-content-fill' + (
                        this.props.drawerOpen ? ' hide' : ''), key: 1}, null)
                ]),

                Status({
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
    });

    /*var SectionItem = Backbone.Model.extend({
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
                            var meta = [];
                            meta.push(_.findWhere(this.get('meta'), {slug: options.attrs.meta}));

                            return OC.api.curriculum.sectionItem.update(
                                {'id': this.get('id'), 'meta': meta}, success);
                        }
                    }

                    return OC.api.curriculum.sectionItem.update(
                        {'id': this.get('id'), 'description': this.get('description')}, success);

                case 'create':
                    return OC.api.curriculum.sectionItem.create({
                        'description': this.get('description'),
                        'section_id': this.get('section_id'),
                        'curriculum_id': OC.explorer.curriculumSettings.id,
                        'position': this.get('position')
                    }, success);
            }
        }
    });*/

    var ModuleSectionItem = React.createClass({
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
                contentEditable: this.props.edit ? true : false,
                title: this.props.model.get('description'),
                onBlur: this.save
            }, this.props.model.get('description'));
        }
    });


    /************************END OF MODULE OBJECTIVE VIEWS**********************/

    var Context = React.createClass({
        /*componentDidMount: function() {
            $(this.getDOMNode()).nanoScroller({
                paneClass: 'scroll-pane',
                sliderClass: 'scroll-slider',
                contentClass: 'scroll-content',
                flash: true
            });
        },*/

        getInitialState: function(){
            return {
                addFieldState: false,
                newFieldName: null,
                newFieldType: 'text'
            };
        },

        makeDraggable: function($element, title, id, isMeta){
            var view = this, resourceSetID;
            function success(fromID, toID, acceptingElement){
                var $section = $element.parents('.explorer-resource-module-support-section');
                if (isMeta) $section.attr('id', 'meta-' + fromID);
                else $section.attr('id', 'resources-' + fromID);

                if (acceptingElement.attr('id').indexOf('meta') !== -1) acceptingElement.attr(
                    'id', 'meta-' + toID);
                else acceptingElement.attr('id', 'resources-' + toID);
            }

            OC.explorer.itemDraggable($element,
                '.explorer-resource-module-support-body',
                '.explorer-resource-module-support-section',
                title,
                function(acceptingElement){
                    // Get item # from its ID.
                    if (acceptingElement.attr('id').indexOf('meta') !== -1){
                        view.props.moveMetaTo(id,
                            acceptingElement.attr('id').substring(5),
                            view.props.item,
                            view.props.item.get('resource_sets'),
                            isMeta,
                            null,
                            success,
                            acceptingElement
                        );
                    } else {
                        resourceSetID = acceptingElement.attr('id').substring(10);
                        view.props.moveMetaTo(id,
                            resourceSetID,
                            view.props.item,
                            view.props.item.get('resource_sets'),
                            isMeta,
                            _.findWhere(view.props.item.get('resource_sets'),
                                {id: parseInt(resourceSetID, 10)}),
                            success,
                            acceptingElement
                        );
                    }

                    view.forceUpdate();
                }
            );
        },

        renderSections: function(){
            var props = this.props, view = this;
            var metaLength = _.keys(this.props.item.get('meta')).length;

            if (metaLength > 0 || this.props.item.get('resource_sets').length > 0){
                var metaProps = _.map(this.props.item.get(
                    'meta').concat(this.props.item.get('resource_sets')), function(metaItem, index){
                    
                    if (_.has(metaItem, 'slug')){
                        return {
                            key: metaItem['slug'],
                            index: index,
                            title: _.has(metaItem, 'title') ? metaItem.title : '(Unnamed)',
                            body: metaItem['body'],
                            item: props.item,
                            edit: props.edit,
                            position: metaItem['position'],
                            makeDraggable: view.makeDraggable
                        };
                    } else {
                        return {
                            key: metaItem.id ? metaItem.id : 0,
                            id:  metaItem.id,
                            collection: metaItem.resources,
                            title: metaItem.title,
                            item: props.item,
                            parent: props.item.get('parent'),
                            edit: props.edit,
                            position: metaItem.position,
                            makeDraggable: view.makeDraggable
                        };
                    }
                });

                return _.map(metaProps.sort(function(a,b){ return a.position - b.position; }), function(metaProp){
                    if (_.has(metaProp, 'index')){
                        return OC.explorer.Meta(metaProp);
                    } else {
                        return OC.explorer.ResourcesView(metaProp);
                    }
                });
            } else {
                return null;
            }
        },

        addField: function(event){
            this.setState({addFieldState: true}, function(){
                this.refs.newFieldInput.getDOMNode().focus();
            });
        },

        cancelAddField: function(event){
            this.setState({addFieldState: false});
        },

        completeAddField: function(event){
            // Find the max position of fields and add one to determine new
            //     field position.
            var maxPosition = _.max(
                this.props.item.get('resource_sets').concat(this.props.item.get('meta')),
                function(resourceSet){ return resourceSet.position; }).position,
                view = this;

            this.props.addField(
                this.state.newFieldName,
                this.state.newFieldType,
                maxPosition + 1,
                this.props.item.get('id'),
                this.props.section.id,
                function(){
                    view.setState({addFieldState: false});
                }
            );
        },

        updateNewFieldTitle: function(event){
            this.setState({newFieldName: event.target.value});
        },

        updateNewFieldType: function(event){
            this.setState({newFieldType: event.target.value});
        },

        render: function(){
            var addFieldView = React.DOM.div({className: 'explorer-resource-add-field'}, [
                React.DOM.div({className: 'explorer-resource-add-field-title', key: 0}, 'New field'),
                React.DOM.div({className: 'explorer-resource-add-field-name-wrapper', key: 1},
                    React.DOM.input({
                        className: 'explorer-resource-add-field-name',
                        ref: 'newFieldInput',
                        type: 'text',
                        placeholder: 'Name',
                        onBlur: this.updateNewFieldTitle
                    })
                ),
                React.DOM.select({
                    className: 'explorer-resource-add-field-type',
                    key: 2,
                    placeholder: 'Type',
                    onBlur: this.updateNewFieldType
                }, [
                    React.DOM.option({key: 0, value: 'text'}, 'Text'),
                    React.DOM.option({key: 1, value: 'resources'}, 'Resources'),
                    React.DOM.option({key: 2, value: 'standards'}, 'Standards')
                ]),
                React.DOM.div({className: 'explorer-resource-add-field-actions', key: 3}, [
                    React.DOM.button({
                        className: 'explorer-dull-button explorer-resource-add-section-action-cancel',
                        onClick: this.cancelAddField
                    }, 'Cancel'),
                    React.DOM.button({
                        className: 'explorer-button',
                        onClick: this.completeAddField
                    }, 'Finish')
                ]),
            ]);

            return React.DOM.div({
                className: 'explorer-resource-module-support-body'/* + 'scrollable-block'*/,
                style: {
                    height: $('.explorer-body-stage').height() - (parseInt($(
                    '.explorer-body-stage-spread').css('padding-top'), 10) * 2)
                }
            }, this.props.item ? [
                React.DOM.div({className: 'explorer-resource-module-support-title', key: 0}, this.props.item.get('description')),
                React.DOM.div({className: 'explorer-resource-module-support-sections', key: 1}, this.renderSections()),

                this.props.edit ? this.state.addFieldState ? addFieldView : (
                    React.DOM.div({
                        className: 'explorer-resource-module-support-new-field',
                        onClick: this.addField,
                        key: 3
                    },
                        '+ ADD FIELD'
                )) : null
            ]: null);
        }
    });

    var Meta = React.createClass({
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

            this.props.makeDraggable($(
                '.explorer-resource-module-support-section-handle', this.getDOMNode()),
                this.props.title, this.props.index, true
            );
        },
        componentWillReceiveProps: function(nextProps){
            this.setState({body: nextProps.body });
        },
        componentDidUpdate: function(){
            $(this.getDOMNode).find('.explorer-resource-module-support-section-body').trigger('change');
        },
        save: function(event){
            newValue = $(event.target).text();
            currentMetas = this.props.item.get('meta');

            this.setState({body: newValue});

            if (currentMetas[this.props.key] !== newValue){
                OC.appBox.saving();

                //currentMetas[this.props.key] = newValue;

                _.findWhere(currentMetas, {slug: this.props.key}).body = newValue;

                this.props.item.set('meta', currentMetas);
                this.props.item.save(null, {
                    attrs: {'meta': this.props.key},
                    success: function(){
                        OC.appBox.saved();
                    }
                });
            }
        },
        renderStandard: function(standard){
            return React.DOM.div({
                className: 'explorer-resource-module-support-section-body-field-snippet'}, [
                React.DOM.span({
                    className: 'explorer-resource-module-support-section-body-standard'
                }, standard.title),
                React.DOM.span({}, ': ' + standard.description)
            ]);
        },
        render: function(){
            var isStandardsFieldView = _.isObject(this.state.body) && this.state.body.type == 'standards';

            var metaBody, hideTitle = _.isObject(this.state.body) && this.state.body.hideTitle;

            if (isStandardsFieldView){
                metaBody = React.DOM.div({
                    className: 'explorer-resource-module-support-section-body'
                }, this.state.body.standards.map(this.renderStandard));
            } else {
                var converter = new Showdown.converter(),
                    body = hideTitle ? this.state.body.body : this.state.body;

                metaBody = React.DOM.div({
                    className: 'explorer-resource-module-support-section-body',
                    contentEditable: this.props.edit? true : false,
                    onBlur: this.save,
                    'data-placeholder': body && body.length > 0 ? '' : '(add something)',
                    dangerouslySetInnerHTML: {
                        __html: converter.makeHtml(body && body.length > 0 ? converter.makeHtml(
                            body) : '')
                    },
                    key: 1
                });
            }

            return React.DOM.div({className: 'explorer-resource-module-support-section explorer-resource-module-support-section-' + this.props.key,
                id: 'meta-' + this.props.index}, [
                React.DOM.div({className: 'explorer-resource-module-support-section-handle-wrapper'},
                    React.DOM.div({className: 'explorer-resource-module-support-section-handle'}, null)
                ),
                hideTitle ? null : React.DOM.div({className: 'explorer-resource-module-support-section-title-wrapper'},
                    React.DOM.div({className: 'explorer-resource-module-support-section-title', key: 0}, this.props.title),
                    metaBody
                ),
                React.DOM.div({className: 'explorer-resource-module-support-section-actions'}, null)
            ]);
        }
    });

    /*var Resources = Backbone.Collection.extend({
        model: OC.explorer.Resource
    });*/

    var ResourcesView = React.createClass({
        _forceUpdate: function() {
            this.forceUpdate();
        },
        componentDidMount: function() {
            this.props.collection.on('add change remove', this._forceUpdate, this);

            this.props.makeDraggable($(
                '.explorer-resource-module-support-section-handle', this.getDOMNode()),
                this.props.title ? this.props.title : 'Resources', this.props.id, false
            );
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
            return React.DOM.div({className: 'explorer-resource-module-support-section explorer-resource-module-support-section-resources',
                id: 'resources-' + this.props.id}, [
                React.DOM.div({className: 'explorer-resource-module-support-section-handle-wrapper'},
                    React.DOM.div({className: 'explorer-resource-module-support-section-handle'}, null)
                ),

                React.DOM.div({className: 'explorer-resource-module-support-section-title-wrapper'},
                    React.DOM.div({className: 'explorer-resource-module-support-section-title', key: 0}, this.props.title ? this.props.title : 'Resources')
                ),
                React.DOM.div({className: 'explorer-resource-module-support-section-actions'}, null),

                React.DOM.div({className: 'explorer-resource-items', key: 1},
                    this.props.collection.map(this.renderResource)),

                this.props.parent ? React.DOM.div({className: 'explorer-resource-actions-suggest-wrapper'},
                React.DOM.button({
                    className: 'explorer-resource-actions-suggest',
                    onClick: this.suggest,
                    key: 2
                }, 'SUGGEST MORE RESOURCES')) : null,

                this.props.edit ? React.DOM.div({className: 'explorer-resource-listing-body-resource-actions', key: 3},
                    React.DOM.button({
                        className: 'explorer-resource-actions-add explorer-light-button',
                        onClick: this.addResource
                    }, '+ Add resource')
                ) : null
            ]);
        }
    });

    /*var Resource = Backbone.Model.extend({
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
    });*/

    ResourceView = React.createClass({
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
    });

    /************************END OF MODULE CONTEXT VIEWS**********************/

    var Status = React.createClass({
        _forceUpdate: function() {
            this.forceUpdate();
        },
        componentDidMount: function() {
            //this.setReady();
            //this.setMessage();

            //this.props.model.on('add change remove', this._forceUpdate, this);
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
    });

    var CurriculumIssues = React.createClass({
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
    });

    var Issues = React.createClass({
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
    });

    var Issue = React.createClass({
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
    });

    /************************END OF ISSUE RELATED VIEWS**********************/

    function resetPreHeights(reverse) {
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
    }

    function initGradeSubjectMenu(){
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
    }

    function clearStatusFocus(){
        $('.light-popup-background').removeClass('show-popup-background');
    }

    var metaTitles = {
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
    };

    var metaOrder = ['methodology', 'how', 'wordwall', 'prerequisite'];

    /*var suggestionTemplate = _.template('<div class="explorer-suggest-resources-listing-item" id="resource-<%= id %>">' +
        '<div class="explorer-suggest-resources-listing-item-thumbnail" style="background-image: url(\'<%= thumbnail %>\')"></div>' +
        '<div class="explorer-suggest-resources-listing-item-content">' +
            '<a href="<%= url %>" target="_blank" class="explorer-suggest-resources-listing-item-content-title"><%= title %></a>' +
            '<div class="explorer-suggest-resources-listing-item-content-description"><%= description %></div>' +
        '</div>' +
        '<div class="explorer-suggest-resources-listing-item-actions">' +
            '<button class="action-button explorer-suggest-resources-listing-item-action-keep">Keep</button>' +
            '<button class="action-button secondary-button explorer-suggest-resources-listing-item-action-hide">Hide</button>' +
        '</div>' +
    '</div>');*/

    var suggestionTemplate = React.createClass({
        render: function(){
            return React.DOM.div({
                className: 'explorer-suggest-resources-listing-item',
                id: 'resource-' + this.props.id
            }, [
                React.DOM.div({
                    className: 'explorer-suggest-resources-listing-item-thumbnail',
                    style: {
                        backgroundImage: 'url(\'' + this.props.thumbnail + '\')'
                    }
                }),
                React.DOM.div({className: 'explorer-suggest-resources-listing-item-content'}, [
                    React.DOM.a({
                        className: 'explorer-suggest-resources-listing-item-content-title',
                        target: '_blank',
                        href: this.props.url
                    }, this.props.title),
                    React.DOM.div({className: 'explorer-suggest-resources-listing-item-content'},
                        this.props.description)
                ]),
                React.DOM.div({className: 'explorer-suggest-resources-listing-item-actions'}, [
                    React.DOM.button({className: 'action-button explorer-suggest-resources-listing-item-action-keep'},
                        'Keep'),
                    React.DOM.button({className: 'action-button secondary-button explorer-suggest-resources-listing-item-action-hide'},
                        'Hide')
                ])
            ]);
        }
    });

    var cachedResources = [];

    function openResourcePreview(curriculum_resource_id, title, thumbnail, url, type){
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

                    if (type == 'document'){
                        require(['mathjax'], function(MathJax){
                            MathJax.Hub.Queue(["Typeset",MathJax.Hub,"document-body"]);
                        });
                    }
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

     function itemDraggable($element, wrapperSelector, parentSelector, text, callback){
        OC.$.addListener($element, 'mousedown', function(event){
            var originalElement = $(this),
                $elementShadow = $('<div/>', {
                    text: text,
                    'class': 'movable-clone'
                });
            $('.movable-clones').append($elementShadow);

            var $newElement = $('.movable-clones div.movable-clone:last');
            // And place it in the hidden clone DOM element.
            $newElement.offset({
                top: originalElement.offset().top,
                left: originalElement.offset().left
            });

            $newElement.css({
                width: $newElement.width()
            });
            $newElement.addClass('float');

            var newElHeight = $(this).outerHeight(),
                newElWidth = $(this).outerWidth(),
                newElY = $(this).offset().top + newElHeight - event.pageY,
                newElX = $(this).offset().left + newElWidth - event.pageX;

            // Establish the user items' frame.
            var droppableElement = originalElement.parents(wrapperSelector);
            var droppableFrame = {
                top: droppableElement.offset().top,
                bottom: droppableElement.offset().top + droppableElement.outerHeight(true),
                left: droppableElement.offset().left,
                right: droppableElement.width()
            };

            droppableElement.addClass('accepting');
            var elementBeingHoveredOver, acceptingElement;

            OC.$.addListener(OC.$.addListener($(this).parents('.explorer-body'), 'mousemove', function(event){
                $newElement.addClass('draggable-shadow');

                $('.draggable-shadow').offset({
                    top: event.pageY + newElY - newElHeight,
                    left: event.pageX + newElX - newElWidth + 20
                });

                $newElement.offset().right = $newElement.offset().left + $newElement.width();

                $(parentSelector).removeClass('accepting');
                elementBeingHoveredOver = $(event.target).parents(parentSelector);

                if (elementBeingHoveredOver.length > 0){
                    if (! $.contains(elementBeingHoveredOver[0], $element[0])) {
                        if (elementBeingHoveredOver.length > 0) elementBeingHoveredOver.addClass('accepting');
                    }
                }
                
            }), 'mouseup', function(){
                $newElement.removeClass('draggable-shadow');

                acceptingElement = $(parentSelector + '.accepting');

                if (acceptingElement.length > 0){
                    callback(acceptingElement);

                    //originalElement.fadeOut('slow');
                    $newElement.remove();
                } else {
                    $newElement.remove();
                }

                $(this).unbind('mousemove');
                $(this).unbind('mouseup');

                droppableElement.removeClass('accepting');
                $(parentSelector).removeClass('accepting');
            });

            event.preventDefault();
        });
    }

    /*OC.explorer.textbooks = Immutable.List();
    OC.explorer.units = Immutable.List();
    OC.explorer.standards = Immutable.List();

    OC.curriculum = {
        id: OC.explorer.curriculumSettings.id
    };*/
    OC.curriculum.loadButton = document.querySelector('.ajax-loader');

    require(['./src/curriculum/Bootstrap',
        './src/curriculum/actions/ActionCreators',
        './src/curriculum/views/PageView.react',
        './src/curriculum/WebAPI'],
        function(Bootstrap, Actions, Page){

        Actions.initSettings(OC.curriculum.settings);

        Bootstrap.init(function(){
            React.renderComponent(
                Page(), document.querySelector('.curriculum'));
        });
    });

    //'.explorer-header-body-wrapper'
    //React.renderComponent(App({
    //    id: OC.explorer.curriculumSettings.id,
    //    description: OC.explorer.curriculumSettings.description,
    //    settings: OC.explorer.curriculumSettings,
    //}), document.querySelector('.content-panel-body'), function(){
        /*$('.explorer-body-side').nanoScroller({
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
        });*/
    //});

    /*$(document).ready(function($){
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




        resizeApp();
        $(window).resize(resizeApp);

        $('.explorer-header-actions-copy').click(function(event){
            var copyPopup = OC.lightPopup('.explorer-copy-dialog'),
                cancelButton = $('.explorer-copy-button-cancel', copyPopup.dialog),
                copyButton = $('.explorer-copy-button-copy', copyPopup.dialog);
            
            copyButton.click(function(event){
                if (! _.has(OC.explorer, 'smallSpinner')){
                    var options = {
                        lines: 12, // The number of lines to draw
                        length: 4, // The length of each line
                        width: 2, // The line thickness
                        radius: 4, // The radius of the inner circle
                        corners: 0.9, // Corner roundness (0..1)
                        rotate: 75, // The rotation offset
                        direction: 1, // 1: clockwise, -1: counterclockwise
                        color: '#fff', // #rgb or #rrggbb or array of colors
                        speed: 1, // Rounds per second
                        trail: 79, // Afterglow percentage
                        shadow: false, // Whether to render a shadow
                        hwaccel: false, // Whether to use hardware acceleration
                        className: 'inline-spinner', // The CSS class to assign to the spinner
                        zIndex: 12, // The z-index (defaults to 2000000000)
                        top: copyButton.offset().top, // Top position relative to parent
                        left: copyButton.offset().left // Left position relative to parent
                    };
                    OC.explorer.smallSpinner = new Spinner(options).spin($('.copy-spinner', copyButton).get(0));
                } else OC.explorer.smallSpinner.spin($('.copy-spinner', copyButton).get(0));


                // Animate the header.
                $('.explorer-copy-header-flyer').addClass('fly');

                // Make POST request, after putting together serialized form.
                var serializedRequest = {
                    'curriculum_id': OC.explorer.curriculumSettings.id,
                    'title': $('input[name="explorer-copy-title"]', copyPopup.dialog).val(),
                    'sync': $('input[name="copy_sync"]', copyPopup.dialog).val()
                };

                $.post('/curriculum/api/curriculum/copy/', serializedRequest,
                    function(response){
                        $('.explorer-copy-body-pre').addClass('fadeOut');
                        $('.explorer-copy-body-post').addClass('show');

                        $('.explorer-copy-url').text('opencurriculum.org' + response.url);
                        $('.explorer-copy-url').attr('href', response.url);

                        setTimeout(function(){
                            $('.explorer-copy-body-pre').addClass('hide');

                            $('.explorer-copy-button-cancel').text('Close');
                            $('.explorer-copy-button-cancel').addClass('expand');

                            OC.explorer.smallSpinner.stop();
                            $('.explorer-copy-button-copy').addClass('hide');
                        }, 1000);
                    }, 'json');
            });

            cancelButton.click(function(event){
                copyPopup.close();
            });
        });
    });*/
});
