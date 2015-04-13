// /site/js/model/config.js

var app = app || {};

app.Config = Backbone.Model.extend({
	urlRoot: '/api/config', 
	parse: function(response){
		response.id = response._id;
		return response;
	}
});