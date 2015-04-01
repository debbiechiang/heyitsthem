// site/js/collections/dbMovie.js

var app = app || {};

app.DBMovieCollection = Backbone.Collection.extend({
	model: app.Movie, 
	url: '/api/media'
});