define(['atomic', 'immutable', 'curriculumActions', 'curriculumSettings'], function(atomic, Immutable, Actions, Settings){
    var Bootstrap = {
        _textbooks: null,
        _units: null,
        _standards: null,
        _numWeeks: null,

        fetch: function(callback){
            var bootstrap = this;

            // Fetch curriculum data from server.
            atomic.get('/curriculum/api/curriculum/' + Settings.getID() + '/')
            .success(function(response, xhr){

                // Build lists from existing textbooks, units and standards.
                bootstrap._textbooks = Immutable.fromJS(response.textbooks);
                bootstrap._units = Immutable.fromJS(response.units);
                bootstrap._standards = Immutable.fromJS(response.standards);

                callback();
            });
        },

        linkUnitsToTextbooks: function(){
            // Set ID references to units in textbooks.
            var bootstrap = this, newTextbookUnits, textbookUnit;
            this._textbooks = this._textbooks.map(function(textbook){
                newTextbookUnits = Immutable.List();

                textbook.get('units').forEach(function(currentUnit){
                    textbookUnit = bootstrap._units.find(function(unit){
                        return unit.get('id') === currentUnit.get('id');
                    });
                    textbookUnit = textbookUnit.set(
                        'textbookID', currentUnit.get('textbook_id'));

                    newTextbookUnits = newTextbookUnits.push(textbookUnit.get('id'));
                });

                return textbook.set('units', newTextbookUnits);
            });
        },

        getTextbookFromUnitID: function(unitID){
            return this._textbooks.find(function(textbook){
                return textbook.get('units').find(function(unit){
                    return unit.id === unitID;
                });
            });
        },

        setUnitPeriods: function(){
            var bootstrap = this, unitPeriods, period;
            if (Settings.getPeriods().title == 'weekly'){
                // Go through every textbook / unit and build a period representation.
                unitPeriods = this._units.map(function(unit){
                    // Find textbook this unit belongs to.
                    textbook = bootstrap.getTextbookFromUnitID(unit.id);

                    period = unit.get('period');
                    return {
                        id: unit.get('id'),
                        textbook: textbook ? textbook : null,
                        textbookTitle: textbook ? textbook.get('title') : null,
                        title: unit.get('title'),
                        textbookThumbnail: textbook ? textbook.get('thumbnail') : null,
                        begin: period && period.has('begin') ? period.get('begin') : null,
                        end: period && period.has('end') ? period.get('end') : null,
                        from: period && period.has('from') ? period.get('from') : null,
                        to: period && period.has('to') ? period.get('to') : null
                    };
                });
                                
                unitPeriods = unitPeriods.filter(function(unitPeriod){
                    return unitPeriod.end !== null;
                }).sortBy(function(unit){ return unit.begin; });

                var max = unitPeriods.max(function(unitPeriodA, unitPeriodB){ return unitPeriodA.end > unitPeriodB.end; }),
                    min = unitPeriods.min(function(unitPeriodA, unitPeriodB){ return unitPeriodA.begin > unitPeriodB.begin; }),
                    end = max ? max.end : null,
                    begin = min ? min.begin : null;

                if (end !== null && begin !== null)
                    this._numWeeks = Math.ceil((end - begin) / 7);
                else this._numWeeks = 0;

                return unitPeriods;

            } else if (view.props.settings.periods.title == 'terms'){

                unitPeriods = OC.explorer.units.flatMap(function(unit){
                    textbook = view.getTextbookFromUnitID(unit.get('id'));
                    period = unit.get('period');
                    return {
                        id: unit.get('id'),
                        title: unit.get('title'),
                        textbook: textbook,
                        textbookTitle: textbook ? textbook.get('title') : null,
                        textbookThumbnail: textbook ? textbook.get('thumbnail') : null,
                        type: period && period.has('type') ? period.get('type') : null,
                        position: period && period.has('position') ? period.get('position') : null,
                        parent: period && period.has('parent') ? period.get('parent') : null,
                        unit: period && period.has('unit') ? period.get('unit') : null
                    };
                });

                // Determine the number of units associated with each term.
                var unitData;
                unitPeriods.forEach(function(unit){
                    unitData = view.props.settings.periods.data[unit.parent];

                    if (! unitData.has('count')){
                        unitData['count'] = 1;
                    } else {
                        unitData['count'] += 1;
                    }
                });

                return unitPeriods;
            }
        },

        init: function(callback){
            var bootstrap = this,
                loadButton = OC.curriculum.loadButton,
                loadButtonWrapper = document.querySelector('.ajax-loader-wrapper');

            function loadSpinner(callback){
                // Set spinner on loading button area.
                require(['spin'], function(Spinner){
                    if (! OC.curriculum.hasOwnProperty('spinner')){
                        OC.curriculum.spinner = new Spinner(OC.spinner.options).spin(loadButton);
                    } else OC.curriculum.spinner.spin(loadButton);

                    callback();
                });
            }

            loadSpinner(function(){
                if (OC.curriculum.hasOwnProperty('spinner')) OC.curriculum.spinner.spin(loadButton);
                
                bootstrap.fetch(function(){
                    OC.curriculum.spinner.stop();

                    bootstrap.linkUnitsToTextbooks();

                    // Create actions to create units, textbooks.
                    Actions.initTextbooks(bootstrap._textbooks);
                    Actions.initUnits(bootstrap.setUnitPeriods());
                    Actions.setNumWeeks(bootstrap._numWeeks);

                    callback();
                });
            });
        }
    };

    return Bootstrap;
});