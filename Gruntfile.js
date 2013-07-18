module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {
                separator: ';'
            },
            dist: {
                src: [
                    'oc_platform/assets/js/jquery-ui-1.10.3.custom.min.js',
                    'oc_platform/assets/js/underscore-min.js',
                    'oc_platform/assets/js/backbone-min.js',
                    'oc_platform/assets/js/quicksilver.js',
                    'oc_platform/assets/js/modernizr.js',
                    'oc_platform/assets/js/jquery.tipsy.js',
                    'oc_platform/assets/js/core.js'
                ],
                dest: 'oc_platform/assets/js/core.min.js'
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            dist: {
                files: {
                    'oc_platform/assets/js/core.min.js': ['<%= concat.dist.dest %>']
                }
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');

    // Default task(s).
    grunt.registerTask('default', ['concat', 'uglify']);
};