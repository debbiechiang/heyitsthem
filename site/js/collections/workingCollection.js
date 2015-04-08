// site/js/collections/workingMovie.js

var app = app || {};

app.WorkingCast = Backbone.Collection.extend({
	model: app.Actor, 
	url: '/api/actor'
});