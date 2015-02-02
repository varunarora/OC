define(['react', 'core_light', 'hogan'],  function(React, OC, Hogan){
    var _spinner;
    return {
        itemDraggable: function(element, wrapperSelector, parentSelector, text, callback){
            var parent = document.querySelector('.' + parentSelector);
            
            // Create movable clones if don't exist.
            var movableClones = document.querySelector('.movable-clones');

            if (! movableClones){
                movableClones = document.createElement('div');
                movableClones.className = 'movable-clones';
                document.body.insertBefore(movableClones, document.body.firstChild);
            }

            OC.$.addListener(element, 'mousedown', function(event){
                var originalElement = event.target,
                    elementShadow = document.createElement('div');

                elementShadow.innerHTML = text;
                elementShadow.className = 'movable-clone';

                movableClones.appendChild(elementShadow);

                var clones = document.querySelectorAll('.movable-clones div.movable-clone'),
                    newElement = clones[clones.length - 1];

                // And place it in the hidden clone DOM element.
                newElement.style.top = originalElement.offsetTop + 'px';
                newElement.style.left = originalElement.offsetLeft + 'px';

                OC.$.addClass(newElement, 'float');

                var newElHeight = OC.$.outerHeight(event.target),
                    newElWidth = OC.$.outerHeight(event.target),
                    newElY = event.target.offsetTop + newElHeight - event.pageY,
                    newElX = event.target.offsetLeft + newElWidth - event.pageX;

                // Establish the user items' frame.
                var droppableElement = OC.$.parents(originalElement, wrapperSelector);
                /*var droppableFrame = {
                    top: droppableElement.offsetTop,
                    bottom: droppableElement.offsetTop + OC.$.outerHeight(droppableElement),
                    left: droppableElement.offsetLeft,
                    right: OC.$.css(droppableElement, 'width')
                };*/

                OC.$.addClass(droppableElement, 'accepting');
                var elementBeingHoveredOver, acceptingElement;

                var moveElement = OC.$.parents(event.target, 'content-panel-wrapper');

                function onMouseMove(event){
                    OC.$.addClass(newElement, 'draggable-shadow');

                    var draggableShadow = document.querySelector('.draggable-shadow');
                    draggableShadow.style.top = event.pageY + newElY - newElHeight + 'px';
                    draggableShadow.style.left = event.pageX + newElX - newElWidth + 20 + 'px';

                    OC.$.removeClass(parent, 'accepting');
                    elementBeingHoveredOver = OC.$.parents(event.target, parentSelector);

                    if (elementBeingHoveredOver){
                        if (! elementBeingHoveredOver.contains(element)) {
                            if (elementBeingHoveredOver) OC.$.addClass(elementBeingHoveredOver, 'accepting');
                        }
                    }
                }

                function onMouseUp(event){
                    OC.$.removeClass(newElement, 'draggable-shadow');

                    acceptingElement = document.querySelector('.' + parentSelector + '.accepting');

                    if (acceptingElement){
                        callback(acceptingElement);
                        //originalElement.fadeOut('slow');
                    }
                    newElement.parentNode.removeChild(newElement);

                    moveElement.removeEventListener('mousemove', onMouseMove);
                    moveElement.removeEventListener('mouseup', onMouseUp);

                    OC.$.removeClass(droppableElement, 'accepting');
                    OC.$.removeClass(parent, 'accepting');
                }

                OC.$.addListener(
                    OC.$.addListener(moveElement, 'mousemove', onMouseMove),
                    'mouseup', onMouseUp);

                event.preventDefault();
            });
        },

        clearStatusFocus: function(){
            $('.light-popup-background').removeClass('show-popup-background');
        },

        metaTitles: {
            'methodology': 'Methodology',
            'how': 'The \'How\'',
            'wordwall': 'Word Wall Must Haves',
            'prerequisites': 'Pre-requisites',
            'ccss': 'Common Core State Standards',
            'content': 'Standards for Mathematical Content',
            'practices': 'Standards for Mathematical Practice',
            'big-idea': 'Big Idea',
            'essential-understandings': 'Enduring Understandings',
            'language-objectives-supports': 'Language Objectives and Supports'
        },

        metaOrder: ['methodology', 'how', 'wordwall', 'prerequisite'],

        suggestionTemplate: React.createClass({
            render: function(){
                return React.DOM.div({
                    className: 'explorer-suggest-resources-listing-item',
                    id: 'resource-' + this.props.id
                }, [
                    React.DOM.div({
                        className: 'explorer-suggest-resources-listing-item-thumbnail',
                        style: {
                            backgroundImage: 'url(\'' + this.props.thumbnail + '\')'
                        }
                    }),
                    React.DOM.div({className: 'explorer-suggest-resources-listing-item-content'}, [
                        React.DOM.a({
                            className: 'explorer-suggest-resources-listing-item-content-title',
                            target: '_blank',
                            href: this.props.url
                        }, this.props.title),
                        React.DOM.div({className: 'explorer-suggest-resources-listing-item-content'},
                            this.props.description)
                    ]),
                    React.DOM.div({className: 'explorer-suggest-resources-listing-item-actions'}, [
                        React.DOM.button({className: 'action-button explorer-suggest-resources-listing-item-action-keep'},
                            'Keep'),
                        React.DOM.button({className: 'action-button secondary-button explorer-suggest-resources-listing-item-action-hide'},
                            'Hide')
                    ])
                ]);
            }
        }),

        cachedResources: [],

        openResourcePreview: function(curriculum_resource_id, title, thumbnail, url, type){
            var previewWrapper = document.querySelector('.explorer-resource-preview-wrapper'),
                favorite = document.querySelector('.explorer-resource-actions-favorite'),
                resourceBody = document.querySelector('.explorer-resource-body');

            function close(){
                OC.$.removeClass(document.querySelector('.popup-background'), 'show-popup-background');
                OC.$.removeClass(previewWrapper, 'show');
            }

            function favoriteResource(event){
                require(['atomic'], function(atomic){
                    atomic.get('/curriculum/api/favorite/' + curriculum_resource_id + '/')
                    .success(function(response, xhr){
                        OC.$.toggleClass(favorite, 'favorited');
                    });
                });
            }

            function bindFavorite(){
                favorite.removeEventListener('click', favoriteResource);
                OC.$.addListener(favorite, 'click', favoriteResource);
            }

            function renderResponse(response){
                document.querySelector('.explorer-resource-header-title').innerHTML = title;
                document.querySelector('.explorer-resource-header-thumbnail').style.backgroundImage = (
                    'url(\'' + thumbnail + '\')');
                document.querySelector('.explorer-resource-actions-open').href = url;

                resourceBody.innerHTML = response;
                OC.$.addClass(resourceBody, 'show');

                OC.$.addClass(document.querySelector('.explorer-resource-preview'), 'show');

                // Bind favorite.
                bindFavorite();
            }

            OC.$.addClass(document.querySelector('.popup-background'), 'show-popup-background');
            OC.$.addClass(previewWrapper, 'show');

            if (! _spinner){
                var options = {
                    lines: 15, // The number of lines to draw
                    length: 6, // The length of each line
                    width: 3, // The line thickness
                    radius: 8, // The radius of the inner circle
                    corners: 0.9, // Corner roundness (0..1)
                    rotate: 75, // The rotation offset
                    direction: 1, // 1: clockwise, -1: counterclockwise
                    color: '#fff', // #rgb or #rrggbb or array of colors
                    speed: 1, // Rounds per second
                    trail: 79, // Afterglow percentage
                    shadow: false, // Whether to render a shadow
                    hwaccel: false, // Whether to use hardware acceleration
                    className: 'spinner', // The CSS class to assign to the spinner
                    zIndex: 12, // The z-index (defaults to 2000000000)
                    top: '50%', // Top position relative to parent
                    left: '50%' // Left position relative to parent
                };
                require(['spin'], function(Spinner){
                    _spinner = new Spinner(options).spin(previewWrapper);
                });
            
                // Also setup the tooltips.
                var i, els = document.querySelectorAll('.explorer-resource-actions div, a');
                for (i = 0; i < els.length; i++){
                    // TODO: Turn this into gravity: 'w'
                    OC.utils.tip(els[i]);
                }
            } else _spinner.spin(previewWrapper);

            // Fetch the resource from the server.
            resourceBody.innerHTML = '';

            var sectionTemplate = Hogan.compile(
                '<div class="reference-preview-wrapper">' +
                    '<div class="reference-preview-thumbnail" style="background-image: url(\'{{thumbnail}}\');"></div>' +
                    '<div class="reference-preview-contents">' +
                        '<h2>{{textbook_title}}</h2>' +
                        '<h3>Chapter {{chapter}}: {{title}}</h3>' +
                        '<h3>Section {{section}}</h3>' +
                        '<p>No digital preview available.</p>' +
                    '</div>' +
                '</div>');

            var pagesTemplate = Hogan.compile(
                '<div class="reference-preview-wrapper">' +
                    '<div class="reference-preview-thumbnail" style="background-image: url(\'{{thumbnail}}\');"></div>' +
                    '<div class="reference-preview-contents">' +
                        '<h2>{{textbook_title}}</h2>' +
                        '<h3>Pages: {{begin}} - {{end}}</h3>' +
                        '<p>No digital preview available.</p>' +
                    '</div>' +
                '</div>');

            var excerptsTemplate = function(props){
                excerpts = _.reduce(props.excerpts, function(memo, value){
                    return memo ? memo + ', ' + value: value; });

                props._excerpts = excerpts;

                return Hogan.compile(
                '<div class="reference-preview-wrapper">' +
                    '<div class="reference-preview-thumbnail" style="background-image: url(\'{{thumbnail}}\');"></div>' +
                    '<div class="reference-preview-contents">' +
                        '<h2>{{textbook_title}}</h2>' +
                        '<h3>{{_excerpts}}</h3>' +
                        '<p>No digital preview available.</p>' +
                    '</div>' +
                '</div>')(props);
            };

            var excerptTemplate = Hogan.compile(
                '<div class="reference-preview-wrapper">' +
                    '<div class="reference-preview-thumbnail" style="background-image: url(\'{{thumbnail}}\');"></div>' +
                    '<div class="reference-preview-contents">' +
                        '<h2>{{textbook_title}}</h2>' +
                        '<h3>{{excerpt}}</h3>' +
                        '<p>No digital preview available.</p>' +
                    '</div>' +
                '</div>');

            var contents = document.querySelector('.explorer-resource-contents');

            if (type == 'reference'){
                require(['atomic'], function(atomic){
                    atomic.get('/curriculum/api/reference/' + curriculum_resource_id + '/')
                    .success(function(response, xhr){
                        if (_spinner) _spinner.stop();

                        if (response.type == 'chapter-section'){
                            renderResponse(sectionTemplate.render(response));
                        }
                        
                        if (response.type == 'pages'){
                            renderResponse(pagesTemplate.render(response));
                        }
                        
                        if (response.type == 'excerpts'){
                            renderResponse(excerptsTemplate.render(response));
                        }

                        if (response.type == 'excerpt'){
                            renderResponse(excerptsTemplate.render(response));
                        }

                        OC.$.removeClass(contents, 'foreign-resource');
                        OC.$.addClass(contents, 'reference-resource');
                    });
                });
            } else {
                require(['atomic'], function(atomic){
                    // HTML input.
                    atomic.get('/curriculum/api/resource-view/' + curriculum_resource_id + '/')
                    .success(function(response, xhr){
                        if (_spinner) _spinner.stop();

                        if (type == 'pdf'){
                            OC.config.pdfjs = true;
                            OC.$.addClass(resourceBody, 'pdf');
                        }
                        
                        OC.$.removeClass(contents, 'reference-resource');
                        OC.$.addClass(contents, 'foreign-resource');
                        renderResponse(response);

                        if (type == 'document'){
                            require(['mathjax'], function(MathJax){
                                MathJax.Hub.Queue(["Typeset",MathJax.Hub,"document-body"]);
                            });
                        }
                    });
                });
            }

            var closeEl = document.querySelector('.explorer-resource-actions-close');
            closeEl.removeEventListener('click', close);
            OC.$.addListener(closeEl, 'click', close);

            OC.$.addListener(document, 'keyup', function(event) {
                if (previewWrapper.hasClass('show')){
                    if (event.which == 27) { // 'Esc' on keyboard
                        close();
                    }
                }
            });
        }
    };
});