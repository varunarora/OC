define(['react', 'curriculumItems', 'curriculumActions', 'curriculumSettings', 'curriculumUtils'],
    function(React, Items, Actions, Settings, Utils){

    var ModuleSectionItemWrapper = React.createClass({
        getInitialState: function(){
            return {selected: false};
        },
        moveItemTo: function(itemID, beforeItemID, sections){
            Actions.moveItem(itemID, beforeItemID);
            Actions.moveItemSave(Items.getToShift());
        },
        componentDidMount: function() {
            //this.setReady();

            var view = this,
                handle = this.getDOMNode().querySelector('.explorer-resource-section-listing-item-handle');

            if (handle){
                Utils.itemDraggable(handle,
                    'explorer-resource-section-listing-items',
                    'explorer-resource-section-listing-item',
                    this.props.model.get('description'),
                    function(acceptingElement){
                        // Get item # from its ID.
                        view.moveItemTo(view.props.model.get('id'),
                            acceptingElement.id.substring(5),
                            view.props.collection
                        );
                    }
                );
            }
        },
        /*setReady: function(){
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
        },*/

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
            Actions.openItem(this.props.model);
            //this.props.openDrawer(this.props.model);
        },

        render: function(){
            return React.DOM.div({
                className: 'explorer-resource-section-listing-item ' + OC.config.palette.title + '-item' + (
                    this.props.model.get('selected') ? ' selected' : ''),
                onClick: this.openDrawer,
                id: 'item-' + this.props.model.get('id')
            }, [
                React.DOM.div({className: 'explorer-resource-section-listing-item-handle-wrapper'},
                    Settings.getCanEdit() ? React.DOM.div({className: 'explorer-resource-section-listing-item-handle'}, null) : null
                ),
                /*React.DOM.div({
                    className: 'explorer-resource-section-listing-item-pre' + (
                        this.props.model.get('ready') === undefined ? (
                            this.props.model.get('issue').host_id !== null ? ' has-issue': '') : (
                            this.props.model.get('ready') ? '' : ' has-issue')
                        ),
                    onClick: this.toggleStatus,
                    key: 0
                }, ''),*/
                
                React.DOM.div({className: 'explorer-resource-section-listing-item-content', key: 1}, [
                    /*React.DOM.div({className: 'explorer-resource-section-listing-item-content-key' + (
                        this.props.drawerOpen ? ' expand' : ''), key: 0},*/
                        ModuleSectionItem({
                            model: this.props.model,
                            openDrawer: this.openDrawer,
                            edit: this.props.edit
                        })
                    //),
                    /*React.DOM.div({className: 'explorer-resource-section-listing-item-content-fill' + (
                        this.props.drawerOpen ? ' hide' : ''), key: 1}, null)*/
                ]),

                /*Status({
                    key: 2,
                    model: this.props.model,
                    persist: this.props.model.get('statusPersist'),
                    show: this.props.model.get('statusShow'),
                    position: this.props.model.get('statusPosition'),
                    makeReady: this.makeReady,
                    makeUnready: this.makeUnready,
                    turnOnFocus: this.turnOnFocus
                })*/

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
            newDescription = event.target.innerHTML;

            if (this.props.model.get('description') !== newDescription){
                OC.utils.status.saving();

                item = this.props.model.set('description', newDescription);

                Actions.updateItem({
                    'id' : item.get('id'),
                    'description': item.get('description')
                    }, function(){
                        OC.utils.status.saved();
                    }
                );

                //this.props.model.save(null, {
                //    success: function(){
                //        OC.utils.status.saved();
                //    }
                //});
            }
        },
        render: function(){
            return React.DOM.div({
                className: 'explorer-resource-objective',
                contentEditable: Settings.getCanEdit() ? true : false,
                title: this.props.model.get('description'),
                onBlur: this.save
            }, this.props.model.get('description'));
        }
    });

    return ModuleSectionItemWrapper;
});