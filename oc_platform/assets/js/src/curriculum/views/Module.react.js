define(['react', 'curriculumItemView',  'curriculumPage', 'curriculumItems', 'curriculumActions',
    'curriculumSettings', 'curriculumUtils', 'curriculumContextView', 'curriculumUnits'],
    function(React, ModuleSectionItemWrapper, PageStore, Items, Actions, Settings, Utils, Context, Units){

    var Module = React.createClass({
        getInitialState: function(){
            return {
                drawerItem: null,
                addBlockState: false,
                newSectionName: null,
                newSectionType: 'collection',
                drawerOpen: PageStore.getDrawerView(),
                sections: Units.getUnit(this.props.id).sections
            };
        },

        componentDidMount: function(){
            PageStore.on('change', this._onChange);
            Units.on('change', this._onChange);
        },
        componentWillUnmount: function(){
            PageStore.removeListener('change', this._onChange);
            Units.removeListener('change', this._onChange);
        },
        _onChange: function(){
            this.setState({
                addBlockState: PageStore.getAddBlockState(),
                drawerOpen: PageStore.getDrawerView(),
                sections: Units.getUnit(this.props.id).sections
            });
        },

        /*getDefaultProps: function() {
            return {objective: null};
        },

        componentWillUnmount: function() {
            _.flatten(this.props.sections.map(function(section){
                return section.items;
            })).map(function(model){
                model.off('add change remove', this._backboneForceUpdate, this);
            }.bind(this));
        },*/

        componentWillMount: function(){
            OC.curriculum.spinner.stop();
        },

        renderDrawer: function(){
            function getSelectedItem(section){
                return Items.getSectionItems(section.get('id')).find(function(item){
                    return item.get('selected') === true; });
            }

            // Find objective from currently selected.
            var props = this.props;
            var selectedSection = props.sections.find(function(section){
                return getSelectedItem(section);
            });

            if (selectedSection){
                return Context({
                    itemID: getSelectedItem(selectedSection).get('id'),
                    section: selectedSection,
                    //moveMetaTo: this.props.moveMetaTo,
                    //moveResourceSetTo: this.props.moveResourceSetTo
            });
            } else {
                if (this.props.drawerView)
                    return Context();
            }
        },

        /*openDrawer: function(item){
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
        },*/

        addSection: function(event){
            this.setState({addBlockState: true}, function(){
                this.refs.newSectionInput.getDOMNode().focus();
            });
        },

        cancelAddSection: function(event){
            this.setState({addBlockState: false});
        },

        completeAddSection: function(event){
            Actions.addSection(this.state.newSectionName,
                this.state.newSectionType,
                this.props.id,
                this.props.isUnit);

            var newSectionType = this.state.newSectionType;

            Actions.addSectionPost(
                Units.getUnsavedSection(), this.props.id,
                this.props.isUnit, function(sectionID){

                    // If contextual, add first item to section.
                    if (newSectionType === 'contextual'){
                        Actions.addItemPost(Units.getSectionItem(), function(itemID){
                            // Get unsectioned item by ID.
                            Actions.addToSection(itemID, sectionID);
                        }, sectionID);
                    }
                }
            );
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
                    React.DOM.div({className: 'explorer-resource-sections-wrapper', key: 1},
                        Sections({
                            //collection: this.props.objectives,
                            sections: this.state.sections,
                            openDrawer: this.openDrawer,
                            drawerOpen: this.state.drawerOpen,
                            moveItemTo: this.props.moveItemTo
                        })
                    ),

                    Settings.getCanEdit() ? this.state.addBlockState ? addSectionView : (
                        React.DOM.div({
                            className: 'curriculum-module-new-section' + (this.props.drawerView ?
                                ' compress' : ''),
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


    var Sections = React.createClass({
        sortedRender: function(){
            this.forceUpdate();
        },
        renderSection: function(section){
            return React.DOM.div({
                className: 'explorer-resource-section card', id: 'section-' + section.get('id')},
                ModuleSection({
                    key: section.get('id'),
                    id: section.get('id'),
                    //collection: items,  // section.get('items'),
                    sections: this.props.sections,
                    title: section.get('title'),
                    type: section.get('type'),
                    //openDrawer: this.props.openDrawer,
                    drawerOpen: this.props.drawerOpen,
                    //sortedRender: this.sortedRender
                })
            );
        },
        render: function(){
            return React.DOM.div({className: 'explorer-resource-sections'},
                this.props.sections.sortBy(function(section) { return section.get('position'); }).map(
                    this.renderSection).toJS()
            );
        }
    });

    var ModuleSection = React.createClass({
        /*_backboneForceUpdate: function() {
            this.forceUpdate();
        },
        bindProps: function() {
            //this.props.collection.on('add change sort remove', this._backboneForceUpdate, this);
        },*/
        moveSectionTo: function(sectionID, beforeSectionID, sections){
            Actions.moveSection(sectionID, beforeSectionID);
            Actions.moveSectionSave(Units.getToShift());
        },
        getInitialState: function() {
            return { showMenu: false, items: this.getItems(this.props.id) };
        },
        getItems: function(){
            var items = Items.getSectionItems(this.props.id);
            if (! this.props.hasOwnProperty('id')){
                if (Items.peekUnsavedSection() === section){
                    items = section.get('items');
                }
            }
            return items;
        },
        componentDidMount: function() {
            //this.bindProps();
            var view = this;

            var i, handles = this.getDOMNode().querySelectorAll(
                '.explorer-resource-section-listing-collection-handle, .explorer-resource-section-listing-contextual-handle');

            for (i = 0; i < handles.length; i++){
                Utils.itemDraggable(
                    handles[i],'explorer-resource-sections',
                    'explorer-resource-section-body', this.props.title,
                    function(acceptingElement){
                        // Get item # from its ID.
                        view.moveSectionTo(view.props.id,
                            OC.$.parents(acceptingElement, 'explorer-resource-section').id.substring(8),
                            view.props.sections
                        );
                        //view.props.sortedRender();
                    }
                );
            }

            var blockMenu = this.getDOMNode().querySelector('nav.block-menu');
            if (blockMenu) {
                var menuPosition = OC.utils.menu(blockMenu,
                    this.getDOMNode().querySelector('.block-menu-button'));

                this.setState({ menuPosition: menuPosition });
            }

            Items.on('change', this._onChange);
        },
        componentWillUnmount: function() {
            //this.props.collection.off('add change sort remove', this._backboneForceUpdate, this);
            Items.removeListener('change', this._onChange);
        },
        componentWillReceiveProps: function(nextProps){
            if (this.props.drawerOpen !== nextProps.drawerOpen){
                if (this.state.menuPosition) this.state.menuPosition.reset();
            }
        },
        _onChange: function(){
            this.setState({
                addBlockState: PageStore.getAddBlockState(),
                items: this.getItems(this.props.id)
            });
        },
        addItem: function(){
            var sectionID = this.props.id;

            // Determine the current max position.
            Actions.addItem(sectionID);

            // Save the item.
            Actions.addItemPost(Items.getUnsavedItem(), function(itemID){
                // Get unsectioned item by ID.
                Actions.addToSection(itemID, sectionID);
            });

            /*
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
            this.props.openDrawer(newCollectionItem);*/
        },
        open: function() {
            this.props.openDrawer(this.props.collection.get(0));
        },

        toggleMenu: function(){
            var view = this;

            this.setState({showMenu: !this.state.showMenu}, function(){
                if (this.state.showMenu){
                    var view = this, body = document.querySelector('body');
                    body.addEventListener('click', function hideMenu(event){
                        if (view.getDOMNode() !== event.target && !view.getDOMNode(
                            ).contains(event.target)){
                            view.setState({showMenu: false});

                            body.removeEventListener('click', hideMenu);

                            event.preventDefault();
                            event.stopPropagation();
                            return false;
                        }
                    });
                }
            });
        },

        renderItem: function(item) {
            return ModuleSectionItemWrapper({
                key: item.id,
                title: item.get('title'),
                model: item,
                collection: this.props.collection,
                openDrawer: this.props.openDrawer,
                drawerOpen: this.props.drawerOpen,
                moveItemTo: this.props.moveItemTo
            });
        },
        render: function(){
            var titleAttributes, drawerOpen = PageStore.getDrawerView();
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
                    titleAttributes = {
                        className: 'curriculum-module-section-listing-collection'
                    };

                    if (drawerOpen){
                        titleAttributes.style = {};
                    } else titleAttributes.style = { backgroundColor: OC.config.palette.dark };

                    sectionTitle = React.DOM.div(titleAttributes,
                        React.DOM.div({className: 'explorer-resource-section-listing-collection-handle-wrapper', key: 0},
                            Settings.getCanEdit() ? React.DOM.div({className: 'explorer-resource-section-listing-collection-handle'}, '') : null
                        ),
                        React.DOM.div({className: 'curriculum-module-section-listing-collection-title-wrapper', key: 1},
                            React.DOM.div({className: 'curriculum-module-section-listing-collection-title'},
                                this.props.title)
                        ),
                        Settings.getCanEdit() ? (React.DOM.div({className: 'curriculum-module-section-listing-collection-menu block-menu-button ' + (
                            drawerOpen ? 'light' : OC.config.palette.title) + '-button', onClick: this.toggleMenu,
                            key: 2}),
                        SectionMenu({open: this.state.showMenu, id: this.props.id})): null
                    );
                //}
                return React.DOM.div({className: 'explorer-resource-section-body'}, [
                    sectionTitle,
                    React.DOM.div({className: 'explorer-resource-section-listing-items', key: 1},
                       this.state.items.sortBy(function(item) { return item.get('position'); }).map(this.renderItem).toJS()),
                    Settings.getCanEdit() ? React.DOM.div({className: 'explorer-resource-listing-actions', key: 2},
                        React.DOM.button({
                            id: 'new-item',
                            className: 'explorer-dull-button',
                            onClick: this.addItem
                        }, '+ Add new')
                    ) : null
                ]);
            } else if (this.props.type === 'contextual') {
                titleAttributes = {
                    className: 'curriculum-module-section-listing-contextual' + (this.props.collection.get(
                        0).get('selected') ? ' selected' : ''),
                    onClick: this.open
                };

                if (drawerOpen){
                    titleAttributes.style = {};
                } else titleAttributes.style = { backgroundColor: OC.config.palette.dark };


                return React.DOM.div({className: 'explorer-resource-section-body'},
                    //React.DOM.div({
                    //    className: 'explorer-resource-section-contextual-listing-title' + (this.props.collection.at(
                    //        0).get('selected') ? ' selected' : ''),
                    //    onClick: this.open
                    //}, this.props.title),

                    React.DOM.div(titleAttributes,
                        React.DOM.div({className: 'curriculum-module-section-listing-contextual-handle-wrapper', key: 0},
                            Settings.getCanEdit() ? React.DOM.div({className: 'curriculum-module-section-listing-contextual-handle'}, '') : null
                        ),
                        React.DOM.div({className: 'curriculum-module-section-listing-contextual-title-wrapper', key: 1},
                            React.DOM.div({className: 'curriculum-module-section-listing-contextual-title'},
                                this.props.title)
                        ),
                        React.DOM.div({className: 'curriculum-module-section-listing-contextual-menu block-menu-button ' + (
                            drawerOpen ? 'light' : OC.config.palette.title) + '-button', onClick: this.toggleMenu, key: 2}),
                        SectionMenu({open: this.state.showMenu, id: this.props.id})
                    )
                );
            }
        }
    });

    var SectionMenu = React.createClass({
        deleteSection: function(){
            Actions.deleteSection(this.props.id);
        },
        render: function(){
            return React.DOM.nav({className: 'oc-menu block-menu' + (this.props.open ? ' show-menu' : '')}, [
                React.DOM.div({className: 'floating-menu-spacer'}, null),
                React.DOM.ul({},
                    React.DOM.li({}, React.DOM.a({
                        onClick: this.deleteSection
                    }, 'Delete block'))
                )
            ]);
        }
    });

    return Module;
});
