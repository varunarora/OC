define([], function(){
    OC.$ = {
        addClass: function(el, className){
            var i;
            if (! (el instanceof NodeList)) el = [el];
            for (i = 0; i < el.length; i++){
                if (el[i].classList)
                  el[i].classList.add(className);
                else
                  el[i].className += ' ' + className;
            }
        },

        hasClass: function(el, className){
            if (el.classList)
                return el.classList.contains(className);
            else
                return new RegExp('(^| )' + className + '( |$)', 'gi').test(el.className);
        },

        removeClass: function(el, className){
            if (el.classList)
              el.classList.remove(className);
            else
              el.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
        },

        toggleClass: function(el, className){
            if (el.classList) {
                el.classList.toggle(className);
            } else {
                var classes = el.className.split(' ');
                var existingIndex = classes.indexOf(className);

                if (existingIndex >= 0)
                    classes.splice(existingIndex, 1);
                else
                    classes.push(className);

                el.className = classes.join(' ');
            }

        },

        addListener: function(el, event, callback){
            var i;
            if (! (el instanceof NodeList)) el = [el];
            for (i = 0; i < el.length; i++){
                if (el[i].addEventListener) {
                    el[i].addEventListener(event, callback, false);
                }
                else {
                    el[i].attachEvent('on' + event, callback);
                }
            }

            return el instanceof NodeList ? el : el[0];
        },

        css: function(el, prop){
            if (window.getComputedStyle)
                return window.getComputedStyle(el)[prop];
            else return el.currentStyle.prop;
        },

        outerWidth: function(el){
            var width = el.offsetWidth;
            var style = getComputedStyle(el);

            width += parseInt(style.marginLeft, 10) + parseInt(style.marginRight, 10);
            return width;
        },

        outerHeight: function(el){
            var height = el.offsetHeight;
            var style = getComputedStyle(el);

            height += parseInt(style.marginTop, 10) + parseInt(style.marginBottom, 10);
            return height;
        },

        /**
         * Get closest DOM element up the tree that contains a class, ID, or data attribute
         * @param  {Element} elem The base element
         * @param  {String} selector The class or data attribute to look for
         * @return {Boolean|Element} False if no match
         */
        closest: function (elem, selector) {
            var firstChar = selector.charAt(0);

            // Get closest match
            for (; elem && elem !== document; elem = elem.parentNode) {
                if (firstChar === '.') {
                    if (elem.classList) {
                        if (elem.classList.contains(selector.substr(1)))
                            return elem;
                    } else {
                        if (elem.className.split(' ').contains(selector.substr(1)))
                            return elem;
                    }
                } else if (firstChar === '#') {
                    if (elem.id === selector.substr(1)) {
                        return elem;
                    }
                } else if (firstChar === '[') {
                    if (elem.hasAttribute(selector.substr(1, selector.length - 2))) {
                        return elem;
                    }
                }
            }

            return false;
        },

        // Serialize an array of form elements or a set of
        // key/values into a query string
        param: function(a) {
            var s = [], prefix, traditional = true;

            if (a instanceof Array && !(obj !== null && typeof obj === "object")){
                // Serialize the form elements
                a.forEach(function(i) {
                    add(i.name, i.value);
                });
            } else {
                for (prefix in a) {
                    buildParams(prefix, a[prefix]);
                }
            }

            // Return the resulting serialization
            return s.join("&").replace(/%20/g, "+");

            function buildParams(prefix, obj) {
                if (obj instanceof Array) {
                    // Serialize array item.
                    obj.forEach(function(v, i) {
                        if (/\[\]$/.test(prefix)) {
                            // Treat each array item as a scalar.
                            add(prefix, v);
                        } else {
                            buildParams(prefix + "[" + (typeof v === "object" ? i : "") + "]", v);
                        }
                    });
                } else if (typeof obj === "object") {
                    // Serialize object item.
                    for (var k in obj){
                        buildParams(prefix + "[" + k + "]", obj[k] );
                    }
                } else {
                    // Serialize scalar item.
                    add(prefix, obj);
                }
            }

            function add(key, value) {
                // If value is a function, invoke it and return its value
                s[s.length] = encodeURIComponent(key) + "=" + encodeURIComponent(value);
            }
        },

        isEmpty: function(obj){
            for(var prop in obj) {
                if(obj.hasOwnProperty(prop))
                    return false;
            }
            return true;
        },

        /* Hardcore jQuery function to work with forms */
        serialize: function(a){
            var rinput = /^(?:color|date|datetime|datetime-local|email|hidden|month|number|password|range|search|tel|text|time|url|week)$/i;
            var filteredElements = [], i, el;

            for (i = 0; i < a.elements.length; i++){
                el = a.elements[i];
                if (el.name && !el.disabled && (el.checked || /^(?:select|textarea)/i.test(el.nodeName) || rinput.test(el.type)))
                    filteredElements.push(el);
            }

            var serializedMap = {};

            filteredElements.forEach(function(el, i){
                var val = el.value;

                if (val !== null){
                    if (val instanceof Array) {
                        val.map(function (val, i) {
                            serializedMap[el.name] = val.replace(/\r?\n/g, "\r\n");
                        });
                    } else {
                        serializedMap[el.name] = val.replace(/\r?\n/g, "\r\n");
                    }
                }
            });

            return serializedMap;
        },

        parents: function(el, className){
            try {
                if (OC.$.hasClass(el, className))
                    return el;
                else
                    return this.parents(el.parentNode, className);
            } catch (e) {
                return null;
            }
        },

        /* Underscore method */
        max: function(list, context){
            var maxValue = list[0], i;
            for (i = 1; i < list.length; i++){
                if (context(list[i]) > context(maxValue))
                    maxValue = list[i];
            }
            return maxValue;
        },

    };

    OC.utils = {
        menu: function(el, offsetEl, center) {
            var top, left;

            function position(){
                var centerMenu = center || false;
                boundingRects = offsetEl.getBoundingClientRect();

                top = boundingRects.top + OC.$.outerHeight(offsetEl) + 'px';
                el.style.top = top;
                
                if (centerMenu) {
                    left = boundingRects.left - (el.offsetWidth - offsetEl.offsetWidth)/2 + 'px';
                    el.style.left = left;
                } else {
                    left = boundingRects.left - (
                        el.offsetWidth - offsetEl.offsetWidth) + 'px';
                    el.style.left = left;
                }
            }

            position();
            window.addEventListener('resize', position);

            return {
                top: top,
                left: left,
                reset: position
            };
        },

        isElementInViewport: function(el){
            var rect = el.getBoundingClientRect();

            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
                rect.right <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
            );
        },

        // Adapted from http://chris-spittles.co.uk/jquery-calculate-scrollbar-width/#sthash.pzDdzxwT.dpuf
        getScrollbarWidth: function() {
            var inner = document.createElement('div'),
                outer = document.createElement('div');

            inner.style.width = '100%';
            inner.style.height = '200px';

            outer.style.width = '200px';
            outer.style.height = '150px';
            outer.style.position = 'absolute';
            outer.style.top = 0;
            outer.style.left = 0;
            outer.style.visibility = 'hidden';
            outer.style.overflow = 'hidden';

            outer.appendChild(inner);
            document.body.appendChild(outer);

            var innerWidth = inner.offsetWidth;
            outer.style.overflow = 'scroll';

            var outerWidth = outer.clientWidth;
            document.body.removeChild(outer);
         
            return (innerWidth - outerWidth);
        },

        // Adopted from underscore.
        isFunction: function(obj) {
            return !!(obj && obj.constructor && obj.call && obj.apply);
        },

        timeago: function(el, action, options){
            function t(timestamp) {
                if (timestamp instanceof Date) {
                    return inWords(timestamp);
                } else if (typeof timestamp === "string") {
                    return inWords(t.parse(timestamp));
                } else if (typeof timestamp === "number") {
                    return inWords(new Date(timestamp));
                } else {
                    return inWords(t.datetime(timestamp));
                }
            }

            t['settings'] = {
                refreshMillis: 60000,
                allowPast: true,
                allowFuture: false,
                localeTitle: false,
                cutoff: 0,
                strings: {
                    prefixAgo: null,
                    prefixFromNow: null,
                    suffixAgo: "ago",
                    suffixFromNow: "from now",
                    inPast: 'any moment now',
                    seconds: "less than a minute",
                    minute: "about a minute",
                    minutes: "%d minutes",
                    hour: "about an hour",
                    hours: "about %d hours",
                    day: "a day",
                    days: "%d days",
                    month: "about a month",
                    months: "%d months",
                    year: "about a year",
                    years: "%d years",
                    wordSeparator: " ",
                    numbers: []
                }
            };

            t['inWords'] = function(distanceMillis) {
                if(!this.settings.allowPast && ! this.settings.allowFuture) {
                  throw 'timeago allowPast and allowFuture settings can not both be set to false.';
                }

                var l = this.settings.strings;
                var prefix = l.prefixAgo;
                var suffix = l.suffixAgo;
                if (this.settings.allowFuture) {
                    if (distanceMillis < 0) {
                        prefix = l.prefixFromNow;
                        suffix = l.suffixFromNow;
                    }
                }

                if(!this.settings.allowPast && distanceMillis >= 0) {
                    return this.settings.strings.inPast;
                }

                var seconds = Math.abs(distanceMillis) / 1000;
                var minutes = seconds / 60;
                var hours = minutes / 60;
                var days = hours / 24;
                var years = days / 365;

                function substitute(stringOrFunction, number) {
                    var string = OC.utils.isFunction(stringOrFunction) ? stringOrFunction(number, distanceMillis) : stringOrFunction;
                    var value = (l.numbers && l.numbers[number]) || number;
                    return string.replace(/%d/i, value);
                }

                var words = seconds < 45 && substitute(l.seconds, Math.round(seconds)) ||
                seconds < 90 && substitute(l.minute, 1) ||
                minutes < 45 && substitute(l.minutes, Math.round(minutes)) ||
                minutes < 90 && substitute(l.hour, 1) ||
                hours < 24 && substitute(l.hours, Math.round(hours)) ||
                hours < 42 && substitute(l.day, 1) ||
                days < 30 && substitute(l.days, Math.round(days)) ||
                days < 45 && substitute(l.month, 1) ||
                days < 365 && substitute(l.months, Math.round(days / 30)) ||
                years < 1.5 && substitute(l.year, 1) ||
                substitute(l.years, Math.round(years));

                var separator = l.wordSeparator || "";
                if (l.wordSeparator === undefined) { separator = " "; }
                return [prefix, words, suffix].join(separator).trim();
            };

            t['parse'] = function(iso8601){
                var s = iso8601.trim();
                s = s.replace(/\.\d+/,""); // remove milliseconds
                s = s.replace(/-/,"/").replace(/-/,"/");
                s = s.replace(/T/," ").replace(/Z/," UTC");
                s = s.replace(/([\+\-]\d\d)\:?(\d\d)/," $1$2"); // -04:00 -> -0400
                s = s.replace(/([\+\-]\d\d)$/," $100"); // +09 -> +0900
                return new Date(s);
            };
            t['datetime'] = function(elem) {
                var iso8601 = t.isTime(elem) ? elem.getAttribute("datetime") : elem.getAttribute("title");
                return t.parse(iso8601);
            };
            t['isTime'] = function(elem) {
                // jQuery's `is()` doesn't play well with HTML5 in IE
                return elem.tagName.toLowerCase() === "time"; // $(elem).is("time");
            };

            // functions that can be called via $(el).timeago('action')
            // init is default when no action is given
            // functions are called with context of a single element
            var functions = {
                init: function(){
                    var refresh_el = function () { return refresh.apply(this,arguments); };
                    refresh_el();
                    var s = t.settings;
                    if (s.refreshMillis > 0) {
                        this._timeagoInterval = setInterval(refresh_el, s.refreshMillis);
                    }
                },
                update: function(time){
                    var parsedTime = t.parse(time);
                    this.setAttribute('timeago', { datetime: parsedTime });
                    if($t.settings.localeTitle) this.getAttribute("title", parsedTime.toLocaleString());
                    refresh.apply(this);
                },
                updateFromDOM: function(){
                    this.setAttribute('timeago', { datetime: t.parse( t.isTime(this) ? this.getAttribute("datetime") : this.getAttribute("title") ) });
                    refresh.apply(this);
                },
                dispose: function () {
                    if (this._timeagoInterval) {
                        window.clearInterval(this._timeagoInterval);
                        this._timeagoInterval = null;
                    }
                }
            };

            function refresh() {
                var data = prepareData(el);
                var s = t.settings;

                if (!isNaN(data.datetime)) {
                    if ( s.cutoff === 0 || Math.abs(distance(data.datetime)) < s.cutoff) {
                        el.innerHTML = inWords(data.datetime);
                    }
                }
                return this;
            }

            function prepareData(element) {
                if (!element.getAttribute("data-timeago")) {
                    element.setAttribute("data-timeago", t.datetime(element) );
                    var text = element.innerText || element.textContent;
                    if (t.settings.localeTitle) {
                        element.setAttribute("title", element.getAttribute("data-timeago").datetime.toLocaleString());
                    } else if (text.length > 0 && !(t.isTime(element) && element.getAttribute("title"))) {
                        element.setAttribute("title", text);
                    }
                }
                return {datetime: new Date(element.getAttribute("data-timeago"))};
            }

            function inWords(date) {
                return t.inWords(distance(date));
            }

            function distance(date) {
                return (new Date().getTime() - date.getTime());
            }

            var fn = action ? functions[action] : functions.init;
            if(!fn){
                throw new Error("Unknown function name '"+ action +"' for timeago");
            }
            // each over objects here and call the requested function
            fn.call(el, options);

            return el;
        },

        popup: function(elSelector, options){
            var _options = options || {},
                backgroundSelector = _options.hasOwnProperty(
                'light') ? '.light-popup-background' : '.popup-background';
                background = document.querySelector(backgroundSelector);
                _popup = null;

            function launchPopup(blockToPopup){
                OC.$.addClass(background, 'show-popup-background');
                OC.$.addClass(blockToPopup, 'show-popup');

                adjustPopupPosition(blockToPopup);

                // Dismiss current message boxes.
                OC.utils.messageBox.dismiss();

                // On window resize, adjust the position of the theater
                window.addEventListener('resize', function(){
                    adjustPopupPosition(blockToPopup);
                });
            }

            function adjustPopupPosition(popup) {
                // With an assumption that the block is smaller than the window size
                popup.style.left = ((window.innerWidth - parseInt(OC.$.css(popup, 'width'), 10)) / 2) + 'px';
                popup.style.top = ((window.innerHeight - parseInt(OC.$.css(popup, 'height'), 10)) / 2.5) + 'px';
            }

            function reposition(){
                return adjustPopupPosition(_popup);
            }

            function attachEscapePopupHandler(popup){
                if (!_options.hasOwnProperty('light'))
                    OC.$.addListener(popup.dialog.querySelector(
                        '.popup-exit'), 'click', exitClickListener);

                OC.$.addListener(document, 'keyup', function(event) {
                    if (OC.$.hasClass(popup.dialog, 'show-popup')){
                        if (event.which == 27) { // 'Esc' on keyboard
                            popup.close();
                        }
                    }
                });
            }

            function closePopup(){
                OC.$.removeClass(popup.dialog, 'show-popup');
                OC.$.removeClass(background, 'show-popup-background');

                // If any other popup is still open, show popup background again.
                var allPopups = document.querySelectorAll('.popup'), i;
                for (i = 0; i < allPopups.length; i++){
                    if (OC.$.hasClass(allPopups[i], 'show-popup'))
                        OC.$.addClass(background, 'show-popup-background');
                }

                if (closeCallback){
                    closeCallback();
                }
            }

            function exitClickListener(){
                closePopup(popup);
            }

            var closeCallback = null;
            if (_options){
                closeCallback = _options.closeCallback || closeCallback;
            }

            var blockToPopup = document.querySelector(elSelector);

            // Unbind old events from popup escape/background click.
            if (!_options.hasOwnProperty('light'))
                blockToPopup.querySelector('.popup-exit').removeEventListener(
                    'click', exitClickListener);
            background.removeEventListener('click', exitClickListener);

            // Launch popup on init.
            launchPopup(blockToPopup);

            var popup = {
                dialog: blockToPopup,
                el: blockToPopup,
                reposition: reposition,
                close: closePopup
            };

            // Attach handler to close popup.
            attachEscapePopupHandler(popup);

            OC.$.addListener(background, 'click', exitClickListener);
            _popup = blockToPopup;

            return popup;
        },

        messageBox: {
            messageElementWrapper: null,
            messageElement: null,
            init: function(){
                var messageElementWrapper = document.querySelector('.login-messages-wrapper'),
                    messageElement = document.querySelector('.login-messages');
                
                OC.utils.messageBox.messageElement = messageElement;
                OC.utils.messageBox.messageElementWrapper = messageElementWrapper;

                if (OC.utils.messageBox.get() !== ''){
                    OC.utils.messageBox.show();
                }

                // Assign click handler to dismiss floating div.
                OC.$.addListener(OC.utils.messageBox.messageElementWrapper.querySelector('.close-message-box'), 'click',
                    OC.utils.messageBox.dismiss);
            },

            set: function(newMessage){
                OC.utils.messageBox.messageElement.innerHTML = newMessage;
            },

            get: function(){
                return OC.utils.messageBox.messageElement.innerHTML;
            },

            show: function(){
                OC.$.addClass(OC.utils.messageBox.messageElementWrapper, 'show-messages');
                OC.utils.messageBox.reposition();
            },

            pushForward: function(){
                OC.$.addClass(OC.utils.messageBox.messageElementWrapper, 'push-forward');
            },

            dismiss: function(){
                OC.utils.messageBox.set('');
                OC.$.removeClass(OC.utils.messageBox.messageElementWrapper, 'show-messages');
            },

            reposition: function(){
                var pageWidth = window.innerWidth,
                    messageWidth = parseInt(OC.$.css(OC.utils.messageBox.messageElementWrapper, 'width'), 10);

                // Set new position of the login messages floating block
                OC.utils.messageBox.messageElementWrapper.style.left = (pageWidth / 2 - messageWidth / 2) + 'px';
            }
        },

        browser: function(tree, parentElement, collectionID){
            parentElement.innerHTML = tree;

            try {
                // Bold the current collection, if this is in files.
                OC.$.addClass(parentElement.querySelector('a#collection-' + collectionID), 'current-collection');
            } catch(e) { }

            var currentlySelectedCollection, currentlySelectedResource;

            // When clicking in whitespace in the move browser, unselect current selection.
            OC.$.addListener(parentElement, 'click', function(event){
                currentlySelectedCollection = parentElement.querySelector('a.selected-destination-collection');
                currentlySelectedResource = parentElement.querySelector('a.selected-destination-resource');

                if (currentlySelectedCollection) OC.$.removeClass(currentlySelectedCollection,
                    'selected-destination-collection');
                if (currentlySelectedResource) OC.$.removeClass(currentlySelectedResource,
                    'selected-destination-resource');
            });

            // Bind collection click with selection of collection.
            OC.$.addListener(parentElement.querySelectorAll('a'), 'click', function(event){
                // Remove any other selections previously made.
                currentlySelectedCollection = parentElement.querySelector(
                    'a.selected-destination-collection, a.selected-destination-resource');

                if (!OC.$.hasClass(event.target, 'current-collection')){
                    if (currentlySelectedCollection){
                        OC.$.removeClass(currentlySelectedCollection, 'selected-destination-collection');
                        OC.$.removeClass(currentlySelectedCollection, 'selected-destination-resource');
                    }

                    if (currentlySelectedCollection !== event.target){
                        if (event.target.id.indexOf('collection') !== -1){
                            OC.$.toggleClass(event.target, 'selected-destination-collection');
                        } else {
                            OC.$.toggleClass(event.target, 'selected-destination-resource');
                        }
                    }
                }

                event.stopPropagation();
                event.preventDefault();
                return false;
            });

            // Toggle collections if it has child collections.
            OC.$.addListener(parentElement.querySelectorAll('ul li.parent-collection > .toggle-collection'), 'click',
                OC.utils.onFolderClick);

            // Toggle tag categories if it has child tag categories.
            /*var toggleCategory = parentElement.querySelector('ul li.parent-category > .toggle-category');
            if (toggleCategory)
                OC.$.addListener(toggleCategory, 'click', OC.parentCollectionClickHandler);*/
        },

        onFolderClick: function(event){
            var listItem = event.target.parentNode;

            OC.$.toggleClass(listItem, 'opened-collection');
            OC.$.toggleClass(listItem.querySelector('ul'), 'show');

            event.preventDefault();
            event.stopPropagation();
            return false;
        },

        palettes: {
            blue: {
                title: 'Blue',
                extraLight: '#e3f2fd', // 50
                light: '#64b5f6', // 300
                base: '#2196f3', // 500
                dark: '#1976d2', // 700
                darker: '#1565c0' // 800
            },
            deepPurple: {
                title: 'Deep Purple',
                extraLight: '#ede7f6', // 50
                light: '#9575cd', // 300
                base: '#673ab7', // 500
                dark: '#512da8', // 700
                darker: '#4527a0' // 800
            },
            red: {
                title: 'Red',
                extraLight: '#ffebee', // 50
                light: '#e57373', // 300
                base: '#f44336', // 500
                dark: '#d32f2f', // 700
                darker: '#c62828' // 800
            },
            pink: {
                title: 'Pink',
                extraLight: '#fce4ec', // 50
                light: '#f06292', // 300
                base: '#e91e63', // 500
                dark: '#c2185b', // 700
                darker: '#ad1457' // 800
            },
            indigo: {
                title: 'Indigo',
                extraLight: '#e8eaf6', // 50
                light: '#7986cb', // 300
                base: '#3f51b5', // 500
                dark: '#303f9f', // 700
                darker: '#283593' // 800
            },
            teal: {
                title: 'Teal',
                extraLight: '#e0f2f1', // 50
                light: '#4db6ac', // 300
                base: '#009688', // 500
                dark: '#00796b', // 700
                darker: '#00695c' // 800
            },
            green: {
                title: 'Green',
                extraLight: '#e8f5e9', // 50
                light: '#81c784', // 300
                base: '#4caf50', // 500
                dark: '#388e3c', // 700
                darker: '#2e7d32' // 800
            },
            orange: {
                title: 'Orange',
                extraLight: '#fff3e0', // 50
                light: '#ffb74d', // 300
                base: '#ff9800', // 500
                dark: '#f57c00', // 700
                darker: '#ef6c00' // 800
            }
        },

        timepicker: function(el, referenceEl, callback){
            // Create new dropdown.
            var dropdown = document.createElement('div');
            dropdown.className = 'oc-timepicker';
            document.body.appendChild(dropdown);

            var _scrolled = false;

            var timeList = document.createElement('ul');

            dropdown.appendChild(timeList);

            // Position dropdown in reference to the el.
            if (referenceEl){
                dropdown.style.left = el.offsetLeft + parseInt(referenceEl.style.left, 10) + 'px';
                dropdown.style.top = el.offsetTop + parseInt(el.offsetHeight, 10) + parseInt(
                    referenceEl.style.top, 10) + 2 + 'px';
            } else {
                dropdown.style.left = el.offsetLeft + 'px';
                dropdown.style.top = el.offsetTop + parseInt(el.offsetHeight, 10) + 2 + 'px';
            }

            dropdown.style.width = el.offsetWidth + 'px'; //OC.$.css(el, 'width');

            var scrollHeight, time, timeMatch, rawHour, hour, rawMinutes, position;
            
            var scrollTo = function(el){
                if (!_scrolled){
                    // Scroll.
                    scrollHeight = dropdown.firstChild.scrollHeight;

                    // If el has value, scroll to that point.
                    if (el.value.length > 0){
                        time = el.value;

                        timeMatch = time.match(/^(0?[1-9]|1[0-2]):([0-5]\d)([ap][m])$/);

                        rawHour = parseInt(timeMatch[1], 10);
                        hour = timeMatch[3] === 'am' ? rawHour : (rawHour === 12 ? rawHour : rawHour + 12);

                        rawMinutes = parseInt(timeMatch[2], 10);
                    // Else scroll down to now.
                    } else {
                        now = new Date();
                        hour = now.getHours();
                        rawMinutes = now.getMinutes();
                    }

                    position = rawMinutes === 0 ? hour * 2 : (hour * 2) + 1;

                    dropdown.firstChild.scrollTop = (scrollHeight/48) * position;
                    _scrolled = true;
                }
            };

            OC.$.addListener(el, 'focus', function(event){
                OC.$.addClass(dropdown, 'show');
                scrollTo(el);
            });

            // Create a new list of times.
            var i, newHour, newHalfHour, amPm;
            for (i = 0; i < 24; i++){
                hour = i < 13 ? i : i -12;
                amPm = i >= 12 ? 'pm' : 'am';

                newHour = document.createElement('li');
                newHour.innerHTML = hour + ':00' + amPm;

                newHalfHour = document.createElement('li');
                newHalfHour.innerHTML = hour + ':30' + amPm;

                timeList.appendChild(newHour);
                timeList.appendChild(newHalfHour);
            }

            var allTimes = timeList.querySelectorAll('li');

            OC.$.addListener(allTimes, 'mousedown', function(event){
                el.value = event.target.innerHTML;
                if (callback) callback(event.target);
            });

            OC.$.addListener(el, 'blur', function(event){
                OC.$.removeClass(dropdown, 'show');
            });

            return {
                el: dropdown,
                scrollTo: scrollTo
            };
        },

        clearTimepickers: function(){
            var existingTimepickers = document.body.querySelectorAll('.oc-timepicker'), i;

            for (i = 0; i < existingTimepickers.length; i++)
                existingTimepickers[i].parentNode.removeChild(existingTimepickers[i]);
        },

        status: {
            init: function(){
                // Create the message box.
                var statusBox = document.createElement('div');
                statusBox.className = 'status';

                document.body.appendChild(statusBox);
            
                // Place the message box.
                statusBox.style.top = window.innerHeight + 15 + 'px';
                statusBox.style.left = document.querySelector(
                    '.content-panel-body-wrapper').offsetLeft + 'px';

                return statusBox;
            },
            get: function(){
                // Check if message box exists.
                var statusBox = document.querySelector('.status');
                if (!statusBox) statusBox = OC.utils.status.init();
                return statusBox;
            },
            show: function(){
                var statusBox = document.querySelector('.status');
                statusBox.style.top = (window.innerHeight - 75) + 'px';
                statusBox.style.opacity = 0.5;
            },
            hide: function(){
                var statusBox = document.querySelector('.status');
                statusBox.style.top = window.innerHeight + 15 + 'px';
                statusBox.style.opacity = 0;
            },
            saving: function(){
                OC.utils.status.get().innerHTML = 'Saving...';
                OC.utils.status.show();
            },
            saved: function(){
                OC.utils.status.get().innerHTML = 'Saved';

                setTimeout(function(){
                    OC.utils.status.hide();
                }, 5000);
            }
        },
        slugify: function(text){
            return text.toLowerCase()
                .replace(/[^\w ]+/g,'')
                .replace(/ +/g,'-');
        },

        post: function(options){
            require(['post'], function(Post){
                if (OC.config.user.id) Post.init(options);
                /*else {
                    var message = 'To post something into the community, you must ' +
                    'login or create a free account (takes 30 seconds!).';
                    OC.launchSignupDialog(message, function(response){
                        Post.init(options);
                    });
                }*/
            });
        },

        tip: function(el, options){
            options = options || { gravity: 'n' };

            // Create the tooltip elements.
            var tipWrapper = document.createElement('div'),
                tipBody = document.createElement('div'),
                tipArrow = document.createElement('div');

            OC.$.addClass(tipWrapper, 'tip-wrapper');
            OC.$.addClass(tipBody, 'tip-body');
            OC.$.addClass(tipArrow, 'tip-arrow');

            // Set the contents of the tip.
            tipBody.innerHTML = el.title;
            el.title = '';

            switch (options.gravity){
                case 'n':
                    tipWrapper.appendChild(tipBody);
                    tipWrapper.appendChild(tipArrow);
                    break;

                case 's':
                    OC.$.addClass(tipArrow, 'tip-arrow-south');
                    tipWrapper.appendChild(tipArrow);

                    OC.$.addClass(tipBody, 'tip-body-south');
                    tipWrapper.appendChild(tipBody);
                    break;

                case 'e':
                    OC.$.addClass(tipArrow, 'tip-arrow-east');
                    tipWrapper.appendChild(tipArrow);

                    OC.$.addClass(tipBody, 'tip-body-east');
                    tipWrapper.appendChild(tipBody);
                    break;

                default:
            }

            document.body.appendChild(tipWrapper);
            tipWrapper = document.querySelector('.tip-wrapper:last-child');
            tipArrow = tipWrapper.querySelector('.tip-arrow');

            // Temporarily show the element to capture its height.
            OC.$.addClass(tipWrapper, 'show');
            var tipHeight = tipWrapper.offsetHeight,
                tipWidth = tipWrapper.offsetWidth,
                tipArrowHeight = tipArrow.offsetHeight;
            OC.$.removeClass(tipWrapper, 'show');

            // Absolutely position to tip.
            function position(){
                switch (options.gravity){
                    case 'n':
                        tipWrapper.style.top = el.getBoundingClientRect().top - tipHeight + 'px';
                        tipWrapper.style.left = el.getBoundingClientRect().left + (
                            (el.offsetWidth - tipWidth) / 2) + 'px';
                        break;

                    case 's':
                        tipWrapper.style.top = el.getBoundingClientRect().top + el.offsetHeight + 'px';
                        tipWrapper.style.left = el.getBoundingClientRect().left + (
                            (el.offsetWidth - tipWidth) / 2) + 'px';
                        break;

                    case 'e':
                        tipWrapper.style.top = el.getBoundingClientRect().top + (
                            (el.offsetHeight - tipHeight) / 2) + 'px';

                        tipWrapper.style.left = el.getBoundingClientRect().left + el.offsetWidth + 'px';

                        tipArrow.style.marginTop = ((tipHeight - tipArrowHeight) / 2) + 'px';
                        break;

                    default:
                }
            }

            position();
            window.addEventListener('resize', position);

            // Bind to the element hover to the tip display.
            OC.$.addListener(el, 'mouseenter', function(event){
                OC.$.addClass(tipWrapper, 'show');
            });
            OC.$.addListener(el, 'mouseleave', function(event){
                OC.$.removeClass(tipWrapper, 'show');
            });
            OC.$.addListener(el, 'click', function(event){
                OC.$.removeClass(tipWrapper, 'show');
            });

            return {
                el: el,
                reposition: position
            };
        },

        getCookie: function(cname) {
            var name = cname + "=";
            var ca = document.cookie.split(';');
            for(var i=0; i<ca.length; i++) {
                var c = ca[i];
                while (c.charAt(0) === ' ') c = c.substring(1);
                if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
            }
            return null;
        }

    };

    // Initialize site-wide elements.
    OC.utils.messageBox.init();

    return OC;
});
