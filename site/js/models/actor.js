// /models/actor.js

var app = app || {};

app.Actor = Backbone.Model.extend({
	defaults: {
		character : "",
		TMDBid: null,
		name: "",
		img: ""
	}
})