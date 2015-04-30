// site/js/models/movie.js

var app = app || {};

app.Movie = Backbone.Model.extend({
	url: '/api/media',
	defaults: {
		title: 'unknown',
		TMDBid: null
	},
	parse: function( response ) {
	    response.id = response.TMDBid;
	    return response;
	}
});