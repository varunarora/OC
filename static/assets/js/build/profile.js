/**
 * Timeago is a jQuery plugin that makes it easy to support automatically
 * updating fuzzy timestamps (e.g. "4 minutes ago" or "about 1 day ago").
 *
 * @name timeago
 * @version 1.4.1
 * @requires jQuery v1.2.3+
 * @author Ryan McGeary
 * @license MIT License - http://www.opensource.org/licenses/mit-license.php
 *
 * For usage and examples, visit:
 * http://timeago.yarp.com/
 *
 * Copyright (c) 2008-2013, Ryan McGeary (ryan -[at]- mcgeary [*dot*] org)
 */

!function(e){"function"==typeof define&&define.amd?define("timeago",["jquery"],e):e(jQuery)}(function(e){function t(){var t=i(this),d=o.settings;return isNaN(t.datetime)||(0==d.cutoff||Math.abs(r(t.datetime))<d.cutoff)&&e(this).text(a(t.datetime)),this}function i(t){if(t=e(t),!t.data("timeago")){t.data("timeago",{datetime:o.datetime(t)});var i=e.trim(t.text());o.settings.localeTitle?t.attr("title",t.data("timeago").datetime.toLocaleString()):!(i.length>0)||o.isTime(t)&&t.attr("title")||t.attr("title",i)}return t.data("timeago")}function a(e){return o.inWords(r(e))}function r(e){return(new Date).getTime()-e.getTime()}e.timeago=function(t){return a(t instanceof Date?t:"string"==typeof t?e.timeago.parse(t):"number"==typeof t?new Date(t):e.timeago.datetime(t))};var o=e.timeago;e.extend(e.timeago,{settings:{refreshMillis:6e4,allowPast:!0,allowFuture:!1,localeTitle:!1,cutoff:0,strings:{prefixAgo:null,prefixFromNow:null,suffixAgo:"ago",suffixFromNow:"from now",inPast:"any moment now",seconds:"less than a minute",minute:"about a minute",minutes:"%d minutes",hour:"about an hour",hours:"about %d hours",day:"a day",days:"%d days",month:"about a month",months:"%d months",year:"about a year",years:"%d years",wordSeparator:" ",numbers:[]}},inWords:function(t){function i(i,r){var o=e.isFunction(i)?i(r,t):i,d=a.numbers&&a.numbers[r]||r;return o.replace(/%d/i,d)}if(!this.settings.allowPast&&!this.settings.allowFuture)throw"timeago allowPast and allowFuture settings can not both be set to false.";var a=this.settings.strings,r=a.prefixAgo,o=a.suffixAgo;if(this.settings.allowFuture&&0>t&&(r=a.prefixFromNow,o=a.suffixFromNow),!this.settings.allowPast&&t>=0)return this.settings.strings.inPast;var d=Math.abs(t)/1e3,n=d/60,s=n/60,l=s/24,m=l/365,f=45>d&&i(a.seconds,Math.round(d))||90>d&&i(a.minute,1)||45>n&&i(a.minutes,Math.round(n))||90>n&&i(a.hour,1)||24>s&&i(a.hours,Math.round(s))||42>s&&i(a.day,1)||30>l&&i(a.days,Math.round(l))||45>l&&i(a.month,1)||365>l&&i(a.months,Math.round(l/30))||1.5>m&&i(a.year,1)||i(a.years,Math.round(m)),u=a.wordSeparator||"";return void 0===a.wordSeparator&&(u=" "),e.trim([r,f,o].join(u))},parse:function(t){var i=e.trim(t);return i=i.replace(/\.\d+/,""),i=i.replace(/-/,"/").replace(/-/,"/"),i=i.replace(/T/," ").replace(/Z/," UTC"),i=i.replace(/([\+\-]\d\d)\:?(\d\d)/," $1$2"),i=i.replace(/([\+\-]\d\d)$/," $100"),new Date(i)},datetime:function(t){var i=e(t).attr(o.isTime(t)?"datetime":"title");return o.parse(i)},isTime:function(t){return"time"===e(t).get(0).tagName.toLowerCase()}});var d={init:function(){var i=e.proxy(t,this);i();var a=o.settings;a.refreshMillis>0&&(this._timeagoInterval=setInterval(i,a.refreshMillis))},update:function(i){var a=o.parse(i);e(this).data("timeago",{datetime:a}),o.settings.localeTitle&&e(this).attr("title",a.toLocaleString()),t.apply(this)},updateFromDOM:function(){e(this).data("timeago",{datetime:o.parse(e(this).attr(o.isTime(this)?"datetime":"title"))}),t.apply(this)},dispose:function(){this._timeagoInterval&&(window.clearInterval(this._timeagoInterval),this._timeagoInterval=null)}};e.fn.timeago=function(e,t){var i=e?d[e]:d.init;if(!i)throw new Error("Unknown function name '"+e+"' for timeago");return this.each(function(){i.call(this,t)}),this},document.createElement("abbr"),document.createElement("time")}),define("feed",["jquery","underscore","timeago"],function(e,t){t.extend(OC.feed,{wrapper:t.template('<div class="user feed-item"><a href="<%= actor_url %>" class="user-photo" style="background-image: url(\'<%= actor_thumbnail %>\');" title="<%= actor_name %>"></a><div class="user-description"><a href="<%= actor_url %>"><%= actor_name %></a> <%= feed_body %></div></div>'),date:t.template(' <span class="feed-item-date" title="<%= target_created %>"></span>'),url:t.template('<a href="<%= target_url %>"><%= target %></a>'),userURL:t.template('<a href="<%= target_user_url %>"><%= target_user %></a>'),urlItem:t.template('<div class="oer-external feed-oer-external" style="background-image: url(\'<%= target_thumbnail %>\');"><div id="oer-info"><div id="oer-details"><ul><li><span class="oer-info-caption">URL:</span> <span class="oer-info-detail"><a href="<%= target_direct_url %>"><%= target_direct_url_trimmed %>...</a></span></li><li><span class="oer-info-caption">License:</span> <span class="oer-info-detail"> <%= target_license %></span></li><li><span class="oer-info-caption">Posted on:</span> <span class="oer-info-detail"> <%= target_created %></span></li></ul></div><div id="oer-get"><a href="<%= target_direct_url %>" target="_blank"><button class="action-button">Open website</button></a></div></div></div>'),videoItem:t.template('<div class="oer-video feed-oer-video"><% if (target_provider === \'youtube\'){ %><iframe width="475" height="267" src="http://www.youtube.com/embed/<%= target_video_tag %>?wmode=opaque" frameborder="0" allowfullscreen></iframe><% } else if (target_provider === \'vimeo\'){ %><iframe src="http://player.vimeo.com/video/<%= target_video_tag %>?title=0&amp;byline=0&amp;portrait=0&amp;badge=0&amp;color=ffffff"width="475" height="267" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe><% } %></div>'),uploadItem:t.template('<div class="activity-object-wrapper"><div class="user-photo" style="background-image: url(\'<%= target_thumbnail %>\');"></div><div class="user-description"><a href="<%= target_url %>"><%= target_title %></a><br/><a href="<%= target_download_url %>" target="_blank">Download</a> &#183; <%= target_size %></div></div>'),commentItem:t.template('<div class="activity-object-wrapper"><blockquote>"<%= action %>"</blockquote></div>'),newPost:t.template('<a href="<%= target_url %>">new post</a>'),group:t.template('<a href="<%= context_url %>"><%= context %></a>. '),newGroup:t.template('<a href="<%= action_url %>"><%= action %></a>. '),membership:t.template('<a href="<%= target_url %>"><%= target %></a>. '),post:t.template('<a href="<%= target_url %>">discussion post</a>'),discussionItem:t.template('<div class="activity-object-wrapper"><div class="user-photo" style="background-image: url(\'<%= target_user_thumbnail %>\');"></div><div class="user-description"><a href="<%= target_user_url %>"><%= target_user %></a><%= target %><blockquote>"<%= action %>"</blockquote></div></div>'),groupItem:t.template('<div class="activity-project-wrapper"><div class="projects-item"><a href="<%= target_url %>" title="<%= target_description %>"><div style="background-image: url(\'<%= target_thumbnail %>\'); background-position: <%= target_thumbnail_position[0] %>% <%= target_thumbnail_position[1] %>%;" class="profile-projects-item-description-wrapper"><div class="profile-projects-item-description"><div class="profile-projects-item-title bold"><%= target %></div></div></div></a></div></div>'),infiniteScroll:function(){if(OC.feed.feedCount>10&&OC.config.user.id){var t,i=e(".lazy-load-button");e(".home-profile-content").on("DOMContentLoaded load resize scroll",function(){e.contains(document,i[0])&&isElementInViewport(i)&&!i.hasClass("loading")&&(i.addClass("loading"),e.get("/user/api/load-feed/"+OC.config.profile.id+"/from/"+OC.feed.currentCount+"/",function(a){if("true"==a.status){var r=Object.keys(a.feeds);if(0!==r.length){var o;for(t=0;t<r.length;t++)o=OC.feed.buildFeedItem(a.feeds[r[t]]),e(".feed-list").append(o),newAppendedFeedItem=e(".feed-list .feed-item:last"),e(".feed-item-date",newAppendedFeedItem).timeago();OC.feed.currentCount+=r.length}else i.remove()}else OC.popup(a.message,a.title);i.removeClass("loading")},"json"))})}},buildFeedItem:function(e){if(feed_item_body="","resource"===e.action_type)"url"==e.target_type?(feed_item_body+="created a new link ",feed_item_body+=OC.feed.url(e),feed_item_body+=OC.feed.date(e),e.target_direct_url_trimmed=e.target_direct_url.substring(0,30),feed_item_body+=OC.feed.urlItem(e)):"document"==e.target_type?(feed_item_body+="created a new document ",feed_item_body+=OC.feed.url(e),feed_item_body+=OC.feed.date(e)):"video"==e.target_type?(feed_item_body+="created a video link ",feed_item_body+=OC.feed.url(e),feed_item_body+=OC.feed.date(e),feed_item_body+=OC.feed.videoItem(e)):"attachment"==e.target_type&&(feed_item_body+="uploaded a new file. ",feed_item_body+=OC.feed.date(e),feed_item_body+=OC.feed.uploadItem(e));else if("comment"===e.action_type)if("resource"===e.target_type)feed_item_body+="commented on the resource ",feed_item_body+=OC.feed.url(e),feed_item_body+=OC.feed.commentItem(e);else if("comment"===e.target_type)e.action_id===e.target_id?(feed_item_body+="wrote a ",feed_item_body+=OC.feed.newPost(e),feed_item_body+=" in ",feed_item_body+=OC.feed.group(e),feed_item_body+=OC.feed.date(e),feed_item_body+=OC.feed.commentItem(e)):(feed_item_body+="commented on a ",feed_item_body+=OC.feed.post(e),feed_item_body+=" in ",feed_item_body+=OC.feed.group(e),feed_item_body+=OC.feed.date(e),feed_item_body+=OC.feed.discussionItem(e));else if("membership"===e.action_type)feed_item_body+="just joined the group ",feed_item_body+=OC.feed.membership(e),feed_item_body+=OC.feed.date(e),feed_item_body+=OC.feed.groupItem(e);else if("project"===e.action_type)feed_item_body+="created the group ",feed_item_body+=OC.feed.membership(e),feed_item_body+=OC.feed.date(e),e.target=e.action,e.target_url=e.action_url,e.target_description=e.action_description,e.target_thumbnail=e.action_thumbnail,e.target_thumbnail_position=e.action_thumbnail_position,feed_item_body+=OC.feed.groupItem(e);else if("favorite"===e.action_type)switch(feed_item_body+="favorited ",feed_item_body+=OC.feed.userURL(e),feed_item_body+="'s resource ",feed_item_body+=OC.feed.url(e),feed_item_body=OC.feed.date(e),e.target_type){case"url":e.target_direct_url_trimmed=e.target_direct_url.substring(0,30),feed_item_body+=OC.feed.urlItem(e);break;case"video":feed_item_body+=OC.feed.videoItem(e);break;case"attachment":feed_item_body+=OC.feed.uploadItem(e)}else"favorite"===e.action_type&&(feed_item_body+="created a folder ",feed_item_body+=OC.feed.url(e),feed_item_body+=OC.feed.date(e));return e.feed_body=feed_item_body,feed_item_html=OC.feed.wrapper(e)}})}),define("profile",["jquery","core","feed"],function(e,t){e(document).ready(function(e){t.feed.infiniteScroll(),e(".feed-item-date").timeago(),e(".youtube-video-placeholder").click(function(){var t=e(this),i=t.css("height"),a=t.css("width"),r=t.attr("name"),o=e("<iframe/>",{height:i,width:a,frameborder:0,allowfullscreen:!0,src:"http://www.youtube.com/embed/"+r+"?wmode=opaque&autoplay=1"});t.replaceWith(o)})})});