module.exports = function(grunt){
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		bower_concat: {
			all: {
				dest: 'site/js/lib/lib.js', 
				dependencies: {
					'underscore': 'jquery',
					'backbone': ['underscore', 'jquery']
				}
			}
		}, 
		concat: {
			all: {
				src: ['site/js/app.js', 'site/js/models/*', 'site/js/collections/*', 'site/js/views/*'],
				dest: 'site/js/lib/mvc.js'
			}
		},
		uglify: {
			build: {
				src: ['site/js/lib/lib.js'],
				dest: 'site/js/lib/lib-min.js'
			}
		}, 
		jshint: {

		},
		watch: {
			all: {
				files : ['site/js/app.js', 'site/js/models/*', 'site/js/collections/*', 'site/js/views/*'],
				tasks: 'concat:all'
			}
		}
	});

	grunt.loadNpmTasks('grunt-bower-concat');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-jshint');

	grunt.registerTask('default', [ 'bower_concat', 'concat','uglify', 'watch']);

}