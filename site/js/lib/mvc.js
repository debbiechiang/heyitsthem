// sites/js/app.js


var app = app || {};

$(function(){
	new app.SearchView();
})
// views/actor.js

var app = app || {};

app.ActorView = Backbone.View.extend({
	tagName: 'li',
	template: _.template( $('#actorTemplate').html() ),

	deleteActor: function(){
		// delete model
		// this.model.destroy();

		// delete view
		this.remove();
	},
	render: function(){
		this.$el.html(this.template(this.model.attributes));
		return this;
	}
})
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
								self.working.push(self.collection.workingCollection.add(movieModel));
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
						self.working.push(self.collection.workingCollection.add(model));
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
			var castModels = [];
			var casts = self.collection.workingCollection.pluck("cast");
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

				console.log('roles', roles);
				console.log('tmdbid', tmdbid);
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

// /models/actor.js

var app = app || {};

app.Actor = Backbone.Model.extend({
	defaults: {
		character : "",
		TMDBid: null,
		name: "",
		img: ""
	}
})
// site/js/models/movie.js

var app = app || {};

app.Movie = Backbone.Model.extend({
	url: '/api/media',
	defaults: {
		title: 'unknown',
		TMDBid: null,
		cast: []
	},
	parse: function( response ) {
	    response.id = response.TMDBid;
	    return response;
	}
});
// /models/actor.js

var app = app || {};

app.Cast = Backbone.Collection.extend({
	model: app.Actor,
	url: function(){ return 'http://api.themoviedb.org/3/' + this.mediaType + '/' + this.TMDBid + '/credits' },
	sync: function(method, model, options){
		options.timeout = 10000;
		options.data = {
			api_key: "3ad868d8cde55463944788618a489c37"
		};
		return Backbone.sync(method, model, options);
	},
	parse: function(response){
		console.log(response.cast);
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
			console.log(parsed);
			return parsed;
		} 
	}
})
// site/js/collections/dbMovie.js

var app = app || {};

app.DBMovieCollection = Backbone.Collection.extend({
	model: app.Movie, 
	url: '/api/media'
});
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
				if (response.results[i].popularity > .005 && (response.results[i].media_type === "movie" || response.results[i].media_type === "tv")){
					var mediaObj = {
						title: (response.results[i].media_type === "movie") ? response.results[i].title : response.results[i].name,
						popularity: response.results[i].popularity,
						TMDBid: response.results[i].id,
						mediaType: response.results[i].media_type
					}
					// TEMPORARILY only return the first result
					return mediaObj
					// parsed.push(mediaObj);
				}
			}
			return parsed;
		} 

	}
});
// site/js/collections/workingMovie.js

var app = app || {};

app.WorkingCollection = Backbone.Collection.extend({
	model: app.Movie
});