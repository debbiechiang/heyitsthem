// /models/actor.js

var app = app || {};

app.Cast = Backbone.Collection.extend({
	model: app.Actor,
	url: function(){ return this.castlink },
	sync: function(method, model, options){
		options.timeout = 10000;
		options.dataType = "jsonp";
		options.data = {
			apikey: "xc2vh7dnvump4knrzbqw9798",
			callback: "callback"
		};
		return Backbone.sync(method, model, options);
	},
	parse: function(response){
		if (response.cast){
			var parsed = [];
			for (var i = 0; i < response.cast.length; i++){
				var actorObj = {
					characters : response.cast[i].characters,
					id: response.cast[i].id,
					name: response.cast[i].name
				}
				parsed.push(actorObj);
			}
			return parsed;
		} 
	}
})