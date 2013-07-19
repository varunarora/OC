OC.article = {
    // Create a zoom button block element to the bottom right
    zoomBlock: $('<div/>', {
        'class': 'image-zoom'
    }),
    initImages: function(){
        OC.article.createTheaterContainer();

        OC.article.attachEscapeTheaterHandler();

        $(OC.config.article.image).load(function(){
            OC.article.resizeArticleImage($(this));

            OC.article.prepareImageTheater($(this));
        });
    },

    prepareImageTheater: function(image){
        // Create a clone of the zoom block element and place it after the event
        var imageZoomBlock = OC.article.zoomBlock.clone();
        imageZoomBlock.insertAfter(image);

        imageZoomBlock.css('left', image.width() - imageZoomBlock.width() - 8);

        // If we hover over the image, the zoomBlock appears
        image.mouseover(function(){
            imageZoomBlock.addClass('show-zoom');
        }).mouseleave(function(){
            imageZoomBlock.removeClass('show-zoom');
        });

        // Attach click handler to image
        image.click(OC.article.launchImageTheater);

        // Trigger a click on the image when the imageZoomBlock is clicked
        imageZoomBlock.click(function(){
            image.click();
        });
    },

    launchImageTheater: function(){
        function adjustTheaterPosition(image) {
            var windowWidth = $(window).width();
            var windowHeight = $(window).height();

            // With an assumption that the image is smaller than the window size
            $('.image-theater').css('left', (windowWidth - image.width()) / 2);
            $('.image-theater').css('top', (windowHeight - image.height()) / 2);
        }

        var imageToZoom = this;

        $('.image-theater-background').addClass(
            'show-image-theater-background');
        $('.image-theater').addClass('show-image-theater');

        // Make a copy of the original image clicked and place in this
        var imageCopy = $('<img/>', {
            'src': imageToZoom.src
        });

        // Clear previous image, if any
        $('.image-theater img').remove();
        $('.image-theater').append(imageCopy);

        // Set the positioning and height/width of the image theater
        $('.image-theater').height(imageCopy.height());
        $('.image-theater').width(imageCopy.width());

        adjustTheaterPosition(imageCopy);

        // On window resize, adjust the position of the theater
        $(window).resize(function(){
            adjustTheaterPosition(imageCopy);
        });

        $('.image-theater-background').click(function(){
            OC.article.closeImageTheater();
        });
    },

    closeImageTheater: function(){
        $('.image-theater').removeClass('show-image-theater');
        $('.image-theater-background').removeClass(
            'show-image-theater-background');
    },

    attachEscapeTheaterHandler: function(){
        $(document).keyup(function(event) {
            if ($('.image-theater').hasClass('show-image-theater')){
                if (event.which == 27) { // 'Esc' on keyboard
                    OC.article.closeImageTheater();
                }
            }
        });
    },

    createTheaterContainer: function(){
        var theaterContainer = $('<div/>', {
            'class': 'image-theater'
        });

        var theaterContainerBackground = $('<div/>', {
            'class': 'image-theater-background'
        });

        var closeTheaterButton = $('<div/>', {
            'class': 'close-image-theater',
            'title': 'Press Esc to close'
        });

        theaterContainer.append(closeTheaterButton);

        // If we hover over the image theater, the closeTheaterButton appears
        theaterContainer.mouseover(function(){
            closeTheaterButton.addClass('show-close-image-theater');
        }).mouseleave(function(){
            closeTheaterButton.removeClass('show-close-image-theater');
        });

        $(closeTheaterButton).click(function(){
            OC.article.closeImageTheater();
        });

        // Add a tipsy message on the closeTheaterButton
        closeTheaterButton.tipsy();

        $('body').append(theaterContainer);
        $('body').append(theaterContainerBackground);
    },

    resizeArticleImage: function(image) {
        // HACK: Because Webkit browsers do not compute image width until it is
        //     loaded, this hack may be used to make an in-memory copy of the
        //     image to compute the dimensions
        var imgCaption = $('<div/>'),
            imgCaptionWrapper = $('<div/>'),
            imgWrapper = $('<div/>'),
            imgSrc = image.attr('src'),
            lastIndexOfSlash = imgSrc.lastIndexOf('/'),
            lastIndexOfPeriod = imgSrc.lastIndexOf('.'),
            imgNum = imgSrc.substring(
                lastIndexOfSlash + 1, lastIndexOfPeriod),
            currentWidth = image.width();

        imgCaption.addClass('img-caption');
        imgCaptionWrapper.addClass('img-caption-wrapper');
        imgWrapper.addClass('img-wrapper');

        imgCaption.appendTo(imgCaptionWrapper);

        var imageParent = image.parent();
        var resizeImage = imageParent.hasClass('scale-down');
        var isFigure = !imageParent.hasClass('no-figure');

        if (isFigure) {
            imgCaption.text("Figure " + imgNum);
        } else {
            imgCaption.text('');
        }

        imgWrapper.insertAfter(image);

        if (resizeImage){
            image.css('width', currentWidth * 0.66);
        }

        image.appendTo(imgWrapper);
        imgCaptionWrapper.appendTo(imgWrapper);
    }

};

$(document).ready(function(){
    OC.article.initImages();
});