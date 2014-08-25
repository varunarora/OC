CKEDITOR.plugins.add('video', {
    icons: 'video',
    init: function(editor) {
        /* Command for inserting a custom image */
        editor.addCommand( 'insertVideo', {
            allowedContent: 'img',
            exec: function(editor) {
                OC.editor.initInsertVideoDialog();
            },
        });

        editor.ui.addButton( 'Video', {
            label: 'Insert video...',
            command: 'insertVideo',
            toolbar: 'insert'
        });
    }
});
