define("authenticate",["core_light"],function(e){var o,n,i=document.querySelector(".google-plus-button"),t={organization:{hostDomainMap:{"curriculum.teachforindia.org":"teachforindia.org"},hasPermission:function(e){return n?this.hostDomainMap[location.hostname]===e:!0}},google:{callback:function(n){n.error?(e.$.addClass(i,"show"),o.stop()):t.google.fetch(n)},fetch:function(){var n;gapi.client.load("oauth2","v2",function(){var i=gapi.client.oauth2.userinfo.get();i.execute(function(i){n={id:i.id,email:i.email,firstName:i.given_name,lastName:i.family_name,profilePic:i.picture+"?sz=200",url:i.link,gender:i.gender,domain:i.hd},i.hasOwnProperty("hd")&&t.organization.hasPermission(i.hd)?t.google.login(n):(e.utils.messageBox.set("Please sign in with your school / district account and refresh to proceed."),e.utils.messageBox.show(),o.stop())})})},login:function(e){require(["atomic"],function(o){o.post("/google-login/",e).success(function(e){t.google.loggedIn(e)})})},loggedIn:function(e){if(e.hasOwnProperty("new")){var o=new Date;o.setDate(o.getDate()+1),document.cookie="onboard=false; expires="+o.toUTCString(),location.reload()}}},spinnerOptions:{lines:15,length:4,width:2,radius:6,corners:.9,rotate:75,direction:1,color:e.config.palette.dark,speed:1,trail:79,shadow:!1,hwaccel:!1,className:"spinner",zIndex:12,top:"60%",left:"50%"}};window.plusCallback=function(e){return t.google.callback(e)},window.renderPlus=function(){gapi.signin.render("google-plus-button",{callback:"plusCallback",clientid:"747453362533.apps.googleusercontent.com",cookiepolicy:"single_host_origin",scope:e.config.hasOwnProperty("organization")?"email https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/calendar":"email"})},n=-1===location.search.replace("?","").split("&").indexOf("lock=false")?!0:!1,require(["spin"],function(e){o=new e(t.spinnerOptions).spin(document.querySelector(".login-loader")),require(["plus"])})});