define(['dispatcher', 'events', 'deep_extend'], function(AppDispatcher, Events, extend){
    var CHANGE_EVENT = 'change',
        EventEmitter = Events.EventEmitter,
        
        _id = null,
        _title = null,  // Name of the curriculum.
        _description = null,  // Purpose of curriculum?
        _gradeType = null,  // 'Grade', 'Level', etc.
        _grade = null,  // 1, 2, 3, etc.
        _subject = null,  // Curriculum subject.
        _session = null,  // 'Semester', 'Trimester', etc.
        _start = null,  // Beginning of the curriculum period.
        _end = null,  // End of the curriculum period.
        _standards = false,  // Standards view turned on.
        _sync = true,  // Sync 'on',

        _syncState = 'pause',
        _syncedTo,  // Is this curriculum synced to a parent curriculum?

        _isOwner = false,  // User is owner of curriculum.

        _newTextbookName = null,  // 
        _newTextbookDescription = null,

        /*_newUnitName = null,
        _newUnitTextbook = null,
        _newUnitFrom = null,
        _newUnitTo = null,
        _newUnitPeriod = null,  // Wrapper for new unit period.*/

        _lastPushed = null,  // The last timestamp when updates were pushed.

        _periodTitle = null,
        _periods = null,

        _gradeTypes = ['Grade', 'Class','Level', 'Group', 'Other'],
        _unsavedSettings = null,

        SettingsStore = extend({}, EventEmitter.prototype, {
            emitChange: function() {
                this.emit(CHANGE_EVENT);
            },
            addChangeListener: function(callback) {
                this.on(CHANGE_EVENT, callback);
            },
            removeChangeListener: function(callback) {
                this.removeListener(CHANGE_EVENT, callback);
            },

            _saving: function(){
                OC.utils.status.saving();
            },
            _saved: function(){
                OC.utils.status.saved();
            },

            _updateSettings: function(settings){
                // Setup changes for save.
                settings['curriculum_id'] = _id;

                // Some evil shit in here.
                for (var key in settings){
                    eval('_' + key + ' = \'' + settings[key] + '\'');
                }

                _unsavedSettings = settings;
            },

            // Getters.
            getGradeTypes: function(){
                return _gradeTypes;
            },

            getGeneral: function(){
                return {
                    title: _title,
                    subject: _subject,
                    session: _session,
                    from: _start,
                    to: _end,
                    grade: _grade ? _grade : null,
                    gradeType: _gradeType ? _gradeType : null,
                    sync: _sync
                };
            },

            getID: function(){
                return _id;
            },

            getPeriods: function(){
                // return _periods;
                return {title: _periodTitle, start: _start, end: _end};
            },

            getPretitle: function(){
                return _title +  ' - ' + _grade + ' ' + _subject;
            },

            getSyncedTo: function(){
                return _syncedTo;
            },

            getCanEdit: function(){
                return _isOwner;
            },

            getSyncState: function(){
                return _syncState;
            },

            getLastPushed: function(){
                return _lastPushed;
            },

            getUnsaved: function(){
                return _unsavedSettings;
            },

            dispatchToken: AppDispatcher.register(function(action) {
                switch(action.type) {
                    case 'ON_LOAD':
                        var gradeType, grade, gradeSplit = general.grade.split(' ');
                    
                        if (SettingsStore.getGradeTypes().indexOf(gradeSplit[0]) !== 0) {
                            gradeType = gradeSplit[0].toLowerCase();
                            grade = gradeSplit[1];
                        } else {
                            gradeType = 'other';
                            grade = this.props.settings.grade;
                        }
                        break;

                    case 'UPDATE_SETTINGS':
                        SettingsStore._updateSettings(action.settings);
                        SettingsStore._saving();
                        break;

                    case 'ADD_ITEM':
                    case 'ADD_FIELD':
                    case 'MOVE_SECTION':
                    case 'MOVE_ITEM':
                    case 'MOVE_FIELD':
                    case 'ADD_UNIT':
                    case 'ADD_TEXTBOOK':
                    case 'ADD_SECTION':
                        SettingsStore._saving();
                        break;

                    case 'ITEM_ADDED_TO_SECTION':
                    case 'ADD_FIELD_COMPLETE':
                    case 'MOVE_SECTION_COMPLETE':
                    case 'MOVE_ITEM_COMPLETE':
                    case 'MOVE_FIELD_COMPLETE':
                    case 'ADD_UNIT_COMPLETE':
                    case 'ADD_TEXTBOOK_COMPLETE':
                    case 'SETTINGS_UPDATED':
                    case 'ADD_SECTION_COMPLETE':
                        SettingsStore._saved();
                        break;

                    case 'PAUSE_CHANGES':
                        if (action.mode === false)
                            _pauseSync = false;
                        else _pauseSync = true;
                        break;

                    case 'INIT_SETTINGS':
                        _id = action.settings.id;
                        _description = action.settings.description;
                        _grade = action.settings.grade;
                        _subject = action.settings.subject;
                        _title = action.settings.title;
                        _isOwner = action.settings.isOwner;
                        
                        _periodTitle = action.settings.periods.title;
                        _start = action.settings.periods.start;
                        _end = action.settings.periods.end;
                        _session = action.settings.periods.session;
                        break;

                    default:
                        return true;
                }

                SettingsStore.emitChange();

                return true;
            })

        });


    return SettingsStore;
});
