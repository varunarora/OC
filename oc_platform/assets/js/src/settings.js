var Settings = React.createClass({
    getInitialState: function() {
        return {
            view: 'general',
            addTextbookMode: false,
            newTextbookName: null,
            newTextbookDescription: null,

            addUnitMode: false,
            newUnitName: null,
            newUnitTextbook: null,
            newUnitFrom: null,
            newUnitTo: null,
            newUnitPeriod: null,

            pauseSync: false,
            pushingSync: false,
            lastPushed: null,

            general: {
                name: null,
                gradeType: null,
                grade: null,
                subject: null,
                session: null,
                from: null,
                to: null,
                standards: false,
                sync: true
            }
        };
    },
    componentWillMount: function(){
        var gradeType, grade, gradeSplit = this.props.settings.grade.split(' ');
        
        if (this.gradeTypes.indexOf(gradeSplit[0]) !== 0) {
            gradeType = gradeSplit[0].toLowerCase();
            grade = gradeSplit[1];
        } else {
            gradeType = 'other';
            grade = this.props.settings.grade;
        }

        var general = {
            name: this.props.settings.title,
            subject: this.props.settings.subject,
            session: this.props.settings.session,
            from: this.props.settings.periods.start,
            to: this.props.settings.periods.end,
            grade: grade ? grade : null,
            gradeType: gradeType ? gradeType : null,
            sync: this.props.settings.sync.on
        };

        this.setState({
            general: general,
            pauseSync: this.props.settings.sync.state === 'pause',
            lastPushed: this.props.settings.sync.lastPushed
        });
    },

    componentDidMount: function(){
        this.updateSyncTime();
    },
    componentDidUpdate: function(){
        this.updateSyncTime();
    },

    updateSyncTime: function(){
        require(['timeago'], function(){
            $('.explorer-settings-general-sync-push-status-time', this.getDOMNode).timeago('updateFromDOM');
        });
    },

    gradeTypes: ['Grade', 'Class','Level', 'Group', 'Other'],

    openGeneral: function(event){
        this.setState({view: 'general'});

        event.stopPropagation();
        event.preventDefault();
        return false;
    },
    showTip: function(event){
        $(event.target).parents('tr').find(
            '.explorer-settings-general-tip').addClass('show');
    },
    hideTip: function(event){
        $(event.target).parents('tr').find(
            '.explorer-settings-general-tip').removeClass('show');

        if (event.type === 'blur' || event.type === 'change' || event.type === 'click'){
            this.updateSettings(event);
        }
    },
    updateSettings: function(event){
        var updateNeeded = false;

        switch (event.target.name){
            case 'name':
            case 'gradeType':
            case 'grade':
            case 'subject':
            case 'session':
            case 'durationRelevance':
            case 'standards':
            case 'sync':
                if (event.target.value !== '' && this.state.general[event.target.name] !== event.target.value){
                    // Update state.
                    this.state.general[event.target.name] = event.target.value;
                    this.setState({general: this.state.general});

                    updateNeeded = true;
                }
                break;

            case 'from':
            case 'to':
                if (event.target.value !== '' !== null && this.state.general[event.target.name] !== event.target.title){
                    // Update state.
                    this.state.general[event.target.name] = event.target.title;
                    this.setState({general: this.state.general});

                    updateNeeded = true;
                }
                break;
        }

        if (updateNeeded){
            // Setup changes for save.
            var serializedSettings = {curriculum_id: this.props.id};
            
            if (event.target.name === 'grade' || event.target.name === 'gradeType'){
                 var formattedGradeType = this.state.general.gradeType.substring(0, 1).toUpperCase() + this.state.general.gradeType.substring(1);
                 serializedSettings['grade'] = formattedGradeType + ' ' + this.state.general.grade;
            }
            else serializedSettings[event.target.name] = this.state.general[event.target.name];

            OC.api.curriculum.settings.update(serializedSettings, function(){});
        }
    },
    pauseChanges: function(event){
        var view = this;
        if (this.state.pauseSync !== 'pausing' || this.state.pauseSync !== 'resuming'){
            if (this.state.pauseSync){
                this.setState({pauseSync: 'resuming'});
                OC.api.curriculum.settings.pauseChanges(this.props.id, function(response){
                    view.setState({pauseSync: false});
                });
            }
            else {
                this.setState({pauseSync: 'pausing'});
                OC.api.curriculum.settings.pauseChanges(this.props.id, function(response){
                    view.setState({pauseSync: true});
                });
            }
        }
    },
    pushChanges: function(event){
        var view = this;
        this.setState({pushingSync: true});
        OC.api.curriculum.settings.pushChanges(this.props.id, function(response){
            view.setState({lastPushed: response.lastPushed, pushingSync: false}, function(){
                
                view.updateSyncTime();
            });
        });
    },
    generalView: function(){
        return React.DOM.table({className: 'explorer-settings-general'}, [
            React.DOM.colgroup({}, [
                React.DOM.col({className: 'explorer-settings-general-message'}),
                React.DOM.col({className: 'explorer-settings-general-inputs'}),
                React.DOM.col({className: 'explorer-settings-general-assist'})
            ]),
            React.DOM.tbody({className: ''}, [
                
                // Curriculum name.
                React.DOM.tr({className: 'explorer-settings-general-name'}, [
                    React.DOM.td({className: ''}, 'Name'),
                    React.DOM.td({className: ''},
                        React.DOM.input({className: '', type: 'text',
                            onFocus: this.showTip, onBlur: this.hideTip,
                            name: 'name', defaultValue: this.state.general.name
                        }, null)
                    ),
                    React.DOM.td({className: 'explorer-settings-general-tip'}, 'eg. Hogwart\'s High Grade 5 Math Curriculum - 2014')
                ]),

                // Grade level.
                React.DOM.tr({className: 'explorer-settings-general-grade'}, [
                    React.DOM.td({className: ''}, 'Grade'),
                    React.DOM.td({className: ''}, [
                        React.DOM.select({
                            className: '', type: 'text',
                            onFocus: this.showTip, onChange: this.hideTip,
                            name: 'gradeType', value: this.state.general.gradeType
                        },
                            React.DOM.option({value: 'grade'}, 'Grade'),
                            React.DOM.option({value: 'class'}, 'Class'),
                            React.DOM.option({value: 'level'}, 'Level'),
                            React.DOM.option({value: 'group'}, 'Group'),
                            React.DOM.option({value: 'other'}, 'Other')
                        ),
                        React.DOM.input({className: '', type: 'text',
                            onFocus: this.showTip, onBlur: this.hideTip,
                            name: 'grade', defaultValue: this.state.general.grade
                        }, null)
                    ]),
                    React.DOM.td({className: 'explorer-settings-general-tip'}, 'eg. Grade 5')
                ]),

                // Subject.
                React.DOM.tr({className: 'explorer-settings-general-subject'}, [
                    React.DOM.td({className: ''}, 'Subject'),
                    React.DOM.td({className: ''},
                        React.DOM.input({className: '', type: 'text',
                            onFocus: this.showTip, onBlur: this.hideTip,
                            name: 'subject', defaultValue: this.state.general.subject
                        }, null)
                    ),
                    React.DOM.td({className: 'explorer-settings-general-tip'}, 'eg. Mathematics')
                ]),

                // Sessions.
                React.DOM.tr({className: 'explorer-settings-general-session'}, [
                    React.DOM.td({className: ''}, 'Academic session'),
                    React.DOM.td({className: ''},
                        React.DOM.select({
                            className: '', type: 'text',
                            onFocus: this.showTip, onChange: this.hideTip,
                            name: 'session'
                        },
                            React.DOM.option({}, 'Semester'),
                            React.DOM.option({}, 'Trimester'),
                            React.DOM.option({}, 'Term'),
                            React.DOM.option({}, 'Instructional Block'),
                            React.DOM.option({}, 'Session'),
                            React.DOM.option({}, 'Other')
                        )
                    ),
                    React.DOM.td({className: 'explorer-settings-general-tip'}, 'eg. "Term". Choose what you call a session in your school')
                ]),

                // Duration.
                OC.explorer.Duration({
                    from: this.state.general.from,
                    to: this.state.general.to,
                    durationRelevance: this.state.general.durationRelevance,
                    updateSettings: this.updateSettings
                }),

                // Color scheme.
                /*React.DOM.tr({className: ''}, [
                    React.DOM.td({className: ''}, 'Color scheme'),
                    React.DOM.td({className: ''},
                        React.DOM.input({className: '', type: 'text'}, null)
                    ),
                    React.DOM.td({className: ''}, null)
                ]),*/


                React.DOM.tr({className: 'explorer-settings-general-advanced'},
                    React.DOM.td({className: '', colSpan: 2}, 'Advanced')
                ),

                // Standards menu?
                React.DOM.tr({className: 'explorer-settings-general-standards'}, [
                    React.DOM.td({className: ''}, 'Include standards menu?'),
                    React.DOM.td({className: '',
                        onMouseOver: this.showTip, onMouseLeave: this.hideTip},
                        React.DOM.label({className: '', type: 'label'}, [
                            React.DOM.input({className: '', type: 'radio', name: 'standards', 'value': 'true', onClick: this.hideTip}),
                            React.DOM.span({className: ''}, 'Yes')
                        ]),
                        React.DOM.label({className: '', type: 'label'}, [
                            React.DOM.input({className: '', type: 'radio', name: 'standards', 'value': 'false', onClick: this.hideTip}),
                            React.DOM.span({className: ''}, 'No')
                        ])
                    ),
                    React.DOM.td({className: 'explorer-settings-general-tip'}, 'Build curriculum through standards?')
                ]),

                // Sync.
                React.DOM.tr({className: 'explorer-settings-general-sync'}, [
                    React.DOM.td({className: ''}, 'Sync'),
                    React.DOM.td({className: ''},
                        React.DOM.div({className: 'explorer-settings-general-sync-labels-wrapper', onMouseOver: this.showTip, onMouseLeave: this.hideTip}, [
                            React.DOM.label({className: '', type: 'label', key: 0}, [
                                React.DOM.input({className: '', type: 'radio', name: 'sync',
                                    'value': true, onClick: this.hideTip, defaultChecked: this.state.general.sync === 'true'}),
                                React.DOM.span({className: ''}, 'Yes')
                            ]),
                            React.DOM.label({className: '', type: 'label', key: 1}, [
                                React.DOM.input({className: '', type: 'radio', name: 'sync',
                                    'value': false, onClick: this.hideTip, defaultChecked: this.state.general.sync !== 'true'}),
                                React.DOM.span({className: ''}, 'No')
                            ])
                        ]),
                        this.state.general.sync === 'true' ? React.DOM.div({className: 'explorer-settings-general-sync-pause'},
                            React.DOM.button({
                                onClick: this.pauseChanges,
                                className: 'explorer-dull-button'
                            }, this.state.pauseSync && this.state.pauseSync !== 'resuming' ? (this.state.pauseSync === 'pausing' ? (
                                'Pausing...') : '► Resume change updates') : (this.state.pauseSync === 'resuming' ? 'Resuming...' : 'Pause outgoing change updates'))
                        ) : null,
                        this.state.general.sync === 'true' ? React.DOM.div({className: 'explorer-settings-general-sync-push'}, [
                            React.DOM.button({
                                onClick: this.pushChanges,
                                className: 'explorer-button'
                            }, this.state.pushingSync ? 'Pushing...' : 'Force push changes\' updates now'),
                            React.DOM.div({className: 'explorer-settings-general-sync-push-status'}, [
                                React.DOM.span({className: 'explorer-settings-general-sync-push-status-message'}, 'Last pushed updates '),
                                React.DOM.span({
                                    className: 'explorer-settings-general-sync-push-status-time',
                                    title: this.state.lastPushed
                                }, '')
                            ])
                        ]) : null
                    ),
                    React.DOM.td({className: 'explorer-settings-general-tip'}, 'Synchronize updates to copies of this curriculum?')
                ]),
            ])
        ]);
    },


    openUnits: function(event){
        this.setState({view: 'units'});

        event.stopPropagation();
        event.preventDefault();
        return false;
    },
    renderTextbookOptions: function(textbook){
        return React.DOM.option({}, textbook.title);
    },
    renderPeriodOptions: function(period){
        return React.DOM.option({}, period.title);
    },
    unitsView: function(){
        var body;

        if (this.state.addUnitMode){
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
                        onBlur: this.updateNewUnitTextbook
                    }, this.props.textbooks.map(this.renderTextbookOptions)),
                    this.props.settings.periods.title === 'weekly' ? React.DOM.div({}, React.DOM.input({
                            className: 'explorer-settings-units-new-body-duration-from',
                            type: 'text',
                            placeholder: 'From',
                            onBlur: this.updateNewUnitFrom
                        }, null),
                        React.DOM.input({
                            className: 'explorer-settings-units-new-body-duration-to',
                            type: 'text',
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
            body = React.DOM.div({
                className: 'explorer-unit-add',
                onClick: this.addUnit,
            }, '+ ADD UNIT');
        }

        return React.DOM.div({
            className: 'explorer-settings-units'}, [
            this.props.units.map(this.renderUnit),
            body
        ]);
    },
    renderUnit: function(unit){
        return OC.explorer.SettingsUnit({
            unit: unit, textbooks: this.props.textbooks, settings: this.props.settings});
    },
    addUnit: function(){
        var view = this;
        this.setState({addUnitMode: true,
            newUnitTextbook: this.props.textbooks[0],
            newUnitPeriod: this.props.settings.periods.data[0]
        }, function(){
            this.refs.newUnitInput.getDOMNode().focus();

            var fromField = $('.explorer-settings-units-new-body-duration-from')[0],
                toField = $('.explorer-settings-units-new-body-duration-to')[0];

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
        });
    },
    cancelAddUnit: function(event){
        this.setState({addUnitMode: false});
    },
    completeAddUnit: function(event){
        var period, daysSinceStart, totalDays;

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

        this.props.addUnit(
            this.state.newUnitName,
            this.state.newUnitTextbook,
            period
        );
        this.setState({addUnitMode: false});
    },

    updateNewUnitName: function(event){
        this.setState({newUnitName: event.target.value});
    },
    updateNewUnitTextbook: function(event){
        this.setState({newUnitTextbook: event.target.value});
    },
    updateNewUnitFrom: function(event){
        this.setState({newUnitFrom: event.target.title});
    },
    updateNewUnitTo: function(event){
        this.setState({newUnitTo: event.target.title});
    },
    updateNewUnitPeriod: function(event){
        this.setState({newUnitPeriod: event.target.title});
    },

    openTextbooks: function(event){
        this.setState({view: 'textbooks'});

        event.stopPropagation();
        event.preventDefault();
        return false;
    },
    textbooksView: function(){
        var body;

        if (this.state.addTextbookMode){
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
        } else {
            body = React.DOM.div({
                className: 'explorer-textbook-add',
                onClick: this.addTextbook,
            }, '+ ADD TEXTBOOK');
        }

        return React.DOM.div({
            className: 'explorer-settings-textbooks'}, [
            this.props.textbooks.map(this.renderTextbook),
            body
        ]);
    },
    addTextbook: function(){
        this.setState({addTextbookMode: true}, function(){
            this.refs.newTextbookInput.getDOMNode().focus();
        });
    },
    cancelAddTextbook: function(event){
        this.setState({addTextbookMode: false});
    },
    completeAddTextbook: function(event){
        this.props.addTextbook(
            this.state.newTextbookName,
            this.state.newTextbookDescription
        );
        this.setState({addTextbookMode: false});
    },
    renderTextbook: function(textbook){
        return React.DOM.div({className: 'explorer-settings-textbooks-item'},
            React.DOM.div({
                className: 'explorer-settings-textbooks-item-thumbnail',
                style: {
                    backgroundImage: 'url(\'' + textbook.thumbnail + '\');'
                }
            }),
            React.DOM.div({className: 'explorer-settings-textbooks-item-body'},
                React.DOM.div({className: 'explorer-settings-textbooks-item-body-title', type: 'text'}, textbook.title),
                React.DOM.div({className: 'explorer-settings-textbooks-item-body-description'}, textbook.description)
            )
        );
    },

    updateNewTextbookName: function(event){
        this.setState({newTextbookName: event.target.value});
    },

    updateNewTextbookDescription: function(event){
        this.setState({newTextbookDescription: event.target.value});
    },

    render: function(){
        var viewToRender;

        switch (this.state.view){
            case 'general':
                viewToRender = this.generalView;
                break;
            
            case 'textbooks':
                viewToRender = this.textbooksView;
                break;
            
            case 'units':
                viewToRender = this.unitsView;
                break;
        }

        return React.DOM.div({className: 'explorer-settings'}, [
            React.DOM.nav({className: 'oc-page-tabs explorer-settings-navigation'},
                React.DOM.ul({className: ''}, [
                    React.DOM.li({className: ''},
                        React.DOM.a({
                            className: this.state.view === 'general' ? 'current' : 0,
                            href: '',
                            onClick: this.openGeneral
                        }, 'General')
                    ),

                    React.DOM.li({className: ''},
                        React.DOM.a({
                            className: this.state.view === 'sessions' ? 'current' : 0,
                            href: '',
                            onClick: this.openOverview
                        }, 'Sessions')
                    ),

                    React.DOM.li({className: ''},
                        React.DOM.a({
                            className: this.state.view === 'textbooks' ? 'current' : 0,
                            href: '',
                            onClick: this.openTextbooks
                        }, 'Textbooks')
                    ),

                    React.DOM.li({className: ''},
                        React.DOM.a({
                            className: this.state.view == 'units' ? 'current' : 0,
                            href: '',
                            onClick: this.openUnits
                        }, 'Units')
                    ),

                    /*React.DOM.li({className: ''},
                        React.DOM.a({
                            className: this.state.view == 'permissions' ? 'current' : 0,
                            href: '',
                            onClick: this.openOverview
                        }, 'Permissions')
                    ),*/
                ])
            ),

            React.DOM.div({className: 'explorer-settings-body'}, [
                viewToRender()
            ])
        ]);
    }
});

var Duration = React.createClass({
    getInitialState: function(){
        return {from: null, to: null, durationRelevance: false};
    },
    componentWillMount: function(){
        this.setState({
            from: this.props.from, to: this.props.to, durationRelevance: this.props.durationRelevance
        });
        this.setGeneralDates();
    },
    setGeneralDates: function(){
        var view = this;
        require(['pikaday'], function(Pikaday){
            var from = new Pikaday({
                field: $('.explorer-settings-general-duration-from')[0],
                onSelect: function(date){
                    view.props.updateSettings({
                        target: {
                            name: 'from',
                            value: date,
                            title: date.toISOString()
                        }
                    });
                }
            }),
                to = new Pikaday({
                field: $('.explorer-settings-general-duration-to')[0],
                onSelect: function(date){
                    view.props.updateSettings({
                        target: {
                            name: 'to',
                            value: date,
                            title: date.toISOString()
                        }
                    });
                }
            });

            from.setDate(view.state.from);
            to.setDate(view.state.to);
        });
    },
    render: function(){
        return React.DOM.tr({className: 'explorer-settings-general-duration'}, [
            React.DOM.td({className: ''}, 'Duration'),
            React.DOM.td({className: ''}, [
                React.DOM.div({className: ''}, [
                    React.DOM.input({
                        className: 'explorer-settings-general-duration-from', type: 'text',
                        /*onFocus: this.showTip, onBlur: this.hideTip,*/
                        name: 'from', placeholder: 'From'
                    }, null),
                    React.DOM.input({
                        className: 'explorer-settings-general-duration-to', type: 'text',
                        /*onFocus: this.showTip, onBlur: this.hideTip,*/
                        name: 'to', placeholder: 'To'
                    }, null)
                ]),
                React.DOM.div({className: 'explorer-settings-general-duration-relevance'}, [
                    React.DOM.label({className: ''}, [
                        React.DOM.input({
                            className: '', type: 'checkbox',
                            name: 'durationRelevance'
                        }, null),
                        React.DOM.span({className: ''}, 'The specific dates don\'t matter')
                    ]),
                ])
            ]),
            React.DOM.td({className: 'explorer-settings-general-tip'}, 'When does the program / year / course begin and end?')
        ]);
    }
});

var SettingsUnit = React.createClass({
    getInitialState: function(){
        return {mode: 'view'};
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
                className: 'explorer-settings-units-item'
            },
                React.DOM.div({
                    className: 'explorer-settings-units-item-thumbnail',
                    style: {
                        backgroundImage: 'url(\'' + this.props.unit.textbookThumbnail + '\');'
                    }
                }),
                React.DOM.div({className: 'explorer-settings-units-item-body'},
                    React.DOM.div({className: 'explorer-settings-units-item-body-title', type: 'text'}, this.props.unit.title),
                    React.DOM.div({className: 'explorer-settings-units-item-body-textbook'}, this.props.unit.textbook.title),
                    React.DOM.div({className: 'explorer-settings-units-item-body-duration'}, (
                        'From Day ' + this.props.unit.begin + ' to Day ' + this.props.unit.end)),
                    React.DOM.div({className: 'explorer-settings-units-item-actions'},
                        React.DOM.a({
                            className: 'explorer-settings-units-item-actions-action',
                            onClick: this.edit
                        }, 'Edit')
                    )
                )
            );
        }

    },
});

var EditableSettingsUnit = React.createClass({
    componentDidMount: function(){
        var view = this,
            fromField = $('.explorer-settings-units-new-body-duration-from')[0],
            toField = $('.explorer-settings-units-new-body-duration-to')[0];
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

            from.setDate(view.props.unit.from);
            to.setDate(view.props.unit.to);
        });
    },
    renderTextbookOptions: function(textbook){
        return React.DOM.option({}, textbook.title);
    },
    cancelEditUnit: function(event){
        this.props.cancelEditUnit();
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
        );
        this.setState({addUnitMode: false});*/
        this.props.completeEditUnit();
    },
    render: function(){
        return React.DOM.div({className: 'explorer-settings-units-new'},
            React.DOM.div({className: 'explorer-settings-units-new-body'},
                React.DOM.div({className: 'explorer-settings-units-new-thumbnail'}),
                React.DOM.input({
                    className: 'explorer-settings-units-new-body-title',
                    type: 'text',
                    placeholder: 'Name of unit',
                    ref: 'editUnitInput',
                    defaultValue: this.props.unit.title,
                    onBlur: this.updateNewUnitName
                }, null),
                React.DOM.select({
                    className: 'explorer-settings-units-new-textbook',
                    onBlur: this.updateNewUnitTextbook,
                    ref: 'editUnitTextbook',
                    defaultvalue: this.props.unit.textbook.id
                }, this.props.textbooks.map(this.renderTextbookOptions)),
                this.props.settings.periods.title === 'weekly' ? React.DOM.div({}, React.DOM.input({
                        className: 'explorer-settings-units-new-body-duration-from',
                        type: 'text',
                        placeholder: 'From',
                        defaultvalue: this.props.unit.from,
                        onBlur: this.updateNewUnitFrom,
                        ref: 'editUnitFrom'
                    }, null),
                    React.DOM.input({
                        className: 'explorer-settings-units-new-body-duration-to',
                        type: 'text',
                        placeholder: 'To',
                        defaultvalue: this.props.unit.to,
                        onBlur: this.updateNewUnitTo,
                        ref: 'editUnitTo',
                    }, null)
                ) : React.DOM.select({
                    className: 'explorer-settings-units-new-period',
                    onBlur: this.updateNewUnitPeriod
                }, this.props.settings.periods.data.map(this.renderPeriodOptions))
            ),
            React.DOM.div({className: 'explorer-resource-add-units-actions', key: 3}, [
                React.DOM.button({
                    className: 'explorer-dull-button explorer-resource-add-unit-action-cancel',
                    onClick: this.cancelEditUnit
                }, 'Cancel'),
                React.DOM.button({
                    className: 'explorer-button',
                    onClick: this.completeEditUnit
                }, 'Finish')
            ])
        );
    }
});