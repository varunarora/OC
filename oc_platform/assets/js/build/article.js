define(["jquery","core","tipsy","mathjax"],function(e){OC.article={zoomBlock:e("<div/>",{"class":"image-zoom"}),initImages:function(){OC.article.createTheaterContainer(),OC.article.attachEscapeTheaterHandler(),e(OC.config.article.image).load(function(){OC.article.resizeArticleImage(e(this)),OC.article.prepareImageTheater(e(this))})},prepareImageTheater:function(e){var a=OC.article.zoomBlock.clone();a.insertAfter(e),a.css("left",e.width()-a.width()-8),e.mouseover(function(){a.addClass("show-zoom")}).mouseleave(function(){a.removeClass("show-zoom")}),e.click(OC.article.launchImageTheater),a.click(function(){e.click()})},launchImageTheater:function(){function a(a){var t=e(window).width(),i=e(window).height();e(".image-theater").css("left",(t-a.width())/2),e(".image-theater").css("top",(i-a.height())/2)}var t=this;e(".image-theater-background").addClass("show-image-theater-background"),e(".image-theater").addClass("show-image-theater");var i=e("<img/>",{src:t.src});e(".image-theater img").remove(),e(".image-theater").append(i),e(".image-theater").height(i.height()),e(".image-theater").width(i.width()),a(i),e(window).resize(function(){a(i)}),e(".image-theater-background").click(function(){OC.article.closeImageTheater()})},closeImageTheater:function(){e(".image-theater").removeClass("show-image-theater"),e(".image-theater-background").removeClass("show-image-theater-background")},attachEscapeTheaterHandler:function(){e(document).keyup(function(a){e(".image-theater").hasClass("show-image-theater")&&27==a.which&&OC.article.closeImageTheater()})},createTheaterContainer:function(){var a=e("<div/>",{"class":"image-theater"}),t=e("<div/>",{"class":"image-theater-background"}),i=e("<div/>",{"class":"close-image-theater",title:"Press Esc to close"});a.append(i),a.mouseover(function(){i.addClass("show-close-image-theater")}).mouseleave(function(){i.removeClass("show-close-image-theater")}),e(i).click(function(){OC.article.closeImageTheater()}),i.tipsy(),e("body").append(a),e("body").append(t)},resizeArticleImage:function(a){var t=e("<div/>"),i=e("<div/>"),r=e("<div/>"),s=a.attr("src"),c=s.lastIndexOf("/"),o=s.lastIndexOf("."),n=s.substring(c+1,o),h=a.width();t.addClass("img-caption"),i.addClass("img-caption-wrapper"),r.addClass("img-wrapper"),t.appendTo(i);var l=a.parent(),d=l.hasClass("scale-down"),m=!l.hasClass("no-figure");t.text(m?"Figure "+n+(a.attr("alt")&&": "+a.attr("alt")):a.attr("alt")),r.insertAfter(a);var g=e("body article").width(),u=.66*h;!d&&h>g||d&&u>g?a.css("width",g-25):d&&a.css("width",u),a.appendTo(r),i.appendTo(r)}},e(document).ready(function(){OC.article.initImages()})});