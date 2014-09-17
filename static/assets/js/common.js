require.config({
    baseUrl: staticURL + 'js',
    //baseUrl: '',
    paths: {
        // Libraries.
        jquery: '//ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min',
        underscore: 'lib/underscore-min',
        modernizr: 'lib/modernizr',
        tipsy: 'lib/jquery.tipsy',
        tagit: 'lib/tag-it.min',
        backbone: 'lib/backbone-min',
        dropzone: 'lib/dropzone.min',
        nanoscroller: 'lib/jquery.nanoscroller.min',
        timeago: 'lib/jquery.timeago',
        react: 'lib/react',
        filepicker: '//api.filepicker.io/v1/filepicker',
        mathjax: '//cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML',
        backboneReact: 'lib/backbone-react-component',

        // CKEditor stuff.
        ckeditor: 'lib/ckeditor/ckeditor',
        ckeditor_jquery: 'lib/ckeditor/adapters/jquery',
        ckeditor_config: 'lib/ckeditor/config',
        ckeditor_styles: 'lib/ckeditor/styles',

        // Internal modules.
        categoryResources: 'src/category-resources',
        core: 'src/core',
        editor: 'src/editor',
        feed: 'src/feed',
        groups: 'src/groups',
        //internal: 'internal',        
        resources: 'src/resources',
        resourcesCollections: 'src/resources-collections',
        searchResults: 'src/search-results',
        upload: 'src/upload-files',

        // Partials.
        browse: 'src/page/browse',
        profile: 'src/page/profile',
        files: 'src/page/files',
        favorites: 'src/page/favorites',
        header: 'src/page/header',
        group: 'src/page/group',
        search: 'src/page/search',
        editor_page: 'src/page/editor',
        article: 'src/page/article',
        explorer: 'src/page/explorer',
        standards: 'src/page/standards',

        // jQuery UI.
        autocomplete: 'lib/jquery-ui/autocomplete',
        ui_core: 'lib/jquery-ui/core',
        widget: 'lib/jquery-ui/widget',
        position: 'lib/jquery-ui/position',
        menu: 'lib/jquery-ui/menu',
        draggable: 'lib/jquery-ui/draggable',
        droppable: 'lib/jquery-ui/droppable',
        mouse: 'lib/jquery-ui/mouse',
        slider: 'lib/jquery-ui/slider',
        dialog: 'lib/jquery-ui/dialog',
        button: 'lib/jquery-ui/button',
        resizable: 'lib/jquery-ui/resizable'
    },
});