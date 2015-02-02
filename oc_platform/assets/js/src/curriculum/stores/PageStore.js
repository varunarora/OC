define(['curriculumAppDispatcher', 'curriculumItems', 'curriculumUnits', 'events', 'deep_extend', 'immutable'],
    function(AppDispatcher, Items, Units, Events, extend, Immutable){

    var EventEmitter = Events.EventEmitter;
    var CHANGE_EVENT = 'change',
        _view = 'overview',
        _numWeeks = null,
        _unit = null,
        _unitsMode = 'view',
        _drawerView = false,
        _addBlockState = false;

    var PageStore = extend(EventEmitter.prototype, {

        emitChange: function() {
            this.emit(CHANGE_EVENT);
        },

        addChangeListener: function(callback) {
            this.on(CHANGE_EVENT, callback);
        },

        removeChangeListener: function(callback) {
            this.removeListener(CHANGE_EVENT, callback);
        },

        resetNumWeeks: function(){
            units = Units.getUnits();

            var max = units.max(function(unitPeriodA, unitPeriodB){ return unitPeriodA.end > unitPeriodB.end; }),
                min = units.min(function(unitPeriodA, unitPeriodB){ return unitPeriodA.begin > unitPeriodB.begin; }),
                end = max ? max.end : null,
                begin = min ? min.begin : null;

            if (end !== null && begin !== null)
                _numWeeks = Math.ceil((end - begin) / 7);
            else _numWeeks = 0;
        },

        buildSections: function(unitID, sections){
            // Get unit from Units store.
            unit = Units.getUnit(unitID);

            unit.sections = Immutable.List();

            var newSection, newItem, items, sectionItems;
            sections.forEach(function(section){
                sectionItems = section.items.map(function(item){
                    return item.id;
                });

                newSection = Immutable.Map({
                    id: section.id,
                    position: section.position,
                    title: section.title,
                    items: sectionItems,
                    type: section.type
                });

                unit.sections = unit.sections.push(newSection);
            });

            _unit = unit;
        },

        // Getters.
        getNumWeeks: function(){ return _numWeeks; },
        getView: function(){ return _view; },
        getUnit: function(){ return _unit; },
        getDrawerView: function(){ return _drawerView; },
        getAddBlockState: function(){ return _addBlockState; },
        getUnitsMode: function(){ return _unitsMode; }
    });

    AppDispatcher.register(function(action) {
      var text;

        switch(action.type) {
            case 'SET_NUM_WEEKS':
                _numWeeks = action.count;
                break;

            case 'ADD_UNIT':
                AppDispatcher.waitFor([Units.dispatchToken]);
                PageStore.resetNumWeeks();
                break;

            case 'OPEN_UNIT':
                _unit = action.unit;
                if (action.unit.hasOwnProperty('sections')){
                    _view = 'unit';
                } else _view = 'loading';
                
                break;

            case 'OPEN_SETTINGS':
                _view = 'settings';
                break;

            case 'OPEN_UNITS':
                _view = 'units';
                _unitsMode = action.mode;
                break;

            case 'BUILD_SECTIONS':
                PageStore.buildSections(action.unitID, action.sections);
                _view = 'unit';
                AppDispatcher.waitFor([Items.dispatchToken]);
                break;

            case 'ADD_SECTION_POST':
                _addBlockState = false;
                break;

            case 'OPEN_ITEM':
                _drawerView = true;
                break;

            case 'OPEN_OVERVIEW':
                _view = 'overview';
                _unit = null;
                break;

            case 'DIM':
                // Such a bad way to do this, but works.
                OC.$.addClass(document.querySelector('.popup-background'), 'show-popup-background');
                break;

            case 'BRIGHTEN':
                OC.$.removeClass(document.querySelector('.popup-background'), 'show-popup-background');
                break;

            default:
                return true;
        }

        PageStore.emitChange();

        return true;
    });

    return PageStore;
});