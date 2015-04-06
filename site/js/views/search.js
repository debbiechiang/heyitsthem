// sites/js/views/search.js

var app = app || {};

app.SearchView = Backbone.View.extend({
	el: '#media', 
	apikey: "xc2vh7dnvump4knrzbqw9798",
	workingCast: [],
	workingCastById: [],
	getTitle: null,
	getCast: null,
	promises: [],
	initialize: function(){
		var self = this;

		this.collection = {
			RTcollection: new app.MovieCollection(),
			dbCollection: new app.DBMovieCollection(),
			workingCollection: new app.WorkingCollection(),
			cast: new app.Cast()
		}

		this.collection.dbCollection.fetch();

		this.listenTo(this.collection.workingCollection, 'add', this.getOverlap);
		this.listenTo(this.collection.workingCollection, 'empty', this.removeAll);
		this.listenTo(this, 'gotOverlap', this.render);


		// this.listenTo(this.collection, 'reset', this.render);
		
		this.render();

	}, 
	events: {
		'click #search': 'searchRottenTomatoes'
	}, 
	searchRottenTomatoes: function(e){
		e.preventDefault(); 

		var self = this;


		// reset workingCollection
		self.collection.workingCollection.trigger('empty');
		self.collection.workingCollection.reset();

		$('#searchMedia div').children('input').each(function(i, el){
			if ((self.collection.RTcollection.movieTitle = $.trim($(el).val())) != "") {

				self.collection.RTcollection.fetch({
					success: function (collection, response, options){
						// at this point, you just got some JSON from the Rotten Tomatoes server. 
						// It's in the form of a model, but it's not saved to the Collection or to the database yet. 
						collection.each(function(model){
							if (movieModel = self.collection.dbCollection.find(function(movie){return movie.get('RTid') == model.get('RTid')})) {
								console.log('FOUND A RECORD IN MONGO DB FOR ' + model.get('title'));
								self.collection.workingCollection.add(movieModel.clone());
								// console.log(existing.toJSON());
								// self.workingCast.push(existing.get("cast"));
							} else {
								console.log('THIS IS A NEW MOVIE ' + model.get('title'));
								// id was set by app.Movie parse function when
								// the movieCollection getter pulled it from the RottenTomatoes API.
								// Set it to null if we want the create method to work correctly on the 
								// dbCollection. 
								model.set({id: null});
								self.collection.dbCollection.create(model, {
									success: function(){
										console.log('FINISHED CREATING');
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
		this.collection.cast.castlink = movieModel.get("castlink");
		this.collection.cast.id = movieModel.get('_id');
		this.collection.cast.fetch({
			success: function(collection, response, options){
				console.log("successfully fetched cast list")
				movieModel.set({cast: collection});
				movieModel.save({}, {
					success: function(model, response, options){
						console.log(model.toJSON());
						self.collection.workingCollection.add(model.clone());
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
		// self.workingCastById = _.map(self.workingCast, function(castList){
		// 	return _.map(castList, function(actor){
		// 		return actor.id;
		// 	})
		// })
		// console.log(_.flatten(self.workingCastById, true));
		// console.log(_.intersection(workingCastById));
	},
	removeAll: function(){
		var self = this;



	},
	render: function(castOverlap){
		var self = this;

		console.log(castOverlap);

		_.each(castOverlap, function(actor){
			var actorModel  = new app.Actor(actor);
			var actorView = new app.ActorView({
				model: actorModel
			});

			actorView.listenTo(self.collection.workingCollection, 'empty', actorView.deleteActor);
			// actorView.listenTo('empty', this.deleteActor);
			self.$el.append(actorView.render().el);
		})
		// self.collection.workingCollection.each(function(model){
		// 	var cast = model.get('cast');
		// 	_.each(cast, function(actor){
		// 		var actorModel  = new app.Actor(actor);
		// 		var actorView = new app.ActorView({
		// 			model: actorModel
		// 		});

		// 		actorView.listenTo(self.collection.workingCollection, 'empty', actorView.deleteActor);
		// 		// actorView.listenTo('empty', this.deleteActor);
		// 		self.$el.append(actorView.render().el);
		// 	})
		// 	// cast.each(function(actor){
		// 	// 	self.$el.append(app.ActorView.render().el);
		// 	// })
		// })
		return this;
	}
});
