define(['react', 'curriculumActions', 'curriculumSettings', 'curriculumUtils', 'immutable',
    'showdown', 'curriculumItems', 'plannerStore', 'plannerWidget'],
    function(React, Actions, Settings, Utils, Immutable, Showdown, Items, Planner, PlannerWidget){

    var Context = React.createClass({
        /*componentDidMount: function() {
            $(this.getDOMNode()).nanoScroller({
                paneClass: 'scroll-pane',
                sliderClass: 'scroll-slider',
                contentClass: 'scroll-content',
                flash: true
            });
        },*/

        componentDidMount: function(){
            var titleBarEl = this.getDOMNode().querySelector(
                '.explorer-resource-module-support-title'),
                contentsEl = this.getDOMNode().querySelector(
                    '.explorer-resource-module-support-contents'),
                preEl = this.getDOMNode().querySelector(
                    '.explorer-resource-module-support-pre');

            var view = this;
            function resizeContents(){
                contentsEl.style.height = (
                    parseInt(OC.$.css(view.getDOMNode(), 'height'), 10) - (
                    parseInt(OC.$.css(titleBarEl, 'height'), 10)) - (
                    parseInt(OC.$.css(titleBarEl, 'paddingTop'), 10) * 2) - (
                    parseInt(OC.$.css(preEl, 'height'), 10)) - (
                    parseInt(OC.$.css(contentsEl, 'paddingTop'), 10)) - (
                    parseInt(OC.$.css(document.querySelector('.explorer-resource-module-main'), 'marginTop'), 10) * 4) + 'px');
            }

            resizeContents();
            window.addEventListener('resize', resizeContents);

            Items.on('change', this._onChange);

            // Set a tip for 'Add to planner'
            if (this.refs.addToPlanner) OC.utils.tip(this.refs.addToPlanner.getDOMNode());
            if (this.refs.delete) OC.utils.tip(this.refs.delete.getDOMNode());
        
            // Set positioning of field menu.
            var menuPosition = OC.utils.menu(this.getDOMNode().querySelector(
                'nav.planner-menu'), this.refs.addToPlanner.getDOMNode(), true);

            /*window.addEventListener('resize', function(){
                this.getDOMNode().style.height = parseInt(OC.$.css(document.querySelector('.content-panel-body-wrapper'), 'height'), 10) - (
                    parseInt(OC.$.css(document.querySelector('.explorer-resource-module-main'), 'marginTop'), 10) * 4) + 'px';
            });*/
        },

        getInitialState: function(){
            return {
                addFieldState: Items.getFieldState(),
                newFieldName: null,
                newFieldType: 'text',
                item: Items.get(this.props.itemID),
                showPlanner: Items.getShowPlanner()
            };
        },

        componentWillUnmount: function(){
            Items.removeListener('change', this._onChange);
        },

        _onChange: function(){
            this.setState({
                addFieldState: Items.getFieldState(),
                item: Items.getSelected(),
                showPlanner: Items.getShowPlanner()
            });
        },

        deleteItem: function(){
            Actions.deleteItem(this.props.itemID);
        },

        moveMetaTo: function(fieldID, beforeFieldID, item, resourceSets, toMoveIsMeta,
            resourceSet, callback, acceptingElement){

            Actions.moveField(fieldID, parseInt(beforeFieldID, 10),
                this.state.item.get('id'), toMoveIsMeta, resourceSet ? true : false);
            Actions.moveFieldSave(this.state.item.get('id'), Items.getMetaToShift());
        },

        makeDraggable: function(element, title, id, isMeta){
            var view = this, resourceSetID;

            function success(fromID, toID, acceptingElement){
                var section = OC.$.parents(element, 'explorer-resource-module-support-section');
                if (isMeta) section.id = 'meta-' + fromID;
                else section.attr.id = 'resources-' + fromID;

                if (acceptingElement.id.indexOf('meta') !== -1)
                    acceptingElement.id = 'meta-' + toID;
                else acceptingElement.id = 'resources-' + toID;
            }

            Utils.itemDraggable(element,
                'explorer-resource-module-support-body',
                'explorer-resource-module-support-section',
                title,
                function(acceptingElement){
                    // Get item # from its ID.
                    if (acceptingElement.id.indexOf('meta') !== -1){
                        view.moveMetaTo(id,
                            acceptingElement.id.substring(5),
                            view.props.item,
                            null, //view.props.item.get('resource_sets'),
                            isMeta,
                            true,
                            success,
                            acceptingElement
                        );
                    } else {
                        resourceSetID = acceptingElement.id.substring(10);
                        view.moveMetaTo(id,
                            resourceSetID,
                            view.props.item,
                            null, //view.props.item.get('resource_sets'),
                            isMeta,
                            false,
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
            var metaLength = this.state.item.get('meta').length;

            if (metaLength > 0 || this.state.item.get('resource_sets').length > 0){
                var metaProps = this.state.item.get(
                    'meta').concat(this.state.item.get('resource_sets')).map(function(metaItem, index){
                    
                    if (metaItem.hasOwnProperty('slug')){
                        return {
                            key: metaItem['slug'],
                            index: index,
                            title: metaItem.hasOwnProperty('title') ? metaItem.title : '(Unnamed)',
                            body: metaItem['body'],
                            item: view.state.item,
                            position: metaItem['position'],
                            makeDraggable: view.makeDraggable
                        };
                    } else {
                        return {
                            key: metaItem.id ? metaItem.id : 0,
                            id:  metaItem.id,
                            collection: metaItem.resources,
                            title: metaItem.title,
                            item: view.state.item,
                            parent: view.state.item.get('parent'),
                            position: metaItem.position,
                            makeDraggable: view.makeDraggable
                        };
                    }
                });

                return metaProps.sort(function(a,b){ return a.position - b.position; }).map(function(metaProp){
                    if (metaProp.hasOwnProperty('index')){
                        return Meta(metaProp);
                    } else {
                        return ResourcesView(metaProp);
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
            var maxPosition = OC.$.max(this.state.item.get('resource_sets').concat(
                this.state.item.get('meta')), function(resourceSet){
                    return resourceSet.position; }).position,
                view = this;

            Actions.addField(
                this.state.newFieldName,
                this.state.newFieldType,
                maxPosition + 1,
                this.state.item.get('id')
            );

            // Save the item.
            Actions.addFieldPost(
                Items.get(view.state.item.get('id')),
                Items.getUnsavedField(view.state.item.get('id')),
                
                function(itemID, resourceSetID){
                    if (view.state.newFieldType === 'resources'){
                        Actions.addFieldComplete(itemID, resourceSetID);
                    } else {
                        Actions.addFieldComplete();
                    }
                }
            );

            /*this.props.addField(
                this.state.newFieldName,
                this.state.newFieldType,
                maxPosition + 1,
                this.props.item.get('id'),
                this.props.section.id,
                function(){
                    view.setState({addFieldState: false});
                }
            );*/
        },

        updateNewFieldTitle: function(event){
            this.setState({newFieldName: event.target.value});
        },

        updateNewFieldType: function(event){
            this.setState({newFieldType: event.target.value});
        },

        togglePlanner: function(){
            var view = this;
            
            //Actions.dim();
            Actions.launchPlanner();

            /*this.setState({showPlanner: !this.state.showPlanner}, function(){
                    Actions.dim();

                    var view = this, body = document.querySelector('body');
                    body.addEventListener('click', function hideMenu(event){
                        if (view.getDOMNode() !== event.target && !view.getDOMNode(
                            ).contains(event.target)){
                            view.setState({showPlanner: false});

                            body.removeEventListener('click', hideMenu);

                            event.preventDefault();
                            event.stopPropagation();
                            return false;
                        }
                    });
                }
            });*/
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
                className: 'explorer-resource-module-support-body pseudo-card'/* + 'scrollable-block'*/,
                style: {
                    height: '100%'
                    //height: parseInt(OC.$.css(document.querySelector('.content-panel-body-wrapper'), 'height'), 10) - (
                    //    parseInt(OC.$.css(document.querySelector('.explorer-resource-module-main'), 'marginTop'), 10) * 4) + 'px'
                    }
            }, this.state.item ? [
                React.DOM.div({
                    className: 'explorer-resource-module-support-pre card-toolbar',
                    style: {
                        backgroundColor: OC.config.palette.dark
                    }
                }, [
                    OC.config.user.id ? React.DOM.div({
                        className: 'explorer-resource-module-support-pre-planner ' + OC.config.palette.title + '-button',
                        ref: 'addToPlanner',
                        title: 'Add to Planner',
                        onClick: this.togglePlanner
                    }) : null,
                    OC.config.user.id ? PlannerWidget.Widget({
                        open: this.state.showPlanner,
                        id: this.state.item.get('id')
                    }, {
                        cancelEventSelect: function(){
                            Actions.clearEventSelection();
                        },
                        confirmEventSelect: function(itemID, eventID){
                            Actions.confirmAddItemToEvent(itemID, eventID);
                            Actions.brighten();
                        },
                        dateSelect: function(date){
                            Actions.selectDate(date);
                        },
                        eventSelect: function(eventID, eventDate){
                            Actions.selectPlannerEvent(eventID, eventDate);
                        }
                    }) : null,
                    Settings.getCanEdit() ? React.DOM.div({
                        className: 'explorer-resource-module-support-delete ' + OC.config.palette.title + '-button',
                        ref: 'delete',
                        title: 'Delete',
                        onClick: this.deleteItem
                    }) : null
                ]),
                React.DOM.div({
                    className: 'explorer-resource-module-support-title',
                    style: {
                        backgroundColor: OC.config.palette.base
                    },
                    key: 0
                }, this.state.item.get('description')),

                React.DOM.div({className: 'explorer-resource-module-support-contents'}, [
                    React.DOM.div({className: 'explorer-resource-module-support-sections', key: 1}, this.renderSections()),

                    Settings.getCanEdit() ? this.state.addFieldState ? addFieldView : (
                        React.DOM.div({
                            className: 'explorer-resource-module-support-new-field',
                            onClick: this.addField,
                            key: 3
                        },
                            '+ ADD FIELD'
                    )) : null
                ])
            ]: null);
        }
    });

    var Meta = React.createClass({
        getInitialState: function(){
            return {body: this.props.body, showMenu: false};
        },
        componentDidMount: function(){
            var view = this;

            function setPlaceholderContent() {
                if (this.textContent) {
                    this.setAttribute('data-div-placeholder-content', 'true');
                }
                else {
                    this.removeAttribute('data-div-placeholder-content');
                }
            }

            var eventsToListenTo = ['change keydown keypress input'];
            eventsToListenTo.forEach(function(event){
                OC.$.addListener(view.getDOMNode().querySelector('*[data-placeholder]'), event, setPlaceholderContent);
            });

            var handle = this.getDOMNode().querySelector(
                '.explorer-resource-module-support-section-handle');
            
            if (handle){
                this.props.makeDraggable(
                    handle, this.props.title,
                    this.props.index, true
                );
            }

            if (Settings.getCanEdit()){
                // Set positioning of field menu.
                var actions = this.refs.actions.getDOMNode();
                OC.$.addClass(actions, 'show');
                var menuPosition = OC.utils.menu(this.getDOMNode().querySelector(
                    'nav.field-menu'), actions);
                OC.$.removeClass(actions, 'show');
                this.setState({ menuPosition: menuPosition });
            }
        },
        componentWillReceiveProps: function(nextProps){
            this.setState({body: nextProps.body });
        },
        componentDidUpdate: function(){
            //$(this.getDOMNode).find('.explorer-resource-module-support-section-body').trigger('change');
        },
        save: function(event){
            newValue = event.target.innerHTML;
            currentMetas = this.props.item.get('meta');

            this.setState({body: newValue});

            if (currentMetas[this.props.key] !== newValue){
                OC.utils.status.saving();

                var i;
                for (i = 0; i < currentMetas.length; i++){
                    if (currentMetas[i].slug === this.props.key){
                        currentMetas[i].body = newValue;
                    }
                }

                Actions.updateItem({
                    'id' : this.props.item.get('id'),
                    'meta': currentMetas
                    }, function(){
                        OC.utils.status.saved();
                    }
                );
            }

        },
        toggleMenu: function(){
            var view = this;

            if (!this.state.showMenu){
                this.state.menuPosition.reset();
            }
            this.setState({showMenu: !this.state.showMenu}, function(){
                if (this.state.showMenu){
                    var view = this, body = document.querySelector('body');
                    body.addEventListener('click', function hideMenu(event){
                        if (view.getDOMNode() !== event.target && !view.getDOMNode(
                            ).contains(event.target)){
                            view.setState({showMenu: false});

                            body.removeEventListener('click', hideMenu);
                        }
                    });
                }
            });
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
            // Check for isObject inspired from http://stackoverflow.com/questions/8511281/check-if-a-variable-is-an-object-in-javascript
            var isStandardsFieldView = (this.state.body !== null && typeof this.state.body === 'object') && this.state.body.type == 'standards';

            var metaBody, hideTitle = (this.state.body !== null && typeof this.state.body === 'object') && this.state.body.hideTitle;

            if (isStandardsFieldView){
                metaBody = React.DOM.div({
                    className: 'explorer-resource-module-support-section-body'
                }, this.state.body.standards.map(this.renderStandard));
            } else {
                var converter = new Showdown.converter(),
                    body = hideTitle ? this.state.body.body : this.state.body;

                metaBody = React.DOM.div({
                    className: 'explorer-resource-module-support-section-body',
                    contentEditable: Settings.getCanEdit() ? true : false,
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
                    Settings.getCanEdit() ? React.DOM.div({className: 'explorer-resource-module-support-section-handle'}, null) : null
                ),
                hideTitle ? null : React.DOM.div({className: 'explorer-resource-module-support-section-title-wrapper'},
                    React.DOM.div({className: 'explorer-resource-module-support-section-title', key: 0}, this.props.title),
                    metaBody
                ),
                Settings.getCanEdit() ? React.DOM.div({
                    className: 'explorer-resource-module-support-section-actions',
                    onClick: this.toggleMenu,
                    ref: 'actions'
                }, null) : null,
                Settings.getCanEdit() ? FieldMenu({
                    open: this.state.showMenu,
                    id: this.props.index,
                    itemID: this.props.item.get('id'),
                    meta: true,
                }) : null
            ]);
        }
    });

    var ResourcesView = React.createClass({
        getInitialState: function(){
            return {showMenu: false};
        },
        _forceUpdate: function() {
            this.forceUpdate();
        },
        componentDidMount: function() {
            // TODO
            //this.props.collection.on('add change remove', this._forceUpdate, this);

            var handle = this.getDOMNode().querySelector(
                '.explorer-resource-module-support-section-handle');

            if (handle){
                this.props.makeDraggable(handle,
                    this.props.title ? this.props.title : 'Resources', this.props.id, false
                );
            }

            if (Settings.getCanEdit()){
                // Set positioning of field menu.
                var actions = this.refs.actions.getDOMNode();
                OC.$.addClass(actions, 'show');
                var menuPosition = OC.utils.menu(this.getDOMNode().querySelector(
                    'nav.field-menu'), actions);
                OC.$.removeClass(actions, 'show');
                this.setState({ menuPosition: menuPosition });
            }
        },
        componentWillMount: function() {
            /*if (! this.props.collection.hasOwnProperty('models')){
                this.props.collection = Immutable.List();
            }*/
        },
        addResource: function(event){
            var view = this;
            
            OC.utils.post({
                title: 'Add a resource',
                message: 'What would you like to add?',
                postTitle: 'Add and finish',
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

            //OC.appBox.saved();
            OC.utils.status.saved();
        },
        resourceSent: function(rawResource){
            //OC.appBox.saving();
            OC.utils.status.saving();

            var resource = Immutable.Map(rawResource);
            Actions.addResource(resource, this.props.id);

            return resource;
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
            return ResourceView({
                model: resource,
                //collection: this.props.collection,
                //objective: this.props.objective,
                resourceSetID: this.props.id,
                key: resource.get('id')
            });
        },
        toggleMenu: function(){
            var view = this;

            if (!this.state.showMenu){
                this.state.menuPosition.reset();
            }
            this.setState({showMenu: !this.state.showMenu}, function(){
                if (this.state.showMenu){
                    var view = this, body = document.querySelector('body');
                    body.addEventListener('click', function hideMenu(event){
                        if (view.getDOMNode() !== event.target && !view.getDOMNode(
                            ).contains(event.target)){
                            view.setState({showMenu: false});

                            body.removeEventListener('click', hideMenu);
                        }
                    });
                }
            });
        },
        render: function() {
            return React.DOM.div({className: 'explorer-resource-module-support-section explorer-resource-module-support-section-resources',
                id: 'resources-' + this.props.id}, [
                React.DOM.div({className: 'explorer-resource-module-support-section-handle-wrapper'},
                    Settings.getCanEdit() ? React.DOM.div({className: 'explorer-resource-module-support-section-handle'}, null) : null
                ),

                React.DOM.div({className: 'explorer-resource-module-support-section-title-wrapper'},
                    React.DOM.div({className: 'explorer-resource-module-support-section-title', key: 0}, this.props.title ? this.props.title : 'Resources')
                ),
                Settings.getCanEdit() ? React.DOM.div({
                    className: 'explorer-resource-module-support-section-actions',
                    onClick: this.toggleMenu,
                    ref: 'actions'
                }, null) : null,
                Settings.getCanEdit() ? FieldMenu({open: this.state.showMenu, id: this.props.id, meta: false}) : null,

                this.props.collection.size > 0 ? React.DOM.div({className: 'explorer-resource-items', key: 1},
                    this.props.collection.map(this.renderResource).toJS()) : null,

                this.props.parent ? React.DOM.div({className: 'explorer-resource-actions-suggest-wrapper'},
                React.DOM.button({
                    className: 'explorer-resource-actions-suggest',
                    onClick: this.suggest,
                    key: 2
                }, 'SUGGEST MORE RESOURCES')) : null,

                Settings.getCanEdit() ? React.DOM.div({className: 'explorer-resource-listing-body-resource-actions', key: 3},
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
            OC.utils.status.saving();

            Actions.removeResource(
                this.props.item.get('id'),
                this.props.resourceSetID,
                function(){
                    OC.utils.status.saved();
                }
            );
        },
        openSesame: function(event){
            Utils.openResourcePreview(
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
                                onClick: ['pdf', 'document', 'reference'].indexOf(this.props.model.get('type')) !== -1 ? this.openSesame : null
                            },  this.props.model.get('title'))
                        ),
                        React.DOM.div({className: 'explorer-resource-item-content-caption', key: 1}, '')
                    ]),
                    Settings.getCanEdit() ? React.DOM.div({className: 'explorer-resource-item-content-actions', key: 1},
                        React.DOM.div({
                            className: 'explorer-resource-item-content-action-delete',
                            onClick: this.removeResource,
                            title: 'Remove resource'
                        })
                    ) : null
                ])
            ]);
        }
    });

    var FieldMenu = React.createClass({
        deleteField: function(){
            if (this.props.meta === true){
                Actions.deleteMeta(this.props.id, this.props.itemID);
            } else {
                Actions.deleteResourceSet(this.props.id);
            }
        },
        render: function(){
            return React.DOM.nav({className: 'oc-menu field-menu' + (this.props.open ? ' show-menu' : '')}, [
                React.DOM.div({className: 'floating-menu-spacer'}, null),
                React.DOM.ul({},
                    React.DOM.li({}, React.DOM.a({
                        onClick: this.deleteField
                    }, 'Delete field'))
                )
            ]);
        }
    });

    return Context;
});