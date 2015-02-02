{
    baseUrl: '',
    dir: 'build',
    mainConfigFile: 'common.js',
    modules: [
        {
            name: 'header',
            include: ['requireLib', 'jquery', 'underscore', 'modernizr', 'tipsy', 'tagit', 'core']
        },
        {
            name: 'browse',
            include: ['browse'],
            exclude: ['header']
        },
        /*{
            name: 'profile',
            include: ['profile'],
            exclude: ['header']
        },
        {
            name: 'files',
            include: ['files'],
            exclude: ['header']
        },*/
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
        },
        {
            name: 'article',
            include: ['article'],
            exclude: ['header']
        },
        /*{
            name: 'explorer',
            include: ['explorer'],
            exclude: ['header']
        },*/
        {
            name: 'standards',
            include: ['standards'],
            exclude: ['header']
        },
        {
            name: 'upload',
            include: ['upload'],
            exclude: ['header']
        },


        {
            name: 'core_light',
            include: ['requireLib', 'core_light', 'org_profile', 'atomic', 'spin'],
        },
        {
            name: 'react',
            include: ['react', 'immutable'],
            exclude: ['core_light']
        },
        {
            name: 'org_feed',
            include: ['org_feed', 'follow'],
            exclude: ['core_light', 'react']
        },
        {
            name: 'curriculum',
            include: [
                'curriculum',
                'post'
            ],
            exclude: ['core_light', 'react']
        },
        {
            name: 'curricula',
            include: ['curricula'],
            exclude: ['core_light', 'react']
        },
        {
            name: 'planner',
            include: [
                'planner',
                'classes',
                'scheduler',
                'pikaday',
                'jstz',
                'moment',
                'plannerStore',
                'plannerWidget',
                'plannerAPI'
            ],
            exclude: ['core_light', 'react']
        },
        {
            name: 'filesNew',
            include: ['filesNew'],
            exclude: ['core_light', 'react']
        },
        {
            name: 'uploadNew',
            include: ['uploadNew', 'hogan'],
            exclude: ['core_light', 'react']
        },

        {
            name: 'authenticate',
            include: ['authenticate'],
            exclude: ['core_light', 'react']
        }

    ],
    paths: {
        jquery: 'empty:',
        filepicker: 'empty:',
        mathjax: 'empty:',
        plus: 'empty:',
        gapi: 'empty:',
        requireLib: 'lib/require',
    },
    optimize: 'uglify2',
    removeCombined: true,
    preserveLicenseComments: false
}