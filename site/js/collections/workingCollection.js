// site/js/collections/workingMovie.js

var app = app || {};

app.WorkingCollection = Backbone.Collection.extend({
	model: app.Movie
});