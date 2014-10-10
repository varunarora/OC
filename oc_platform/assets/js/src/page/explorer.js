define(['jquery', 'core', 'underscore', 'react', 'backboneReact', 'nanoscroller'], function($, OC, _, React, BackboneMixin){

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
        objective: {
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
        },
        unit: {
            addObjective: function(serializedUnitObjective, callback){
                $.post('/curriculum/api/objective/add-objective-to-unit/', serializedUnitObjective,
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
        Settings: Backbone.Model.extend({
            drawerOpen: '',
        }),
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

        Objective: Backbone.Model.extend({
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

        ObjectiveView: React.createClass({
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
        }),

        MetaView: React.createClass({
            save: function(event){
                newValue = $(event.target).text();
                currentMetas = this.props.objective.get('meta');

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
                    React.DOM.div({className: 'explorer-resource-module-support-section-title'}, this.props.title),
                    React.DOM.div({
                        className: 'explorer-resource-module-support-section-body',
                        contentEditable: true,
                        onBlur: this.save
                    }, this.props.body),
                ]);
            }
        }),

        ObjectiveContextView: React.createClass({
            addResource: function(event){
                var view = this;
                OC.shareNewClickHandler(event, {
                    title: 'Add a resource to the unit objective',
                    message: 'What would you like to share today?',
                    urlTitle: 'Add a website URL',
                    addMeta: false,
                    sent: view.resourceSent,
                    callback: view.resourceAdded,
                    urlPostURL: '/curriculum/api/objective/add-url/',
                    existingPostURL:'/curriculum/api/objective/add-existing/',
                    uploadPostURL:'/curriculum/api/objective/add-upload/',
                    toAppendFormData: {objective_id: this.props.objective.get('id')}
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
                this.props.objective.get('resources').push(newResource);

                return newResource;
            },
            suggest: function(event){
                var view = this;

                suggestionsPopup = OC.customPopup('.explorer-suggest-resources-dialog');
                var resourcesBody = $('.explorer-suggest-resources-body', suggestionsPopup.dialog),
                    resourcesBodyListing = $('.explorer-suggest-resources-listing', resourcesBody);

                resourcesBodyListing.removeClass('failure');
                resourcesBody.addClass('loading');
            
                $.get('/curriculum/api/objective/' + this.props.objective.get('id') + '/suggest-resources/',
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
                    objective_id: this.props.objective.get('id'),
                    resource_collection_ID: resourceID
                };

                $.post('/curriculum/api/objective/add-existing/', serializedPost,
                    function(response){
                        var newResource = new OC.explorer.Resource(response.resource);
                        view.props.objective.get('resources').push(newResource);
                    }, 'json');
                
                resourceItem.fadeOut('fast');
            },
            renderSections: function(){
                var props = this.props;

                var metaLength = _.keys(this.props.objective.get('meta')).length;
                if (metaLength > 0){
                    var rawSections = [], sections = [], metaItem;
                    
                    _.each(this.props.objective.get('meta'), function(value, key){
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

                        return OC.explorer.MetaView({
                            key: key,
                            title: OC.explorer.metaTitles[key],
                            body: value,
                            objective: props.objective
                        });
                    });
                } else {
                    return null;
                }
            },
            render: function(){
                return React.DOM.div({className: 'explorer-resource-module-support-body'}, [
                    React.DOM.div({className: 'explorer-resource-module-support-title'}, this.props.objective.get('description')),
                    this.renderSections(),
                    React.DOM.div({className: 'explorer-resource-module-support-section explorer-resource-module-support-section-resources'}, [
                        React.DOM.div({className: 'explorer-resource-module-support-section-title'}, 'Resources'),
                        OC.explorer.ResourcesView({
                            collection: this.props.objective.get('resources'),
                            objective: this.props.objective
                        }),

                        React.DOM.button({
                            className: 'explorer-resource-actions-suggest',
                            onClick: this.suggest
                        }, 'SUGGEST MORE RESOURCES'),

                        React.DOM.div({className: 'explorer-resource-listing-body-resource-actions'}, [
                            React.DOM.button({
                                className: 'explorer-resource-actions-add',
                                onClick: this.addResource
                            }, '+ Add resource')
                        ])
                    ]),
                ]);
            }
        }),

        ModuleHeaderView: React.createClass({
            render: function(){
                return React.DOM.div({className: 'explorer-resource-module-header'}, [
                    React.DOM.div({
                        className: 'explorer-resource-module-thumbnail',
                        style: {
                            backgroundImage: 'url(' + this.props.thumbnail + ')'
                        }
                    }, ''),
                    React.DOM.div({className: 'explorer-resource-module-content'}, [
                        React.DOM.div({className: 'explorer-resource-module-content-title'}, this.props.title),
                        React.DOM.div({className: 'explorer-resource-module-content-caption'}, this.props.textbookTitle)
                    ])
                ]);
            }
        }),

        ModuleView: React.createClass({
            _backboneForceUpdate: function() {
                this.forceUpdate();
            },
            bindProps: function() {
                _.union(this.props.objectives, [this.props.settings]).map(function(model){
                    model.on('add change remove', this._backboneForceUpdate, this);
                }.bind(this));
            },
            
            componentDidMount: function() {
                this.bindProps();
            },

            /*componentDidUpdate: function() {
                this.bindProps();
            },*/

            componentWillUnmount: function() {
                _.union(this.props.objectives, [this.props.settings]).map(function(model){
                    model.off('add change remove', this._backboneForceUpdate, this);
                }.bind(this));
            },

            renderDrawer: function(){
                // Find objective from currently selected.
                var selectedObjective = this.props.objectives.findWhere({selected: true});

                if (selectedObjective){
                    return OC.explorer.ObjectiveContextView({ objective: selectedObjective });
                } else {
                    return null;
                }
            },
            addObjective: function(){
                // Get currently visible unit.
                /*console.log('aaya tha');
                var selectedModule = $('li.textbooks .explorer-body-side-menu-light li.selected a'),
                    title = selectedModule.text(),
                    textbookTitle = selectedModule.parents('ul:first').parent().find('a:first').text();

                var unit = _.findWhere(_.findWhere(OC.explorer.textbooks, {
                    title: textbookTitle}).units, {title: title}),
                    unitObjectives = unit.objectives;*/

                var newObjective = new OC.explorer.Objective({
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
                });
            },
            render: function(){
                return React.DOM.div({className: 'explorer-resource-module'}, [
                    React.DOM.div({className: 'explorer-resource-module-main'}, [
                        OC.explorer.ModuleHeaderView({
                            thumbnail: this.props.thumbnail,
                            title: this.props.title,
                            textbookTitle: this.props.textbookTitle
                        }),

                        React.DOM.div({className: 'explorer-resource-listing'}, [
                            React.DOM.div({className: 'explorer-resource-listing-labels'}, [
                                React.DOM.div({className: 'explorer-resource-listing-labels-pre'}, ''),
                                React.DOM.div({className: 'explorer-resource-listing-labels-header'}, [
                                    React.DOM.div({className: 'explorer-resource-listing-labels-header-key' + (this.props.settings.get('drawerOpen') ?
                                        ' expand' : '')}, [
                                        React.DOM.span({className: 'explorer-resource-listing-label'}, 'Objective / Skill')
                                    ]),
                                    React.DOM.div({className: 'explorer-resource-listing-labels-header-fill' + (this.props.settings.get('drawerOpen') ?
                                        ' hide' : '')}, [
                                        React.DOM.span({className: 'explorer-resource-listing-label'}, 'Information')
                                    ])
                                ])
                            ]),
                            React.DOM.div({className: 'explorer-resource-listing-body'},
                                OC.explorer.ModuleObjectivesView({collection: this.props.objectives})),
                        ]),

                        React.DOM.div({className: 'explorer-resource-listing-actions'}, [
                            React.DOM.button({
                                id: 'new-objective',
                                onClick: this.addObjective
                            }, '+ New objective / skill'),
                        ]),
                    ]),
                    React.DOM.div({
                        className: 'explorer-resource-module-support' + (this.props.settings.get('drawerOpen') ?
                            ' show' : '')
                    }, [
                        this.renderDrawer()
                    ]),
                ]);
            }
        }),

        StatusView: React.createClass({
            _forceUpdate: function() {
                this.forceUpdate();
            },
            componentDidMount: function() {
                this.setReady();
                //this.setMessage();

                this.props.objective.on('add change remove', this._forceUpdate, this);
            },
            /*componentDidUpdate: function() {
                this.setReady();
                //this.setMessage();

                this.props.objective.off('add change remove', this._forceUpdate, this);
                this.props.objective.on('add change remove', this._forceUpdate, this);
            },*/
            componentWillUnmount: function() {
                // Ensure that we clean up any dangling references when the component is destroyed.
                this.props.objective.off('add change remove', this._forceUpdate, this);
                        },
            setReady: function(){
                if (this.props.objective.get('ready') === undefined) {
                    if (this.props.objective.get('issue').host_id !== null){
                        this.props.objective.set('ready', false);
                    } else this.props.objective.set('ready', true);
                }
            },
            /*setMessage: function(){
                if (this.props.objective.get('message') === undefined) {
                    if (this.props.objective.get('issue'))
                        this.props.objective.set('message', this.props.objective.get('issue')['message']);
                    else
                        this.props.objective.set('message', null);
                }
            },*/
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
            persist: function(){
                this.props.objective.set('statusPersist', true);
            },
            letGo: function(){
                if (! $('.light-popup-background').hasClass('show-popup-background')){
                    //this.props.objective.set('statusPersist', false);
                    //this.props.objective.set('statusShow', false);
                }
            },
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
                /*$('.light-popup-background').click(function(event){
                    OC.explorer.clearStatusFocus(false);
                    props.objective.set('statusShow', false);
                    props.objective.set('statusPersist', false);
                });*/

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
            render: function(){
                return React.DOM.div({
                    className: 'objective-status-dialog' + (
                        this.props.objective.get('statusPersist') ? ' persist' : '' ) + (
                        this.props.objective.get('statusShow') ? ' show' : '' ),
                    
                    onMouseOver: this.persist,
                    onMouseLeave: this.letGo,
                    style: this.props.objective.get('statusPosition')
                }, [
                    React.DOM.div({className: 'objective-status-pointer'}, ''),
                    React.DOM.div({className: 'objective-status-body'}, [
                        React.DOM.ul({className: 'objective-status-options'}, [
                            React.DOM.li({className: 'objective-status-option'}, [
                                React.DOM.button({
                                    className: 'objective-ready-status' + (
                                        this.props.objective.get('ready') ?  ' selected' : ''),
                                    onClick: this.makeReady,
                                }, 'Well framed objective and adequate resources'),
                            ]),
                            React.DOM.li({className: 'objective-status-option'}, [
                                React.DOM.button({
                                    className: 'objective-unready-status' + (
                                        this.props.objective.get('ready') ? '' : ' selected'),
                                    onClick: this.makeUnready,
                                }, 'Objective or resources need work'),
                            ]),
                        ]),
                        React.DOM.div({className: 'objective-status-unready-body' + (
                            this.props.objective.get('ready') ? '' : ' show')}, [
                            React.DOM.textarea({
                                name: 'unready-message',
                                placeholder: 'If you are looking for specific kinds of resources, explain here',
                                defaultValue: this.props.objective.get('issue')['message'],
                                onChange: this.changeMessage,
                                onClick: this.turnOnFocus,
                            }),
                            React.DOM.div({className: 'action-button', onClick: this.saveMessage}, 'Done')
                        ]),
                    ])
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
            renderResource: function(resource){
                return OC.explorer.ResourceView({
                    model: resource,
                    collection: this.props.collection,
                    objective: this.props.objective
                });
            },
            render: function() {
                return React.DOM.div({className: 'explorer-resource-items'},
                    this.props.collection.map(this.renderResource));
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
            render: function(){
                return React.DOM.div({className: 'explorer-resource-item'}, [
                    React.DOM.div({className: 'explorer-resource-item-thumbnail-wrapper'}, [
                        React.DOM.div({
                            className: 'explorer-resource-item-thumbnail',
                            style: {
                                backgroundImage: 'url(\'' + this.props.model.get('thumbnail') + '\')'
                            }
                        })
                    ]),
                    React.DOM.div({className: 'explorer-resource-item-content'}, [
                        React.DOM.div({className: 'explorer-resource-item-content-body'}, [
                            React.DOM.div({className: 'explorer-resource-item-content-title'}, [
                                React.DOM.a({href: this.props.model.get('url'), target: '_blank'},  this.props.model.get('title'))
                            ]),
                            React.DOM.div({className: 'explorer-resource-item-content-caption'}, 'Teachers notes: , Related learning outcomes: ')
                        ]),
                        React.DOM.div({className: 'explorer-resource-item-content-actions'}, [
                            React.DOM.div({
                                className: 'explorer-resource-item-content-action-delete',
                                onClick: this.removeResource,
                                title: 'Remove resource'
                            })
                        ])
                    ])
                ]);
            }
        }),

        ObjectiveResourcesView: React.createClass({
            _backboneForceUpdate: function() {
                this.forceUpdate();
            },

            bindProps: function() {
                [OC.explorer.settings, this.props.model].map(function(model){
                    model.on('add change remove', this._backboneForceUpdate, this);
                }.bind(this));
            },
            
            componentDidMount: function() {
                this.bindProps();
            },

            componentWillUnmount: function() {
                [OC.explorer.settings, this.props.model].map(function(model){
                    model.off('add change remove', this._backboneForceUpdate, this);
                }.bind(this));
            },

            getInitialState: function(){
                return {selected: false};
            },

            setStatusProps: function(){
                /*this.props.model.set('statusPersist', false);
                this.props.model.set('statusShow', false);
                this.props.model.set('selected', false);
                //this.props.model.set('ready', true);
                this.props.model.set('statusPosition', {
                    top: 0,
                    left: 0
                });*/
            },
            componentWillMount: function(){
                this.setStatusProps();
            },
            /*componentDidUpdate: function(){
                if (!this.props.model.has('statusShow'))
                    this.setStatusProps();

                this.bindProps();
            },*/
            toggleObjectiveStatus: function(event){
                var pre = $(event.target);

                this.props.model.set('statusPosition', {
                    top: pre.offset().top,
                    left: pre.offset().left + (pre.width() / 2) + 7
                });

                var props = this.props;
                
                console.log(props.model.get('statusShow'));
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
            openDrawer: function(){
                //this.replaceState({selected: true});
                // Remove all objective selecteds.
                this.props.objectives.where({selected: true}).forEach(function(objective){
                    objective.set({selected: false});
                });

                this.props.model.set('selected', true);

                $('.explorer-resource-module-main').addClass('compress');
                //$('.explorer-resource-module-support').addClass('show');
                OC.explorer.settings.set('drawerOpen', true);

                $('.explorer-resource-module-support-body').height(
                    $('.explorer-body-stage').height() - (parseInt($(
                    '.explorer-body-stage-spread').css('padding-top'), 10) * 2) -
                    parseInt($('.explorer-resource-module-support-body').css(
                    'padding-top'), 10) * 2);
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
                        onClick: this.toggleObjectiveStatus,
                        //onMouseLeave: this.hideObjectiveStatus
                    }, ''),
                    React.DOM.div({className: 'explorer-resource-listing-body-content'}, [
                        React.DOM.div({className: 'explorer-resource-listing-body-content-key' + (
                            OC.explorer.settings.get('drawerOpen') ? ' expand' : '')}, [
                            OC.explorer.ObjectiveView({model: this.props.model})
                        ]),
                        React.DOM.div({className: 'explorer-resource-listing-body-content-fill' + (
                            OC.explorer.settings.get('drawerOpen') ? ' hide' : '')}, [
                        ])
                    ]),
                    OC.explorer.StatusView({
                        objective: this.props.model,
                        persist: this.props.model.get('statusPersist'),
                        show: this.props.model.get('statusShow'),
                        position: this.props.model.get('statusPosition'),
                    })
                ]);

                /*return React.DOM.div({className: 'explorer-resource-objective-section'}, [
                    React.DOM.div({
                        className: 'explorer-resource-listing-body-pre' + (
                            this.props.model.get('ready') === undefined ? (
                                this.props.model.get('issue').host_id !== null ? ' has-issue': '') : (
                                this.props.model.get('ready') ? '' : ' has-issue')
                            ),
                        onMouseOver: this.renderObjectiveStatus,
                        onMouseLeave: this.hideObjectiveStatus
                    }, ''),
                    React.DOM.div({className: 'explorer-resource-listing-body-content'}, [
                        React.DOM.div({className: 'explorer-resource-listing-body-content-fill'}, [
                            OC.explorer.ObjectiveView({model: this.props.model})
                        ]),
                        React.DOM.div({className: 'explorer-resource-listing-body-content-key'}, [
                            OC.explorer.ResourcesView({
                                collection: this.props.model.get('resources'),
                                objective: this.props.model
                            }),
                            React.DOM.div({className: 'explorer-resource-listing-body-resource-actions'}, [
                                React.DOM.button({
                                    className: 'explorer-resource-actions-add',
                                    onClick: this.addResource
                                }, '+ Add resource')
                            ])
                        ])
                    ]),
                    OC.explorer.StatusView({
                        objective: this.props.model,
                        persist: this.props.model.get('statusPersist'),
                        show: this.props.model.get('statusShow'),
                        position: this.props.model.get('statusPosition'),
                    })
                ]);*/
            }
        }),

        ModuleObjectivesView: React.createClass({
            mixins: [BackboneMixin],
            componentWillReceiveProps: function(nextProps){
                if (nextProps.collection instanceof Backbone.Collection)
                    this.wrapper.collection = nextProps.collection;
            },
            renderObjective: function(objective){
                return OC.explorer.ObjectiveResourcesView({
                    model: objective,
                    objectives: this.getCollection()
                });
            },
            render: function(){
                return React.DOM.div({className: 'explorer-resource-objective-sections'},
                    this.getCollection().models.map(this.renderObjective));
            }
        }),

        CurriculumIssuesSetView: React.createClass({
            renderCurriculumIssues: function(unit){
                return OC.explorer.CurriculumIssuesView({unit: unit});
            },
            render: function(){
                return React.DOM.div({className: 'explorer-overview-issues'},
                    this.props.units.map(this.renderCurriculumIssues));
            }
        }),

        CurriculumIssuesView: React.createClass({
            render: function(){
                return React.DOM.div({className: 'explorer-overview-issues-set'}, [
                    OC.explorer.ModuleHeaderView({
                        title: this.props.unit.unitTitle.toUpperCase(),
                        textbookTitle: this.props.unit.textbookTitle.toUpperCase(),
                        thumbnail: this.props.unit.textbookThumbnail
                    }),
                    OC.explorer.IssuesView({objectives: this.props.unit.objectives})
                ]);
            }
        }),

        IssuesView: React.createClass({
            renderIssue: function(objective){
                return OC.explorer.IssueView({objective: objective});
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

        IssueView: React.createClass({
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
                            this.props.objective.get('issue')['message'])
                    ])
                ]);
            }
        }),

        Genie: React.createClass({
            render: function(){
                return React.DOM.div({className: 'wide-header explorer-body'}, [
                    React.DOM.div({className: 'explorer-body-side scrollable-block'}, [
                        React.DOM.ul({className: 'explorer-body-side-menu explorer-body-side-menu-main scroll-content'}, [
                            React.DOM.li({className: 'overview'}, [
                                React.DOM.a({href: ''}, 'OVERVIEW')
                            ]),
                            React.DOM.li({className: 'textbooks'}, [
                                React.DOM.a({href: ''}, 'UNITS / RESOURCES')
                            ]),
                        ])
                    ]),

                    React.DOM.div({className: 'explorer-body-stage'}, [
                        React.DOM.div({className: 'explorer-body-stage-spread'}, [
                            React.DOM.div({className: 'explorer-resource-overview show'}, [
                                React.DOM.div({className: 'explorer-overview-section'}, [
                                    React.DOM.h2({}, 'Overview'),
                                    React.DOM.p({}, this.props.description),
                                ]),

                                React.DOM.div({className: 'explorer-overview-section'}, [
                                    React.DOM.div({className: 'explorer-overview-unit-table'}, '')
                                ]),

                                React.DOM.div({className: 'explorer-overview-section'}, [
                                    React.DOM.h2({}, 'Issues'),

                                    React.DOM.div({className: 'explorer-overview-issues-wrapper explorer-resource-module'}, [

                                    ])
                                ]),

                            ]),
                        ]),
                    ]),

                ]);
            }
        }),

        initSideNavigation: function(){
            // Learning outcomes / Standards.
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

            $('li.learning-outcomes').append(menu);

            // Textbooks / resources.
            var k, l, /*textbooks = _.keys(OC.explorer.rawTexts), */resourcesMenu,
                textbookLi, textbookMenu, textbookURL, textbookChapters, ChapterLi, ChapterURL;

            resourcesMenu = $('<ul/>', {
                'class': 'explorer-body-side-menu'
            });
            for (k = 0; k < OC.explorer.textbooks.length; k++){
                textbookLi = $('<li/>');
                textbookURL = $('<a/>', {
                    'href': '',
                    'text': OC.explorer.textbooks[k].title
                });
                textbookLi.append(textbookURL);

                textbookMenu = $('<ul/>', {
                    'class': 'explorer-body-side-menu explorer-body-side-menu-light'
                });

                textbookChapters = OC.explorer.textbooks[k].units;
                for (l = 0; l < textbookChapters.length; l++){
                    ChapterLi = $('<li/>');
                    ChapterURL = $('<a/>', {
                        'href': '',
                        'id': 'unit-' + textbookChapters[l].id,
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

            $('li.overview > a').click(function(event){
                OC.explorer.initOverview();

                event.stopPropagation();
                event.preventDefault();
                return false;
            });

            // Bind clicks on the lesson names.
            $('li.textbooks .explorer-body-side-menu-light li a').click(
                OC.explorer.openUnit);
        },

        initActions: function(){
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
        },

        initOverview: function() {
            function objectiveHasIssues(objective){
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

            React.renderComponent(OC.explorer.CurriculumIssuesSetView(
                {units: issueUnits}), $('.explorer-overview-issues-wrapper').get(0),
                function(){
                    $('.explorer-loader').removeClass('show');
                }
            );

            OC.explorer.renderUnitTable();
        },

        resetPreHeights: function(reverse) {
            // Set height of pre-columns to 100% of parent - bad CSS problem.
            var objectivePres = $('.explorer-resource-listing-body-pre, .explorer-resource-listing-labels-pre');

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

        openUnit: function(event, callback){
            $('.explorer-loader').addClass('show');

            $('li.textbooks .explorer-body-side-menu-light li.selected').removeClass('selected');
            
            //$('.explorer-resource-listing').addClass('show');
            $('.explorer-resource-module-wrapper').addClass('show');

            $('.explorer-resource-overview').removeClass('show');

            var title = $(event.target).text(),
                textbookTitle = $(event.target).parents('ul:first').parent().find('a:first').text(),
                textbook = _.findWhere(OC.explorer.textbooks, {title: textbookTitle});

            var objectivePres = $('.explorer-resource-listing-body-pre');
            objectivePres.height('');

            var unit = _.findWhere(textbook.units, {title: title});

            React.renderComponent(OC.explorer.ModuleView({
                title: title.toUpperCase(),
                textbookTitle: textbookTitle.toUpperCase(),
                thumbnail: textbook.thumbnail,
                objectives: unit.objectives,
                settings: OC.explorer.settings,
                id: unit.id

            }), $('.explorer-resource-module-wrapper').get(0), function(){
                OC.explorer.resetPreHeights();
                if (callback) callback();
                $('.explorer-loader').removeClass('show');
            });

            $(event.target).parent('li').addClass('selected');

            event.stopPropagation();
            event.preventDefault();
            return false;
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

        renderUnitTable: function() {
            // Build the time table based on the curriculum period and unit begin -> end.
            if (OC.explorer.curriculumSettings.periods == 'weekly'){
                var numWeeks = 0;

                // Go through every textbook / unit and build a period representation.
                unitPeriods = _.flatten(_.map(OC.explorer.textbooks, function(textbook){
                    return _.map(textbook.units, function(unit){
                        return {
                            id: unit.id,
                            textbookTitle: textbook.title,
                            title: unit.title,
                            textbookThumbnail: textbook.thumbnail,
                            begin: unit.period ? unit.period.begin : null,
                            end: unit.period ? unit.period.end : null
                        };
                    });
                }));
                var unitsWithPeriods = _.sortBy(_.reject(
                    unitPeriods, function(unitPeriod){ return unitPeriod.end === null; }), function(unit){
                    return unit.begin;
                });

                var end = _.max(unitsWithPeriods, function(unitPeriod){ return unitPeriod.end; }).end,
                    begin = _.min(unitsWithPeriods, function(unitPeriod){ return unitPeriod.begin; }).begin;

                numWeeks = Math.ceil((end - begin) / 7);
                
                $('.explorer-overview-unit-table').html('');
                $('.explorer-overview-unit-table').append($('<div/>', {
                    'class': 'explorer-overview-timetable'
                }));
                $('.explorer-overview-unit-table').append($('<div/>', {
                    'class': 'explorer-overview-unitflow'
                }));

                var i, timetable = $('.explorer-overview-timetable');
                for (i = 0; i < numWeeks; i++){
                    timetable.append($('<div/>', {
                        'class': 'explorer-timetable-period',
                        'text': 'Week ' + (i + 1)
                    }));
                }

                var j, appendedUnit, unitflow = $('.explorer-overview-unitflow');
                for (i = 0; i < unitsWithPeriods.length; i++){
                    unitflow.append($('<a/>', {
                        'class': 'explorer-unitflow-unit',
                        //'text': unitsWithPeriods[i].title,
                        'id': 'textbook-unit-' + unitsWithPeriods[i].id,
                        'style': 'height: ' + (((
                            unitsWithPeriods[i].end - unitsWithPeriods[i].begin + 1) * 12) - 41) + 'px'
                    }));

                    appendedUnit = $('.explorer-unitflow-unit:last');
                    
                    appendedUnit.click(function(event){
                        event.target = $('a#unit-' + $(
                            this).attr('id').substring(14)).get(0);
                        OC.explorer.openUnit(event);
                    });

                    React.renderComponent(OC.explorer.ModuleHeaderView({
                        title: unitsWithPeriods[i].title,
                        textbookTitle: unitsWithPeriods[i].textbookTitle,
                        thumbnail: unitsWithPeriods[i].textbookThumbnail
                    }), appendedUnit.get(0));
                }
            }
        },

        metaTitles: {
            'methodology': 'Methodology',
            'how': 'The \'How\'',
            'wordwall': 'Word Wall Must Haves',
            'prerequisites': 'Pre-requisites'
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

        cachedResources: []

    });

    $(document).ready(function($){
        function resizeApp(){
            $('.explorer-body').height(
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

        resizeApp();
        $(window).resize(resizeApp);

        // Build a new Backbone'd object from textbook and chapter names.
        OC.explorer.textbooks = []; //{};

        var i, j, k, objective, resources;
        for (i = 0; i < OC.explorer.rawTexts.length; i++){
            rawTextbook = OC.explorer.rawTexts[i];
            rawUnits = [];

            for (j = 0; j < rawTextbook.units.length; j++){
                var rawUnit = rawTextbook.units[j],
                    rawObjectives = rawUnit.objectives;
            /*rawUnits = _.pluck(rawTextbook, 'title');

            unitMaps = {};
            _.each(rawUnits, function(unit){
                var rawObjectives = _.findWhere(rawTextbook, {'title': unit}).objectives;
                */
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

        OC.explorer.settings = new OC.explorer.Settings({drawerOpen: false});

        // Main grade-subject menu on home hover.
        OC.explorer.initGradeSubjectMenu();

        OC.explorer.initSideNavigation();

        OC.explorer.initActions();

        OC.explorer.initOverview();

        $('.explorer-body-side').nanoScroller({
            paneClass: 'scroll-pane',
            sliderClass: 'scroll-slider',
            contentClass: 'scroll-content',
            flash: true
        });
    });
});


