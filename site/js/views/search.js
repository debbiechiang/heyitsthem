// sites/js/views/search.js

var app = app || {};

app.SearchView = Backbone.View.extend({
	el: '#media', 
	apikey: "xc2vh7dnvump4knrzbqw9798",
	initialize: function(){
		this.collection = new app.MovieCollection();
		this.dbCollection = new app.DBMovieCollection();
		this.dbCollection.fetch();
		this.render();

		this.listenTo(this.collection, 'reset', this.render);

	}, 
	events: {
		'click #search': 'searchRottenTomatoes'
	}, 
	// array of deferreds
	deferred: {},
	workingMedia: [],
	searchRottenTomatoes: function(e){
		e.preventDefault(); 

		var self = this;
		var movieTitle;
		var cast; 
		// console.log('searching with apikey ' + self.apikey);
		$('#searchMedia div').children('input').each(function(i, el){
			if ($.trim($(el).val()) != "") {
				self.collection.movieTitle = $.trim($(el).val());
				self.collection.fetch({
					success: function (collection, response, options){
						// at this point, you just got some JSON from the Rotten Tomatoes server. 
						// It's in the form of a model, but it's not saved to the Collection or to the database yet. 
						collection.each(function(model){
							if (self.dbCollection.find(function(movie){return movie.get('RTid') == model.get('RTid')})) {
								console.log('FOUND A RECORD IN MONGO DB FOR ' + model.get('title'));
							} else {
								console.log('THIS IS A NEW MOVIE ' + model.get('title'));
								// id was set by app.Movie parse function when
								// the movieCollection getter pulled it from the RottenTomatoes API.
								// Set it to null if we want the create method to work correctly on the 
								// dbCollection. 
								model.set({id: null});
								self.dbCollection.create(model);
							}
						});
					}, 

					error: function(collection, response, options){
						console.log("There was an error!")
					}
				});
			}

			// var data = {
			// 	page_limit: 1,
			// 	page: 1, 
			// 	apikey: self.apikey, 
			// 	callback: "callback"
			// }
			// var url = 'http://api.rottentomatoes.com/api/public/v1.0/movies.json?q=' + encodeURI(movieTitle).replace(/%20/g, "+");
			// send a search request to rottentomatoes api

			// self.deferred.getMovie = $.ajax({
			// 	url: url,
			// 	type: "GET",
			// 	data: data,
			// 	dataType: "JSONP",
			// })
			// .done(function(data){
			// 	_.each(data.movies, function(el, index, list){
			// 		console.log('RTid for', el.title, ' is: ', el.id);
			// 		if (self.collection.find(function(model){return model.get('RTid') == el.id})) {
			// 			console.log('FOUND A RECORD IN MONGO DB FOR THIS MOVIE');
			// 	;	} else {
			// 			console.log('THIS IS A NEW MOVIE');
			// 		}
			// 		var movie = self.collection.find(function(model){
			// 			return model.get('RTid') == el.id
			// 		}) || new app.Movie()

			// 		// fire off cast list req
			// 		// console.log(movie.get('cast').length);
			// 		self.deferred.getCast = (movie.get('cast').length > 0) ? movie.get('cast') : self.getCastList(movie, el.links.cast, el.id, self);
					
			// 		// save movie to the 
			// 		movie.save({
			// 			title: el.title, 
			// 			year: el.year,
			// 			RTid: +el.id,
			// 			link: el.links.alternate
			// 		}, {
			// 			success: function(model, response, options){
			// 				console.log('successfully saved movie ' + model.get("title"));
			// 			}, 
			// 			error: function(model, response, options){
			// 				console.log(response);
			// 			}
			// 		});

			// 		// add the movie to the collection
			// 		self.collection.add(movie);

			// 		// add this model to the workingMedia;
			// 		self.workingMedia.push(movie);
			// 	}, self);

			// });



		});
	}, 
	getCastList: function(model, castlink, id, self){
		$.ajax({
			url: castlink,
			type: "GET",
			data: {
				apikey: self.apikey
			},
			dataType: "JSONP"
		})
		.done(function(data){
			// console.log(data.cast);
			// console.log(model.toJSON());
			// save the cast data to the database
			self.deferred.castSaved = model.save({
				cast: data.cast
			},{
				success: function(model, response, options){
					//console.log(data.cast);
				}, 
				error: function(model, response, options){
					console.log(response);
				}
			});

		});
	},
	addMovie: function(){

	},
	render: function(item){
		 console.log(item);

		return this;
	}
});
