define(['dispatcher', 'events', 'deep_extend', 'immutable'],
    function(AppDispatcher, Events, extend, Immutable){
    
    var EventEmitter = Events.EventEmitter;

    var CHANGE_EVENT = 'change',
        _selectedDate = null,
        _pending = false,
        _events = Immutable.Map(),
        _selectedEvent = null,
        _drawer = false,
        _item = null;

    var PlannerStore = extend(EventEmitter.prototype, {
        emitPlannerChange: function() {
            this.emit(CHANGE_EVENT);
        },

        addChangeListener: function(callback) {
            this.on(CHANGE_EVENT, callback);
        },

        removeChangeListener: function(callback) {
            this.removeListener(CHANGE_EVENT, callback);
        },

        getSelectedDate: function(){
            return _selectedDate;
        },

        getSelectedEvent: function(){
            return _selectedEvent;
        },

        getEventsFor: function(date){
            var events = _events.get(date);
            return events ? events : [];
        },

        hasPendingLoad: function(){
            return _pending === true;
        },

        getDrawer: function(){
            return _drawer;
        },

        getItem: function(){
            return _item;
        },

        dispatchToken: AppDispatcher.register(function(action) {
            switch(action.type) {
                case 'SELECT_DATE':
                    _selectedDate = action.date;
                    _pending = true;
                    break;

                case 'SELECT_DATE_COMPLETE':
                    _events = _events.set(action.date, action.response);
                    _pending = false;
                    break;

                case 'SELECT_PLANNER_EVENT':
                    var i, event; events = _events.get(action.date);
                    for (i = 0; i < events.length; i++) {
                        event = events[i];
                        if (event.id === action.id) {
                            _selectedEvent = event;
                            break;
                        }
                    }
                    break;

                case 'CLEAR_EVENT_SELECTION':
                    _selectedEvent = null;
                    break;

                case 'ITEM_ADDED_TO_EVENT':
                    var _selectedEventCopy = _selectedEvent;
                    require(['moment'], function(moment){
                        var start = moment(_selectedEventCopy.start);

                        // Dirty and hackish, but temp solution.
                        OC.utils.messageBox.set('Added to \'' + _selectedEventCopy.title + '\' on ' + (
                            start.format('dddd, MMMM Do YYYY [at] h:mma')));
                        OC.utils.messageBox.show();
                    });

                    _selectedEvent = null;
                    break;

                case 'OPEN_ITEM':
                    _drawer = true;
                    _item = action.item;
                    break;

                case 'CLOSE_ITEM':
                    _drawer = false;
                    break;

                default:
                    return true;
            }

            PlannerStore.emitPlannerChange();

            return true;
        })
    });

    return PlannerStore;
});