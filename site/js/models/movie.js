// site/js/models/movie.js

var app = app || {};

app.Movie = Backbone.Model.extend({
	url: '/api/media',
	defaults: {
		title: 'unknown',
		year: 'unknown',
		link: 'http://www.rotten-tomatoes.com',
		castlink: null,
		RTid: null,
		cast: []
	},
	parse: function( response ) {
	    response.id = response.RTid;
	    return response;
	}
});