define("curricula",["core_light"],function(e){function r(r){var u=e.utils.popup(".delete-curriculum-dialog"),c=r.target.id.substring(18);u.dialog.querySelector('input[name="curriculum_id"]').value=c,e.$.addListener(u.dialog.querySelector(".delete-curriculum-cancel-button"),"click",function(e){return u.close(),e.preventDefault(),e.stopPropagation(),!1})}function u(r){var u=e.utils.popup(".curriculum-copy-dialog",{light:!0}),c=u.dialog.querySelector(".curriculum-copy-button-cancel"),l=u.dialog.querySelector(".curriculum-copy-button-copy"),i=l.querySelector(".copy-spinner"),t=r.target.id.substring(5);e.$.addListener(l,"click",function(){if(e.curriculum.hasOwnProperty("smallSpinner"))e.curriculum.smallSpinner.spin(i);else{var r={lines:12,length:4,width:2,radius:4,corners:.9,rotate:75,direction:1,color:"#fff",speed:1,trail:79,shadow:!1,hwaccel:!1,className:"inline-spinner",zIndex:12,top:l.offsetTop,left:l.offsetLeft};require(["spin"],function(u){e.curriculum.smallSpinner=new u(r).spin(i)})}e.$.addClass(document.querySelector(".curriculum-copy-header-flyer"),"fly");var c={curriculum_id:t,title:u.dialog.querySelector('input[name="curriculum-copy-title"]').value,sync:u.dialog.querySelector('input[name="copy_sync"]').value};require(["atomic"],function(r){r.post("/curriculum/api/curriculum/copy/",c).success(function(r){var c=u.dialog.querySelector(".curriculum-copy-url"),i=u.dialog.querySelector(".curriculum-copy-body-pre"),t=u.dialog.querySelector(".curriculum-copy-button-cancel");e.$.addClass(i,"fadeOut"),e.$.addClass(u.dialog.querySelector(".curriculum-copy-body-post"),"show"),c.innerHTML=location.hostname+r.url,c.href=r.url,setTimeout(function(){e.$.addClass(i,"hide"),t.innerHTML="Close",e.$.addClass(t,"expand"),e.curriculum.smallSpinner.stop(),e.$.addClass(l,"hide")},1e3)})})}),e.$.addListener(c,"click",function(){u.close()})}var c=document.querySelector(".content-panel-body-create");c&&e.$.addListener(c,"click",function(){var r=e.utils.popup(".create-curriculum-dialog",{light:!0});require(["pikaday"],function(e){{var u=r.dialog.querySelector('input[name="start_date"]'),c=r.dialog.querySelector('input[name="end_date"]');new e({field:u}),new e({field:c})}});var u=r.dialog.querySelector(".create-curriculum-button-cancel");e.$.addListener(u,"click",function(e){return r.close(),e.preventDefault(),e.stopPropagation(),!1})});var l,i=document.querySelectorAll(".curriculum-delete-button");for(l=0;l<i.length;l++)e.$.addListener(i[l],"click",r);e.curriculum={};var t,o=document.querySelectorAll(".curriculum-copy-button");for(t=0;t<o.length;t++)e.$.addListener(o[t],"click",u)});