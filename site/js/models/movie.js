// site/js/models/movie.js

var app = app || {};

app.Movie = Backbone.Model.extend({
	idAttribute: 'rtID',
	defaults: {
		title: 'unknown',
		year: 'unknown',
		link: 'http://www.rotten-tomatoes.com',
		rtID: null,
		cast: []
	}
});