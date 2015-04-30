// site/js/collections/workingCollection.js

var app = app || {};

app.WorkingCast = Backbone.Collection.extend({
	model: app.Actor, 
	url: '/api/actor', 
	localStorage: new Backbone.LocalStorage('whosthat-workingCast')
});