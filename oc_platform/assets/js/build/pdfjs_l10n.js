document.webL10n=function(n,e){function t(){return e.querySelectorAll('link[type="application/l10n"]')}function r(){var n=e.querySelector('script[type="application/l10n"]');return n?JSON.parse(n.innerHTML):null}function o(n){return n?n.querySelectorAll("*[data-l10n-id]"):[]}function u(n){if(!n)return{};var e=n.getAttribute("data-l10n-id"),t=n.getAttribute("data-l10n-args"),r={};if(t)try{r=JSON.parse(t)}catch(o){console.warn("could not parse arguments for #"+e)}return{id:e,args:r}}function a(n){var t=e.createEvent("Event");t.initEvent("localized",!0,!1),t.language=n,e.dispatchEvent(t)}function i(n,e,t,r){e=e||function(){},t=t||function(){console.warn(n+" not found.")};var o=new XMLHttpRequest;o.open("GET",n,r),o.overrideMimeType&&o.overrideMimeType("text/plain; charset=utf-8"),o.onreadystatechange=function(){4==o.readyState&&(200==o.status||0===o.status?e(o.responseText):t())},o.onerror=t,o.ontimeout=t;try{o.send(null)}catch(u){t()}}function c(n,e,t,r){function o(n){return n.lastIndexOf("\\")<0?n:n.replace(/\\\\/g,"\\").replace(/\\n/g,"\n").replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\b/g,"\b").replace(/\\f/g,"\f").replace(/\\{/g,"{").replace(/\\}/g,"}").replace(/\\"/g,'"').replace(/\\'/g,"'")}function u(n){function t(n,t){for(var i=n.replace(c,"").split(/[\r\n]+/),h="*",g=e.replace(/-[a-z]+$/i,""),v=!1,p="",m=0;m<i.length;m++){var w=i[m];if(!f.test(w)){if(t){if(l.test(w)){p=l.exec(w),h=p[1],v="*"!==h&&h!==e&&h!==g;continue}if(v)continue;s.test(w)&&(p=s.exec(w),r(a+p[1]))}var y=w.match(d);y&&3==y.length&&(u[y[1]]=o(y[2]))}}}function r(n){i(n,function(n){t(n,!1)},null,!1)}var u=[],c=/^\s*|\s*$/,f=/^\s*#|^\s*$/,l=/^\s*\[(.*)\]\s*$/,s=/^\s*@import\s+url\((.*)\)\s*$/i,d=/^([^=\s]*)\s*=\s*(.+)$/;return t(n,!0),u}var a=n.replace(/[^\/]*$/,"")||"./";i(n,function(n){y+=n;var e=u(n);for(var r in e){var o,a,i=r.lastIndexOf(".");i>0?(o=r.substring(0,i),a=r.substr(i+1)):(o=r,a=b),w[o]||(w[o]={}),w[o][a]=e[r]}t&&t()},r,E)}function f(n,e){function o(n){{var e=n.href;n.type}this.load=function(n,t){var r=n;return c(e,n,t,function(){console.warn(e+" not found."),r=""}),r}}e=e||function(){},l(),k=n;var u=t(),i=u.length;if(0===i){var f=r();return f&&f.locales&&f.default_locale?(console.log("using the embedded JSON directory, early way out"),w=f.locales[n]||f.locales[f.default_locale],e()):console.log("no resource to load, early way out"),a(n),void(z="complete")}var s=null,d=0;s=function(){d++,d>=i&&(e(),a(n),z="complete")};for(var h=0;i>h;h++){var g=new o(u[h]),v=g.load(n,s);v!=n&&(console.warn('"'+n+'" resource not found'),k="")}}function l(){w={},y="",k=""}function s(n){function e(n,e){return-1!==e.indexOf(n)}function t(n,e,t){return n>=e&&t>=n}var r={af:3,ak:4,am:4,ar:1,asa:3,az:0,be:11,bem:3,bez:3,bg:3,bh:4,bm:0,bn:3,bo:0,br:20,brx:3,bs:11,ca:3,cgg:3,chr:3,cs:12,cy:17,da:3,de:3,dv:3,dz:0,ee:3,el:3,en:3,eo:3,es:3,et:3,eu:3,fa:0,ff:5,fi:3,fil:4,fo:3,fr:5,fur:3,fy:3,ga:8,gd:24,gl:3,gsw:3,gu:3,guw:4,gv:23,ha:3,haw:3,he:2,hi:4,hr:11,hu:0,id:0,ig:0,ii:0,is:3,it:3,iu:7,ja:0,jmc:3,jv:0,ka:0,kab:5,kaj:3,kcg:3,kde:0,kea:0,kk:3,kl:3,km:0,kn:0,ko:0,ksb:3,ksh:21,ku:3,kw:7,lag:18,lb:3,lg:3,ln:4,lo:0,lt:10,lv:6,mas:3,mg:4,mk:16,ml:3,mn:3,mo:9,mr:3,ms:0,mt:15,my:0,nah:3,naq:7,nb:3,nd:3,ne:3,nl:3,nn:3,no:3,nr:3,nso:4,ny:3,nyn:3,om:3,or:3,pa:3,pap:3,pl:13,ps:3,pt:3,rm:3,ro:9,rof:3,ru:11,rwk:3,sah:0,saq:3,se:7,seh:3,ses:0,sg:0,sh:11,shi:19,sk:12,sl:14,sma:7,smi:7,smj:7,smn:7,sms:7,sn:3,so:3,sq:3,sr:11,ss:3,ssy:3,st:3,sv:3,sw:3,syr:3,ta:3,te:3,teo:3,th:0,ti:4,tig:3,tk:3,tl:4,tn:3,to:0,tr:0,ts:3,tzm:22,uk:11,ur:3,ve:3,vi:0,vun:3,wa:4,wae:3,wo:0,xh:3,xog:3,yo:0,zh:0,zu:3},o={0:function(){return"other"},1:function(n){return t(n%100,3,10)?"few":0===n?"zero":t(n%100,11,99)?"many":2==n?"two":1==n?"one":"other"},2:function(n){return 0!==n&&n%10===0?"many":2==n?"two":1==n?"one":"other"},3:function(n){return 1==n?"one":"other"},4:function(n){return t(n,0,1)?"one":"other"},5:function(n){return t(n,0,2)&&2!=n?"one":"other"},6:function(n){return 0===n?"zero":n%10==1&&n%100!=11?"one":"other"},7:function(n){return 2==n?"two":1==n?"one":"other"},8:function(n){return t(n,3,6)?"few":t(n,7,10)?"many":2==n?"two":1==n?"one":"other"},9:function(n){return 0===n||1!=n&&t(n%100,1,19)?"few":1==n?"one":"other"},10:function(n){return t(n%10,2,9)&&!t(n%100,11,19)?"few":n%10!=1||t(n%100,11,19)?"other":"one"},11:function(n){return t(n%10,2,4)&&!t(n%100,12,14)?"few":n%10===0||t(n%10,5,9)||t(n%100,11,14)?"many":n%10==1&&n%100!=11?"one":"other"},12:function(n){return t(n,2,4)?"few":1==n?"one":"other"},13:function(n){return t(n%10,2,4)&&!t(n%100,12,14)?"few":1!=n&&t(n%10,0,1)||t(n%10,5,9)||t(n%100,12,14)?"many":1==n?"one":"other"},14:function(n){return t(n%100,3,4)?"few":n%100==2?"two":n%100==1?"one":"other"},15:function(n){return 0===n||t(n%100,2,10)?"few":t(n%100,11,19)?"many":1==n?"one":"other"},16:function(n){return n%10==1&&11!=n?"one":"other"},17:function(n){return 3==n?"few":0===n?"zero":6==n?"many":2==n?"two":1==n?"one":"other"},18:function(n){return 0===n?"zero":t(n,0,2)&&0!==n&&2!=n?"one":"other"},19:function(n){return t(n,2,10)?"few":t(n,0,1)?"one":"other"},20:function(n){return!t(n%10,3,4)&&n%10!=9||t(n%100,10,19)||t(n%100,70,79)||t(n%100,90,99)?n%1e6===0&&0!==n?"many":n%10!=2||e(n%100,[12,72,92])?n%10!=1||e(n%100,[11,71,91])?"other":"one":"two":"few"},21:function(n){return 0===n?"zero":1==n?"one":"other"},22:function(n){return t(n,0,1)||t(n,11,99)?"one":"other"},23:function(n){return t(n%10,1,2)||n%20===0?"one":"other"},24:function(n){return t(n,3,10)||t(n,13,19)?"few":e(n,[2,12])?"two":e(n,[1,11])?"one":"other"}},u=r[n.replace(/-.*$/,"")];return u in o?o[u]:(console.warn("plural form unknown for ["+n+"]"),function(){return"other"})}function d(n,e,t){var r=w[n];if(!r){if(console.warn("#"+n+" is undefined."),!t)return null;r=t}var o={};for(var u in r){var a=r[u];a=h(a,e,n,u),a=g(a,e,n),o[u]=a}return o}function h(n,e,t,r){var o=/\{\[\s*([a-zA-Z]+)\(([a-zA-Z]+)\)\s*\]\}/,u=o.exec(n);if(!u||!u.length)return n;var a,i=u[1],c=u[2];if(e&&c in e?a=e[c]:c in w&&(a=w[c]),i in x){var f=x[i];n=f(n,a,t,r)}return n}function g(n,e,t){for(var r=/\{\{\s*(.+?)\s*\}\}/,o=r.exec(n);o;){if(!o||o.length<2)return n;var u=o[1],a="";if(e&&u in e)a=e[u];else{if(!(u in w))return console.log("argument {{"+u+"}} for #"+t+" is undefined."),n;a=w[u][b]}n=n.substring(0,o.index)+a+n.substr(o.index+o[0].length),o=r.exec(n)}return n}function v(n){var t=u(n);if(t.id){var r=d(t.id,t.args);if(!r)return void console.warn("#"+t.id+" is undefined.");if(r[b]){if(0===p(n))n[b]=r[b];else{for(var o=n.childNodes,a=!1,i=0,c=o.length;c>i;i++)3===o[i].nodeType&&/\S/.test(o[i].nodeValue)&&(a?o[i].nodeValue="":(o[i].nodeValue=r[b],a=!0));if(!a){var f=e.createTextNode(r[b]);n.insertBefore(f,n.firstChild)}}delete r[b]}for(var l in r)n[l]=r[l]}}function p(n){if(n.children)return n.children.length;if("undefined"!=typeof n.childElementCount)return n.childElementCount;for(var e=0,t=0;t<n.childNodes.length;t++)e+=1===n.nodeType?1:0;return e}function m(n){n=n||e.documentElement;for(var t=o(n),r=t.length,u=0;r>u;u++)v(t[u]);v(n)}var w={},y="",b="textContent",k="",x={},z="loading",E=!0;return x.plural=function(n,e,t,r){var o=parseFloat(e);if(isNaN(o))return n;if(r!=b)return n;x._pluralRules||(x._pluralRules=s(k));var u="["+x._pluralRules(o)+"]";return 0===o&&t+"[zero]"in w?n=w[t+"[zero]"][r]:1==o&&t+"[one]"in w?n=w[t+"[one]"][r]:2==o&&t+"[two]"in w?n=w[t+"[two]"][r]:t+u in w?n=w[t+u][r]:t+"[other]"in w&&(n=w[t+"[other]"][r]),n},{get:function(n,e,t){var r=n.lastIndexOf("."),o=b;r>0&&(o=n.substr(r+1),n=n.substring(0,r));var u;t&&(u={},u[o]=t);var a=d(n,e,u);return a&&o in a?a[o]:"{{"+n+"}}"},getData:function(){return w},getText:function(){return y},getLanguage:function(){return k},setLanguage:function(n){f(n,m)},getDirection:function(){var n=["ar","he","fa","ps","ur"];return n.indexOf(k)>=0?"rtl":"ltr"},translate:m,getReadyState:function(){return z},ready:function(t){t&&("complete"==z||"interactive"==z?n.setTimeout(t):e.addEventListener?e.addEventListener("localized",t):e.attachEvent&&e.documentElement.attachEvent("onpropertychange",function(n){"localized"===n.propertyName&&t()}))}}}(window,document);