// /models/actor.js

var app = app || {};

app.Actor = Backbone.Model.extend({
	idAttribute: '_id',
	defaults: {
		characters : [],
		id: null,
		name: ""
	}
})