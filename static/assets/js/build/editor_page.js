define(["ckeditor","ckeditor_jquery","ckeditor_config","ckeditor_styles","editor"],function(){CKEDITOR.config.contentsCss=staticURL+"css/ckeditor/contents.css",CKEDITOR.config.skin="moono,"+staticURL+"css/ckeditor/skins/moono_docs/",require(["jquery","dropzone","editor"],function(o,e){o(document).ready(function(){o(".image-upload-dialog .upload-drag-drop").dropzone({url:"/api/image-upload/",createImageThumbnails:!1}),o(".image-upload-dialog .upload-drag-drop").length>0&&(e.forElement(".image-upload-dialog .upload-drag-drop").on("sending",OC.editor.attachUserID),e.forElement(".image-upload-dialog .upload-drag-drop").on("sending",OC.attachCSRFToken)),o(".upload-widget-dialog .upload-drag-drop").dropzone({url:"/api/file-upload/",createImageThumbnails:!1,maxFilesize:5}),o(".editor-frame").length>0&&OC.editor.init(),OC.editor.initImageUploaderTabs(),o(".upload-widget-dialog .upload-drag-drop").length>0&&(e.forElement(".upload-widget-dialog .upload-drag-drop").on("sending",OC.editor.attachUserID),e.forElement(".upload-widget-dialog .upload-drag-drop").on("sending",OC.attachCSRFToken)),o(".tagit").tagit({allowSpaces:!0}),o("span.delete-objective").click(OC.editor.objectiveDeleteHandler),OC.editor.initDropMenus(),OC.editor.initEditUnit(),window.onbeforeunload=function(){return"If you quit, you will loose all your work. Would you still like to leave?"},o("#new-resource-document-form .editor-button-wrapper .save-button").click(function(e){return window.onbeforeunload=null,OC.editor.serializeDocument(),o("#new-resource-document-form").submit(),e.stopPropagation(),e.preventDefault(),!1})})})});