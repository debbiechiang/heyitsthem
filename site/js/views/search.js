// sites/js/views/search.js

var app = app || {};

app.SearchView = Backbone.View.extend({
	el: '#media', 
	apikey: "3ad868d8cde55463944788618a489c37",
	img: {
		"base_url": "",
		"profile_size": ""
	},
	promises: [],
	working: [],
	initialize: function(){
		var self = this;

		// get the TMDB config object
		$.get("http://api.themoviedb.org/3/configuration?api_key=" + self.apikey)
			.done(function(data){
				self.img.base_url = data.images.base_url;
				self.img.profile_size = data.images.profile_sizes[0];
			});

		this.collection = {
			TMDBcollection: new app.MovieCollection(),
			dbCollection: new app.DBMovieCollection(),
			workingCollection: new app.WorkingCollection(),
			cast: new app.Cast()
		}

		this.collection.dbCollection.fetch({
			success: function(collection, response, object){
				console.log(collection.toJSON())
			}
		});

		this.listenTo(this.collection.workingCollection, 'add', this.getOverlap);
		this.listenTo(this.collection.workingCollection, 'empty', this.removeAll);
		this.listenTo(this, 'gotOverlap', this.render);


		// this.listenTo(this.collection, 'reset', this.render);
		
		// this.render();

	}, 
	events: {
		'click #search': 'searchTMDB'
	}, 
	searchTMDB: function(e){
		e.preventDefault(); 

		var self = this;


		// reset workingCollection
		self.collection.workingCollection.trigger('empty');
		self.collection.workingCollection.reset();

		$('#searchMedia div').children('input').each(function(i, el){
			if ((self.collection.TMDBcollection.movieTitle = $.trim($(el).val())) != "") {

				self.collection.TMDBcollection.fetch({
					success: function (collection, response, options){
						// at this point, you just got some JSON from the Rotten Tomatoes server. 
						// It's in the form of a model, but it's not saved to the Collection or to the database yet. 
						collection.each(function(model){
							if (movieModel = self.collection.dbCollection.find(function(movie){return movie.get('TMDBid') == model.get('TMDBid')})) {
								console.log('FOUND A RECORD IN MONGO DB FOR ' + model.get('title'));
								self.working.push(self.collection.workingCollection.add(movieModel.clone()));
							} else {
								console.log('THIS IS A NEW ' + model.get('mediaType') + ': ' + model.get('title'));
								// id was set by app.Movie parse function when
								// the movieCollection getter pulled it from the TMDB API.
								// Set it to null if we want the create method to work correctly on the 
								// dbCollection. 
								model.set({id: null});
								self.collection.dbCollection.create(model, {
									success: function(){
										console.log('FINISHED CREATING ', model.get('title'));
										if (model.get('cast').length === 0){
											console.log('getting the cast list');
											self.getCastList(model);
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
		// get the media type 
		this.collection.cast.mediaType = movieModel.get('mediaType');
		// get the Mongo ID for saving the cast list into the DB
		this.collection.cast.id = movieModel.get('_id');
		// get the TMDB id to search by 
		this.collection.cast.TMDBid = movieModel.get('TMDBid');

		this.collection.cast.fetch({
			success: function(collection, response, options){
				console.log("successfully fetched cast list")
				movieModel.set({cast: collection});
				movieModel.save({}, {
					success: function(model, response, options){
						self.working.push(self.collection.workingCollection.add(model.clone()));
					}
				});
			},
			error: function(collection, response, options){
				console.log("there was an error");
			}
		});
	},
	getOverlap: function(){
		var self = this;

		console.log(self.collection.workingCollection.toJSON());
		// this needs to be a Promise, somehow
		if (self.collection.workingCollection.length > 1){
			var castOverlap = [];
			var casts = self.collection.workingCollection.pluck("cast");

			castOverlap = _.intersection.apply(this, _.map(casts, function(el){
				return _.pluck(el, "id");
			}));

			// console.log(castOverlap);

			castModels = _.map(castOverlap, function(val, i, list){
				return _.findWhere(casts[0], {id: val});
			})

			self.trigger('gotOverlap', castModels);


		}
	},
	removeAll: function(){
		var self = this;
	},
	render: function(castOverlap){
		var self = this;

		console.log(castOverlap);

		_.each(castOverlap, function(actor){
			var actorModel  = new app.Actor(actor);
			actorModel.set({
				'base_url': self.img.base_url,
				'profile_size': self.img.profile_size
			})
			var actorView = new app.ActorView({
				model: actorModel
			});

			actorView.listenTo(self.collection.workingCollection, 'empty', actorView.deleteActor);
			// actorView.listenTo('empty', this.deleteActor);
			self.$el.append(actorView.render().el);
		});
		return this;
	}
});
