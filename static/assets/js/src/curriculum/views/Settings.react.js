define(['react', 'curriculumSettings', 'curriculumActions', 'pikaday'], function(React, SettingsStore, Actions, Pikaday){
    var Settings = React.createClass({
        getInitialState: function() {
            return {
                view: 'general',
                addTextbookMode: false,  // Is a textbook being added right now?
                addUnitMode: false,  // New unit being added currently?
                pauseSync: false,  // Is Sync paused?
                pushingSync: false,  // Are updates being pushed right now?
            };
        },

        componentWillMount: function(){
            this.setState({
                general: SettingsStore.getGeneral(),
                pauseSync: SettingsStore.getSyncState() === 'pause',
                lastPushed: SettingsStore.getLastPushed()
            });
        },

        componentDidMount: function(){
            this.updateSyncTime();
        },

        componentDidUpdate: function(){
            this.updateSyncTime();
        },

        _onChange: function(){
            this.setState({
                pauseSync: PageStore.getPauseSync(),
                pushingSync: PageStore.getPushingSync()
            });
        },

        updateSyncTime: function(){
            require(['timeago'], function(){
                $('.explorer-settings-general-sync-push-status-time', this.getDOMNode).timeago('updateFromDOM');
            });
        },

        openGeneral: function(event){
            this.setState({view: 'general'});

            event.stopPropagation();
            event.preventDefault();
            return false;
        },

        /*showTip: function(event){
            $(event.target).parents('tr').find(
                '.explorer-settings-general-tip').addClass('show');
        },*/

        hideTip: function(event){
            //$(event.target).parents('tr').find(
            //    '.explorer-settings-general-tip').removeClass('show');

            if (event.type === 'blur' || event.type === 'change' || event.type === 'click'){
                this.updateSettings(event);
            }
        },
        updateSettings: function(event){
            var updateNeeded = false;

            switch (event.target.name){
                case 'title':
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
                serializedSettings = {};
                /*if (event.target.name === 'grade' || event.target.name === 'gradeType'){
                     var formattedGradeType = this.state.general.gradeType.substring(0, 1).toUpperCase() + this.state.general.gradeType.substring(1);
                     serializedSettings['grade'] = formattedGradeType + ' ' + this.state.general.grade;
                }
                else */serializedSettings[event.target.name] = this.state.general[event.target.name];

                Actions.updateSettings(serializedSettings);
                Actions.saveSettings(SettingsStore.getUnsaved());
            }
        },
        pauseChanges: function(event){
            var view = this;
            if (this.state.pauseSync !== 'pausing' || this.state.pauseSync !== 'resuming'){
                if (this.state.pauseSync){
                    this.setState({pauseSync: 'resuming'});
                    Actions.pauseChanges(this.props.id, false);

                    /*OC.api.curriculum.settings.pauseChanges(this.props.id, function(response){
                        view.setState({pauseSync: false});
                    });*/
                }
                else {
                    this.setState({pauseSync: 'pausing'});
                    Actions.pauseChanges(this.props.id, true);

                    /*OC.api.curriculum.settings.pauseChanges(this.props.id, function(response){
                        view.setState({pauseSync: true});
                    });*/
                }
            }
        },
        pushChanges: function(event){
            console.log('tried pausing changes');
            /*var view = this;
            this.setState({pushingSync: true});
            OC.api.curriculum.settings.pushChanges(this.props.id, function(response){
                view.setState({lastPushed: response.lastPushed, pushingSync: false}, function(){
                    view.updateSyncTime();
                });
            });*/
        },
        goBack: function(){
            Actions.openOverview();
        },

        generalView: function(){
            return React.DOM.div({className: 'card-wrapper'},
                React.DOM.div({className: 'card'}, [
                    React.DOM.div({className: 'card-toolbar', style: { backgroundColor: OC.config.palette.dark }}, [
                        React.DOM.a({
                            className: 'card-toolbar-back back-button ' + OC.config.palette.title + '-button',
                            onClick: this.goBack
                        }, 'Back')
                    ]),
                    React.DOM.div({className: 'card-title-wrapper card-title-wrapper-edit card-title-wrapper-small'}, [
                        React.DOM.input({
                            className: 'card-title ' + OC.config.palette.title + '-card-title',
                            defaultValue: this.state.general.title, placeholder: 'Name', ref: 'curriculumNameInput',
                            onBlur: this.hideTip, name: 'title'
                        }),
                    ]),
                    React.DOM.div({className: 'card-input-wrapper card-dual-input-wrapper'}, [
                        React.DOM.input({
                            className: 'card-input ' + OC.config.palette.title + '-card-input',
                            defaultValue: (this.state.general.gradeType ? this.state.general.gradeType + ' ' : '') + this.state.general.grade, placeholder: 'Grade (eg. Grade 5)', ref: 'curriculumGradeInput',
                            onBlur: this.hideTip, name: 'grade'
                        }),
                        React.DOM.input({
                            className: 'card-input ' + OC.config.palette.title + '-card-input',
                            defaultValue: this.state.general.subject, placeholder: 'Subject', ref: 'curriculumSubjectInput',
                            onBlur: this.hideTip, name: 'subject'
                        }),
                    ]),
                    React.DOM.div({className: 'card-input-wrapper'}, [
                        React.DOM.select({
                            className: 'card-input ' + OC.config.palette.title + '-card-input',
                            defaultValue: this.state.general.session, placeholder: 'Academic session', ref: 'curriculumGradeInput',
                            name: 'session', onBlur: this.hideTip }, [
                            React.DOM.option({value: 'semester'}, 'Semester'),
                            React.DOM.option({value: 'trimester'}, 'Trimester'),
                            React.DOM.option({value: 'term'}, 'Term'),
                            React.DOM.option({value: 'instructional-block'}, 'Instructional Block'),
                            React.DOM.option({value: 'session'}, 'Session'),
                            React.DOM.option({value: 'other'}, 'Other')
                        ])
                    ]),
                    Duration({ from: this.state.general.from, to: this.state.general.to, updateSettings: this.updateSettings }),
                    React.DOM.div({className: 'card-section-title-wrapper'},
                        React.DOM.div({className: 'card-section-title', style: {color: OC.config.palette.base} }, 'Advanced')
                    ),
                    React.DOM.div({className: 'card-input-wrapper explorer-settings-general-sync'}, [
                        React.DOM.div({className: ''}, 'Sync'),
                        React.DOM.div({className: ''},
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
                        )
                    ]),

                ])

            );
            /*return React.DOM.table({className: 'explorer-settings-general'}, [
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
                    //Duration({
                    //    from: this.state.general.from,
                    //    to: this.state.general.to,
                    //    durationRelevance: this.state.general.durationRelevance,
                    //    updateSettings: this.updateSettings
                    //}),

                    // Color scheme.
                    //React.DOM.tr({className: ''}, [
                    //    React.DOM.td({className: ''}, 'Color scheme'),
                    //    React.DOM.td({className: ''},
                    //        React.DOM.input({className: '', type: 'text'}, null)
                    //    ),
                    //    React.DOM.td({className: ''}, null)
                    ]),


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
            ]);*/



        },

        openUnits: function(event){
            this.setState({view: 'units'});

            event.stopPropagation();
            event.preventDefault();
            return false;
        },

        openTextbooks: function(event){
            this.setState({view: 'textbooks'});

            event.stopPropagation();
            event.preventDefault();
            return false;
        },

        render: function(){
            var viewToRender;

            switch (this.state.view){
                case 'general':
                    viewToRender = this.generalView;
                    break;
                
                case 'textbooks':
                    viewToRender = Textbooks;
                    break;
                
                case 'units':
                    viewToRender = Units;
                    break;
            }

            return viewToRender();
        }
    });

    var Duration = React.createClass({
        getInitialState: function(){
            return {from: null, to: null, initialized: false, durationRelevance: false};
        },
        componentWillMount: function(){
            this.setState({
                from: this.props.from,
                to: this.props.to,
                durationRelevance: this.props.durationRelevance
            });
        },
        componentDidMount: function(){
            var view = this,
                fromField = this.refs.from.getDOMNode(),
                toField = this.refs.to.getDOMNode();

            var from = new Pikaday({ field: fromField,
                onSelect: function(date){
                    if (view.state.initialized){
                        view.props.updateSettings({
                            target: {
                                name: 'from',
                                value: date,
                                title: date.toISOString()
                            }
                        });
                    }
                }
            }),
                to = new Pikaday({ field: toField,
                onSelect: function(date){
                    if (view.state.initialized){
                        view.props.updateSettings({
                            target: {
                                name: 'to',
                                value: date,
                                title: date.toISOString()
                            }
                        });
                    }
                }
            });

            from.setDate(view.state.from);
            to.setDate(view.state.to);

            view.setState({initialized: true});
        },
        render: function(){
            return React.DOM.div({className: 'card-input-wrapper card-dual-input-wrapper'}, [
                React.DOM.input({className: 'card-input ' + OC.config.palette.title + '-card-input', name: 'From',
                    placeholder: 'From', ref: 'from' }),
                React.DOM.input({className: 'card-input ' + OC.config.palette.title + '-card-input', name: 'To',
                    placeholder: 'To', ref: 'to' }),
                /*React.DOM.div({className: 'explorer-settings-general-duration-relevance'}, [
                    React.DOM.label({className: ''}, [
                        React.DOM.input({
                            className: '', type: 'checkbox',
                            name: 'durationRelevance'
                        }, null),
                        React.DOM.span({className: ''}, 'The specific dates don\'t matter')
                    ]),
                ])*/
            ]);

            /*return React.DOM.tr({className: 'explorer-settings-general-duration'}, [
                React.DOM.td({className: ''}, 'Duration'),
                React.DOM.td({className: ''}, [
                    React.DOM.div({className: ''}, [
                        React.DOM.input({
                            className: 'explorer-settings-general-duration-from', type: 'text',
                            //onFocus: this.showTip, onBlur: this.hideTip,
                            name: 'from', placeholder: 'From'
                        }, null),
                        React.DOM.input({
                            className: 'explorer-settings-general-duration-to', type: 'text',
                            //onFocus: this.showTip, onBlur: this.hideTip,
                            name: 'to', placeholder: 'To'
                        }, null)
                    ]),

                ]),
                React.DOM.td({className: 'explorer-settings-general-tip'}, 'When does the program / year / course begin and end?')
            ]);*/
        }
    });


    return Settings;
});