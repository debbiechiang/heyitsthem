// sites/js/views/search.js

var app = app || {};

app.SearchView = Backbone.View.extend({
	el: '#media', 
	apikey: "xc2vh7dnvump4knrzbqw9798",
	initialize: function(){

		this.collection = {
			RTcollection: new app.MovieCollection(),
			dbCollection: new app.DBMovieCollection(),
			cast: new app.Cast()
		}
		// initialize the getter for the RottenTomatoes API
		//this.RTcollection = new app.MovieCollection();

		// initialize the setter for the Mongo DB
		//this.dbCollection = new app.DBMovieCollection();
		this.collection.dbCollection.fetch();


		// this.listenTo(this.collection, 'reset', this.render);
		
		this.render();

	}, 
	events: {
		'click #search': 'searchRottenTomatoes'
	}, 
	searchRottenTomatoes: function(e){
		e.preventDefault(); 

		var self = this;
		var movieTitle;
		var workingCast = [];
		// console.log('searching with apikey ' + self.apikey);
		$('#searchMedia div').children('input').each(function(i, el){
			if ((self.collection.RTcollection.movieTitle = $.trim($(el).val())) != "") {

				self.collection.RTcollection.fetch({
					success: function (collection, response, options){
						// at this point, you just got some JSON from the Rotten Tomatoes server. 
						// It's in the form of a model, but it's not saved to the Collection or to the database yet. 
						var existing; 
						collection.each(function(model){
							if (existing = self.collection.dbCollection.find(function(movie){return movie.get('RTid') == model.get('RTid')})) {
								console.log('FOUND A RECORD IN MONGO DB FOR ' + existing.get('title'));
								console.log(existing.toJSON());
								workingCast.push(existing.cast);
							} else {
								existing = model;
								console.log('THIS IS A NEW MOVIE ' + model.get('title'));
								// id was set by app.Movie parse function when
								// the movieCollection getter pulled it from the RottenTomatoes API.
								// Set it to null if we want the create method to work correctly on the 
								// dbCollection. 
								model.set({id: null});
								self.collection.dbCollection.create(model, {
									success: function(){
										console.log(model.toJSON());
										console.log('FINISHED CREATING');
										if (existing.get('cast').length === 0){
											console.log('getting the cast list');
											self.getCastList(existing);
										} else {
											console.log('cast list already exists');
										}
									}
								});
							}


						});

					}, 

					error: function(collection, response, options){
						console.log("There was an error!")
					}
				});
			}

		});
	}, 
	getCastList: function(movieModel){
		var self = this;
		this.collection.cast.castlink = movieModel.get("castlink");
		this.collection.cast.id = movieModel.get('_id');
		this.collection.cast.fetch({
			success: function(collection, response, options){
				console.log("successfully fetched cast list")
				movieModel.set({cast: collection});
				movieModel.save();
				workingCast.push(existing.cast);
			},
			error: function(collection, response, options){
				console.log("there was an error");
			}
		});
	},
	addMovie: function(){

	},
	render: function(item){
		return this;
	}
});
