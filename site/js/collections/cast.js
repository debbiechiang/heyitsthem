// /collections/cast.js

var app = app || {};

app.Cast = Backbone.Collection.extend({
	model: app.Actor,
	url: function(){ 
		if (this.mediaType === "movie"){
			return 'http://api.themoviedb.org/3/' + this.mediaType + '/' + this.TMDBid + '/credits' 
		} else {
			return 'http://api.themoviedb.org/3/tv/' + this.TMDBid + '/season/' + this.season + '/credits'
		}
	},
	sync: function(method, model, options){
		options.timeout = 10000;
		options.data = {
			api_key: "3ad868d8cde55463944788618a489c37"
		};
		return Backbone.sync(method, model, options);
	},
	parse: function(response){
		if (response.cast){
			var parsed = [];
			for (var i = 0; i < response.cast.length; i++){
				var actorObj = {
					character : response.cast[i].character,
					TMDBid: response.cast[i].id,
					name: response.cast[i].name, 
					img: response.cast[i].profile_path
				}
				parsed.push(actorObj);
			}
			// console.log(parsed);
			return parsed;
		} 
	}
})