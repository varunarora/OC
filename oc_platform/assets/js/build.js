{
    baseUrl: '',
    dir: 'build',
    mainConfigFile: 'common.js',
    modules: [
        {
            name: 'header',
            include: ['jquery', 'underscore', 'modernizr', 'tipsy', 'tagit', 'core']
        },
        {
            name: 'browse',
            include: ['browse'],
            exclude: ['header']
        },
        {
            name: 'profile',
            include: ['profile'],
            exclude: ['header']
        },
        {
            name: 'files',
            include: ['files'],
            exclude: ['header']
        },
        {
            name: 'favorites',
            include: ['favorites'],
            exclude: ['header']
        },
        {
            name: 'group',
            include: ['group'],
            exclude: ['header']
        },
        {
            name: 'search',
            include: ['search'],
            exclude: ['header']
        },
        {
            name: 'editor',
            include: ['editor_page'],
            exclude: ['header']
        }
    ],
    paths: {
        jquery: 'empty:',
        filepicker: 'empty:',
        mathjax: 'empty:'
    },
    optimize: 'uglify2',
    removeCombined: true
}