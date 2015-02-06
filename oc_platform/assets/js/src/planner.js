define(['react', 'core_light', 'moment', 'curriculumContextView', 'plannerActions', 'plannerStore', 'immutable'],
    function(React, OC, moment, ContextView, Actions, PlannerStore, Immutable){
    
    var bodyWrapper = document.querySelector('.content-panel-body-wrapper');
    OC.api = {
        planner: {
            event: {
                save: function(serializedEvent, callback){
                    require(['jstz', 'atomic'], function(jstz, atomic){
                        serializedEvent['zone'] = jstz.determine().name();
                        atomic.post('/planner/event/save/', serializedEvent)
                        .success(function(response, xhr){
                            callback(response);
                        });
                    });
                }
            }
        }
    };

    var Planner = {
        calendar: React.createClass({
            getInitialState: function(){
                return {hourHeight: 3.85, week: this.props.week,
                    allDayWeekEvents: [], height: 1000
                };
            },
            componentDidMount: function(){
                var view = this, calendarFrameHeight;

                function resizeUI(){
                    calendarFrameHeight = (
                        parseInt(window.innerHeight, 10) - parseInt(OC.$.css(document.querySelector(
                            '.content-panel header'), 'height'), 10) - parseInt(OC.$.css(document.querySelector(
                            '.content-panel-body-title-bar-wrapper'), 'height'), 10) + 'px');

                    view.refs.calendarWrapper.getDOMNode().style.height = calendarFrameHeight;
                }
    
                resizeUI();
                window.addEventListener('resize', resizeUI);

                this.setHourHeight();
            },

            componentWillMount: function(){
                this.setAllDayWeekEvents();
            },

            componentWillReceiveProps: function(nextProps){
                if (this.props.allDayEvents !== nextProps.allDayEvents)
                    this.setAllDayWeekEvents(nextProps.allDayEvents);
            },

            renderTimes: function(){
                var i, hours = [], currentTime = moment();

                hours.push(React.DOM.div({className: 'planner-calendar-times-date'}));

                hours.push(React.DOM.div({
                    className: 'planner-calendar-times-allday', ref: 'allDayTimes',
                    style: {
                        height: this.state.allDayWeekEvents.length * (this.state.hourHeight) + '%'
                    }
                }));

                for (i = 0; i < 24; i++){
                    currentTime.set('hour', i);
                    hours.push(
                        React.DOM.div({className: 'planner-calendar-times-time', ref: 'timeBlock',
                            style: { height: this.state.hourHeight + '%' } },
                            React.DOM.div({className: 'planner-calendar-times-body'}, [
                                React.DOM.div({className: 'planner-calendar-times-time-title-wrapper'},
                                    React.DOM.div({className: 'planner-calendar-times-time-title'}, currentTime.format('h a'))),
                                React.DOM.div({className: 'planner-calendar-times-time-week'})
                            ])
                        )
                    );
                }

                return hours;
            },
            setHourHeight: function(){
                this.setState({ hourHeight: (100 - 7.6) / (24 + this.state.allDayWeekEvents.length) });
            },
            renderEvents: function(){
                // Determine the five days of the current week.

                var i, j, days = [], day, evnts, currentDay;
                var nextMonday = (this.props.currentWeek * 7) + 1, endOfWeek = nextMonday + 5, today = moment();

                days.push(React.DOM.div({className: 'planner-calendar-canvas-time'}));

                for (i = nextMonday; i < endOfWeek; i++){
                    currentDay = moment().weekday(i);
                    day = this.state.week[currentDay.format('YYYY-MM-DD').toString()];

                    evnts = [];

                    evnts.push(React.DOM.div({className: 'planner-calendar-canvas-day-header-wrapper'},
                        React.DOM.div({className: 'planner-calendar-canvas-day-header'}, [
                            React.DOM.div({className: 'planner-calendar-canvas-day-header-day'}, currentDay.format('ddd')),
                            React.DOM.div({
                                className: 'planner-calendar-canvas-day-header-date',
                                style: {
                                    color: OC.config.palette.base
                                }
                            }, currentDay.format('D'))
                        ])
                    ));

                    var allDayEventsHeight = this.state.allDayWeekEvents.length * (this.state.hourHeight) + '%';
                    evnts.push(React.DOM.div({
                        className: 'planner-calendar-canvas-allday',
                        style: {
                            height: allDayEventsHeight
                        }
                    }));

                    if (day){
                        for (j = 0; j < day.length; j++)
                            if (day[j].all_day === false){
                                evnts.push(Planner.evntPreview({
                                    evnt: day[j],
                                    hourHeight: this.state.hourHeight,
                                    openEvent: this.props.openEvent,
                                }));
                            }
                    }

                    days.push(React.DOM.div({className: 'planner-calendar-canvas-day'}, [
                        today.isSame(currentDay, 'day') ? React.DOM.div({className: 'planner-calendar-canvas-day-today'}) : null,
                        React.DOM.div({className: 'planner-calendar-canvas-day-events'}, evnts)
                    ]));

                }

                return days;
            },

            setAllDayWeekEvents: function(allDayEvents){
                // Go through every all day event.
                var i, j, k, date, evnts = allDayEvents || this.props.allDayEvents, evnt, start, end, now, width, padding;
                var currentMonday = 1, endOfWeek = currentMonday + 5, today = moment();

                var allDayWeekEvents = [];

                for (date in evnts){
                    for (i = 0; i < evnts[date].length; i++){
                        // Check if the all day event has a start today or before.
                        evnt = evnts[date][i];
                        start = moment(evnt.start); end = moment(evnt.end);
                        now = new Date();

                        if (start.isSame(now, 'date') || (start.isBefore(moment().weekday(endOfWeek)) && end.isAfter(
                            moment().weekday(currentMonday - 1)))){

                            // If yes, begin daily spacers till the end of the week.
                            width = end.diff(start, 'days');
                            padding = start.day() - currentMonday;

                            allDayWeekEvents.push({
                                'title': evnt.title,
                                'width': width,
                                'padding': padding
                            });
                        }
                    }
                }

                var view = this;
                this.setState({ allDayWeekEvents: allDayWeekEvents }, function(){
                    view.setHourHeight();
                });

            },

            renderAlldayEvents: function(){
                var evntsViews = [], i, allDayWeekEvents = this.state.allDayWeekEvents;

                for (i = 0; i < allDayWeekEvents.length; i++) {
                    evntsViews.push(Planner.allDayEventPreview({
                        evnt: allDayWeekEvents[i],
                        openEvent: this.props.openEvent
                    }));
                }

                return [
                    React.DOM.div({className: 'planner-calendar-allday-canvas-date'}, null),
                    React.DOM.div({className: 'planner-calendar-allday-canvas-events'}, evntsViews),
                ];
            },

            render: function(){
                return React.DOM.div({className: 'planner-calendar-wrapper', ref: 'calendarWrapper'},
                    React.DOM.div({className: 'planner-calendar'}, [
                        React.DOM.div({className: 'planner-calendar-times'}, [
                            this.renderTimes()
                        ]),
                        React.DOM.div({className: 'planner-calendar-days', ref: 'calendarDays'}, [
                            React.DOM.div({className: 'planner-calendar-days-times'},
                                React.DOM.div({className: 'planner-calendar-days-day-divider'})),
                            React.DOM.div({className: 'planner-calendar-days-day'},
                                React.DOM.div({className: 'planner-calendar-days-day-divider'})),
                            React.DOM.div({className: 'planner-calendar-days-day'},
                                React.DOM.div({className: 'planner-calendar-days-day-divider'})),
                            React.DOM.div({className: 'planner-calendar-days-day'},
                                React.DOM.div({className: 'planner-calendar-days-day-divider'})),
                            React.DOM.div({className: 'planner-calendar-days-day'},
                                React.DOM.div({className: 'planner-calendar-days-day-divider'})),
                            React.DOM.div({className: 'planner-calendar-days-day'},
                                React.DOM.div({className: 'planner-calendar-days-day-divider'})),
                        ]),
                        React.DOM.div({className: 'planner-calendar-canvas'}, [
                            this.renderEvents()
                        ]),
                        React.DOM.div({className: 'planner-calendar-allday-canvas'}, [
                            this.renderAlldayEvents()
                        ]),
                    ])
                );
            }
        }),
        evnt: React.createClass({
            getInitialState: function(){
                return { contexts: this.props.contexts };
            },
            componentWillReceiveProps: function(nextProps){
                if (nextProps.hasOwnProperty('contexts'))
                    this.setState({ contexts: nextProps.contexts });
            },
            componentDidMount: function(){
                var view = this;

                var loadButton = this.getDOMNode().querySelector('.ajax-loader'),
                    loadButtonWrapper = this.getDOMNode().querySelector('.ajax-loader-wrapper');

                // Set spinner on loading button area.
                require(['spin'], function(Spinner){
                    if (! Planner.hasOwnProperty('spinner')){
                        Planner.spinner = new Spinner(OC.spinner.options).spin(loadButton);
                    } else Planner.spinner.spin(loadButton);

                    if (Planner.hasOwnProperty('spinner')) Planner.spinner.spin(loadButton);

                    // Fetch event body.
                    require(['atomic'], function(atomic){
                        atomic.get('/planner/api/event/' + view.props.evnt.id + '/')
                        .success(function(response, xhr){
                            view.props.setContexts(view.props.evnt.id, response.contexts);
                            view.props.setNotes(view.props.evnt.id, response.notes);

                            Planner.spinner.stop();
                        });
                    });

                });
            },
            renderContexts: function(){
                var c, contexts = [], items, i;
                for (c in this.state.contexts){
                    items = [];

                    for (i = 0; i < this.state.contexts[c].items.length; i++){
                        items.push(Planner.evntItemView({ item: this.state.contexts[c].items[i] }));
                    }

                    contexts.push(
                        React.DOM.div({className: 'planner-event-details-block'}, [
                            React.DOM.div({className: 'planner-event-details-block-title',
                                style: { color: (this.props.evnt.palette ? OC.utils.palettes[this.props.evnt.palette].base : OC.config.palette.base) }},
                                this.state.contexts[c].title + ' / ' + this.state.contexts[c].unitTitle),
                            React.DOM.div({className: 'planner-event-details-block-items'}, items)
                        ])
                    );
                }

                return contexts;
            },
            edit: function(){
                this.props.editEvent();
            },
            goBack: function(){
                Actions.closeItem();

                this.props.closeEvent();
            },
            delete: function(){
                this.props.deleteEvent();
            },
            render: function(){
                var toolbarStyle, titleStyle;
                if (this.props.evnt.class_link){
                    toolbarStyle = { backgroundColor: OC.utils.palettes[this.props.evnt.palette].dark };
                    titleStyle = { backgroundColor: OC.utils.palettes[this.props.evnt.palette].base };
                } else {
                    toolbarStyle = { backgroundColor: OC.config.palette.dark };
                    titleStyle = { backgroundColor: OC.config.palette.base };
                }

                var start = moment(this.props.evnt.start),
                    end = moment(this.props.evnt.end);

                return React.DOM.div({className: 'planner-event-wrapper card-wrapper' + (this.props.drawer ? ' card-wrapper-condensed' : '')},
                    React.DOM.div({className: 'planner-event card'}, [
                        React.DOM.div({className: 'planner-event-toolbar card-toolbar', style: toolbarStyle }, [
                            React.DOM.a({
                                className: 'card-toolbar-back planner-event-toolbar-back back-button ' + (
                                    this.props.evnt.palette ? this.props.evnt.palette : OC.config.palette.title) + '-button',
                                onClick: this.goBack
                            }, 'Back'),
                            React.DOM.div({className: 'card-toolbar-secondary'}, [
                                OC.config.user.id === OC.config.profile.id ? React.DOM.a({
                                    className: 'planner-event-toolbar-back card-toolbar-delete ' + (
                                    (this.props.evnt.palette ? this.props.evnt.palette : OC.config.palette.title) + '-button'),
                                    onClick: this.delete
                                }, 'Delete') : null,
                                OC.config.user.id === OC.config.profile.id ? React.DOM.a({
                                    className: 'planner-event-toolbar-back card-toolbar-edit ' + (
                                    (this.props.evnt.palette ? this.props.evnt.palette : OC.config.palette.title) + '-button'),
                                    onClick: this.edit
                                }, 'Edit') : null
                            ])
                        ]),
                        React.DOM.div({className: 'planner-event-title-wrapper card-title-wrapper',  style: titleStyle}, [
                            React.DOM.div({className: 'planner-event-title card-title'},  this.props.evnt.title),
                            React.DOM.div({className: 'planner-event-title-assist'},  [
                                React.DOM.span({className: 'planner-event-title-assist-class'}, (this.props.evnt.class_link ? this.props.evnt.class_link.title + ' / ' : '') + start.fromNow(
                                    )),
                                React.DOM.span({}, ' on '),
                                React.DOM.span({className: 'planner-event-title-assist-date'}, start.format('MMM Do, YYYY [at] h:mma')),
                                React.DOM.span({}, ' to '),
                                React.DOM.span({className: 'planner-event-title-assist-date'}, start.isSame(end, 'day') ? end.format('h:mma') : end.format('MMM Do, YYYY [at] h:mma'))
                            ])
                        ]),
                        this.state.contexts ? React.DOM.div({className: 'planner-event-details card-details card-details-padded'}, this.renderContexts()) : null,
                        this.props.notes ? React.DOM.div({className: 'planner-event-details card-details card-details-padded'},
                            React.DOM.div({className: 'planner-event-details-block'}, [
                                React.DOM.div({className: 'planner-event-details-block-title',
                                    style: { color: (this.props.evnt.palette ? OC.utils.palettes[this.props.evnt.palette].base : OC.config.palette.base) }}, 'Notes'),
                                React.DOM.div({className: 'planner-event-details-block-body'}, this.props.notes)
                            ])
                        ): null,
                        (this.state.contexts === null || typeof this.state.contexts === 'object' ) ? null : React.DOM.div({className: 'ajax-loader-wrapper'}, React.DOM.div({className: 'ajax-loader'}))
                    ])
                );
            }
        }),

        evntItemView: React.createClass({
            open: function(){
                Actions.openItem(this.props.item);
            },
            render: function(){
                return React.DOM.div({className: 'planner-event-details-block-item'},
                    React.DOM.a({className: 'planner-event-details-block-item-description', onClick: this.open},
                        this.props.item.description)
                );
            }
        }),

        // Copied from classes.js. Need to remove duplication.
        time: React.createClass({
            classPeriodChanged: function(timeEl){
                //this.props.changed(this.getDOMNode().value, this.props.position, this.props.name, this.props.day);
                this.props.scrollToTimepicker(this.getDOMNode());
            },
            componentDidMount: function(){
                this.time = OC.utils.timepicker(this.getDOMNode(), null, this.props.listenToChange ? this.classPeriodChanged : null);
            },
            componentWillReceiveProps: function(nextProps){
                if (nextProps.scrollTo){
                    this.time.scrollTo(nextProps.scrollTo);
                }
            },
            componentWillUnmount: function(nextProps, nextState){
                this.time.el.parentNode.removeChild(this.time.el);
            },
            render: function(){
                return React.DOM.input({type: 'text', placeholder: this.props.name, className: 'planner-time',
                    defaultValue: this.props.time, onChange: this.classPeriodChanged, ref: this.props.ref });
            }
        }),

        editEvnt: React.createClass({
            getInitialState: function(){
                return { contexts: this.props.contexts, scrollTo: null };
            },
            componentDidMount: function(){
                var fromField = this.refs.startDate.getDOMNode(),
                    toField = this.refs.endDate.getDOMNode();

                require(['pikaday'], function(Pikaday){
                    var from, to;
                    from = new Pikaday({
                        field: fromField,
                        onSelect: function(date){
                            to.setMinDate(date);
                        }
                    });
                    to = new Pikaday({
                        field: toField,
                        /*onSelect: function(date){
                            toField.title = date.toISOString();
                        }*/
                    });
                });

            },
            scrollToTimepicker: function(){
                this.setState({ scrollTo: this.refs.startTime.getDOMNode() });
            },
            save: function(){
                var view = this;
                var serializedEvent = {
                    'id': this.props.evnt.id,
                    'title': this.refs.newEventInput.getDOMNode().value,
                    'from_date': this.refs.startDate.getDOMNode().value,
                    'from_time': this.refs.startTime.getDOMNode().value,
                    'to_date': this.refs.endDate.getDOMNode().value,
                    'to_time': this.refs.endTime.getDOMNode().value,
                    'class': this.refs.class.getDOMNode().value,
                    'notes': this.refs.notes.getDOMNode().value,
                };

                var isNew = this.props.evnt.id ? false : true;
                OC.api.planner.event.save(serializedEvent, function(response){
                    if (! serializedEvent.id){
                        serializedEvent.id = response.id;
                        OC.utils.messageBox.set('New event \'' + serializedEvent.title + '\' saved');
                    } else {
                        OC.utils.messageBox.set('Saved');
                    }

                    // Find palette of newly created event.
                    var palette = 'blue', title = 'None', i;
                    for (i = 0; i < OC.planner.classes; i++) {
                        if (OC.planner.classes[i].id === parseInt(serializedEvent.class, 10)){
                            palette = OC.planner.classes[i].palette;
                            title = OC.planner.classes[i].title;
                            break;
                        }
                    }

                    var event = {
                        all_day: false,
                        class_link: {
                            id: parseInt(serializedEvent.class, 10),
                            title: title
                        },
                        start: response.start,
                        end: response.end,
                        id: serializedEvent.id,
                        palette: palette,
                        title: serializedEvent.title,
                    };

                    view.props.eventSaved(event, isNew);

                    OC.utils.messageBox.show();
                });
            },
            goBack: function(){
                this.props.closeEdit();
            },
            remove: function(itemID){
                var c, i, contexts = this.state.contexts;
                for (c in contexts){
                    for (i = 0; i < contexts[c].items.length; i++){
                        if (contexts[c].items[i].id === itemID)
                            break;
                    }

                    contexts[c].items.splice(i, 1);
                }
                this.setState({contexts: contexts});
            },
            renderClasses: function(){
                var classList = OC.planner.classes.map(function(classy){
                    return React.DOM.option({className: 'planner-class-detail-select-option', value: classy.id}, classy.title);
                });
                classList.push(React.DOM.option({className: 'planner-class-detail-select-option', value: 'none' }, 'None'));
                return classList;
            },
            renderContexts: function(){
                var c, contexts = [], items, i;
                for (c in this.state.contexts){
                    items = [];

                    for (i = 0; i < this.state.contexts[c].items.length; i++){
                        items.push(Planner.evntItem({
                            item: this.state.contexts[c].items[i],
                            evnt: this.props.evnt,
                            remove: this.remove
                        }));
                    }

                    contexts.push(
                        React.DOM.div({className: 'planner-event-details-block'}, [
                            React.DOM.div({className: 'planner-event-details-block-title',
                                style: { color: (this.props.evnt.palette ? OC.utils.palettes[this.props.evnt.palette].base : OC.config.palette.base) }},
                                this.state.contexts[c].title + ' / ' + this.state.contexts[c].unitTitle),
                            React.DOM.div({className: 'planner-event-details-block-items'}, items)
                        ])
                    );
                }

                return contexts;
            },
            render: function(){
                var toolbarStyle, titleStyle, start = moment(this.props.evnt.start), end = moment(this.props.evnt.end);
                if (this.props.evnt.class_link){
                    toolbarStyle = { backgroundColor: OC.utils.palettes[this.props.evnt.palette].dark };
                    titleStyle = { backgroundColor: OC.utils.palettes[this.props.evnt.palette].base };
                } else {
                    toolbarStyle = { backgroundColor: OC.config.palette.dark };
                    titleStyle = { backgroundColor: OC.config.palette.base };
                }
                return React.DOM.div({className: 'planner-event-wrapper card-wrapper'},
                    React.DOM.div({className: 'planner-event card'}, [
                        React.DOM.div({className: 'planner-event-toolbar card-toolbar', style: toolbarStyle }, [
                            React.DOM.a({
                                className: 'card-toolbar-back planner-event-toolbar-back back-button ' + (
                                    this.props.evnt.palette ? this.props.evnt.palette : OC.config.palette.title) + '-button',
                                onClick: this.goBack
                            }, 'Back'),
                            React.DOM.div({className: 'card-toolbar-secondary'}, [
                                React.DOM.a({
                                    className: 'planner-event-toolbar-back card-toolbar-save ' + (
                                    this.props.evnt.palette ? this.props.evnt.palette : OC.config.palette.title) + '-button',
                                    onClick: this.save
                                }, 'Save')
                            ])
                        ]),
                        React.DOM.div({className: 'planner-event-title-wrapper card-title-wrapper card-title-wrapper-edit card-title-wrapper-small'}, [
                            React.DOM.input({className: 'planner-event-title card-title ' + (this.props.evnt.palette ? this.props.evnt.palette : OC.config.palette.title) + '-card-title',
                                defaultValue: this.props.evnt.title, placeholder: 'What is this event called?', ref: 'newEventInput' }),
                        ]),

                        React.DOM.div({className: 'planner-class-details planner-class-details-dates planner-class-details-times card-details card-details-padded'}, [
                            React.DOM.div({className: 'planner-class-detail'}, [
                                React.DOM.div({className: 'planner-class-detail-support planner-class-detail-input-support'}, 'From'),
                                React.DOM.div({className: 'planner-class-detail-body'}, [
                                    React.DOM.input({type: 'text', ref: 'startDate', placeholder: 'Start date', title: start.toISOString(),
                                        value: start.format('YYYY-MM-DD') }),
                                    Planner.time({
                                        time: this.props.evnt.start ? start.format('hh:mma') : null,
                                        name: 'Start time', ref: 'startTime', scrollTo: null, scrollToTimepicker: this.scrollToTimepicker,
                                        listenToChange: true
                                    })
                                ])
                            ]),
                            React.DOM.div({className: 'planner-class-detail'}, [
                                React.DOM.div({className: 'planner-class-detail-support planner-class-detail-input-support'}, 'To'),
                                React.DOM.div({className: 'planner-class-detail-body'}, [
                                    React.DOM.input({type: 'text', ref: 'endDate', placeholder: 'End date', title: end.toISOString(),
                                        value: end.format('YYYY-MM-DD') }),
                                    Planner.time({
                                        time: this.props.evnt.end ? end.format('hh:mma') : null,
                                        name: 'End time', ref: 'endTime', scrollTo: this.state.scrollTo, scrollToTimepicker: this.scrollToTimepicker,
                                        listenToChange: false
                                    })
                                ])
                            ]),
                        ]),
                        React.DOM.div({className: 'planner-class-details planner-class-details-class card-details card-details-padded'}, [
                            React.DOM.div({className: 'planner-class-detail'}, [
                                React.DOM.div({className: 'planner-class-detail-support'}, 'Class'),
                                React.DOM.select({className: 'planner-class-detail-body', ref: 'class', defaultValue: this.props.evnt.class_link ? this.props.evnt.class_link.id : 'none' }, this.renderClasses())
                            ])
                        ]),

                        this.state.contexts ? React.DOM.div({className: 'planner-event-details card-details card-details-padded'}, this.renderContexts()) : null,
                        React.DOM.div({className: 'planner-class-details planner-class-details-colors card-details card-details-padded'}, [
                            React.DOM.div({className: 'planner-class-detail'}, [
                                React.DOM.div({className: 'planner-class-detail-support'}, 'Notes'),
                                React.DOM.textarea({className: 'planner-class-detail-body', ref: 'notes'}, this.props.notes)
                            ])
                        ]),
                    ])
                );
            }
        }),

        evntItem: React.createClass({
            componentDidMount: function(){
                var actions = this.refs.actions.getDOMNode();

                OC.$.addClass(actions, 'show');
                OC.utils.menu(this.getDOMNode().querySelector(
                    'nav.item-menu'), this.refs.actions.getDOMNode());
                OC.$.removeClass(actions, 'show');
            },
            moveItem: function(){
                var view = this;
                var moveDialog = OC.utils.popup('.move-item-dialog');

                function load(loader, callback){
                    require(['spin'], function(Spinner){
                        if (! Planner.hasOwnProperty('moveEventSpinner')){
                            var popupOptions = OC.spinner.options;
                            popupOptions['top'] = '75%';
                            Planner.moveEventSpinner = new Spinner(popupOptions).spin(loader);
                        } else Planner.moveEventSpinner.spin(loader);

                        callback();
                    });
                }

                function toSchedule(event, isNext){
                    moveDialog.close();
                    
                    var confirmDialog = OC.utils.popup('.confirm-move-dialog'),
                        loader = confirmDialog.dialog.querySelector('.popup-body-loader'),
                        message = confirmDialog.dialog.querySelector('.confirm-move-message'),
                        none = confirmDialog.dialog.querySelector('.confirm-move-none'),
                        back = confirmDialog.dialog.querySelector('.go-back-button'),
                        confirm = confirmDialog.dialog.querySelector('.confirm-button'),
                        cancel = confirmDialog.dialog.querySelector('.cancel-button'),
                        selectedEventID = null;

                    OC.$.removeClass(message, 'show');
                    OC.$.removeClass(none, 'show');

                    // Set to loading to fetch next class.
                    load(loader, function(){
                        // Fetch next class in series.
                        require(['atomic'], function(atomic){
                            atomic.get('/planner/event/' + (isNext ? 'after' : 'before') + '/' + view.props.evnt.id + '/')
                            .success(function(response, xhr){
                                Planner.moveEventSpinner.stop();

                                if (response){
                                    OC.$.addClass(message, 'show');
                                    selectedEventID = response.id;

                                    var start = moment(response.start);

                                    confirmDialog.dialog.querySelector(
                                        '.confirm-move-dialog-date').innerHTML = start.format('dddd, MMMM Do YYYY');
                                    confirmDialog.dialog.querySelector(
                                        '.confirm-move-dialog-time').innerHTML = start.format('h:mma');
                                    confirmDialog.dialog.querySelector(
                                        '.confirm-move-dialog-class').innerHTML = response.class_link.title;
                                } else {
                                    OC.$.addClass(none, 'show');
                                    OC.$.removeClass(back, 'secondary-popup-button');
                                    OC.$.addClass(confirm, 'hide');
                                }
                            });
                        });
                    });

                    OC.$.addListener(back, 'click', function(event){
                        confirmDialog.close();
                        moveDialog = OC.utils.popup('.move-item-dialog');
                    });

                    OC.$.addListener(confirm, 'click', function(event){
                        confirmDialog.close();

                        require(['plannerAPI'], function(){
                            OC.api.planner.addItem(view.props.item.id, selectedEventID);
                            OC.api.planner.removeItem(view.props.item.id, view.props.evnt.id);
                            view.remove();

                            OC.utils.messageBox.set('Moved item successfully');
                            OC.utils.messageBox.show();
                        });
                    });

                    OC.$.addListener(cancel, 'click', function(event){
                        confirmDialog.close();
                    });
                }

                OC.$.addListener(moveDialog.dialog.querySelector('.option-next'),
                    'click', function(event){ toSchedule(event, true); });

                OC.$.addListener(moveDialog.dialog.querySelector('.option-before'),
                    'click', function(event){ toSchedule(event, false); });

                OC.$.addListener(moveDialog.dialog.querySelector('.option-select'), 'click',
                    function(event){
                        moveDialog.close();
                        var moveWidget = OC.utils.popup('.move-item-widget-dialog'),
                            loader = moveWidget.dialog.querySelector('.popup-body-loader');

                        load(loader, function(){
                            require(['plannerWidget', 'curriculumActions', 'plannerAPI'],
                                function(PlannerWidget, curriculumActions){
                                React.renderComponent(
                                    PlannerWidget.Calendar(
                                        {itemID: view.props.item.id},
                                        {
                                            cancelEventSelect: function(){
                                                curriculumActions.clearEventSelection();
                                            },
                                            confirmEventSelect: function(itemID, eventID){
                                                curriculumActions.confirmAddItemToEvent(itemID, eventID);
                                                curriculumActions.removeItemFromEvent(itemID, view.props.evnt.id);
                                                
                                                view.remove();

                                                //Actions.brighten();
                                                moveWidget.close();

                                                OC.utils.messageBox.set('Moved item successfully');
                                                OC.utils.messageBox.show();
                                            },
                                            dateSelect: function(date){
                                                curriculumActions.selectDate(date);
                                            },
                                            eventSelect: function(eventID, eventDate){
                                                curriculumActions.selectPlannerEvent(eventID, eventDate);
                                            }
                                        }),
                                    document.querySelector('.move-item-widget'),
                                    function(){
                                        moveWidget.reposition();
                                    }
                                );
                            });
                        });
                    }
                );
            },
            remove: function(){
                this.props.remove(this.props.item.id);
            },

            getInitialState: function(){
                return { showMenu: false };
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
                            }
                        });
                    }
                });
            },

            render: function(){
                return React.DOM.div({
                    className: 'planner-event-details-block-item'
                }, [
                    React.DOM.div({className: 'planner-event-details-block-item-description'},
                        this.props.item.description),
                    React.DOM.div({
                        className: 'planner-event-details-block-item-actions' + (this.state.showMenu ? ' show' : '' ),
                        onClick: this.toggleMenu,
                        ref: 'actions'
                    }),
                    Planner.itemMenu({
                        open: this.state.showMenu,
                        moveItem: this.moveItem,
                        //removeItem: this.props.removeItem
                    })
                ]);
            }
        }),

        evntPreview: React.createClass({
            componentDidMount: function(){
                var wrapper = this.refs.wrapper.getDOMNode();
                wrapper.style.marginBottom = '-' + OC.$.css(wrapper, 'height');
            },
            openEvent: function(){
                this.props.openEvent(this.props.evnt);
            },
            render: function(){
                var evntTimes = [new Date(this.props.evnt.start), new Date(this.props.evnt.end)],
                    evntHeight = (Math.round((evntTimes[1] - evntTimes[0]) / 1000 / 60)) / 60 * this.props.hourHeight;

                var wrapperStyle = {
                   top: ((evntTimes[0].getHours() + (evntTimes[0].getMinutes() / 60)) * this.props.hourHeight) + '%',
                   height: evntHeight + '%',
                };

                if (this.props.evnt.palette)
                    wrapperStyle['backgroundColor'] = OC.utils.palettes[this.props.evnt.palette].base;

                return React.DOM.div({
                    className: 'planner-calendar-canvas-day-event-wrapper',
                    style: wrapperStyle,
                    onClick: this.openEvent,
                    ref: 'wrapper'
                },
                React.DOM.div({className: 'planner-calendar-canvas-day-event'}, [
                    React.DOM.div({className: 'planner-calendar-canvas-day-event-title'}, this.props.evnt.title),
                    evntHeight >= 40 ? React.DOM.div({className: 'planner-calendar-canvas-day-event-time'}, moment(evntTimes[0]).format(
                        'ha') + '-' + moment(evntTimes[1]).format('ha')) : null
                ]));
            }
        }),

        allDayEventPreview: React.createClass({
            openEvent: function(){
                this.props.openEvent(this.props.evnt);
            },
            render: function(){
                var i, evntView = [];
                for (i = 0; i < this.props.evnt.padding; i++){
                    evntView.push(React.DOM.div(
                        {className: 'planner-calendar-allday-canvas-event-padding'}, null));
                }

                evntView.push(React.DOM.div({
                    className: 'planner-calendar-allday-canvas-event-body-wrapper',
                    style: {
                        width: ((this.props.evnt.width + 1) * 20) + '%'
                    }
                }, React.DOM.div({className: 'planner-calendar-allday-canvas-event-body'}, this.props.evnt.title)
                ));

                return React.DOM.div({
                    className: 'planner-calendar-allday-canvas-event',
                    //onClick: this.openEvent
                }, evntView);
            }
        }),

        calendarWrapper: React.createClass({
            getInitialState: function(){
                return {
                    view: 'calendar', evnt: null, week: {},
                    currentWeek: 0, allDayEvents: {}, loaded: [],
                    contexts: {}, notes: {},
                    drawer: PlannerStore.getDrawer(), context: PlannerStore.getItem()
                };
            },

            componentDidMount: function(){
                var view = this;

                this.loadSpinner(function(){
                    require(['atomic', 'jstz'], function(atomic, jstz){
                        var zone = jstz.determine().name();
                        atomic.get('/planner/events/' + OC.config.profile.id + '/' + encodeURIComponent(zone) + '/')
                        .success(function(response, xhr){
                            view.updateEvents(response);
                            view.setState({ loaded: [-4, -3, -2, -1, 0, 1, 2, 3] });

                            Planner.spinner.stop();
                        });
                    });
                });

                this.resizeUI();
                window.addEventListener('resize', this.resizeUI);

                PlannerStore.on('change', this._onChange);
            },
            componentWillUnmount: function(){
                PlannerStore.removeListener('change', this._onChange);
            },

            _onChange: function(){
                this.setState({
                    drawer: PlannerStore.getDrawer(),
                    context: PlannerStore.getItem()
                }, function(){
                    if (this.state.drawer){
                        function resize(){
                            OC.$.addClass(bodyWrapper, 'condensed');
                            bodyWrapper.style.width = OC.$.css(
                                document.querySelector('header'), 'width');
                        }
                        resize();
                        OC.$.addListener(window, 'resize', resize);
                    } else {
                        OC.$.removeClass(bodyWrapper, 'condensed');
                        bodyWrapper.style.width = '96%';
                    }
                });
            },
            loadSpinner: function(callback){
                var loadButton = document.querySelector('.ajax-loader');

                // Set spinner on loading button area.
                require(['spin'], function(Spinner){
                    if (! Planner.hasOwnProperty('spinner')){
                        Planner.spinner = new Spinner(OC.spinner.options).spin(loadButton);
                    } else Planner.spinner.spin(loadButton);

                    if (Planner.hasOwnProperty('spinner')) Planner.spinner.spin(loadButton);

                    callback();
                });
            },

            componentDidUpdate: function(){
                this.resizeUI();
            },

            resizeUI: function(){
                if (this.state.view === 'calendar')
                    this.refs.titleBarWrapper.getDOMNode().style.width = (
                        OC.$.css(document.querySelector('.content-panel header'), 'width'));
            },

            openEvent: function(evnt){
                // Open event view.
                this.setState({view: 'event', evnt: evnt});
            },
            closeEvent: function(){
                // Close event view.
                this.setState({view: 'calendar' });
            },
            editEvent: function(){
                // Close event view.
                this.setState({view: 'edit'});
            },
            closeEdit: function(){
                // Open event view.
                if (!this.state.evnt.id) this.setState({view: 'calendar'});
                else this.setState({view: 'event'});
            },
            updateEvents: function(data){
                var view = this;
                require(['deep_extend'], function(extend){
                    // Classify all day events.
                    var allDayEvents = {}, date, i, evnt;
                    for (date in data){
                        for (i = 0; i < data[date].length; i++){
                            evnt = data[date][i];
                            if (evnt.all_day === true)
                                if (allDayEvents.hasOwnProperty(date))
                                    allDayEvents[date].push(evnt);
                                else
                                    allDayEvents[date] = [evnt];
                        }
                    }

                    view.setState({week: extend(view.state.week, data), allDayEvents: allDayEvents });
                });
            },
            fetch: function(monthDiff){
                var view = this, loaded = view.state.loaded, currentWeek = this.state.currentWeek,
                    aroundDate = new Date();

                aroundDate.setMonth(monthDiff);

                this.loadSpinner(function(){
                    require(['atomic'], function(atomic){
                        atomic.get('/planner/events/around/' + aroundDate.toISOString() + '/')
                        .success(function(response, xhr){
                            view.updateEvents(response);
                            
                            if (monthDiff > 0){
                                Array.prototype.push.apply(loaded, [
                                    currentWeek, currentWeek+1, currentWeek+2, currentWeek+3 ]);
                            } else {
                                Array.prototype.push.apply(loaded, [
                                    currentWeek, currentWeek-1, currentWeek-2, currentWeek-3 ]);
                            }

                            view.setState({ loaded: loaded });

                            Planner.spinner.stop();
                        });
                    });
                });
            },
            moveWeekForward: function(){
                var view = this;
                this.setState({ currentWeek: this.state.currentWeek+1 }, function(){
                    if (this.state.loaded.indexOf(this.state.currentWeek) === -1){
                        // Find max current week.
                        var maxWeek = 0;
                        this.state.loaded.forEach(function(w){
                            if (w > maxWeek) maxWeek = w;
                        });

                        view.fetch(Math.round(maxWeek / 4));
                    }
                });
            },
            moveWeekBackward: function(){
                var view = this;
                this.setState({ currentWeek: this.state.currentWeek-1 }, function(){
                    if (this.state.loaded.indexOf(this.state.currentWeek) === -1){
                        // Find min current week.
                        var minWeek = 0;
                        this.state.loaded.forEach(function(w){
                            if (w < minWeek) minWeek = w;
                        });

                        view.fetch(Math.round(minWeek / 4));
                    }
                });
            },
            setContexts: function(eventID, contexts){
                var currentContexts = this.state.contexts;
                currentContexts[eventID] = contexts;

                this.setState({ contexts: currentContexts });
            },
            getContext: function(eventID){
                return this.state.contexts[eventID];
            },
            setNotes: function(eventID, notes){
                var currentNotes = this.state.notes;
                currentNotes[eventID] = notes;

                this.setState({ notes: currentNotes });
            },
            getNotes: function(eventID){
                return this.state.notes[eventID];
            },
            create: function(){
                var now = new Date();
                var evnt = {
                    'id': null,
                    'start': now.toISOString(),
                    'end': now.toISOString(),
                    'title': '',
                    'all_day': false,
                    'palette': null,
                    'class_link': null
                };
                this.setState({view: 'edit', evnt: evnt});
            },
            eventSaved: function(event, isNew){
                var view = this, i;

                function hasID(list, id){
                    for (i = 0; i < list.length; i++){
                        if (list[i].id === id) return i;
                    }
                    return null;
                }

                var data = {}, date = moment(event.start).format('YYYY-MM-DD');
                if (view.state.week.hasOwnProperty(date)){
                    data[date] = view.state.week[date];

                    if (isNew) data[date].push(event);
                    else {
                        // Find the event and replace it.
                        for (var dateKey in view.state.week){
                            index = hasID(view.state.week[dateKey], event.id);
                            if (index){
                                data[dateKey][index] = event;
                            }
                        }
                    }
                } else data[date] = event;

                require(['deep_extend'], function(extend){
                    view.setState({ evnt: event, week: data });
                });
            },
            deleteEvent: function(){
                // Find event in weeks.
                OC.utils.messageBox.set('Deleted \'' + this.state.evnt.title + '\' successfully');

                var view = this;
                require(['atomic'], function(atomic){
                    atomic.get('/planner/event/' + view.state.evnt.id + '/delete/')
                    .success(function(response, xhr){
                        OC.utils.messageBox.show();
                    });
                });

                var weeks = this.state.week;
                var week = weeks[moment(this.state.evnt.start).format('YYYY-MM-DD')];
                week.splice(week.indexOf(this.state.evnt), 1);

                this.setState({ week: weeks, view: 'calendar' });
            },
            render: function(){
                if (this.state.view === 'calendar'){
                    var startDate = moment().add(this.state.currentWeek, 'w').day(1),
                        endDate = moment().add(this.state.currentWeek, 'w').day(5),
                        sameMonth = startDate.month() === endDate.month();

                    return React.DOM.div({className: 'planner-wrapper'}, [
                        React.DOM.div({className: 'content-panel-body-title-bar-wrapper', ref: 'titleBarWrapper'},
                            React.DOM.div({className: 'content-panel-body-title-wrapper'}, [
                                //React.DOM.h1({className: 'content-panel-body-title'}, 'Planner'),
                                React.DOM.div({className: 'content-panel-body-context'}, [
                                    React.DOM.div({className: 'content-panel-body-context-view'}, [
                                        //React.DOM.a({}, 'Day'),
                                        React.DOM.a({className: 'current'}, 'Week'),
                                    ]),
                                    React.DOM.div({className: 'content-panel-body-context-period'}, [
                                        React.DOM.div({className: 'content-panel-body-context-period-back', onClick: this.moveWeekBackward},
                                            React.DOM.div({className: 'content-panel-body-context-period-back-arrow'}, null)),
                                        React.DOM.div({className: 'content-panel-body-context-period-body'}, startDate.format('MMM D') + ' - ' + (
                                            sameMonth ? '' : endDate.format('MMM')  + ' ') + endDate.date()),
                                        React.DOM.div({className: 'content-panel-body-context-period-forward', onClick: this.moveWeekForward},
                                            React.DOM.div({className: 'content-panel-body-context-period-forward-arrow'}, null))
                                    ])
                                ]),
                                OC.config.profile.id === OC.config.user.id ? React.DOM.div({className: 'content-panel-body-create' }, [
                                    React.DOM.a({
                                        className: 'oc-button content-panel-body-create-button-pre oc-page-action-button',
                                        href: OC.planner.classesURL
                                    }, 'Manage classes'),
                                    React.DOM.button({
                                        className: 'oc-button oc-page-action-button',
                                        onClick: this.create
                                    }, '+ Create new')
                                ]) : null
                            ])
                        ),
                        Planner.calendar({
                            openEvent: this.openEvent,
                            week: this.state.week,
                            currentWeek: this.state.currentWeek,
                            //updateEvents: this.updateEvents,
                            allDayEvents: this.state.allDayEvents
                        })
                    ]);
                } else if (this.state.view === 'edit'){
                    return Planner.editEvnt({
                        closeEdit: this.closeEdit,
                        evnt: this.state.evnt,
                        contexts: this.getContext(this.state.evnt.id),
                        notes: this.getNotes(this.state.evnt.id),
                        eventSaved: this.eventSaved
                    });
                } else {
                    var item;
                    if (this.state.drawer){
                        item = this.state.context;

                        item.resource_sets.forEach(function(resourceSet){
                            resourceSet.resources = Immutable.fromJS(resourceSet.resources);
                        });
                    }
                    
                    return React.DOM.div({}, [
                        Planner.evnt({
                            closeEvent: this.closeEvent,
                            evnt: this.state.evnt,
                            editEvent: this.editEvent,
                            setContexts: this.setContexts,
                            contexts: this.getContext(this.state.evnt.id),
                            setNotes: this.setNotes,
                            notes: this.getNotes(this.state.evnt.id),
                            deleteEvent: this.deleteEvent,
                            drawer: this.state.drawer
                        }),
                        this.state.drawer ? React.DOM.div({ className: 'explorer-resource-module-support show planner-event-support'},
                            ContextView({
                                host: 'planner',
                                item: Immutable.Map(item),
                                palette: this.state.evnt.palette
                            })
                        ) : null
                    ]);
                }
            }
        }),

        itemMenu: React.createClass({
            removeItem: function(){
                //this.props.removeItem(this.props.id);
            },
            moveItem: function(){
                this.props.moveItem(this.props.id);
            },
            render: function(){
                return React.DOM.nav({className: 'oc-menu item-menu' + (this.props.open ? ' show-menu' : '')}, [
                    React.DOM.div({className: 'floating-menu-spacer'}, null),
                    React.DOM.ul({},
                        React.DOM.li({}, React.DOM.a({
                            onClick: this.moveItem
                        }, 'Move to...')),
                        React.DOM.li({}, React.DOM.a({
                            onClick: this.removeItem
                        }, 'Remove'))
                    )
                ]);
            }
        })
    };

    React.renderComponent(
        Planner.calendarWrapper({week: {}}), bodyWrapper
    );
    return Planner;
});