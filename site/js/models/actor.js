// /models/actor.js

var app = app || {};

app.Actor = Backbone.Model.extend({
	defaults: {
		characters : [],
		id: null,
		name: ""
	}
})