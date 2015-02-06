define(['dispatcher', 'events', 'deep_extend', 'immutable', 'curriculumTextbooks', 'curriculumSettings'],
    function(AppDispatcher, Events, extend, Immutable, Textbooks, Settings){
    
    var EventEmitter = Events.EventEmitter;

    var CHANGE_EVENT = 'change',
        _units = Immutable.List(),
        _unsavedSections = Immutable.List(),
        _toShift = null,  // Temporarily storing what needs to be shifted.

        _unsavedUnit = null,
        _isView = null;

    var UnitStore = extend({}, EventEmitter.prototype, {
        emitChange: function() {
            this.emit(CHANGE_EVENT);
        },

        addChangeListener: function(callback) {
            this.on(CHANGE_EVENT, callback);
        },

        removeChangeListener: function(callback) {
            this.removeListener(CHANGE_EVENT, callback);
        },

        getUnits: function(){
            return _units;
        },

        getUnit: function(id){
            return _units.find(function(unit){
                return unit.id === id;
            });
        },

        _addSection: function(name, sectionType, moduleID, isUnit){
            // Add the section, mark it as selected.
            var toUpdateUnit = _units.find(function(unit){
                return unit.id === moduleID; });

            var maxSection = toUpdateUnit.sections.max(function(sectionA, sectionB){
                return sectionA.get('position') > sectionB.get('position'); });
            
            newSection = Immutable.Map({
                // Determine max section position.
                position: maxSection ? maxSection.get('position') + 1 : 0,
                title: name,
                items: [],
                type: sectionType,
            });

            _units = _units.update(_units.indexOf(toUpdateUnit), function(unit){
                unit.sections = unit.sections.push(newSection);
                return unit;
            });

            _unsavedSections = _unsavedSections.push(newSection);

            // Make XHR, and update section ID.
            /*OC.api.curriculum.section.create({
                'parent_id': parentID,
                'is_unit': isUnit,
                'title': newSection.title,
                'position': newSection.position,
                'type': newSection.type
            }, function(response){
                newSection.id = response.id;

                if (sectionType === 'contextual'){
                    newSectionItem.set('section_id', newSection.id);

                    newCollectionItem = newSection.items.create(newSectionItem, {
                        success: function(model){
                            newSection.items.add(model);
                            return OC.api.curriculum.section.addItem(
                                {'id': model.get('section_id'), 'item_id': model.get('id')}, function(){});
                        }
                    });
                }
            });*/
        },

        _setSectionID: function(id, section){
            // Get unit which contains this section.
            var unit = _units.find(function(unit){
                return unit.hasOwnProperty('sections') ? unit.sections.contains(section) : false; });

            _units = _units.update(_units.indexOf(unit), function(unit){
                sections = unit.sections.update(unit.sections.indexOf(section), function(section){
                    return section.set('id', id);
                });
                unit.sections = sections;
                return unit;
            });
        },

        _setItemSectionID: function(item, sectionID){
            item = item.set('sectionID', sectionID);
        },

        _setUnitID: function(id){
            _units = _units.update(_units.indexOf(_unsavedUnit), function(unit){
                unit.id = id;
                return unit;
            });
        },

        getUnsavedSection: function(){
            var last = _unsavedSections.last();
            _unsavedSections.pop();

            return last;
        },


        peekUnsavedSection: function(){
            return _unsavedSections.last();
        },

        getToShift: function(){
            return _toShift;
        },

        getUnsavedUnit: function(){
            return _unsavedUnit;
        },

        isView: function(){
            return _isView;
        },

        _deleteSection: function(id){
            var sectionToDelete;
            var unit = _units.find(function(unit){
                if (unit.sections){
                    sectionToDelete = unit.sections.find(function(section){
                        return section.get('id') === id;
                    });
                    return sectionToDelete !== undefined;
                }

                return false;
            });

            _units = _units.update(_units.indexOf(unit), function(unit){
                unit.sections = unit.sections.delete(unit.sections.indexOf(
                    sectionToDelete));

                return unit;
            });
        },

        _moveSection: function(sectionID, beforeSectionID){
            var toMoveSection, beforeSection, i, toShift = {}, sectionsToShift;

            var toMoveSectionUnit = _units.find(function(unit){
                if (unit.sections){
                    toMoveSection = unit.sections.find(function(section){
                        return section.get('id') === sectionID;
                    });
                    return toMoveSection !== undefined;
                }
                return false;
            });

            var beforeSectionUnit = _units.find(function(unit){
                if (unit.sections){
                    beforeSection = unit.sections.find(function(section){
                        return section.get('id') === parseInt(beforeSectionID, 10);
                    });
                    return beforeSection !== undefined;
                }
                return false;
            });


            // Determine the position of each of the models.
            if (toMoveSection.get('position') < beforeSection.get('position')){
                // For each section in the sections that is between the two,
                //     reduce position by 1.
                sectionsToShift = toMoveSectionUnit.sections.filter(function(section){
                    return section.get('position') > toMoveSection.get('position') && (
                    section.get('position') <= beforeSection.get('position'));
                });

                _units = _units.update(_units.indexOf(toMoveSectionUnit), function(unit){
                    unit.sections = unit.sections.withMutations(function(sections){
                        sectionsToShift.forEach(function(sectionToShift){
                            sections = sections.update(sections.indexOf(sectionToShift),
                                function(section){
                                    return section.set('position', section.get('position') - 1);
                                }
                            );
                        });

                        sections = sections.update(sections.indexOf(toMoveSection), function(section){
                            return section.set('position', beforeSection.get('position'));
                        });

                        return sections;
                    });

                    return unit;
                });

            } else if (toMoveSection.get('position') > beforeSection.get('position')){
                // For each section in the sections that is between the two,
                //     add position by 1.
                sectionsToShift = toMoveSectionUnit.sections.filter(function(section){
                    return section.get('position') < toMoveSection.get('position') && (
                    section.get('position') >= beforeSection.get('position'));
                });

                _units = _units.update(_units.indexOf(toMoveSectionUnit), function(unit){
                    unit.sections = unit.sections.withMutations(function(sections){
                        sectionsToShift.forEach(function(sectionToShift){
                            sections = sections.update(sections.indexOf(sectionToShift),
                                function(section){
                                    return section.set('position', section.get('position') + 1);
                                }
                            );
                        });

                        sections = sections.update(sections.indexOf(toMoveSection), function(section){
                            return section.set('position', beforeSection.get('position'));
                        });

                        return sections;
                    });

                    return unit;
                });
            }

            // Persist the changes with XHR.
            var toShiftSection, toShiftSectionIndex;
            unit = _units.find(function(u) { return u.id === toMoveSectionUnit.id; });

            function getSectionWithID(unit, sectionID){
                return unit.sections.find(function(section) {
                    return section.get('id') === sectionID;
                });
            }

            sectionsToShift.forEach(function(section){
                toShiftSectionIndex = unit.sections.indexOf(
                    getSectionWithID(unit, section.get('id'))
                );

                if (toShiftSectionIndex !== -1){
                    toShiftSection = unit.sections.get(toShiftSectionIndex);
                    toShift[toShiftSection.get('id')] = toShiftSection.get('position');
                }
            });

            toShift[toMoveSection.get('id')] = unit.sections.find(function(section) {
                return section.get('id') === toMoveSection.get('id');
            }).get('position');

            _toShift = toShift;
        },

        _addUnit: function(name, textbook, from, to){
            var period, daysSinceStart, totalDays;

            var start = new Date(Settings.getPeriods().start),
                end = new Date(Settings.getPeriods().end);

            if (Settings.getPeriods().title === 'weekly'){
                // Determine the delta between the start/end of the curriculum program
                //     and these dates.
                daysSinceStart = (new Date(from) - start) / 1000 / 60 / 60 / 24;
                totalDays = (new Date(to) - new Date(from)) / 1000 / 60 / 60 / 24;

                period = {
                    type: 'generic',
                    begin: Math.round(daysSinceStart),
                    end: Math.round(totalDays + daysSinceStart),
                    unit: 'day',
                    from: from,
                    to: to
                };
            } else {
                period = {
                    position: _.max(this.props.units, function(unit) {
                        return unit.position; }).position + 1,
                    type: 'child',
                    parent: this.props.settings.periods.data.indexOf(
                        this.state.newUnitPeriod),
                    unit: 'equal'
                };
            }

            var newUnit = {
                title: name,
                textbook: Textbooks.getTitleFromID(textbook),
                period: period,
                sections: Immutable.List()
            };

            var serializedUnit = {
                title: name,
                textbook_id: typeof textbook === 'number' ? textbook : null,
                period: period,
                curriculum_id: Settings.getID()
            };

            for (var key in period){
                serializedUnit[key] = period[key];
                newUnit[key] = period[key];
            }
            delete serializedUnit['period'];
            delete newUnit['period'];

            _units = _units.push(newUnit);
            _unsavedUnit = serializedUnit;
        },

        dispatchToken: AppDispatcher.register(function(action) {
            switch(action.type) {
                case 'SET_UNITS':
                    units = action.units;
                    _units = units;
                    break;

                case 'ADD_SECTION':
                    UnitStore._addSection(
                        action.name, action.sectionType, action.moduleID, action.isUnit);
                    break;

                case 'ADD_SECTION_COMPLETE':
                    UnitStore._setSectionID(action.section, action.id);
                    break;

                case 'DELETE_SECTION':
                    UnitStore._deleteSection(action.id);
                    break;

                case 'MOVE_SECTION':
                    UnitStore._moveSection(action.sectionID, action.beforeSectionID);
                    break;

                case 'OPEN_UNITS':
                    _isView = true;
                    break;
                
                case 'OPEN_TEXTBOOKS':
                    _isView = false;
                    break;

                case 'ADD_UNIT':
                    UnitStore._addUnit(
                        action.name, action.textbook,
                        action.from, action.to
                    );
                    break;

                case 'ADD_UNIT_COMPLETE':
                    UnitStore._setUnitID(action.id);
                    break;

                default:
                    return true;
            }

            UnitStore.emitChange();

            return true;
        })

    });

    return UnitStore;
});
