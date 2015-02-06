define(['atomic', 'dispatcher', 'curriculumActions'],
    function(atomic, AppDispatcher, Actions){
        if (!OC.hasOwnProperty('api')){
            OC.api = {};
        }

        OC.api.planner = {
            get: function(date){
                require(['jstz'], function(jstz){
                    atomic.get('/planner/daily/' + date + '/zone/' +
                        encodeURIComponent(jstz.determine().name()) + '/')
                    .success(function(response, xhr){
                        Actions.selectDateComplete(date, response);
                    });
                });
            },

            addItem: function(itemID, eventID){
                atomic.post('/planner/event/add-item/', {
                    'item_id': itemID,
                    'event_id': eventID
                })
                .success(function(response, xhr){
                    Actions.itemAddedToEvent();
                });
            },

            removeItem: function(itemID, eventID){
                atomic.post('/planner/event/remove-item/', {
                    'item_id': itemID,
                    'event_id': eventID
                })
                .success(function(response, xhr){
                    //Actions.itemAddedToEvent();
                });
            }
        };

        AppDispatcher.register(function(action){
            switch(action.type) {
                case 'SELECT_DATE':
                    OC.api.planner.get(action.date);
                    break;

                case 'ADD_ITEM_TO_EVENT':
                    OC.api.planner.addItem(action.itemID, action.eventID);
                    break;

                case 'REMOVE_ITEM_FROM_EVENT':
                    OC.api.planner.removeItem(action.itemID, action.eventID);
                    break;

                default:
                    return true;
            }
        });
    }
);