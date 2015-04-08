// sites/js/views/search.js

var app = app || {};

app.SearchView = Backbone.View.extend({
	el: '#media', 
	apikey: "3ad868d8cde55463944788618a489c37",
	img: {
		"base_url": "",
		"profile_size": ""
	},
	fields: null,
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
			workingCast: new app.WorkingCast(),
			cast: new app.Cast()
		}

		this.collection.dbCollection.fetch({
			success: function(collection, response, object){
				console.log(collection.toJSON())
			}
		});

		this.listenTo(this, 'checkOverlap', this.getOverlap);
		this.listenTo(this.collection.workingCast, 'empty', this.removeAll);
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

		// get the number of fields to check
		self.fields = this.$('.media').length;

		// reset workingCast
		self.working = [];
		self.collection.workingCast.trigger('empty');
		self.collection.workingCast.reset();
		console.log(self.collection.workingCast.toJSON());

		$('#searchMedia div').children('input').each(function(i, el){
			if ((self.collection.TMDBcollection.movieTitle = $.trim($(el).val())) != "") {

				self.collection.TMDBcollection.fetch({
					success: function (collection, response, options){
						// at this point, you just got some JSON from the Rotten Tomatoes server. 
						// It's in the form of a model, but it's not saved to the Collection or to the database yet. 
						collection.each(function(model){
							if (movieModel = self.collection.dbCollection.find(function(movie){return movie.get('TMDBid') == model.get('TMDBid')})) {
								console.log('FOUND A RECORD IN MONGO DB FOR ' + model.get('title'));
								self.getCastList(movieModel);
								// self.working.push(self.collection.workingCast.add(movieModel));
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
										self.getCastList(model);
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
	getCastList: function(model){
		var self = this;

		if (model.get('cast').length === 0){
			console.log('getting the cast list');
			// get the media type 
			this.collection.cast.mediaType = model.get('mediaType');
			// get the Mongo ID for saving the cast list into the DB
			this.collection.cast.id = model.get('_id');
			// get the TMDB id to search by 
			this.collection.cast.TMDBid = model.get('TMDBid');

			this.collection.cast.fetch({
				success: function(collection, response, options){
					console.log("successfully fetched cast list")
					model.set({cast: collection});
					model.save({}, {
						success: function(model, response, options){
							self.working.push(model.get('cast'));
							self.trigger('checkOverlap');
							// self.working.push(self.collection.workingCast.add(model));
						}
					});
				},
				error: function(collection, response, options){
					console.log("there was an error");
				}
			});
		} else {
			console.log('cast list already exists');
			self.working.push(model.get('cast'));
			self.trigger('checkOverlap');
		}

	},
	getOverlap: function(){
		var self = this;

		// this needs to be a Promise, somehow
		if (self.working.length === self.fields){
			var castOverlap = [];
			var castModels = [];
			var casts = self.working;
			console.log("casts: ", casts);
			castOverlap = _.intersection.apply(this, _.map(casts, function(el){
				return _.pluck(el, "TMDBid");
			}));

			console.log("castOverlap: " , castOverlap);

			castModels = _.map(castOverlap, function(tmdbid, i, list){
				// get the list of roles for this tmdbid. 
				var roles = _.map(casts, function(cast, i, list){
					return _.findWhere(cast, {TMDBid: tmdbid});
				})

				// console.log('roles', roles);
				// console.log('tmdbid', tmdbid);
				var actorModel = _.reduce(roles, function(memo, role, i){ 
					console.log('memo', memo);
					return {
						name: role.name,
						img: role.img,
						TMDBid: tmdbid,
						character: memo.character + ", " + role.character
					}
				});

				console.log('actorModel', actorModel);

				return actorModel;
			})

			console.log("castModels: ", castModels);
			self.trigger('gotOverlap', castModels);
		}
	},
	removeAll: function(){
		var self = this;
	},
	render: function(castOverlap){
		var self = this;

		_.each(castOverlap, function(actor){
			var actorModel  = new app.Actor(actor);
			actorModel.set({
				'base_url': self.img.base_url,
				'profile_size': self.img.profile_size
			});

			// keep track of the actors with views in the workingCast collection
			self.collection.workingCast.create(actorModel);

			var actorView = new app.ActorView({
				model: actorModel
			});

			actorView.listenTo(self.collection.workingCast, 'empty', actorView.deleteActor);

			self.$el.append(actorView.render().el);
		});
		return this;
	}
});
