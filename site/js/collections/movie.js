// site/js/collections/movie.js

var app = app || {};

app.MovieCollection = Backbone.Collection.extend({
	model: app.Movie, 
	url: function(){ return 'http://api.themoviedb.org/3/search/multi?query=' + encodeURI(this.movieTitle).replace(/%20/g, "+")},
	sync: function(method, model, options){
		options.timeout = 10000;
		options.data = {
			page: 1, 
			api_key: "3ad868d8cde55463944788618a489c37"
		};
		return Backbone.sync(method, model, options);
	},
	parse: function(response){
		// console.log('response is: ')
		// console.log(response);

		if (response.results){
			var parsed = [];
			for (var i = 0; i < response.results.length; i++){
				// limit popularity and also restrict multi-search results to 
				// TV shows and movies
				if (response.results[i].media_type === "movie" || response.results[i].media_type === "tv"){
					var mediaObj = {
						title: (response.results[i].media_type === "movie") ? response.results[i].title : response.results[i].name,
						popularity: response.results[i].popularity,
						TMDBid: response.results[i].id,
						mediaType: response.results[i].media_type
					}
					// TEMPORARILY only return the first result
					// return mediaObj
					parsed.push(mediaObj);
				}
			}
			// sort by popularity and return the top 5 results
			// underscore is great
			return _.chain(parsed).sortBy(function(parsed){return parsed.popularity}).reverse().first(5).value();
		} else {
			console.log("TMDB has no record of that title!");
		}

	}
});