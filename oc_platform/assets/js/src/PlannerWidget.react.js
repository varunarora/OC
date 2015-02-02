define(['react', 'plannerStore', 'moment'], function(React, Planner, moment){
    var _options = {};

    var PlannerWidgetInit = function(props, options){
        _options = options;
        return PlannerWidget(props);
    };

    var CalendarInit = function(props, options){
        _options = options;
        return Calendar(props);
    };

    var Calendar = React.createClass({
        componentDidMount: function(){
            Planner.on('change', this._onChange);
        },

        componentWillUnmount: function(){
            Planner.removeListener('change', this._onChange);
        },

        _onChange: function(){
            var selectedDate = Planner.getSelectedDate();
            this.setState({
                selectedDate: selectedDate,
                events: Planner.getEventsFor(selectedDate),
                selectedEvent: Planner.getSelectedEvent()
            });

            // If the request has been made, but the result hasn't arrived.
            if (Planner.hasPendingLoad()) this.load();
            else this.turnOffLoad();
        },

        getInitialState: function(){
            return {
                day: moment(),
                events: [],
                selectedDate: Planner.getSelectedDate(),
                selectedEvent: Planner.getSelectedEvent()
            };
        },

        load: function(){
            var loadButton = this.getDOMNode().querySelector('.ajax-loader');

            function loadSpinner(callback){
                // Set spinner on loading button area.
                require(['spin'], function(Spinner){
                    if (! OC.hasOwnProperty('plannerSpinner')){
                        OC.plannerSpinner = new Spinner(OC.spinner.options).spin(loadButton);
                    } else OC.plannerSpinner.spin(loadButton);

                    callback();
                });
            }

            loadSpinner(function(){
                if (OC.hasOwnProperty('plannerSpinner')) OC.plannerSpinner.spin(loadButton);
            });
        },

        turnOffLoad: function(){
            if (OC.hasOwnProperty('plannerSpinner'))
                OC.plannerSpinner.stop();
        },

        renderDates: function(){
            var datesThisMonth = [];
            
            // Get days of previous and coming month to include in
            //    current month view.
            var currentDay = moment(this.state.day).date(1),
                firstDay = currentDay.day(), i, j;

            // Get last few days of previous month.
            currentDay.subtract(firstDay, 'd');
            for (i = firstDay; i > 0; i--){
                datesThisMonth.push(
                    SingleDate({
                        isSibling: true,
                        date: currentDay.date(),
                        fulldate: currentDay.format(),
                        isSelected: this.state.selectedDate === currentDay.format()
                    }));
                currentDay.add(1, 'd');
            }

            var lastDateOfMonth = moment(this.state.day).endOf('month'), currentClasses;
            var numOfDays = lastDateOfMonth.date();
            var today = moment(), isToday = false;

            lastDateOfMonth.date(0);

            for (j = 1; j <= numOfDays; j++){
                if (lastDateOfMonth.isSame(today, 'month') && today.date() === j)
                    isToday = true;
                else isToday = false;

                lastDateOfMonth.add(1, 'd');
                datesThisMonth.push(SingleDate({
                    date: lastDateOfMonth.date(), isToday: isToday,
                    //selectedDate: this.state.selectedDate,
                    fulldate: lastDateOfMonth.format(),
                    isSelected: this.state.selectedDate === lastDateOfMonth.format()
                }));
            }

            // Get first few days of next month.
            lastDayOfMonth = lastDateOfMonth.day();
            for (k = 0; k < 6 - lastDayOfMonth; k++){
                lastDateOfMonth.add(1, 'd');
                datesThisMonth.push(
                    SingleDate({
                        isSibling: true,
                        date: lastDateOfMonth.date(),
                        fulldate: lastDateOfMonth.format(),
                        //selectedDate: this.state.selectedDate,
                        isSelected: this.state.selectedDate === lastDateOfMonth.format()
                    }));
            }

            return datesThisMonth;
        },
        back: function(){
            this.setState({ day: this.state.day.subtract(1, 'M') });
        },
        forward: function(){
            this.setState({ day: this.state.day.add(1, 'M') });
        },
        
        cancelEventSelection: function(event){
            _options.cancelEventSelect();
        },

        confirmEventSelection: function(event){
            _options.confirmEventSelect(this.props.itemID, this.state.selectedEvent.id);
        },

        renderEvent: function(event){
            var eventProps = { event: event };
            if (! this.state.selectedEvent) eventProps['selected'] = false;

            return PlannerWidgetEvent(eventProps);
        },
        renderDays: function(){
            return [
                React.DOM.div({className: 'calendar-body-days-day'}, 'S'),
                React.DOM.div({className: 'calendar-body-days-day'}, 'M'),
                React.DOM.div({className: 'calendar-body-days-day'}, 'T'),
                React.DOM.div({className: 'calendar-body-days-day'}, 'W'),
                React.DOM.div({className: 'calendar-body-days-day'}, 'T'),
                React.DOM.div({className: 'calendar-body-days-day'}, 'F'),
                React.DOM.div({className: 'calendar-body-days-day'}, 'S')
            ];
        },
        render: function(){
            return React.DOM.div({className: 'planner-menu-body'}, [
                React.DOM.div({className: 'planner-menu-calendar'}, [
                    React.DOM.div({className: 'calendar-header'}, [
                        React.DOM.div({
                            className: 'calendar-header-previous',
                            onClick: this.back
                        }, React.DOM.span({ className: 'calendar-header-previous-arrow' })),
                        React.DOM.div({className: 'calendar-header-month'}, this.state.day.format('MMMM YY')),
                        React.DOM.div({
                            className: 'calendar-header-next',
                            onClick: this.forward
                        }, React.DOM.span({ className: 'calendar-header-next-arrow' })),
                    ]),
                    React.DOM.div({className: 'calendar-body'}, [
                        React.DOM.div({className: 'calendar-body-days'}, this.renderDays()),
                        React.DOM.div({className: 'calendar-body-dates'}, this.renderDates())
                    ]),
                ]),
                React.DOM.div({className: 'planner-menu-events'}, [
                    this.state.events.length > 0 ? React.DOM.div({className: 'planner-menu-events-list'},
                        this.state.events.map(this.renderEvent)) : null,
                    this.state.selectedEvent ? React.DOM.div({className: 'planner-menu-events-actions'}, [
                        React.DOM.div({className: 'planner-menu-events-actions-buttons  popup-buttons'}, [
                            React.DOM.div({
                                className: 'planner-menu-events-actions-button popup-button secondary-popup-button',
                                onClick: this.cancelEventSelection
                            }, 'Cancel'),
                            React.DOM.div({
                                className: 'planner-menu-events-actions-button popup-button',
                                style: {
                                    color: OC.config.palette.base
                                },
                                onClick: this.confirmEventSelection
                            }, 'Confirm')
                        ])
                    ]) : null,
                    React.DOM.div({className: 'ajax-loader-wrapper'},
                        React.DOM.div({className: 'ajax-loader'})
                    )
                ])
            ]);
        }
    });

    var SingleDate = React.createClass({
        getInitialProps: function(){
            return { isSibling: false, isToday: false };
        },
        getInitialState: function(){
            return { isSelected: this.props.isSelected };
        },
        select: function(){
            _options.dateSelect(this.props.fulldate);
            this.setState({ isSelected: true });
        },
        componentWillReceiveProps: function(nextProps){
            if (nextProps.isSelected !== this.state.isSelected)
                this.setState({ isSelected: nextProps.isSelected });
        },
        render: function(){
            return React.DOM.div({
                className: 'calendar-body-dates-date' + (this.props.isSibling ? ' sibling-month-date' : '') + (
                    this.props.isToday ? ' today' : '') + (this.state.isSelected ? ' selected' : ''),
                onClick: this.select
            }, this.props.date);
        }
    });

    var PlannerWidgetEvent = React.createClass({
        getInitialState: function(){
            return { selected: false };
        },
        componentWillReceiveProps: function(nextProps){
            if (nextProps.hasOwnProperty('selected')){
                if (nextProps.selected !== this.props.selected)
                    this.setState({ selected: nextProps.selected});
            }
        },
        select: function(){
            this.setState({ selected: !this.state.selected }, function(){
                if (this.state.selected)
                    _options.eventSelect(this.props.event.id, this.props.event.date);
                else _options.cancelEventSelect();
            });
        },
        render: function(){
            return React.DOM.div({
                    className: 'planner-menu-event ' + OC.config.palette.title + '-planner-event' + (this.state.selected ? ' selected' : ''),
                    onClick: this.select
                }, [
                React.DOM.div({className: 'planner-menu-event-title'}, this.props.event.title),
                    React.DOM.div({}, [
                        React.DOM.span({className: 'planner-menu-event-time'},
                            moment(this.props.event.start).format('h:mma') + ' - ' + moment(this.props.event.end).format('h:mma') + ' ·'),
                    React.DOM.a({
                        className: 'planner-menu-event-view',
                        href: this.props.event.url
                    }, 'View event')
                ])
            ]);
        }
    });

    var PlannerWidget = React.createClass({
        render: function(){
            return React.DOM.nav({className: 'oc-menu planner-menu' + (this.props.open ? ' show-menu' : '')}, [
                React.DOM.div({className: 'floating-menu-spacer'}, null),
                React.DOM.div({className: 'menu-body'}, [
                    React.DOM.div({className: 'planner-menu-body-wrapper'}, Calendar({ itemID: this.props.id }))
                ])
            ]);
        }
    });

    return {
        Widget: PlannerWidgetInit,
        Calendar: CalendarInit
    };
});
