CKEDITOR.plugins.add('upload', {
    icons: 'ocimage,attach',
    init: function(editor) {
        /* Command for inserting a custom image */
        editor.addCommand( 'insertImage', {
            allowedContent: 'img',
            exec: function(editor) {
                OC.editor.initImageUploadDialog(OC.editor.onImageInsert);
            },
        });

        /* Command for inserting a upload file */
        editor.addCommand( 'attachFile', {
            allowedContent: 'a',
            exec: function(editor) {
                OC.editor.initUploadDialog(OC.editor.onUploadInsert);
            },
        });

        /* Buttons for the defined commands */
        editor.ui.addButton( 'OCImage', {
            label: 'Insert image',
            command: 'insertImage',
            toolbar: 'insert'
        });
        editor.ui.addButton( 'Attach', {
            label: 'Upload / attach new...',
            command: 'attachFile',
            toolbar: 'insert'
        });
    }
});
