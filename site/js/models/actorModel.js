// /models/actor.js

var app = app || {};

app.Actor = Backbone.Model.extend({
	defaults: {
		character : "No actor overlap found",
		TMDBid: null,
		name: "",
		img: ""
	},
	parse: function( response ) {
	    return response;
	}
})