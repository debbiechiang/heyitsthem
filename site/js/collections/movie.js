// site/js/collections/movie.js

var app = app || {};

app.MovieCollection = Backbone.Collection.extend({
	model: app.Movie, 
	url: function(){ return 'http://api.rottentomatoes.com/api/public/v1.0/movies.json?q=' + encodeURI(this.movieTitle).replace(/%20/g, "+")},
	sync: function(method, model, options){
		options.timeout = 10000;
		options.dataType = "jsonp";
		options.data = {
			page_limit: 1,
			page: 1, 
			apikey: "xc2vh7dnvump4knrzbqw9798",
			callback: "callback"
		};
		return Backbone.sync(method, model, options);
	},
	parse: function(response){
		// console.log('response is: ')
		// console.log(response);

		if (response.movies){
			var parsed = [];
			for (var i = 0; i < response.movies.length; i++){
				var movieObj = {
					title: response.movies[i].title,
					year: response.movies[i].year,
					link: response.movies[i].links.alternate,
					RTid: response.movies[i].id,
					castlink: response.movies[i].links.cast
				}
				parsed.push(movieObj);
			}
			// console.log(parsed);
			return parsed;
		} 

	}
});