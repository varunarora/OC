CKEDITOR.plugins.add('resources', {
    requires: 'widget',
    init: function(editor){
        editor.widgets.add('resources', {
            allowedContent: 'div[id](!foreign-document-element); ' +
                'div{background-image}(!foreign-document-element-thumbnail); ' +
                'div(!foreign-document-element-description); ' +
                'div(!foreign-document-element-description-title); ' +
                'div(!foreign-document-element-description-preview); ',
            //template: OC.editor.insertedSearchResultTemplate,
            upcast: function(element) {
                return element.name == 'div' && element.hasClass('foreign-document-element');
            }
        });

    }
});