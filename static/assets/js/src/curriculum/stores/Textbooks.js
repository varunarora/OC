define(['dispatcher', 'events', 'deep_extend', 'immutable', 'curriculumSettings'],
    function(AppDispatcher, Events, extend, Immutable, Settings){
    
    var EventEmitter = Events.EventEmitter;

    var CHANGE_EVENT = 'change',
        _textbooks = Immutable.List(),
        _unsavedTextbook = null;

    var TextbookStore = extend({}, EventEmitter.prototype, {
        emitChange: function() {
            this.emit(CHANGE_EVENT);
        },

        addChangeListener: function(callback) {
            this.on(CHANGE_EVENT, callback);
        },

        removeChangeListener: function(callback) {
            this.removeListener(CHANGE_EVENT, callback);
        },

        getTextbooks: function(){
            return _textbooks;
        },

        getUnsavedTextbook: function(){
            return _unsavedTextbook;
        },

        getTitleFromID: function(id){
            textbook = _textbooks.find(function(textbook){
                return textbook.get('id') === id;
            });

            return textbook ? textbook.title : null;
        },

        _addTextbook: function(title, description){
            var newTextbook = {
                'title': title,
                'description': description,
            };

            _textbooks = _textbooks.push(Immutable.Map(newTextbook));
            
            newTextbook['curriculum_id'] = Settings.getID();
            _unsavedTextbook = newTextbook;
        }
    });

    AppDispatcher.register(function(action) {
        switch(action.type) {
            case 'SET_TEXTBOOKS':
                _textbooks = action.textbooks;
                break;

            case 'ADD_TEXTBOOK':
                TextbookStore._addTextbook(
                    action.title, action.description
                );
                break;

            default:
                return true;
        }

      TextbookStore.emitChange();

      return true;
    });

    return TextbookStore;
});
