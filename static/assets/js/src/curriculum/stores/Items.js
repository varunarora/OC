define(['curriculumAppDispatcher', 'events', 'deep_extend', 'immutable', 'curriculumActions'],
    function(AppDispatcher, Events, extend, Immutable, Actions){

    var EventEmitter = Events.EventEmitter;
    var CHANGE_EVENT = 'change',
        _items = Immutable.List(),
        _unsaved = Immutable.List(),
        _unsavedField = Immutable.Map(),
        
        // Items that have been created but still need to be added to a list.
        _unsectioned = Immutable.List(),

        // Resource set fields whose IDs have not been assigned.
        _unsetFields = Immutable.Map(),

        _addFieldState = false,

        _toShift = null,
        _toShiftMeta = null,

        _showPlanner = false;


    var ItemsStore = extend(EventEmitter.prototype, {
        emitChange: function() {
            this.emit(CHANGE_EVENT);
        },

        addChangeListener: function(callback) {
            this.on(CHANGE_EVENT, callback);
        },

        removeChangeListener: function(callback) {
            this.removeListener(CHANGE_EVENT, callback);
        },

        _setItems: function(sections){
            sections.forEach(function(section){
                items = section.items.map(function(ri){
                    newItem = Immutable.Map(ri);

                    newItem = newItem.set('issue', {
                        id: ri.issue ? ri.id : null,
                        host_id: ri.issue ? ri.host_id : null,
                        message: ri.issue ? ri.message : null
                    });
                    newItem = newItem.set('sectionID', section.id);

                    return newItem;
                });

                sectionItems = Immutable.List(items);

                sectionItems = sectionItems.map(function(item){
                    return item.set('resource_sets', item.get('resource_sets').map(function(resourceSet){
                        return {
                            id: resourceSet.id,
                            title: resourceSet.title,
                            position: resourceSet.position,
                            resources: Immutable.List(resourceSet.resources.map(
                                function(rr){ return Immutable.Map(rr); }))
                        };
                    }));
                });

                _items = _items.merge(sectionItems);

            });
        },

        selectItem: function(toSelectitem){
            // Remove all objective selecteds.
            var selectedItem = _items.find(function(item){
                return item.get('selected') === true; });

            if (selectedItem) {
                _items = _items.update(_items.indexOf(selectedItem), function(item){
                    return item.set('selected', false); });
            }

            // Update the item 'selected' value and consequently, the list.
            _items = _items.update(_items.indexOf(toSelectitem), function(item){
                return item.set('selected', true); });
        },

        get: function(itemID){
            return _items.find(function(item){ return item.get('id') == itemID; });
        },

        getSectionItems: function(sectionID){
            return _items.filter(function(item){
                return item.get('sectionID') === sectionID;
            });
        },

        getUnsavedItem: function(){
            var last = _unsaved.last();
            _unsaved.pop();

            _unsectioned = _unsectioned.push(last);
            return last;
        },

        getUnsavedField: function(itemID){
            var field = _unsavedField.get(itemID);
            _unsavedField = _unsavedField.delete(itemID);

            _unsetFields = _unsetFields.set(itemID, field);
            return field;
        },

        getFieldState: function(){
            return _addFieldState;
        },

        getShowPlanner: function(){
            return _showPlanner;
        },

        _update: function(props){
            var toUpdateItem = _items.find(function(item){
                return item.get('id') === props.id; });

            delete props.id;

            _items = _items.update(_items.indexOf(toUpdateItem), function(item){
                return item.withMutations(function(originalItem){
                    for (var prop in props) {
                        originalItem.set(prop, props[prop]);
                    }
                });
            });
        },

        _add: function(sectionID){
            var maxPosition = _items.filter(function(item){ return item.get('sectionID') === sectionID; }).max(
                function(itemA, itemB){ return itemA.get('position') > itemB.get('position'); }).get('position');

            var newItem = Immutable.Map({
                description: '',
                resource_sets: [{ id: null, resources: Immutable.List() }],
                meta: [],
                position: maxPosition + 1,
                issue: {
                    id: null, host_id: null, message: null
                },
                sectionID: sectionID
            });

            _items = _items.push(newItem);
            _unsaved = _unsaved.push(newItem);
        },

        _setItemID: function(itemToUpdate, id){
            _items = _items.update(_items.indexOf(itemToUpdate), function(item){
                return item.set('id', id); });
        },

        _setSectionID: function(itemID, sectionID){
            var toUpdateItem = _items.find(function(item){
                return item.get('id') === itemID; });
            
            _items = _items.update(_items.indexOf(toUpdateItem), function(item){
                return item.set('sectionID', sectionID); });
        },

        _setResourceSetID: function(itemID, resourceSetID){
            var toUpdateItem = _items.find(function(item){ return item.get('id') == itemID; }),
                resourceSet = _unsavedField.get(itemID);

            var updatedResourceSets = toUpdateItem.get('resource_sets'),
                index = updatedResourceSets.indexOf(resourceSet);

            updatedResourceSets[index].id = resourceSetID;
            var updatedItem = toUpdateItem.set('resource_sets', updatedResourceSets);

            // Update resource set from item's resource sets with ID.
            _items = _items.set(_items.indexOf(toUpdateItem), updatedItem);
        },

        _addResource: function(resource, resourceSetID){
            // Get resource set.
            var resourceSet = null, toUpdateItem, index, rsIndex;

            toUpdateItem = _items.find(function(item, i){
                index = i;
                resourceSet = item.get('resource_sets').find(function(resourceSet, rsi){
                    rsIndex = rsi;
                    return resourceSet.id === resourceSetID;
                });
                return resourceSet !== undefined;
            });

            var updatedResourceSets = toUpdateItem.get('resource_sets');

            // Add resource.
            updatedResourceSets[rsIndex].resources = updatedResourceSets[rsIndex].resources.push(resource);
            var updatedItem = toUpdateItem.set('resource_sets', updatedResourceSets);

            _items = _items.set(index, updatedItem);
        },

        _addField: function(title, fieldType, position, itemID){
            var toUpdateItem = _items.find(function(item){ return item.get('id') == itemID; }),
                item;

            if (fieldType === 'text'){
                var slug = OC.utils.slugify(title);

                var meta = toUpdateItem.get('meta'),
                    newMetaItem = {
                        'slug': slug,
                        'title': title,
                        'body': '',
                        'position': position
                    };

                meta.push(newMetaItem);
                item = toUpdateItem.set('meta', meta);

                _unsavedField = _unsavedField.set(itemID, {'meta': newMetaItem});

            } else if (fieldType === 'resources'){
                var newResourceSet = {
                    title: title,
                    position: position,
                    resources: []
                };

                var currentResourceSets = toUpdateItem.get('resource_sets');
                currentResourceSets.push(newResourceSet);
                
                item = toUpdateItem.set('resource_sets', currentResourceSets);

                _unsavedField = _unsavedField.set(itemID, Immutable.Map(
                    {'resource_set': newResourceSet}));
            }

            _items = _items.set(_items.indexOf(toUpdateItem), item);
        },

        _delete: function(id){
            var toUpdateItem = _items.find(function(item){
                return item.get('id') === id; });
            
            _items = _items.delete(_items.indexOf(toUpdateItem));
        },

        _deleteMeta: function(id, itemID){
            var toUpdateItem = _items.find(function(item){
                return item.get('id') === itemID; });
            
            _items = _items.update(_items.indexOf(toUpdateItem), function(item){
                return item.update('meta', function(meta){
                    meta.splice(id, 1);
                    return meta;
                });
            });
        },

        _deleteResourceSet: function(id){
            var toDeleteResourceSet, index;
            var toUpdateItem = _items.find(function(item, i){
                toDeleteResourceSet = item.get('resource_sets').find(function(resourceSet, j){
                    index = j;
                    return resourceSet.id  === id;
                });
                return toDeleteResourceSet !== undefined;
            });
            
            _items = _items.update(_items.indexOf(toUpdateItem), function(item){
                return item.update('resource_sets', function(resourceSets){
                    resourceSets.splice(index, 1);
                    return resourceSets;
                });
            });
        },

        _moveItem: function(itemID, beforeItemID){
            var i, toShift = {}, sectionsToShift;

            var toMoveItem = _items.find(function(item){
                return item.get('id') === itemID;
            });

            var beforeItem = _items.find(function(item){
                return item.get('id') === parseInt(beforeItemID, 10);
            });

            var items = this.getSectionItems(toMoveItem.get('sectionID'));

            // Determine the position of each of the models.
            if (toMoveItem.get('position') < beforeItem.get('position')){
                // For each item in the items that is between the two,
                //     reduce position by 1.
                itemsToShift = items.filter(function(section){
                    return section.get('position') > toMoveItem.get('position') && (
                    section.get('position') <= beforeItem.get('position'));
                });

                _items = _items.withMutations(function(items){
                    itemsToShift.forEach(function(itemToShift){
                        items = items.update(items.indexOf(itemToShift),
                            function(item){
                                return item.set('position', item.get('position') - 1);
                            }
                        );

                    });

                    items = items.update(items.indexOf(toMoveItem), function(item){
                        return item.set('position', beforeItem.get('position'));
                    });

                    return items;
                });

            } else if (toMoveItem.get('position') > beforeItem.get('position')){
                // For each section in the sections that is between the two,
                //     add position by 1.
                itemsToShift = items.filter(function(section){
                    return section.get('position') < toMoveItem.get('position') && (
                    section.get('position') >= beforeItem.get('position'));
                });

                _items = _items.withMutations(function(items){
                    itemsToShift.forEach(function(itemToShift){
                        items = items.update(items.indexOf(itemToShift),
                            function(item){
                                return item.set('position', item.get('position') + 1);
                            }
                        );

                    });

                    items = items.update(items.indexOf(toMoveItem), function(item){
                        return item.set('position', beforeItem.get('position'));
                    });

                    return items;
                });
            }

            // Persist the changes with XHR.
            itemsToShift.forEach(function(item){
                toShift[item.get('id')] = ItemsStore.get(item.get('id')).get('position');
            });

            toShift[toMoveItem.get('id')] = _items.find(function(item) {
                return item.get('id') === toMoveItem.get('id');
            }).get('position');

            _toShift = toShift;
        },

        getToShift: function(){
            return _toShift;
        },
        
        getMetaToShift: function(){
            return _toShiftMeta;
        },

        _moveMeta: function(fieldID, beforeFieldID, itemID, toMoveIsMeta, toMoveBeforeIsMeta){
            var toMoveField, beforeField, toMovePosition, beforePosition;

            var toMoveFieldItem = _items.find(function(item){
                return item.get('id') === itemID;
            });


            if (toMoveIsMeta && toMoveBeforeIsMeta){
                toMoveFieldItem.get('meta').forEach(function(meta, i){
                    if (fieldID === i) toMoveField = meta;
                    if (beforeFieldID === i) beforeField = meta;
                });
            } else if (toMoveIsMeta) {
                toMoveFieldItem.get('meta').forEach(function(meta, i){
                    if (fieldID === i) toMoveField = meta;
                });

                beforeField = toMoveFieldItem.get('resource_sets').find(function(resourceSet){
                    return beforeFieldID === resourceSet.id;
                });
            } else if (toMoveBeforeIsMeta){
                toMoveField = toMoveFieldItem.get('resource_sets').find(function(resourceSet){
                    return fieldID === resourceSet.id;
                });

                toMoveFieldItem.get('meta').forEach(function(meta, i){
                    if (beforeFieldID === i) beforeField = meta;
                });
            } else {
                toMoveField = toMoveFieldItem.get('resource_sets').find(function(resourceSet){
                    return fieldID === resourceSet.id;
                });

                beforeField = toMoveFieldItem.get('resource_sets').find(function(resourceSet){
                    return beforeFieldID === resourceSet.id;
                });
            }

            var i, rsToShift, toShift = {}, originalMeta = toMoveFieldItem.get('meta'), rsToShiftIndex, meta, metasToShift = [];

            beforePosition = beforeField.position;

            // Determine the position of each of the models.
            if (toMoveField.position < beforeField.position){
                // For each resource set or meta that is between the two,
                //     reduce position by 1.
                rsToShift = toMoveFieldItem.get('resource_sets').filter(function(rs){
                    return rs.position > toMoveField.position && (
                    rs.position <= beforeField.position);
                });

                for (i = 0; i < originalMeta.length; i++){
                    meta = originalMeta[i];
                    if (meta.position > toMoveField.position && (
                        meta.position <= beforeField.position)){
                        metasToShift.push(meta);
                        meta.position = meta.position - 1;
                    } else metasToShift.push(null);
                }

                if (toMoveIsMeta) originalMeta[toMoveField.position].position = beforeField.position;

                _items = _items.update(items.indexOf(toMoveFieldItem), function(item){
                    
                    item = item.update('resource_sets', function(resourceSets){
                        rsToShift.forEach(function(singleRsToShift){
                            rsToShiftIndex = resourceSets.indexOf(singleRsToShift);

                            if (rsToShiftIndex !== -1){
                                resourceSets = resourceSets.update(rsToShiftIndex, function(rs){
                                    return rs.set('position', rs.get('position') - 1);
                                });
                            }
                        });
                        return resourceSets;
                    });

                    item = item.set('meta', originalMeta);

                    return item;
                });

            } else if (toMoveField.position > beforeField.position){
                // For each resource set or meta that is between the two,
                //     add position by 1.
                rsToShift = toMoveFieldItem.get('resource_sets').filter(function(rs){
                    return rs.position < toMoveField.position && (
                    rs.position >= beforeField.position);
                });

                for (i = 0; i < originalMeta.length; i++){
                    meta = originalMeta[i];
                    if (meta.position < toMoveField.position && (
                        meta.position >= beforeField.position)){
                        metasToShift.push(meta);
                        meta.position = meta.position + 1;
                    } else metasToShift.push(null);
                }

                if (toMoveIsMeta) originalMeta[toMoveField.position].position = beforePosition;

                _items = _items.update(items.indexOf(toMoveFieldItem), function(item){
                    
                    item = item.update('resource_sets', function(resourceSets){
                        rsToShift.forEach(function(singleRsToShift){
                            rsToShiftIndex = resourceSets.indexOf(singleRsToShift);

                            if (rsToShiftIndex !== -1){
                                resourceSets = resourceSets.update(rsToShiftIndex, function(rs){
                                    return rs.set('position', rs.get('position') + 1);
                                });
                            }
                        });
                        return resourceSets;
                    });

                    item = item.set('meta', originalMeta);

                    return item;
                });
            }

            function getResourceSetFromID(resourceSetID){
                return _items.find(function(item){
                    return item.get('id') === itemID;
                }).get('resource_sets').find(function(resourceSet){
                    return resourceSet.id === resourceSetID;
                });
            }

            // Persist the changes with XHR.
            if (rsToShift){
                rsToShift.forEach(function(rs){
                    toShift['set-' + rs.id] = getResourceSetFromID[rs.id].position;
                });
            }

            if (metasToShift){
                metasToShift.forEach(function(meta, i){
                    if (meta) toShift['meta-' + i] = meta.position;
                });
            }

            if (toMoveIsMeta) toShift['meta-' + fieldID] = toMoveField.position;
            else toShift['set-' + fieldID] = toMoveField.position;

            _toShiftMeta = toShift;

            // Callback.
            //callback(toMoveField.position, resourceSet ? resourceSet.id : beforePosition, acceptingElement);
        },

        _hidePlanner: function(event) {
            if (_showPlanner === true){
                if (event.which == 27) { // 'Esc' on keyboard
                    _showPlanner = false;
                }
            }

            OC.$.removeClass(document.querySelector('.popup-background'), 'show-popup-background');

            if (event.target.className.indexOf('popup-background') !== -1) {
                _showPlanner = false;
            }

            ItemsStore.emitChange();
        },

        dispatchToken: AppDispatcher.register(function(action) {
            var text;

            switch(action.type) {
                case 'ADD_ITEM':
                    ItemsStore._add(action.sectionID);
                    break;

                case 'ADD_ITEM_COMPLETE':
                    ItemsStore._setItemID(action.item, action.id);
                    break;

                case 'ADD_ITEM_TO_SECTION':
                    ItemsStore._setSectionID(action.itemID, action.sectionID);
                    break;

                case 'OPEN_ITEM':
                    ItemsStore.selectItem(action.item);
                    break;

                case 'BUILD_SECTIONS':
                    ItemsStore._setItems(action.sections);
                    break;

                case 'ITEM_UPDATED':
                    ItemsStore._update(action.props);
                    break;

                case 'ADD_FIELD':
                    ItemsStore._addField(
                        action.name, action.fieldType,
                        action.position, action.itemID
                    );
                    break;

                case 'ADD_FIELD_COMPLETE':
                    if (action.itemID)
                        ItemsStore._setResourceSetID(action.itemID, action.fieldID);
                    _addFieldState = false;
                    break;

                case 'ADD_RESOURCE':
                    ItemsStore._addResource(
                        action.resource,
                        action.resourceSetID
                    );
                    break;

                case 'DELETE_ITEM':
                    ItemsStore._delete(action.id);
                    break;

                case 'DELETE_META':
                    ItemsStore._deleteMeta(action.id, action.itemID);
                    break;

                case 'DELETE_RESOURCESET':
                    ItemsStore._deleteResourceSet(action.id);
                    break;

                case 'MOVE_ITEM':
                    ItemsStore._moveItem(action.itemID, action.beforeItemID);
                    break;

                case 'MOVE_FIELD':
                    ItemsStore._moveMeta(
                        action.fieldID,
                        action.beforeFieldID,
                        action.itemID,
                        action.toMoveIsMeta,
                        action.beforeIsMeta
                    );
                    break;

                case 'ADD_ITEM_TO_EVENT':
                    _showPlanner = false;
                    break;

                case 'LAUNCH_PLANNER':
                    _showPlanner = !_showPlanner;
                    
                    // Such a bad way to do this, but works.
                    var background = document.querySelector('.popup-background');
                    OC.$.addClass(background, 'show-popup-background');
                    OC.$.addListener(document, 'keyup', ItemsStore._hidePlanner);
                    OC.$.addListener(background, 'click', ItemsStore._hidePlanner);

                    break;

                default:
                    return true;
            }

            ItemsStore.emitChange();

            return true;
        })
    });

    return ItemsStore;
});