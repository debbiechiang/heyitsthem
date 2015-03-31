// sites/js/views/search.js

var app = app || {};

app.SearchView = Backbone.View.extend({
	el: '#media', 
	apikey: "xc2vh7dnvump4knrzbqw9798",
	initialize: function(){
		this.collection = new app.MovieCollection();
		this.collection.fetch();
		this.render();
	}, 
	events: {
		'click #search': 'searchRottenTomatoes'
	}, 
	searchRottenTomatoes: function(e){
		e.preventDefault(); 

		var self = this;
		var movieTitle;
		var cast; 

		// console.log('searching with apikey ' + self.apikey);
		$('#searchMedia div').children('input').each(function(i, el){
			movieTitle = $(el).val();
			var data = {
				page_limit: 2,
				page: 1, 
				apikey: self.apikey, 
				callback: "callback"
			}
			var url = 'http://api.rottentomatoes.com/api/public/v1.0/movies.json?q=' + encodeURI(movieTitle).replace(/%20/g, "+");
			// send a search request to rottentomatoes api

			var getMovie = $.ajax({
				url: url,
				type: "GET",
				data: data,
				dataType: "JSONP",
			})
			.done(function(data){
				_.each(data.movies, function(el, index, list){
					console.log('RTid for', el.title, ' is: ', el.id);
					
					var movie = self.collection.find(function(model){
						return model.get('RTid') == el.id
					}) || new app.Movie();

					movie.save({
						title: el.title, 
						year: el.year,
						RTid: +el.id,
						link: el.links.alternate
					}, {
						success: function(){
							console.log('successfully saved');
						}, 
						error: function(model, response, options){
							console.log(response);
						}
					});

					// fire off cast list req
					//var cast = self.getCastList(el.links.cast, el.id, self);
					
				}, self);

			});



		});
	}, 
	getCastList: function(castlink, id, self){
		var getCast = $.ajax({
			url: castlink,
			type: "GET",
			data: {
				apikey: self.apikey
			},
			dataType: "JSONP"
		})
		.done(function(data){
			return data.cast;
		});
	},
	addMovie: function(){

	},
	render: function(){

	}
});
