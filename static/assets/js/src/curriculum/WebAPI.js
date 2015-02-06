define(['atomic', 'dispatcher', 'curriculumActions', 'curriculumSettings', 'plannerAPI'],
    function(atomic, AppDispatcher, Actions, Settings){
    
    OC.api.curriculum = {
        sectionItem: {
            update: function(serializedItem, callback){
                atomic.post('/curriculum/api/section-item/update/', serializedItem)
                .success(function(response, xhr){
                    if (! serializedItem.hasOwnProperty('meta'))
                        Actions.itemUpdated(serializedItem);

                    callback(response);
                });
            },
            create: function(item, sectionID){
                var serializedItem = {
                    description: item.get('description'),
                    section_id: item.get('sectionID'),
                    curriculum_id: Settings.getID(),
                    position: item.get('position')
                };

                atomic.post('/curriculum/api/section-item/create/', serializedItem)
                .success(function(response, xhr){
                    Actions.addItemComplete(item, response.id, sectionID);
                });
            },
            delete: function(id){
                atomic.delete('/curriculum/api/section-item/' + id + '/delete/')
                .success(function(response, xhr){});
            },
            createResourceSet: function(serializedItem, callback){
                atomic.post('/curriculum/api/section-item/create-resource-set/', serializedItem)
                .success(function(response, xhr){

                    callback(serializedItem['id'], response.id);
                });
            },
            deleteMeta: function(id, position){
                atomic.delete('/curriculum/api/section-item/' + id + '/delete-meta/' + position + '/')
                .success(function(response, xhr){});
            },
            reposition: function(toShift){
                atomic.post('/curriculum/api/section-items/reposition/', toShift)
                .success(function(response, xhr){
                    Actions.moveItemComplete(response);
                });
            },
            repositionMeta: function(id, toShift){
                atomic.post('/curriculum/api/meta/' + id + '/reposition/', toShift)
                .success(function(response, xhr){
                    Actions.moveFieldComplete(response);
                });
            }
        },
        section: {
            get: function(id, callback){
                atomic.get('/curriculum/api/sections/' + id + '/')
                .success(function(response, xhr){
                    Actions.buildSections(id, response);
                });
            },
            addItem: function(itemID, sectionID){
                atomic.post('/curriculum/api/section-item/add-item-to-section/', {'id': sectionID, 'item_id': itemID})
                .success(function(response, xhr){
                    Actions.itemAddedToSection(itemID);
                    //callback(response);
                });
            },
            create: function(section, moduleID, isUnit, callback){
                var serializedSection = {
                    title: section.get('title'),
                    section_type: section.get('type'),
                    position: section.get('position'),
                    parent_id: moduleID,
                    is_unit: isUnit
                };

                atomic.post('/curriculum/api/section/create/', serializedSection)
                .success(function(response, xhr){
                    Actions.addSectionComplete(section, response.id);

                    callback(response.id);
                });
            },
            delete: function(id){
                atomic.delete('/curriculum/api/section/' + id + '/delete/')
                .success(function(response, xhr){});
            },
            reposition: function(toShift){
                atomic.post('/curriculum/api/sections/reposition/', toShift)
                .success(function(response, xhr){
                    Actions.moveSectionComplete(response);
                });
            }
        },
        issues: {
            update: function(serializedObjective, callback){
                atomic.post('/curriculum/api/issue/create-update/', JSON.stringify(serializedObjective))
                .success(function(response, xhr){
                    callback(response);
                });
            },
        },
        resources: {
            delete: function(serializedObjectiveResource, callback){
                atomic.post('/curriculum/api/section-item/remove-resource/', serializedObjectiveResource)
                .success(function(response, xhr){
                    callback(response);
                });
            }
        },
        resourceSet: {
            delete: function(id){
                atomic.delete('/curriculum/api/section-item-resources/' + id + '/delete/')
                .success(function(response, xhr){});
            }
        },
        textbook: {
            create: function(serializedTextbook, callback){
                atomic.post('/curriculum/api/textbook/create/', serializedTextbook)
                .success(function(response, xhr){
                    //callback(response);
                    Actions.addTextbookComplete(response.id);
                });
            }
        },
        unit: {
            create: function(serializedUnit, callback){
                atomic.post('/curriculum/api/unit/create/', serializedUnit)
                .success(function(response, xhr){
                    //callback(response);
                    Actions.addUnitComplete(response.id);
                });
            }
        },
        settings: {
            update: function(serializedSettings, callback){
                atomic.post('/curriculum/api/settings/update/', serializedSettings)
                .success(function(response, xhr){
                    //callback(response);
                    Actions.settingsUpdated(response);
                });
            },
            pushChanges: function(curriculum_id, callback){
                atomic.get('/curriculum/api/curriculum/' + curriculum_id + '/push/')
                .success(function(response, xhr){
                    callback(response);
                });
            },
            pauseChanges: function(curriculum_id, callback){
                atomic.get('/curriculum/api/curriculum/' + curriculum_id + '/pause/')
                .success(function(response, xhr){
                    callback(response);
                });
            }
        }
    };

    AppDispatcher.register(function(action){
        switch(action.type) {
            case 'SAVE_SETTINGS':
                OC.api.curriculum.settings.update(action.settings, function(){});
                break;

            case 'OPEN_UNIT':
                if (! action.unit.hasOwnProperty('sections')){
                    OC.api.curriculum.section.get(action.unit.id);
                }
                break;

            case 'SAVE_UNIT':
                OC.api.curriculum.unit.create(action.unit);
                break;

            case 'SAVE_TEXTBOOK':
                OC.api.curriculum.textbook.create(action.textbook);
                break;

            // Add item.
            case 'ADD_ITEM_POST':
                OC.api.curriculum.sectionItem.create(action.item, action.sectionID);
                break;

            case 'ADD_ITEM_COMPLETE':
                if (action.sectionID) OC.api.curriculum.section.addItem(action.id, action.sectionID);
                break;

            case 'ADD_ITEM_TO_SECTION':
                OC.api.curriculum.section.addItem(action.itemID, action.sectionID);
                break;

            case 'DELETE_ITEM':
                OC.api.curriculum.sectionItem.delete(action.id);
                break;

            // Add section.
            case 'ADD_SECTION_POST':
                OC.api.curriculum.section.create(
                    action.section, action.moduleID, action.isUnit, action.callback);
                break;

            case 'DELETE_SECTION':
                OC.api.curriculum.section.delete(action.id);
                break;

            case 'UPDATE_ITEM':
                OC.api.curriculum.sectionItem.update(action.props, action.callback);
                break;

            // Add section.
            case 'ADD_FIELD_POST':
                var item = action.item,
                    field = action.field;

                if (field.hasOwnProperty('meta')){
                    serializedItem = {
                        meta: [field.meta],
                        id: item.get('id')
                    };
                    OC.api.curriculum.sectionItem.update(serializedItem, action.callback);
                } else {
                    OC.api.curriculum.sectionItem.createResourceSet({
                        id: item.get('id'),
                        title: field.resource_set.title,
                        position: field.resource_set.position
                    }, action.callback);
                }
                break;


            // Delete fields.
            case 'DELETE_META':
                OC.api.curriculum.sectionItem.deleteMeta(action.itemID, action.id);
                break;

            case 'DELETE_RESOURCESET':
                OC.api.curriculum.resourceSet.delete(action.id);
                break;

            case 'MOVE_SECTION_SAVE':
                OC.api.curriculum.section.reposition(action.toShift);
                break;

            case 'MOVE_ITEM_SAVE':
                OC.api.curriculum.sectionItem.reposition(action.toShift);
                break;

            case 'MOVE_FIELD_SAVE':
                OC.api.curriculum.sectionItem.repositionMeta(action.id, action.toShift);
                break;


            // Resources.
            case 'REMOVE_RESOURCE':
                OC.api.curriculum.resources.delete(
                    {'resource_id': action.resourceID,
                    'resource_set_id': action.resourceSetID
                }, action.callback);
                break;

            default:
                return true;
        }

    });
});