!function(t,e){if("function"==typeof define&&define.amd)define("backbone",["underscore","jquery","exports"],function(i,n,s){t.Backbone=e(t,s,i,n)});else if("undefined"!=typeof exports){var i=require("underscore");e(t,exports,i)}else t.Backbone=e(t,{},t._,t.jQuery||t.Zepto||t.ender||t.$)}(this,function(t,e,i,n){{var s=t.Backbone,r=[],o=(r.push,r.slice);r.splice}e.VERSION="1.1.2",e.$=n,e.noConflict=function(){return t.Backbone=s,this},e.emulateHTTP=!1,e.emulateJSON=!1;var a=e.Events={on:function(t,e,i){if(!l(this,"on",t,[e,i])||!e)return this;this._events||(this._events={});var n=this._events[t]||(this._events[t]=[]);return n.push({callback:e,context:i,ctx:i||this}),this},once:function(t,e,n){if(!l(this,"once",t,[e,n])||!e)return this;var s=this,r=i.once(function(){s.off(t,r),e.apply(this,arguments)});return r._callback=e,this.on(t,r,n)},off:function(t,e,n){var s,r,o,a,h,c,u,d;if(!this._events||!l(this,"off",t,[e,n]))return this;if(!t&&!e&&!n)return this._events=void 0,this;for(a=t?[t]:i.keys(this._events),h=0,c=a.length;c>h;h++)if(t=a[h],o=this._events[t]){if(this._events[t]=s=[],e||n)for(u=0,d=o.length;d>u;u++)r=o[u],(e&&e!==r.callback&&e!==r.callback._callback||n&&n!==r.context)&&s.push(r);s.length||delete this._events[t]}return this},trigger:function(t){if(!this._events)return this;var e=o.call(arguments,1);if(!l(this,"trigger",t,e))return this;var i=this._events[t],n=this._events.all;return i&&c(i,e),n&&c(n,arguments),this},stopListening:function(t,e,n){var s=this._listeningTo;if(!s)return this;var r=!e&&!n;n||"object"!=typeof e||(n=this),t&&((s={})[t._listenId]=t);for(var o in s)t=s[o],t.off(e,n,this),(r||i.isEmpty(t._events))&&delete this._listeningTo[o];return this}},h=/\s+/,l=function(t,e,i,n){if(!i)return!0;if("object"==typeof i){for(var s in i)t[e].apply(t,[s,i[s]].concat(n));return!1}if(h.test(i)){for(var r=i.split(h),o=0,a=r.length;a>o;o++)t[e].apply(t,[r[o]].concat(n));return!1}return!0},c=function(t,e){var i,n=-1,s=t.length,r=e[0],o=e[1],a=e[2];switch(e.length){case 0:for(;++n<s;)(i=t[n]).callback.call(i.ctx);return;case 1:for(;++n<s;)(i=t[n]).callback.call(i.ctx,r);return;case 2:for(;++n<s;)(i=t[n]).callback.call(i.ctx,r,o);return;case 3:for(;++n<s;)(i=t[n]).callback.call(i.ctx,r,o,a);return;default:for(;++n<s;)(i=t[n]).callback.apply(i.ctx,e);return}},u={listenTo:"on",listenToOnce:"once"};i.each(u,function(t,e){a[e]=function(e,n,s){var r=this._listeningTo||(this._listeningTo={}),o=e._listenId||(e._listenId=i.uniqueId("l"));return r[o]=e,s||"object"!=typeof n||(s=this),e[t](n,s,this),this}}),a.bind=a.on,a.unbind=a.off,i.extend(e,a);var d=e.Model=function(t,e){var n=t||{};e||(e={}),this.cid=i.uniqueId("c"),this.attributes={},e.collection&&(this.collection=e.collection),e.parse&&(n=this.parse(n,e)||{}),n=i.defaults({},n,i.result(this,"defaults")),this.set(n,e),this.changed={},this.initialize.apply(this,arguments)};i.extend(d.prototype,a,{changed:null,validationError:null,idAttribute:"id",initialize:function(){},toJSON:function(){return i.clone(this.attributes)},sync:function(){return e.sync.apply(this,arguments)},get:function(t){return this.attributes[t]},escape:function(t){return i.escape(this.get(t))},has:function(t){return null!=this.get(t)},set:function(t,e,n){var s,r,o,a,h,l,c,u;if(null==t)return this;if("object"==typeof t?(r=t,n=e):(r={})[t]=e,n||(n={}),!this._validate(r,n))return!1;o=n.unset,h=n.silent,a=[],l=this._changing,this._changing=!0,l||(this._previousAttributes=i.clone(this.attributes),this.changed={}),u=this.attributes,c=this._previousAttributes,this.idAttribute in r&&(this.id=r[this.idAttribute]);for(s in r)e=r[s],i.isEqual(u[s],e)||a.push(s),i.isEqual(c[s],e)?delete this.changed[s]:this.changed[s]=e,o?delete u[s]:u[s]=e;if(!h){a.length&&(this._pending=n);for(var d=0,f=a.length;f>d;d++)this.trigger("change:"+a[d],this,u[a[d]],n)}if(l)return this;if(!h)for(;this._pending;)n=this._pending,this._pending=!1,this.trigger("change",this,n);return this._pending=!1,this._changing=!1,this},unset:function(t,e){return this.set(t,void 0,i.extend({},e,{unset:!0}))},clear:function(t){var e={};for(var n in this.attributes)e[n]=void 0;return this.set(e,i.extend({},t,{unset:!0}))},hasChanged:function(t){return null==t?!i.isEmpty(this.changed):i.has(this.changed,t)},changedAttributes:function(t){if(!t)return this.hasChanged()?i.clone(this.changed):!1;var e,n=!1,s=this._changing?this._previousAttributes:this.attributes;for(var r in t)i.isEqual(s[r],e=t[r])||((n||(n={}))[r]=e);return n},previous:function(t){return null!=t&&this._previousAttributes?this._previousAttributes[t]:null},previousAttributes:function(){return i.clone(this._previousAttributes)},fetch:function(t){t=t?i.clone(t):{},void 0===t.parse&&(t.parse=!0);var e=this,n=t.success;return t.success=function(i){return e.set(e.parse(i,t),t)?(n&&n(e,i,t),void e.trigger("sync",e,i,t)):!1},V(this,t),this.sync("read",this,t)},save:function(t,e,n){var s,r,o,a=this.attributes;if(null==t||"object"==typeof t?(s=t,n=e):(s={})[t]=e,n=i.extend({validate:!0},n),s&&!n.wait){if(!this.set(s,n))return!1}else if(!this._validate(s,n))return!1;s&&n.wait&&(this.attributes=i.extend({},a,s)),void 0===n.parse&&(n.parse=!0);var h=this,l=n.success;return n.success=function(t){h.attributes=a;var e=h.parse(t,n);return n.wait&&(e=i.extend(s||{},e)),i.isObject(e)&&!h.set(e,n)?!1:(l&&l(h,t,n),void h.trigger("sync",h,t,n))},V(this,n),r=this.isNew()?"create":n.patch?"patch":"update","patch"===r&&(n.attrs=s),o=this.sync(r,this,n),s&&n.wait&&(this.attributes=a),o},destroy:function(t){t=t?i.clone(t):{};var e=this,n=t.success,s=function(){e.trigger("destroy",e,e.collection,t)};if(t.success=function(i){(t.wait||e.isNew())&&s(),n&&n(e,i,t),e.isNew()||e.trigger("sync",e,i,t)},this.isNew())return t.success(),!1;V(this,t);var r=this.sync("delete",this,t);return t.wait||s(),r},url:function(){var t=i.result(this,"urlRoot")||i.result(this.collection,"url")||j();return this.isNew()?t:t.replace(/([^\/])$/,"$1/")+encodeURIComponent(this.id)},parse:function(t){return t},clone:function(){return new this.constructor(this.attributes)},isNew:function(){return!this.has(this.idAttribute)},isValid:function(t){return this._validate({},i.extend(t||{},{validate:!0}))},_validate:function(t,e){if(!e.validate||!this.validate)return!0;t=i.extend({},this.attributes,t);var n=this.validationError=this.validate(t,e)||null;return n?(this.trigger("invalid",this,n,i.extend(e,{validationError:n})),!1):!0}});var f=["keys","values","pairs","invert","pick","omit"];i.each(f,function(t){d.prototype[t]=function(){var e=o.call(arguments);return e.unshift(this.attributes),i[t].apply(i,e)}});var p=e.Collection=function(t,e){e||(e={}),e.model&&(this.model=e.model),void 0!==e.comparator&&(this.comparator=e.comparator),this._reset(),this.initialize.apply(this,arguments),t&&this.reset(t,i.extend({silent:!0},e))},v={add:!0,remove:!0,merge:!0},g={add:!0,remove:!1};i.extend(p.prototype,a,{model:d,initialize:function(){},toJSON:function(t){return this.map(function(e){return e.toJSON(t)})},sync:function(){return e.sync.apply(this,arguments)},add:function(t,e){return this.set(t,i.extend({merge:!1},e,g))},remove:function(t,e){var n=!i.isArray(t);t=n?[t]:i.clone(t),e||(e={});var s,r,o,a;for(s=0,r=t.length;r>s;s++)a=t[s]=this.get(t[s]),a&&(delete this._byId[a.id],delete this._byId[a.cid],o=this.indexOf(a),this.models.splice(o,1),this.length--,e.silent||(e.index=o,a.trigger("remove",a,this,e)),this._removeReference(a,e));return n?t[0]:t},set:function(t,e){e=i.defaults({},e,v),e.parse&&(t=this.parse(t,e));var n=!i.isArray(t);t=n?t?[t]:[]:i.clone(t);var s,r,o,a,h,l,c,u=e.at,f=this.model,p=this.comparator&&null==u&&e.sort!==!1,g=i.isString(this.comparator)?this.comparator:null,m=[],y=[],b={},_=e.add,w=e.merge,x=e.remove,k=!p&&_&&x?[]:!1;for(s=0,r=t.length;r>s;s++){if(h=t[s]||{},o=h instanceof d?a=h:h[f.prototype.idAttribute||"id"],l=this.get(o))x&&(b[l.cid]=!0),w&&(h=h===a?a.attributes:h,e.parse&&(h=l.parse(h,e)),l.set(h,e),p&&!c&&l.hasChanged(g)&&(c=!0)),t[s]=l;else if(_){if(a=t[s]=this._prepareModel(h,e),!a)continue;m.push(a),this._addReference(a,e)}a=l||a,!k||!a.isNew()&&b[a.id]||k.push(a),b[a.id]=!0}if(x){for(s=0,r=this.length;r>s;++s)b[(a=this.models[s]).cid]||y.push(a);y.length&&this.remove(y,e)}if(m.length||k&&k.length)if(p&&(c=!0),this.length+=m.length,null!=u)for(s=0,r=m.length;r>s;s++)this.models.splice(u+s,0,m[s]);else{k&&(this.models.length=0);var E=k||m;for(s=0,r=E.length;r>s;s++)this.models.push(E[s])}if(c&&this.sort({silent:!0}),!e.silent){for(s=0,r=m.length;r>s;s++)(a=m[s]).trigger("add",a,this,e);(c||k&&k.length)&&this.trigger("sort",this,e)}return n?t[0]:t},reset:function(t,e){e||(e={});for(var n=0,s=this.models.length;s>n;n++)this._removeReference(this.models[n],e);return e.previousModels=this.models,this._reset(),t=this.add(t,i.extend({silent:!0},e)),e.silent||this.trigger("reset",this,e),t},push:function(t,e){return this.add(t,i.extend({at:this.length},e))},pop:function(t){var e=this.at(this.length-1);return this.remove(e,t),e},unshift:function(t,e){return this.add(t,i.extend({at:0},e))},shift:function(t){var e=this.at(0);return this.remove(e,t),e},slice:function(){return o.apply(this.models,arguments)},get:function(t){return null==t?void 0:this._byId[t]||this._byId[t.id]||this._byId[t.cid]},at:function(t){return this.models[t]},where:function(t,e){return i.isEmpty(t)?e?void 0:[]:this[e?"find":"filter"](function(e){for(var i in t)if(t[i]!==e.get(i))return!1;return!0})},findWhere:function(t){return this.where(t,!0)},sort:function(t){if(!this.comparator)throw new Error("Cannot sort a set without a comparator");return t||(t={}),i.isString(this.comparator)||1===this.comparator.length?this.models=this.sortBy(this.comparator,this):this.models.sort(i.bind(this.comparator,this)),t.silent||this.trigger("sort",this,t),this},pluck:function(t){return i.invoke(this.models,"get",t)},fetch:function(t){t=t?i.clone(t):{},void 0===t.parse&&(t.parse=!0);var e=t.success,n=this;return t.success=function(i){var s=t.reset?"reset":"set";n[s](i,t),e&&e(n,i,t),n.trigger("sync",n,i,t)},V(this,t),this.sync("read",this,t)},create:function(t,e){if(e=e?i.clone(e):{},!(t=this._prepareModel(t,e)))return!1;e.wait||this.add(t,e);var n=this,s=e.success;return e.success=function(t,i){e.wait&&n.add(t,e),s&&s(t,i,e)},t.save(null,e),t},parse:function(t){return t},clone:function(){return new this.constructor(this.models)},_reset:function(){this.length=0,this.models=[],this._byId={}},_prepareModel:function(t,e){if(t instanceof d)return t;e=e?i.clone(e):{},e.collection=this;var n=new this.model(t,e);return n.validationError?(this.trigger("invalid",this,n.validationError,e),!1):n},_addReference:function(t){this._byId[t.cid]=t,null!=t.id&&(this._byId[t.id]=t),t.collection||(t.collection=this),t.on("all",this._onModelEvent,this)},_removeReference:function(t){this===t.collection&&delete t.collection,t.off("all",this._onModelEvent,this)},_onModelEvent:function(t,e,i,n){("add"!==t&&"remove"!==t||i===this)&&("destroy"===t&&this.remove(e,n),e&&t==="change:"+e.idAttribute&&(delete this._byId[e.previous(e.idAttribute)],null!=e.id&&(this._byId[e.id]=e)),this.trigger.apply(this,arguments))}});var m=["forEach","each","map","collect","reduce","foldl","inject","reduceRight","foldr","find","detect","filter","select","reject","every","all","some","any","include","contains","invoke","max","min","toArray","size","first","head","take","initial","rest","tail","drop","last","without","difference","indexOf","shuffle","lastIndexOf","isEmpty","chain","sample"];i.each(m,function(t){p.prototype[t]=function(){var e=o.call(arguments);return e.unshift(this.models),i[t].apply(i,e)}});var y=["groupBy","countBy","sortBy","indexBy"];i.each(y,function(t){p.prototype[t]=function(e,n){var s=i.isFunction(e)?e:function(t){return t.get(e)};return i[t](this.models,s,n)}});var b=e.View=function(t){this.cid=i.uniqueId("view"),t||(t={}),i.extend(this,i.pick(t,w)),this._ensureElement(),this.initialize.apply(this,arguments),this.delegateEvents()},_=/^(\S+)\s*(.*)$/,w=["model","collection","el","id","attributes","className","tagName","events"];i.extend(b.prototype,a,{tagName:"div",$:function(t){return this.$el.find(t)},initialize:function(){},render:function(){return this},remove:function(){return this.$el.remove(),this.stopListening(),this},setElement:function(t,i){return this.$el&&this.undelegateEvents(),this.$el=t instanceof e.$?t:e.$(t),this.el=this.$el[0],i!==!1&&this.delegateEvents(),this},delegateEvents:function(t){if(!t&&!(t=i.result(this,"events")))return this;this.undelegateEvents();for(var e in t){var n=t[e];if(i.isFunction(n)||(n=this[t[e]]),n){var s=e.match(_),r=s[1],o=s[2];n=i.bind(n,this),r+=".delegateEvents"+this.cid,""===o?this.$el.on(r,n):this.$el.on(r,o,n)}}return this},undelegateEvents:function(){return this.$el.off(".delegateEvents"+this.cid),this},_ensureElement:function(){if(this.el)this.setElement(i.result(this,"el"),!1);else{var t=i.extend({},i.result(this,"attributes"));this.id&&(t.id=i.result(this,"id")),this.className&&(t["class"]=i.result(this,"className"));var n=e.$("<"+i.result(this,"tagName")+">").attr(t);this.setElement(n,!1)}}}),e.sync=function(t,n,s){var r=k[t];i.defaults(s||(s={}),{emulateHTTP:e.emulateHTTP,emulateJSON:e.emulateJSON});var o={type:r,dataType:"json"};if(s.url||(o.url=i.result(n,"url")||j()),null!=s.data||!n||"create"!==t&&"update"!==t&&"patch"!==t||(o.contentType="application/json",o.data=JSON.stringify(s.attrs||n.toJSON(s))),s.emulateJSON&&(o.contentType="application/x-www-form-urlencoded",o.data=o.data?{model:o.data}:{}),s.emulateHTTP&&("PUT"===r||"DELETE"===r||"PATCH"===r)){o.type="POST",s.emulateJSON&&(o.data._method=r);var a=s.beforeSend;s.beforeSend=function(t){return t.setRequestHeader("X-HTTP-Method-Override",r),a?a.apply(this,arguments):void 0}}"GET"===o.type||s.emulateJSON||(o.processData=!1),"PATCH"===o.type&&x&&(o.xhr=function(){return new ActiveXObject("Microsoft.XMLHTTP")});var h=s.xhr=e.ajax(i.extend(o,s));return n.trigger("request",n,h,s),h};var x=!("undefined"==typeof window||!window.ActiveXObject||window.XMLHttpRequest&&(new XMLHttpRequest).dispatchEvent),k={create:"POST",update:"PUT",patch:"PATCH","delete":"DELETE",read:"GET"};e.ajax=function(){return e.$.ajax.apply(e.$,arguments)};var E=e.Router=function(t){t||(t={}),t.routes&&(this.routes=t.routes),this._bindRoutes(),this.initialize.apply(this,arguments)},S=/\((.*?)\)/g,C=/(\(\?)?:\w+/g,$=/\*\w+/g,T=/[\-{}\[\]+?.,\\\^$|#\s]/g;i.extend(E.prototype,a,{initialize:function(){},route:function(t,n,s){i.isRegExp(t)||(t=this._routeToRegExp(t)),i.isFunction(n)&&(s=n,n=""),s||(s=this[n]);var r=this;return e.history.route(t,function(i){var o=r._extractParameters(t,i);r.execute(s,o),r.trigger.apply(r,["route:"+n].concat(o)),r.trigger("route",n,o),e.history.trigger("route",r,n,o)}),this},execute:function(t,e){t&&t.apply(this,e)},navigate:function(t,i){return e.history.navigate(t,i),this},_bindRoutes:function(){if(this.routes){this.routes=i.result(this,"routes");for(var t,e=i.keys(this.routes);null!=(t=e.pop());)this.route(t,this.routes[t])}},_routeToRegExp:function(t){return t=t.replace(T,"\\$&").replace(S,"(?:$1)?").replace(C,function(t,e){return e?t:"([^/?]+)"}).replace($,"([^?]*?)"),new RegExp("^"+t+"(?:\\?([\\s\\S]*))?$")},_extractParameters:function(t,e){var n=t.exec(e).slice(1);return i.map(n,function(t,e){return e===n.length-1?t||null:t?decodeURIComponent(t):null})}});var N=e.History=function(){this.handlers=[],i.bindAll(this,"checkUrl"),"undefined"!=typeof window&&(this.location=window.location,this.history=window.history)},R=/^[#\/]|\s+$/g,H=/^\/+|\/+$/g,I=/msie [\w.]+/,A=/\/$/,O=/#.*$/;N.started=!1,i.extend(N.prototype,a,{interval:50,atRoot:function(){return this.location.pathname.replace(/[^\/]$/,"$&/")===this.root},getHash:function(t){var e=(t||this).location.href.match(/#(.*)$/);return e?e[1]:""},getFragment:function(t,e){if(null==t)if(this._hasPushState||!this._wantsHashChange||e){t=decodeURI(this.location.pathname+this.location.search);var i=this.root.replace(A,"");t.indexOf(i)||(t=t.slice(i.length))}else t=this.getHash();return t.replace(R,"")},start:function(t){if(N.started)throw new Error("Backbone.history has already been started");N.started=!0,this.options=i.extend({root:"/"},this.options,t),this.root=this.options.root,this._wantsHashChange=this.options.hashChange!==!1,this._wantsPushState=!!this.options.pushState,this._hasPushState=!!(this.options.pushState&&this.history&&this.history.pushState);var n=this.getFragment(),s=document.documentMode,r=I.exec(navigator.userAgent.toLowerCase())&&(!s||7>=s);if(this.root=("/"+this.root+"/").replace(H,"/"),r&&this._wantsHashChange){var o=e.$('<iframe src="javascript:0" tabindex="-1">');this.iframe=o.hide().appendTo("body")[0].contentWindow,this.navigate(n)}this._hasPushState?e.$(window).on("popstate",this.checkUrl):this._wantsHashChange&&"onhashchange"in window&&!r?e.$(window).on("hashchange",this.checkUrl):this._wantsHashChange&&(this._checkUrlInterval=setInterval(this.checkUrl,this.interval)),this.fragment=n;var a=this.location;if(this._wantsHashChange&&this._wantsPushState){if(!this._hasPushState&&!this.atRoot())return this.fragment=this.getFragment(null,!0),this.location.replace(this.root+"#"+this.fragment),!0;this._hasPushState&&this.atRoot()&&a.hash&&(this.fragment=this.getHash().replace(R,""),this.history.replaceState({},document.title,this.root+this.fragment))}return this.options.silent?void 0:this.loadUrl()},stop:function(){e.$(window).off("popstate",this.checkUrl).off("hashchange",this.checkUrl),this._checkUrlInterval&&clearInterval(this._checkUrlInterval),N.started=!1},route:function(t,e){this.handlers.unshift({route:t,callback:e})},checkUrl:function(){var t=this.getFragment();return t===this.fragment&&this.iframe&&(t=this.getFragment(this.getHash(this.iframe))),t===this.fragment?!1:(this.iframe&&this.navigate(t),void this.loadUrl())},loadUrl:function(t){return t=this.fragment=this.getFragment(t),i.any(this.handlers,function(e){return e.route.test(t)?(e.callback(t),!0):void 0})},navigate:function(t,e){if(!N.started)return!1;e&&e!==!0||(e={trigger:!!e});var i=this.root+(t=this.getFragment(t||""));if(t=t.replace(O,""),this.fragment!==t){if(this.fragment=t,""===t&&"/"!==i&&(i=i.slice(0,-1)),this._hasPushState)this.history[e.replace?"replaceState":"pushState"]({},document.title,i);else{if(!this._wantsHashChange)return this.location.assign(i);this._updateHash(this.location,t,e.replace),this.iframe&&t!==this.getFragment(this.getHash(this.iframe))&&(e.replace||this.iframe.document.open().close(),this._updateHash(this.iframe.location,t,e.replace))}return e.trigger?this.loadUrl(t):void 0}},_updateHash:function(t,e,i){if(i){var n=t.href.replace(/(javascript:|#).*$/,"");t.replace(n+"#"+e)}else t.hash="#"+e}}),e.history=new N;var P=function(t,e){var n,s=this;n=t&&i.has(t,"constructor")?t.constructor:function(){return s.apply(this,arguments)},i.extend(n,s,e);var r=function(){this.constructor=n};return r.prototype=s.prototype,n.prototype=new r,t&&i.extend(n.prototype,t),n.__super__=s.prototype,n};d.extend=p.extend=E.extend=b.extend=N.extend=P;var j=function(){throw new Error('A "url" property or function must be specified')},V=function(t,e){var i=e.error;e.error=function(n){i&&i(t,n,e),t.trigger("error",t,n,e)}};return e}),define("resources",["jquery","underscore","backbone","core"],function(t,e,i,n){function s(t,e){n.resources.resultSet.get(t).set("favorited",e)}n.Result=i.Model.extend({id:"",url:"",title:"",summary:"",created:"",user:"",difficulty:"",visibility:"",cost:"",license:"",type:"",thumbnail:"",favorited:"",user_url:""});var r=i.Collection.extend({model:n.Result});n.resources.resultSet=new r,n.resultCollectionView=null;var o=i.View.extend({tagName:"div",className:"content-panel-body-listing-thumbnail-item",template:e.template('<a href="<%= user_url %>" class="content-panel-body-listing-item-user-picture" style="background-image: url(\'<%= user_thumbnail %>\')"></a><a href="<%= url %>" class="content-panel-body-listing-item-anchor"><div class="content-panel-body-listing-item-label-fold"></div><div class="content-panel-body-listing-item-label"><%= type %></div><div class="content-panel-body-listing-item-favorites<% if (favorited){ %> favorited<% } %>"><%= favorites %></div><div class="content-panel-body-listing-item-thumbnail"style="background-image: url(\'<%= thumbnail %>\')"></div><div class="content-panel-body-listing-item-thumbnail-shadow"></div><div class="content-panel-body-listing-item-contents"><div class="content-panel-body-listing-item-contents-caption"><%= title %></div><div class="content-panel-body-listing-item-contents-meta"><%= views %> views</div><%= tags %><div class="content-panel-body-listing-item-contents-description"><%= description %></div><% if (review_count !== 0) { %><div class="content-panel-body-listing-item-contents-reviews"><div class="content-panel-body-listing-item-contents-review-count">(<span class="content-panel-body-listing-item-contents-review-count-value"><%= review_count %></span>)</div></div><% } %></div></a>'),events:{"click .resource-favorite":"favorite","click .resource-copy":"copy"},initialize:function(){this.listenTo(this.model,"change",this.silentRender)},silentRender:function(){this.$el.html(this.template(this.model.toJSON()))},render:function(){return this.$el.html(this.template(this.model.toJSON())),t("#search-result-set").append(this.$el),this},favorite:function(){n.favoriteClickHandler("resource",this.model.get("id"),this.favoriteCallback,this.unfavoriteCallback,this.$el.find(".resource-favorite"))},copy:function(){var e=n.customPopup(".loading-dialog"),i=this;t.get("/resources/collection-from-resource/"+i.model.get("id")+"/",function(t){"true"==t.status?(e.close(),n.addCopyClickHandler("resource",i.model.get("id"),t.collectionID,event)):n.popup(t.message,t.title)},"json")},favoriteCallback:function(t){t.text("Favorited"),t.addClass("favorited")},unfavoriteCallback:function(t){t.text("Favorite"),t.removeClass("favorited")}}),a=i.View.extend({render:function(t){this.clearView(),this.prepareView();var i=t||this.collection;this.collection=i,0===i.length?this.showNullView():e.each(i.models,function(t){new o({model:t}).render()}),this.revealView()},clearView:function(){t("#search-result-set").html("")},prepareView:function(){t("#search-result-set").addClass("spinner-background")},revealView:function(){t("#search-result-set").removeClass("spinner-background"),t("#search-result-set").css("display","none"),t("#search-result-set").fadeIn("fast")},showNullView:function(){t("#search-result-set").html("<p>No results matching your criteria found.</p>")},setFavoriteStates:function(){}});return n.favorites.initFavoriteState=function(){var t;for(t=0;t<n.resources.resultSet.length;t++)n.getFavoriteState("resource",n.resources.resultSet.models[t].get("id"),s)},{ResultsCollectionView:a}}),define("favorites",["jquery","core","resources"],function(t,e,i){t(document).ready(function(){e.config.user.id&&e.favorites.initFavoriteState(e.resources.resultSet),ResultsCollectionView=i.ResultsCollectionView,e.resultCollectionView=new ResultsCollectionView({collection:e.resources.resultSet}),e.resultCollectionView.render()})});