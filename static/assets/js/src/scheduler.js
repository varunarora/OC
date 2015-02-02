define(['core_light'], function(OC){
    var Scheduler = {
        popup: null,
        classPeriodEl: null, classPeriodFromEl: null, classPeriodToEl: null,
        classPeriodWrapper: null,
        classDays: {}, remainingClasses: null, k: null,
        replicateLabels: null,
        replicateLabelsWrapper: null,
        timesNextDone: null,
        day: null,

        // Bind timepicker to the time input boxes.
        bindTimes: function(wrapperEl){
            var from = wrapperEl.querySelector('.class-period-from'),
                to = wrapperEl.querySelector('.class-period-to');

            var fromTimepicker, toTimepicker;

            function onFromSelect(timeEl){ toTimepicker.scrollTo(from); }

            fromTimepicker = OC.utils.timepicker(from, this.popup.el, onFromSelect);
            toTimepicker = OC.utils.timepicker(to, this.popup.el);

            from.value = '';
            to.value = '';
        },

        // Toggle the callback on 'Next >' or 'Done' on day view.
        toggleTimesButtonCallback: function(isDone){
            if (isDone){
                this.timesNextDone.removeEventListener('click', this.boundCloseView);
                this.timesNextDone.removeEventListener('click', this.boundDayView);

                OC.$.addListener(this.timesNextDone, 'click', this.boundCloseView = this.closeSchedule.bind(this));
            } else {
                this.timesNextDone.removeEventListener('click', this.boundCloseView);
                this.timesNextDone.removeEventListener('click', this.boundDayView);

                OC.$.addListener(this.timesNextDone, 'click', this.boundDayView = this.dayView.bind(this));
            }
        },

        // Bind listener for replicate options change.
        replicateListener: function(event){
            // Check to see if there are replicate days still unchecked.
            var replicateInputs = this.replicateLabels.querySelectorAll(
                'input[type="checkbox"]');

            var m, replicateUncheckedInputs = [];
            for (m = 0; m < replicateInputs.length; m++){
                if (replicateInputs[m].checked === false)
                    replicateUncheckedInputs.push(replicateInputs[m]);
            }

            // If no replicate day is selected, change 'next >' to 'Done'.
            if (replicateUncheckedInputs.length === 0){
                this.timesNextDone.innerHTML = 'Done';
                this.toggleTimesButtonCallback(true);
            }
            else {
                this.timesNextDone.innerHTML = 'Next &#187;';
                this.toggleTimesButtonCallback(false);
            }
        },


        // Launch single day view.
        dayView: function(event){
            var scheduler = this;

            event.target.removeEventListener('click', this.boundDayView);

            if (Object.keys(this.classDays).length === 0){
                // Find the selected days.
                var selectedDayInputs = this.popup.el.querySelectorAll(
                    '.select-days input[type="checkbox"]:checked');

                if (selectedDayInputs.length === 1)
                    OC.$.addClass(this.replicateLabelsWrapper, 'hidden');

                var i;
                for (i = 0; i < selectedDayInputs.length; i++){
                    this.classDays[selectedDayInputs[i].name] = [];
                }

                //this.remainingClasses = this.classDays;

                this.initDayView(this.classDays);

            } else {
                // Capture existing values.
                this.pushCurrentTimes();
                this.replicateCurrentTimes.bind(this)();
            }

            event.stopPropagation();
            event.preventDefault();
            return false;
        },

        addClassPeriod: function(event){
            classPeriodEl = document.createElement('div');
            classPeriodEl.className = 'class-period';

            classPeriodFromEl = document.createElement('input');
            classPeriodFromEl.type = 'text';
            classPeriodFromEl.placeholder = 'From';
            classPeriodFromEl.className = 'class-period-from';

            classPeriodToEl = document.createElement('input');
            classPeriodToEl.type = 'text';
            classPeriodToEl.placeholder = 'To';
            classPeriodToEl.className = 'class-period-to';

            classPeriodEl.appendChild(classPeriodFromEl);
            classPeriodEl.appendChild(classPeriodToEl);

            this.classPeriodWrapper.appendChild(classPeriodEl);
            this.bindTimes(classPeriodEl);

            if (event){
                event.target.removeEventListener('click', this.addClassPeriodBound);

                event.stopPropagation();
                event.preventDefault();
                return false;
            }
        },

        // Launch single day view.
        initDayView: function(days){
            // Set the first class day as the context.
            var daySet = false;

            var replicateLabel, replicateMessage, replicateInput;
            this.replicateLabels.innerHTML = '';
            for (var key in days){
                if (! daySet) {
                    this.day.innerHTML = key;
                    daySet = true;
                } else {
                    replicateLabel = document.createElement('label');
                    replicateLabel.className = 'inline-input-label';

                    replicateInput = document.createElement('input');
                    replicateInput.type = 'checkbox';

                    replicateMessage = document.createElement('span');
                    replicateMessage.innerHTML = key;
                    
                    replicateLabel.appendChild(replicateInput);
                    replicateLabel.appendChild(replicateMessage);
                    this.replicateLabels.appendChild(replicateLabel);
                }
            }

            if (Object.keys(days).length > 1)
                OC.$.removeClass(this.replicateLabelsWrapper, 'hidden');
            else
                OC.$.addClass(this.replicateLabelsWrapper, 'hidden');

            this.replicateListener();

            // Setup time selectors.
            OC.$.addClass(this.popup.el.querySelector(
                '.select-days'), 'hidden');
            OC.$.removeClass(this.popup.el.querySelector(
                '.select-times'), 'hidden');

            // Remove existing class periods and make a new one.
            var classPeriods = this.popup.el.querySelectorAll('.class-period');
            for (j = 0; j < classPeriods.length; j++){
                classPeriods[j].parentNode.removeChild(classPeriods[j]);
            }

            this.addClassPeriod();

            this.bindTimes(this.popup.el.querySelector('.class-period'));

            // Listen to changes on the list of replicates, if all,
            //     change 'Next >' to 'Done'.
            OC.$.addListener(this.replicateLabels.querySelectorAll(
                'input[type="checkbox"]'), 'change', this.replicateListener.bind(this));

            //this.popup.el.querySelector('.add-class-period').removeEventListener(
            //    'click', this.addClassPeriod);
            this.addClassPeriodBound = this.addClassPeriod.bind(this);

            OC.$.addListener(this.popup.el.querySelector(
                '.add-class-period'), 'click', this.addClassPeriodBound);
        },

        // Collect the current day views' times.
        pushCurrentTimes: function(){
            var classPeriods = this.popup.el.querySelectorAll('.class-period'), j;
            for (j = 0; j < classPeriods.length; j++){
                this.classDays[this.day.innerHTML].push({
                    'from': classPeriods[j].querySelector('input.class-period-from').value,
                    'to': classPeriods[j].querySelector('input.class-period-to').value
                });
            }
        },

        // Replicate the current day views' times.
        replicateCurrentTimes: function(callback){
            var scheduler = this;

            // Replicate for all checked inputs.
            require(['deep_extend'], function(extend){
                var replicateCheckedInputs = scheduler.replicateLabels.querySelectorAll(
                    '.replicate-labels input[type="checkbox"]:checked');

                if (replicateCheckedInputs.length > 0){
                    var k;
                    for (k = 0; k < replicateCheckedInputs.length; k++){
                        scheduler.classDays[replicateCheckedInputs[k].parentNode.querySelector('span').innerHTML] = extend(
                            [], scheduler.classDays[scheduler.day.innerHTML]);
                    }
                }
                
                // All class days with length 0.
                scheduler.remainingClasses = {};
                for (var classKey in scheduler.classDays){
                    if (scheduler.classDays[classKey].length === 0){
                        scheduler.remainingClasses[classKey] = scheduler.classDays[classKey];
                    }
                }

                scheduler.initDayView(scheduler.remainingClasses);
                callback();
            });
        },

        // Clear input values from previous popup open.
        refresh: function(){
            // Remove all filled inputs from before.
            var inputs = this.popup.el.querySelectorAll('input');

            // Empty replicate labels, but show.
            this.replicateLabels.innerHTML = '';
            OC.$.removeClass(this.replicateLabelsWrapper, 'hidden');

            // Preserve the times submit button as 'Next'.
            this.timesNextDone.innerHTML = 'Next &#187;';

            var n;
            for (n = 0; n < inputs.length; n++){
                if (inputs[n].type === 'checkbox')
                    inputs[n].checked = false;
                else
                    inputs[n].value = null;
            }
        },

        // Terminate popup.
        closeSchedule: function(){
            var view = this;

            // Set the schedule.
            this.pushCurrentTimes();
            this.replicateCurrentTimes(function(){
                view.callback(view.classDays);
            });

            this.popup.close();
        },

        init: function(callback){
            this.popup = OC.utils.popup('.setup-class-dialog');
            this.classPeriodWrapper = this.popup.el.querySelector('.class-periods');
            this.replicateLabels = this.popup.el.querySelector('.replicate-labels');
            this.replicateLabelsWrapper = this.popup.el.querySelector('.replicate-labels-wrapper');
            this.timesNextDone = this.popup.el.querySelector('.setup-times-days-button');
            this.day = this.popup.el.querySelector('.select-times-day-name');
            this.classDays = {};

            this.callback = callback;

            var daysNextButton = this.popup.el.querySelector('.setup-class-days-button');

            // On init, show week day selector.
            OC.$.addClass(this.popup.el.querySelectorAll('.popup-body-message'), 'hidden');
            OC.$.removeClass(this.popup.el.querySelector('.select-days'), 'hidden');

            this.refresh();

            // On next, open first selected days' schedule.

            if ('boundDayView' in this)
                daysNextButton.removeEventListener('click', this.boundDayView);

            this.boundDayView = this.dayView.bind(this);
            OC.$.addListener(daysNextButton, 'click', this.boundDayView);
        },
    };

    return Scheduler;
});