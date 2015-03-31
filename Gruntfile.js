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
		uglify: {
			build: {
				src: ['site/js/lib/lib.js'],
				dest: 'site/js/lib/lib-min.js'
			}
		}, 
		jshint: {

		},
		watch: {
			
		}
	});

	grunt.loadNpmTasks('grunt-bower-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-jshint');

	grunt.registerTask('default', ['uglify', 'bower_concat:all']);

}