define(['react', 'core_light'], function(React, OC){
    OC.api = {
        planner: {
            class: {
                save: function(serializedClass, callback){
                    require(['jstz', 'atomic'], function(jstz, atomic){
                        serializedClass['zone'] = jstz.determine().name();
                        atomic.post('/planner/class/save/', serializedClass)
                        .success(function(response, xhr){
                            callback(response.id);
                        });
                    });
                },
                delete: function(serializedClass, callback){
                    require(['atomic'], function(atomic){
                        atomic.get('/planner/class/' + serializedClass.id + '/delete/')
                        .success(function(response, xhr){
                            callback();
                        });
                    });
                }
            }
        }
    };
    var Planner = {
        color: React.createClass({
            componentDidMount: function(){
                this.tip = OC.utils.tip(this.getDOMNode());
            },
            getInitialState: function(){
                return {selected: this.props.selected};
            },
            componentWillReceiveProps: function(newProps){
                if ('selected' in newProps)
                    this.setState({ selected: newProps.selected });
                if ('schedule' in newProps){
                    // HACK: Because the completion on rendering the schedule takes time.
                    setTimeout(this.tip.reposition, 100);
                }
            },
            setColor: function(){
                this.props.changeColor(this.props.paletteName);
                this.setState({ selected: true });
            },
            render: function(){
                return React.DOM.div({className: 'planner-class-color' + (this.state.selected ? ' selected' : ''),
                    style: { backgroundColor: this.props.palette.base },
                    onClick: this.setColor,
                    title: OC.utils.palettes[this.props.paletteName].title
                });
            }
        }),
        time: React.createClass({
            classPeriodChanged: function(){
                this.props.changed(this.getDOMNode().value, this.props.position, this.props.name, this.props.day);
            },
            componentDidMount: function(){
                this.time = OC.utils.timepicker(this.getDOMNode(), null, this.classPeriodChanged);
            },
            componentWillUnmount: function(nextProps, nextState){
                this.time.el.parentNode.removeChild(this.time.el);
            },
            render: function(){
                return React.DOM.input({type: 'text', placeholder: this.props.name, className: 'class-period-' + this.props.name.toLowerCase(),
                    value: this.props.time, onChange: this.classPeriodChanged });
            }
        }),
        day: React.createClass({
            checked: function(){
                // If atleast one of the periods if full, return true.
                if (this.props.schedule){
                    var i;
                    for (i = 0; i < this.props.schedule.length; i++){
                        if ('from' in this.props.schedule[i] && 'to' in this.props.schedule[i])
                            return true;
                    }
                }

                return false;
            },
            openDayView: function(){
                this.props.openDayView(this.props.day);
            },
            render: function(){
                return React.DOM.li({onClick: this.openDayView, className: 'planner-class-details-schedule-day' + (this.props.isCurrent ? ' current' : ''),
                    style: { borderColor: this.props.isCurrent ? OC.utils.palettes[this.props.palette].base : null }},
                    React.DOM.div({className: 'planner-class-details-schedule-day-body'}, [
                        React.DOM.input({type: 'checkbox', checked: this.checked()}, null),
                        React.DOM.label({style: { color: OC.utils.palettes[this.props.palette].base }}, this.props.day.substring(0,3))
                    ])
                );
            }
        }),
        class: React.createClass({
            getInitialState: function(){
                return { schedule: this.props.class.schedule, day: null, palette: this.props.palette };
            },
            componentDidMount: function(){
                this.refs.newClassInput.getDOMNode().focus();

                var fromField = this.refs.startDate.getDOMNode(),
                    toField = this.refs.endDate.getDOMNode();

                require(['pikaday'], function(Pikaday){
                    var from, to;
                    from = new Pikaday({
                        field: fromField,
                        onSelect: function(date){
                            fromField.title = date.toISOString();
                            to.setMinDate(date);
                        }
                    });
                    to = new Pikaday({
                        field: toField,
                        onSelect: function(date){
                            toField.title = date.toISOString();
                        }
                    });
                });
            },

            goBack: function(){
                this.props.listClasses();
            },
            save: function(){
                var view = this,
                    loadButton = document.querySelector('.ajax-spinner');
                
                require(['spin'], function(Spinner){
                    if (! Planner.hasOwnProperty('spinner')){
                        var options = OC.spinner.options;
                        options.top = '9%';

                        Planner.spinner = new Spinner(options).spin(loadButton);
                    } else Planner.spinner.spin(loadButton);

                    var serializedClass = {
                        'id': view.props.class.id,
                        'title': view.refs.newClassInput.getDOMNode().value,
                        'palette': view.state.palette,
                        'schedule': view.state.schedule,
                        'from': view.refs.startDate.getDOMNode().title,
                        'to': view.refs.endDate.getDOMNode().title
                    };
                    OC.api.planner.class.save(serializedClass, function(id){
                        if (! serializedClass.id){
                            serializedClass.id = id;
                            OC.utils.messageBox.set('New class \'' + serializedClass.title + '\' saved');
                        } else {
                            OC.utils.messageBox.set('Saved');
                        }
                        view.props.newClassSaved(serializedClass);
                        
                        Planner.spinner.stop();
                        OC.utils.messageBox.show();
                    });
                });
            },

            delete: function(event){
                var view = this,
                    title = this.props.class.title,
                    id = this.props.class.id;
                
                view.props.deleted(id);
                OC.api.planner.class.delete({id: id}, function(id){
                    OC.utils.messageBox.set('Deleted \'' + title + '\'');

                    OC.utils.messageBox.show();
                });
            },

            setup: function(){
                var view = this;

                require(['scheduler'], function(scheduler){
                    var Scheduler = view.state.scheduler || scheduler;
                    if (! view.state.scheduler) view.setState({ scheduler: Scheduler });

                    Scheduler.init(function(schedule){
                        view.setState({ schedule: schedule });
                    });
                });
            },

            changeColor: function(palette){
                this.setState({ palette: palette });
            },
            classPeriodChanged: function(value, position, name, day){
                var currentSchedule = this.state.schedule;

                try {
                    currentSchedule[day][position][name.toLowerCase()] = value;
                } catch(e) {
                    if (currentSchedule[day]){
                        currentSchedule[day][position] = {};
                        currentSchedule[day][position][name.toLowerCase()] = value;
                    } else {
                        currentSchedule[day] = [{}];
                        currentSchedule[day][0][name.toLowerCase()] = value;
                    }
                }

                this.setState({ schedule: currentSchedule });
            },

            addClassPeriod: function(){
                var currentSchedule = this.state.schedule;

                try {
                    currentSchedule[this.state.day].push({});
                } catch(e) {
                    currentSchedule[this.state.day] = [{}, {}];
                }

                this.setState({ schedule: currentSchedule });
            },
            openDayView: function(day){
                this.setState({ day : day });
            },
            renderDaySelector: function(day){
                return Planner.day({
                    openDayView: this.openDayView,
                    day: day,
                    palette: this.state.palette,
                    isCurrent: this.state.day === day,
                    schedule: this.state.schedule[day]
                });
            },
            renderDaySchedule: function(schedule){
                var i, classPeriods = [];
                for (i = 0; i < (schedule ? schedule.length : 1); i++){
                    classPeriods.push(React.DOM.div({className: 'class-period'}, [
                        Planner.time({ time: schedule ? schedule[i].from : null, name: 'From',
                            changed: this.classPeriodChanged, position: i, day: this.state.day }),
                        Planner.time({ time: schedule ? schedule[i].to : null, name: 'To',
                            changed: this.classPeriodChanged, position: i, day: this.state.day }),
                    ]));
                }
                return [
                    React.DOM.div({ className: 'class-periods'}, classPeriods),
                    React.DOM.a({ className: 'add-class-period',
                        onClick: this.addClassPeriod,
                        style: { color: OC.utils.palettes[this.state.palette].base }}, '+ Add class period')
                ];
            },
            renderSchedule: function(){
                return React.DOM.div({className: 'planner-class-details planner-class-details-schedule card-details card-details-padded'}, [
                    React.DOM.ul({className: 'planner-class-details-schedule-days'},
                        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
                        .map(this.renderDaySelector)
                    ),
                    this.state.day ? React.DOM.div({className: 'planner-class-details-schedule-body'}, this.renderDaySchedule(
                        this.state.schedule[this.state.day])) : React.DOM.div(
                        {className: 'planner-class-details-schedule-placeholder'},
                        'Click on a tab to change the schedule for a particular day')
                ]);
            },
            renderColors: function(){
                var palette, colors = [], palettes = OC.utils.palettes;
                for (palette in palettes){
                    colors.push(Planner.color({ palette: palettes[palette], changeColor: this.changeColor,
                        selected: this.state.palette === palette, paletteName: palette, schedule: this.state.schedule }));
                }

                return colors;
            },
            render: function(){
                return React.DOM.div({className: 'planner-class-wrapper card-wrapper'},
                    React.DOM.div({className: 'planner-class card'}, [
                        React.DOM.div({className: 'planner-class-toolbar card-toolbar', style: {
                            backgroundColor: OC.utils.palettes[this.state.palette].dark } }, [
                            React.DOM.a({
                                className: 'planner-class-toolbar-back card-toolbar-back back-button ' + (
                                    this.state.palette.toLowerCase() + '-button'),
                                onClick: this.goBack
                            }, 'Back'),
                            React.DOM.div({className: 'card-toolbar-secondary'}, [
                                React.DOM.a({
                                    className: 'planner-class-toolbar-delete card-toolbar-delete ' + (
                                        this.state.palette.toLowerCase() + '-button'),
                                    onClick: this.delete
                                }, 'Delete'),
                                React.DOM.a({
                                    className: 'planner-class-toolbar-back card-toolbar-save ' + (
                                        this.state.palette.toLowerCase() + '-button'),
                                    onClick: this.save
                                }, 'Save')
                            ])
                        ]),
                        React.DOM.div({className: 'planner-class-title-wrapper card-title-wrapper card-title-wrapper-edit card-title-wrapper-small'}, [
                            React.DOM.input({className: 'planner-class-title card-title ' + this.state.palette.toLowerCase() + '-card-title',
                                defaultValue: this.props.class.title, placeholder: 'Name of class', ref: 'newClassInput' }),
                        ]),
                        this.state.schedule ? this.renderSchedule() : React.DOM.div({className: 'planner-class-details card-details card-details-padded'}, [
                            React.DOM.button({className: 'oc-button oc-loud-button', onClick: this.setup}, 'Setup the class schedule')
                        ]),
                        React.DOM.div({className: 'planner-class-details planner-class-details-dates card-details card-details-padded'}, [
                            React.DOM.div({className: 'planner-class-detail'}, [
                                React.DOM.div({className: 'planner-class-detail-support planner-class-detail-input-support'}, 'Starts on'),
                                React.DOM.div({className: 'planner-class-detail-body'},
                                    React.DOM.input({type: 'text', ref: 'startDate', placeholder: 'Start date', defaultValue: this.props.class.start ? this.props.class.start : null }))
                            ]),
                            React.DOM.div({className: 'planner-class-detail'}, [
                                React.DOM.div({className: 'planner-class-detail-support planner-class-detail-input-support'}, 'Ends on'),
                                React.DOM.div({className: 'planner-class-detail-body'},
                                    React.DOM.input({type: 'text', ref: 'endDate', placeholder: 'End date', defaultValue: this.props.class.end ? this.props.class.end : null }))
                            ])
                        ]),
                        React.DOM.div({className: 'planner-class-details planner-class-details-colors card-details card-details-padded'}, [
                            React.DOM.div({className: 'planner-class-detail'}, [
                                React.DOM.div({className: 'planner-class-detail-support'}, 'Color'),
                                React.DOM.div({className: 'planner-class-detail-body'}, this.renderColors())
                            ])
                        ])
                    ])
                );
            }
        }),
        classPreview: React.createClass({
            openClass: function(){
                this.props.openClass(this.props._class);
            },
            render: function(){
                var keys = [];
                for (var key in this.props._class.schedule) keys.push(key);

                return React.DOM.div({className: 'planner-classes-class planner-classes-class-' + this.props._class.paletteName.toLowerCase(),
                    onClick: this.openClass}, [
                    React.DOM.div({className: 'planner-classes-class-title'}, this.props._class.title),
                    React.DOM.div({className: 'planner-classes-class-description'}, keys.length > 0 ? 'Repeats on ' + keys.join(', ') : '(No schedule setup)'),
                ]);
            }
        }),
        classes: React.createClass({
            getInitialState: function(){
                return {classes: this.props.classes};
            },
            addClass: function(){
                var newClass = {
                    id: null,
                    title: '',
                    palette: OC.utils.palettes['blue'],
                    paletteName: 'blue',
                    schedule: null
                };
                
                this.props.addClass(newClass);
            },
            renderClass: function(_class){
                return Planner.classPreview({ _class: _class, openClass: this.props.openClass });
            },
            render: function(){
                return React.DOM.div({className: 'planner-classes-wrapper card-wrapper'},
                    React.DOM.div({className: 'planner-classes card'}, [
                        React.DOM.div({className: 'planner-classes-toolbar card-toolbar', style: { backgroundColor: OC.config.palette.dark } }, [
                            React.DOM.a({
                                className: 'planner-classes-toolbar-back card-toolbar-back back-button ' + OC.config.palette.title + '-button',
                                onClick: this.goBack,
                                href: OC.planner.plannerURL
                            }, 'Back'),
                            React.DOM.a({
                                className: 'planner-class-toolbar-back card-toolbar-add add-button ' + OC.config.palette.title + '-button',
                                onClick: this.addClass
                            }, 'Add class')
                        ]),
                        React.DOM.div({className: 'planner-classes-title-wrapper card-title-wrapper card-title-wrapper-small',  style: { backgroundColor: OC.config.palette.base }}, [
                            React.DOM.div({className: 'planner-classes-title card-title'},  'Classes'),
                        ]),
                        this.state.classes.length > 0 ? React.DOM.div({className: 'planner-classes-details card-details'},
                            this.state.classes.map(this.renderClass)) : (
                            React.DOM.div({className: 'empty-state-title empty-state-title-independent'}, 'You have no classes setup'))
                    ])
                );
            }
        }),

        classesWrapper: React.createClass({
            getInitialState: function(){
                return {class: null, classes: OC.planner.classes};
            },
            openClass: function(_class){
                this.setState({class: _class });
            },
            listClasses: function(){
                this.setState({class: null });
            },
            newClassSaved: function(_class){
                // Go through every class to see which class doesn't have an ID defined.
                var classes = this.state.classes;
                var i;
                for (i = 0; i < classes.length; i++){
                    if (! classes[i].id){
                        classToUpdateIndex = i;
                        break;
                    }
                }

                classes[i] = {
                    id: _class.id,
                    title: _class.title,
                    paletteName: _class.palette,
                    palette: OC.utils.palettes[_class.palette],
                    schedule: _class.schedule,
                    from: _class.from,
                    to: _class.to
                };
                this.setState({classes: classes, class: null});
            },

            deleted: function(id){
                var classes = this.state.classes;
                var i;
                for (i = 0; i < classes.length; i++){
                    if (classes[i].id === id){
                        classToDeleteIndex = i;
                        break;
                    }
                }

                classes.splice(i, 1);
                this.setState({classes: classes, class: null});
            },

            addClass: function(newClass){
                var classes = this.state.classes;
                classes.push(newClass);

                this.setState({ classes: classes }, function(){
                    this.openClass(newClass);
                });
            },
            render: function(){
                if (!this.state.class)
                    return Planner.classes({
                        openClass: this.openClass,
                        classes: this.state.classes,
                        addClass: this.addClass
                    });
                else
                    return Planner.class({
                        openClass: this.openClass,
                        class: this.state.class,
                        listClasses: this.listClasses,
                        palette: this.state.class.paletteName,
                        newClassSaved: this.newClassSaved,
                        deleted: this.deleted
                    });
            }
        })
    };

    React.renderComponent(
        Planner.classesWrapper(),
        document.querySelector('.classes-box-wrapper')
    );
    return Planner;
});