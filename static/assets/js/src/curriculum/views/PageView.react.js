define(['react', 'curriculumPage', 'curriculumActions', 'curriculumSettings',
    'curriculumUnits', 'curriculumTextbooks', 'curriculumModuleView', 'reactRouter'],
    function(React, PageStore, Actions, Settings, Units, Textbooks, Module, Router){

    var Link = Router.Link;

    var Sequence = React.createClass({
        getInitialState: function(){
            return this.getStateFromStore();
        },
        getStateFromStore: function(){
            return {
                units: Units.getUnits(),
                view: PageStore.getView(),
                drawerView: PageStore.getDrawerView()
            };
        },
        componentDidMount: function(){
            PageStore.on('change', this._onChange);
            Settings.on('change', this._onChange);
        },
        componentWillUnmount: function(){
            PageStore.removeListener('change', this._onChange);
            Settings.removeListener('change', this._onChange);
        },
        _onChange: function(){
            this.setState(this.getStateFromStore());
        },

        renderPeriods: function() {
            var view = this, i;

            if (Settings.getPeriods().title == 'weekly'){
                var weeks = [];
                for (i = 0; i < PageStore.getNumWeeks(); i++){
                    weeks.push(React.DOM.div({className: 'curriculum-calendar-canvas-period'},
                        React.DOM.div({className: 'curriculum-calendar-canvas-period-title'}, 'Week '+ (i + 1))
                    ));
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

        openSettings: function(){
            Actions.openSettings();
        },

        openUnits: function(){
            Actions.openUnits();
        },

        createUnits: function(){
            Actions.openUnits(true);
        },

        renderPeriodUnits: function() {
            // Build the time table based on the curriculum period and unit begin -> end.
            var view = this;
            return Units.getUnits().toJS().map(function(unit){
                return PeriodUnitItem({
                    unit: unit,
                    click: view.renderUnit,
                    key: unit.id
                });
            });
        },

        render: function(){
            var overviewView, settingsView, unitView, unitsView, loadingView = React.DOM.div(), view = this;

            function getPageSpread(){
                switch (view.state.view){
                    case 'overview':
                        return overviewView;
                    case 'settings':
                        return settingsView;
                    case 'units':
                        return unitsView;
                    case 'loading':
                        return loadingView;
                    default:
                        return unitView;
                }
            }

            overviewView = React.DOM.div({className: 'curriculum-menu-wrapper card-wrapper'},
                React.DOM.div({className: 'curriculum-menu card'}, [
                    React.DOM.div({className: 'curriculum-pretitle-wrapper card-toolbar', style: { backgroundColor: OC.config.palette.dark }}, [
                        //React.DOM.div({className: 'curriculum-pretitle'}, Settings.getPretitle()),
                        //React.DOM.div({className: 'curriculum-pretitle-options'})
                        React.DOM.a({
                            className: 'card-toolbar-back back-button ' + OC.config.palette.title + '-button',
                            href: OC.curriculum.home
                        }, 'Back'),
                        Settings.getCanEdit() ? React.DOM.div({className: 'card-toolbar-secondary'}, [
                            React.DOM.a({
                                className: 'card-toolbar-units ' + OC.config.palette.title + '-button',
                                onClick: this.openUnits
                            }, 'Units'),
                            Link({
                                className: 'card-toolbar-settings ' + OC.config.palette.title + '-button',
                                //onClick: this.openSettings,
                                to: 'settings'
                            }, 'Settings')
                        ]) : null
                    ]),
                    React.DOM.div({className: 'curriculum-title-wrapper card-title-wrapper card-title-wrapper-small', style: { backgroundColor: OC.config.palette.base }},
                        React.DOM.div({className: 'curriculum-title card-title'}, Settings.getPretitle())
                    ),
                    React.DOM.div({className: 'curriculum-calendar', style: {height: (this.state.numWeeks * 60) + 'px' }}, [
                        React.DOM.div({className: 'curriculum-calendar-canvas'}, this.renderPeriods()),
                        React.DOM.div({className: 'curriculum-units', style: {marginTop: '-' + (PageStore.getNumWeeks() * 60) + 'px' }}, this.renderPeriodUnits())
                    ]),
                    PageStore.getNumWeeks() === 0 ? React.DOM.div({className: 'curriculum-empty-state empty-state-title empty-state-title-independent'}, [
                        React.DOM.span({}, 'Get started by '), React.DOM.a({onClick: this.createUnits, className: 'curriculum-action ' + OC.config.palette.title + '-action'}, 'creating a unit'),
                    ]) : null
                ])
            );

            unitsView = UnitsView({ mode: PageStore.getUnitsMode() });
            //settingsView = SettingsView();

            if (this.state.view === 'unit' || this.state.view === 'standard'){
                unitView = React.DOM.div({className: 'curriculum-module-wrapper' + (PageStore.getDrawerView() ? '' : ' card-wrapper')},
                    Module({
                        title: this.state.view === 'unit' ? PageStore.getUnit().title.toUpperCase(
                            ) : this.props.standard.title.toUpperCase(),
                        textbookTitle: this.props.textbook ? this.props.textbook.get('title').toUpperCase() : null,
                        thumbnail: this.props.textbook ? this.props.textbook.thumbnail : null,
                        sections: this.state.view === 'unit' ? PageStore.getUnit().sections : this.props.standard.sections,
                        id: this.state.view === 'unit' ? PageStore.getUnit().id : this.props.standard.id,
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

    var PeriodUnitItem = React.createClass({
        openUnit: function(){
            OC.curriculum.spinner.spin(OC.curriculum.loadButton);

            // Send an action to render selected unit ID.
            Actions.openUnit(this.props.unit);
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
        }
    });

    var UnitHeader = React.createClass({
        componentDidMount: function(){
            OC.utils.tip(this.refs.back.getDOMNode(), {gravity: 's'});
        },
        return: function(){
            // Send an action to return to overview view.
            Actions.openOverview();
        },
        render: function(){
            return React.DOM.header({
                className: 'unit-header',
                style: {
                    backgroundImage: 'url(\'' + this.props.unit.textbookThumbnail + '\')'
                }
            }, [
                React.DOM.div({className: 'unit-header-mask'}),
                React.DOM.div({className: 'unit-header-body'},
                    React.DOM.div({
                        className: 'unit-header-body-back',
                        onClick: this.return,
                        ref: 'back',
                        title: 'Back to sequence'
                    }),
                    React.DOM.div({className: 'unit-header-body-description'}, [
                        React.DOM.div({
                            className: 'unit-header-body-description-thumbnail',
                            style: {
                                backgroundImage: 'url(\'' + this.props.unit.textbookThumbnail + '\')'
                            }
                        }),
                        React.DOM.div({className: 'unit-header-body-description-titles'}, [
                            React.DOM.div({className: 'unit-header-body-description-titles-unit'}, this.props.unit.title),
                            React.DOM.div({className: 'unit-header-body-description-titles-textbook'}, this.props.unit.textbookTitle),
                        ])
                    ]),
                    React.DOM.div({className: 'unit-header-body-user content-panel-header-user'},
                        React.DOM.nav({className: 'content-panel-header-user-buttons'}, OC.views.UserHeader())
                    )
                )
            ]);
        }
    });

    var UnitsView = React.createClass({
        getInitialState: function(){
            return {mode: this.props.mode, view: Units.isView() ? 'units': 'textbooks'};
        },
        componentDidMount: function(){
            Units.on('change', this._onChange);
            Textbooks.on('change', this._onChange);

            if (this.state.mode === 'add'){
                this.initDateSelectors();
            }
        },
        componentWillUnmount: function(){
            Units.removeListener('change', this._onChange);
            Textbooks.removeListener('change', this._onChange);
        },
        componentDidUpdate: function(){
            if (this.state.mode === 'add'){
                this.initDateSelectors();
            }
        },
        initDateSelectors: function(){
            var fromField, toField;
            if (this.state.view === 'units'){
                fromField = this.getDOMNode().querySelector('.explorer-settings-units-new-body-duration-from');
                toField = this.getDOMNode().querySelector('.explorer-settings-units-new-body-duration-to');

                require(['pikaday'], function(Pikaday){
                    var from = new Pikaday({
                        field: fromField,
                        onSelect: function(date){
                            fromField.title = date.toISOString();
                        }
                    }),
                        to = new Pikaday({
                        field: toField,
                        onSelect: function(date){
                            toField.title = date.toISOString();
                        }
                    });
                });
            }
        },
        _onChange: function(){
            this.setState({
                view: Units.isView() ? 'units': 'textbooks'
            });
        },
        renderUnit: function(unit){
            return SettingsUnit({
                unit: unit,
                settings: this.props.settings
            });
        },
        cancelAddUnit: function(event){
            this.setState({mode: 'view'});
        },
        renderTextbookOptions: function(){
            var textbooks = Textbooks.getTextbooks().map(function(textbook){
                return React.DOM.option({value: textbook.get('id')}, 'Textbook: ' + textbook.get('title'));
            });
            textbooks = textbooks.push(React.DOM.option({value: 'none'}, 'Textbook: (none)'));

            return textbooks;
        },

        completeAddUnit: function(event){
            Actions.addUnit(
                this.refs.newUnitInput.getDOMNode().value,
                this.refs.newUnitTextbook.getDOMNode().value,
                this.refs.newUnitFrom.getDOMNode().value,
                this.refs.newUnitTo.getDOMNode().value
            );

            Actions.saveUnit(Units.getUnsavedUnit());

            this.setState({mode: 'view'});
        },

        openUnits: function(event){
            this.setState({mode: 'view'});
            Actions.openUnits();
        },
        openTextbooks: function(event){
            this.setState({mode: 'view'});
            Actions.openTextbooks();
        },
        goBack: function(){
            Actions.openOverview();
        },
        add: function(){
            this.setState({ mode: 'add' });
        },

        completeAddTextbook: function(event){
            Actions.addTextbook(
                this.refs.newTextbookInput.getDOMNode().value,
                this.refs.newTextbookDescription.getDOMNode().value
            );
            Actions.saveTextbook(Textbooks.getUnsavedTextbook());

            this.setState({mode: 'view'});
        },

        cancelAddTextbook: function(event){
            this.setState({mode: 'view'});
        },
        renderTextbook: function(textbook){
            return React.DOM.div({className: 'curriculum-textbooks-item'},
                React.DOM.div({
                    className: 'curriculum-textbooks-item-thumbnail',
                    style: {
                        backgroundImage: 'url(\'' + textbook.get('thumbnail') + '\');'
                    }
                }),
                React.DOM.div({className: 'curriculum-textbooks-item-body'},
                    React.DOM.div({className: 'curriculum-textbooks-item-body-title', type: 'text'}, textbook.get('title')),
                    React.DOM.div({className: 'curriculum-textbooks-item-body-description'}, textbook.get('description'))
                ),
                React.DOM.div({className: 'curriculum-textbooks-item-actions'},
                    React.DOM.a({
                        className: 'curriculum-textbooks-item-actions-action circle-action ' + OC.config.palette.title + '-circle-action',
                        onClick: this.edit,
                        title: 'Edit',
                        ref: 'edit'
                    }, null)
                )
            );
        },
        render: function(){
            var body;
            if (this.state.mode === 'add'){
                if (this.state.view === 'units'){
                    body = React.DOM.div({className: 'explorer-settings-units-new'},
                        React.DOM.div({className: 'explorer-settings-units-new-body'},
                            React.DOM.div({className: 'explorer-settings-units-new-thumbnail'}),
                            React.DOM.input({
                                className: 'explorer-settings-units-new-body-title',
                                type: 'text',
                                placeholder: 'Name of unit',
                                ref: 'newUnitInput',
                                onBlur: this.updateNewUnitName
                            }, null),
                            React.DOM.select({
                                className: 'explorer-settings-units-new-textbook',
                                ref: 'newUnitTextbook',
                                onBlur: this.updateNewUnitTextbook
                            }, this.renderTextbookOptions()),
                            Settings.getPeriods().title === 'weekly' ? React.DOM.div({}, React.DOM.input({
                                    className: 'explorer-settings-units-new-body-duration-from',
                                    type: 'text',
                                    ref: 'newUnitFrom',
                                    placeholder: 'From',
                                    onBlur: this.updateNewUnitFrom
                                }, null),
                                React.DOM.input({
                                    className: 'explorer-settings-units-new-body-duration-to',
                                    type: 'text',
                                    ref: 'newUnitTo',
                                    placeholder: 'To',
                                    onBlur: this.updateNewUnitTo
                                }, null)
                            ) : React.DOM.select({
                                className: 'explorer-settings-units-new-period',
                                onBlur: this.updateNewUnitPeriod
                            }, this.props.settings.periods.data.map(this.renderPeriodOptions))
                        ),
                        React.DOM.div({className: 'explorer-resource-add-units-actions', key: 3}, [
                            React.DOM.button({
                                className: 'explorer-dull-button explorer-resource-add-unit-action-cancel',
                                onClick: this.cancelAddUnit
                            }, 'Cancel'),
                            React.DOM.button({
                                className: 'explorer-button',
                                onClick: this.completeAddUnit
                            }, 'Finish')
                        ])
                    );

                } else {
                    body = React.DOM.div({className: 'explorer-settings-textbooks-new'},
                        React.DOM.div({className: 'explorer-settings-textbooks-new-thumbnail'}),
                        React.DOM.div({className: 'explorer-settings-textbooks-new-body'},
                            React.DOM.input({
                                className: 'explorer-settings-textbooks-new-body-title',
                                type: 'text',
                                placeholder: 'Name of textbook',
                                ref: 'newTextbookInput',
                                onBlur: this.updateNewTextbookName
                            }, null),
                            React.DOM.textarea({
                                className: 'explorer-settings-textbooks-new-description',
                                placeholder: 'Description of textbook',
                                ref: 'newTextbookDescription',
                                onBlur: this.updateNewTextbookDescription
                            }, null)
                        ),
                        React.DOM.div({className: 'explorer-resource-add-textbooks-actions', key: 3}, [
                            React.DOM.button({
                                className: 'explorer-dull-button explorer-resource-add-textbook-action-cancel',
                                onClick: this.cancelAddTextbook
                            }, 'Cancel'),
                            React.DOM.button({
                                className: 'explorer-button',
                                onClick: this.completeAddTextbook
                            }, 'Finish')
                        ])
                    );

                }
            }

            return React.DOM.div({className: 'curriculum-units-wrapper card-wrapper'},
                React.DOM.div({className: 'curriculum-units card'}, [
                    React.DOM.div({className: 'card-toolbar', style: { backgroundColor: OC.config.palette.dark }}, [
                        React.DOM.a({
                            className: 'card-toolbar-back back-button ' + OC.config.palette.title + '-button',
                            onClick: this.goBack
                        }, 'Back'),
                        React.DOM.div({className: 'card-toolbar-secondary'}, [
                            this.state.mode === 'view' ? React.DOM.a({
                                className: 'card-toolbar-add add-button',
                                onClick: this.add
                            }, this.state.view === 'units' ? 'Add unit' : 'Add textbook') : null
                        ])
                    ]),
                    React.DOM.ul({className: 'card-tabs ' + OC.config.palette.title + '-card-tabs', style: { backgroundColor: OC.config.palette.base } }, [
                        React.DOM.li({
                            className: 'card-tab ' + (this.state.view === 'units' ? 'selected' : ''),
                            onClick: this.openUnits
                        }, 'Units'),
                        React.DOM.li({
                            className: 'card-tab ' + (this.state.view === 'textbooks' ? 'selected' : ''),
                            onClick: this.openTextbooks
                        }, 'Textbooks')
                    ]),
                    this.state.view === 'units' ? React.DOM.div({className: 'explorer-settings-units'}, [
                        Units.getUnits().map(this.renderUnit).toJS(),
                        body
                    ]) : React.DOM.div({className: 'explorer-settings-textbooks'}, [
                        Textbooks.getTextbooks().map(this.renderTextbook).toJS(),
                        body
                    ])
                ])
            );
        }

        /*
        renderPeriodOptions: function(period){
            return React.DOM.option({}, period.title);
        },*/


    });

    var SettingsUnit = React.createClass({
        getInitialState: function(){
            return {mode: 'view'};
        },
        componentDidMount: function(){
            OC.utils.tip(this.refs.edit.getDOMNode(), {gravity: 's'});
        },
        edit: function(){
            this.setState({mode: 'edit'});
        },
        cancelEditUnit: function(event){
            this.setState({mode: 'view'});
        },
        completeEditUnit: function(event){
            /*var period, daysSinceStart, totalDays;

            var start = new Date(this.props.settings.periods.start),
                end = new Date(this.props.settings.periods.end);


            if (this.props.settings.periods.title === 'weekly'){
                // Determine the delta between the start/end of the curriculum program
                //     and these dates.
                daysSinceStart = (new Date(this.state.newUnitFrom) - start) / 1000 / 60 / 60 / 24;
                totalDays = (new Date(this.state.newUnitTo) - new Date(this.state.newUnitFrom)) / 1000 / 60 / 60 / 24;

                period = {
                    type: 'generic',
                    begin: daysSinceStart,
                    end: totalDays + daysSinceStart,
                    unit: 'day',
                    from: this.state.newUnitFrom,
                    to: this.state.newUnitTo
                };
            } else {
                period = {
                    position: _.max(this.props.units, function(unit) {
                        return unit.position; }).position + 1,
                    type: 'child',
                    parent: this.props.settings.periods.data.indexOf(
                        this.state.newUnitPeriod),
                    unit: 'equal'
                };
            }

            this.props.editUnit(
                this.state.newUnitName,
                this.state.newUnitTextbook,
                period
            );*/
            this.setState({mode: 'view'});
        },
        render: function(){
            if (this.state.mode === 'edit'){
                return OC.explorer.EditableSettingsUnit({
                    unit: this.props.unit,
                    textbooks: this.props.textbooks,
                    settings: this.props.settings,
                    cancelEditUnit: this.cancelEditUnit,
                    completeEditUnit: this.completeEditUnit
                });
            } else {
                return React.DOM.div({
                    className: 'curriculum-units-item'
                },
                    React.DOM.div({
                        className: 'curriculum-units-item-thumbnail',
                        style: {
                            backgroundImage: 'url(\'' + this.props.unit.textbookThumbnail + '\');'
                        }
                    }),
                    React.DOM.div({className: 'curriculum-units-item-body'},
                        React.DOM.div({className: 'curriculum-units-item-body-title', type: 'text'}, this.props.unit.title),
                        React.DOM.div({className: 'curriculum-units-item-body-textbook'}, this.props.unit.textbook ? this.props.unit.textbook.title : null),
                        React.DOM.div({className: 'curriculum-units-item-body-duration'}, (
                            'From Day ' + this.props.unit.begin + ' to Day ' + this.props.unit.end))
                    ),
                    React.DOM.div({className: 'curriculum-units-item-actions'},
                        React.DOM.a({
                            className: 'curriculum-units-item-actions-action circle-action ' + OC.config.palette.title + '-circle-action',
                            onClick: this.edit,
                            title: 'Edit',
                            ref: 'edit'
                        }, null)
                    )
                );
            }

        },
    });

    function setHeader(){
        var openedUnit = PageStore.getUnit();
        if (openedUnit){
            React.renderComponent(UnitHeader({ unit: openedUnit }),
                document.querySelector('.header-wrapper'));
        } else {
            React.renderComponent(OC.views.Header(),
                document.querySelector('.header-wrapper'), function(){
                    if (! OC.curriculum.resized){
                        OC.resize();
                        window.addEventListener('resize', OC.resize);
                    }
                });
        }
    }

    setHeader(); PageStore.on('change', setHeader);

    return Sequence;
});