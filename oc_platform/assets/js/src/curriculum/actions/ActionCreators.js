define(['curriculumAppDispatcher'], function(AppDispatcher){
    return {
        initTextbooks: function(textbooks){
            AppDispatcher.dispatch({
                type: 'SET_TEXTBOOKS',
                textbooks: textbooks,
            });
        },
        initUnits: function(units){
            AppDispatcher.dispatch({
                type: 'SET_UNITS',
                units: units,
            });
        },
        initSettings: function(settings){
            AppDispatcher.dispatch({
                type: 'INIT_SETTINGS',
                settings: settings,
            });
        },
        setNumWeeks: function(count){
            AppDispatcher.dispatch({
                type: 'SET_NUM_WEEKS',
                count: count,
            });
        },
        openUnit: function(unit){
            AppDispatcher.dispatch({
                type: 'OPEN_UNIT',
                unit: unit
            });
        },
        buildSections: function(unitID, sections){
            AppDispatcher.dispatch({
                type: 'BUILD_SECTIONS',
                unitID: unitID,
                sections: sections
            });
        },
        updateSettings: function(settings){
            AppDispatcher.dispatch({
                type: 'UPDATE_SETTINGS',
                settings: settings,
            });
        },
        saveSettings: function(settings){
            AppDispatcher.dispatch({
                type: 'SAVE_SETTINGS',
                settings: settings
            });
        },
        settingsUpdated: function(){
            AppDispatcher.dispatch({
                type: 'SETTINGS_UPDATED'
            });
        },
        openOverview: function(){
            AppDispatcher.dispatch({
                type: 'OPEN_OVERVIEW'
            });
        },

        /** Pertaining to settings and units **/
        openSettings: function(){
            AppDispatcher.dispatch({
                type: 'OPEN_SETTINGS'
            });
        },

        openUnits: function(addMode){
            AppDispatcher.dispatch({
                type: 'OPEN_UNITS',
                mode: addMode ? 'add' : 'view'
            });
        },

        openTextbooks: function(){
            AppDispatcher.dispatch({
                type: 'OPEN_TEXTBOOKS'
            });
        },

        addUnit: function(name, textbook, from, to){
            AppDispatcher.dispatch({
                type: 'ADD_UNIT',
                name: name,
                textbook: textbook,
                from: from,
                to: to
            });
        },

        saveUnit: function(unit){
            AppDispatcher.dispatch({
                type: 'SAVE_UNIT',
                unit: unit
            });
        },

        addUnitComplete: function(){
            AppDispatcher.dispatch({
                type: 'ADD_UNIT_COMPLETE'
            });
        },

        addTextbook: function(title, description){
            AppDispatcher.dispatch({
                type: 'ADD_TEXTBOOK',
                title: title,
                description: description
            });
        },

        saveTextbook: function(textbook){
            AppDispatcher.dispatch({
                type: 'SAVE_TEXTBOOK',
                textbook: textbook
            });
        },

        addTextbookComplete: function(){
            AppDispatcher.dispatch({
                type: 'ADD_TEXTBOOK_COMPLETE'
            });
        },

        /** Pertaining to modules and items **/
        openItem: function(item){
            AppDispatcher.dispatch({
                type: 'OPEN_ITEM',
                item: item,
            });
        },

        // Add item.
        addItem: function(sectionID){
            AppDispatcher.dispatch({
                type: 'ADD_ITEM',
                sectionID: sectionID
            });
        },
        addItemPost: function(item, callback, sectionID){
            AppDispatcher.dispatch({
                type: 'ADD_ITEM_POST',
                item: item,
                callback: callback,
                sectionID: sectionID || null
            });
        },
        addItemComplete: function(item, id){
            AppDispatcher.dispatch({
                type: 'ADD_ITEM_COMPLETE',
                item: item,
                id: id
            });
        },
        addToSection: function(itemID, sectionID){
            AppDispatcher.dispatch({
                type: 'ADD_ITEM_TO_SECTION',
                itemID: itemID,
                sectionID: sectionID
            });
        },
        itemAddedToSection: function(itemID, sectionID){
            AppDispatcher.dispatch({
                type: 'ITEM_ADDED_TO_SECTION',
                itemID: itemID,
                sectionID: sectionID
            });
        },

        // Add section.
        addSection: function(name, sectionType, moduleID, isUnit){
            AppDispatcher.dispatch({
                type: 'ADD_SECTION',
                name: name,
                sectionType: sectionType,
                moduleID: moduleID,
                isUnit: isUnit
            });
        },
        addSectionPost: function(section, moduleID, isUnit, callback){
            AppDispatcher.dispatch({
                type: 'ADD_SECTION_POST',
                section: section,
                moduleID: moduleID,
                isUnit: isUnit,
                callback: callback
            });
        },
        addSectionComplete: function(id, section){
            AppDispatcher.dispatch({
                type: 'ADD_SECTION_COMPLETE',
                section: section,
                id: id
            });
        },
        deleteSection: function(id){
            AppDispatcher.dispatch({
                type: 'DELETE_SECTION',
                id: id
            });
        },

        // Update item.
        updateItem: function(props, callback){
            AppDispatcher.dispatch({
                type: 'UPDATE_ITEM',
                props: props,
                callback: callback
            });
        },
        itemUpdated: function(props){
            AppDispatcher.dispatch({
                type: 'ITEM_UPDATED',
                props: props
            });
        },

        // Delete item.
        deleteItem: function(id){
            AppDispatcher.dispatch({
                type: 'DELETE_ITEM',
                id: id
            });
        },

        // Add field.
        addField: function(name, fieldType, position, itemID){
            AppDispatcher.dispatch({
                type: 'ADD_FIELD',
                name: name,
                fieldType: fieldType,
                position: position,
                itemID: itemID
            });
        },
        addFieldPost: function(item, field, callback){
            AppDispatcher.dispatch({
                type: 'ADD_FIELD_POST',
                item: item,
                field: field,
                callback: callback
            });
        },
        addFieldComplete: function(itemID, fieldID){
            AppDispatcher.dispatch({
                type: 'ADD_FIELD_COMPLETE',
                itemID: itemID,
                fieldID: fieldID
            });
        },

        // Add resource.
        addResource: function(resource, resourceSetID){
            AppDispatcher.dispatch({
                type: 'ADD_RESOURCE',
                resource: resource,
                resourceSetID: resourceSetID
            });
        },

        // Meta and resource set.
        deleteMeta: function(id, itemID){
            AppDispatcher.dispatch({
                type: 'DELETE_META',
                id: id,
                itemID: itemID
            });
        },

        deleteResourceSet: function(id){
            AppDispatcher.dispatch({
                type: 'DELETE_RESOURCESET',
                id: id
            });
        },


        // Moving sections, items and fields.
        moveSection: function(sectionID, beforeSectionID){
            AppDispatcher.dispatch({
                type: 'MOVE_SECTION',
                sectionID: sectionID,
                beforeSectionID: beforeSectionID
            });
        },
        
        moveSectionSave: function(toShift){
            AppDispatcher.dispatch({
                type: 'MOVE_SECTION_SAVE',
                toShift: toShift
            });
        },
        
        moveSectionComplete: function(){
            AppDispatcher.dispatch({
                type: 'MOVE_SECTION_COMPLETE'
            });
        },


        moveItem: function(itemID, beforeItemID){
            AppDispatcher.dispatch({
                type: 'MOVE_ITEM',
                itemID: itemID,
                beforeItemID: beforeItemID
            });
        },
        
        moveItemSave: function(toShift){
            AppDispatcher.dispatch({
                type: 'MOVE_ITEM_SAVE',
                toShift: toShift
            });
        },
        
        moveItemComplete: function(){
            AppDispatcher.dispatch({
                type: 'MOVE_ITEM_COMPLETE'
            });
        },


        moveField: function(fieldID, beforeFieldID, itemID, toMoveIsMeta, beforeIsMeta){
            AppDispatcher.dispatch({
                type: 'MOVE_FIELD',
                fieldID: fieldID,
                beforeFieldID: beforeFieldID,
                itemID: itemID,
                toMoveIsMeta: toMoveIsMeta,
                beforeIsMeta: beforeIsMeta
            });
        },
        
        moveFieldSave: function(id, toShift){
            AppDispatcher.dispatch({
                type: 'MOVE_FIELD_SAVE',
                id: id,
                toShift: toShift
            });
        },
        
        moveFieldComplete: function(){
            AppDispatcher.dispatch({
                type: 'MOVE_FIELD_COMPLETE'
            });
        },


        /* Add to planner */

        launchPlanner: function(){
            AppDispatcher.dispatch({
                type: 'LAUNCH_PLANNER'
            });
        },

        selectDate: function(date){
            AppDispatcher.dispatch({
                type: 'SELECT_DATE',
                date: date
            });
        },

        selectDateComplete: function(date, response){
            AppDispatcher.dispatch({
                type: 'SELECT_DATE_COMPLETE',
                date: date,
                response: response
            });
        },

        selectPlannerEvent: function(id, date){
            AppDispatcher.dispatch({
                type: 'SELECT_PLANNER_EVENT',
                id: id,
                date: date
            });
        },

        clearEventSelection: function(){
            AppDispatcher.dispatch({
                type: 'CLEAR_EVENT_SELECTION'
            });
        },

        confirmAddItemToEvent: function(itemID, eventID){
            AppDispatcher.dispatch({
                type: 'ADD_ITEM_TO_EVENT',
                itemID: itemID,
                eventID: eventID
            });
        },

        itemAddedToEvent: function(){
            AppDispatcher.dispatch({
                type: 'ITEM_ADDED_TO_EVENT'
            });
        },

        removeItemFromEvent: function(itemID, eventID){
            AppDispatcher.dispatch({
                type: 'REMOVE_ITEM_FROM_EVENT',
                itemID: itemID,
                eventID: eventID
            });
        },

        // UI stuff.
        dim: function(){
            AppDispatcher.dispatch({
                type: 'DIM'
            });
        },
        brighten: function(){ AppDispatcher.dispatch({ type: 'BRIGHTEN' }); },
    };
});
