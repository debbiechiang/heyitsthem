// /models/actor.js

var app = app || {};

app.Actor = Backbone.Model.extend({
	// idAttribute: 'TMDBid',
	defaults: {
		character : "No overlap found",
		TMDBid: null,
		name: "",
		img: ""
	},
	parse: function( response ) {
	    response.id = response._id;
	    return response;
	}
})