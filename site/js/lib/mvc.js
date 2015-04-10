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
		console.log('trying to delete '+ this.model.get('name'));
		// delete model
		this.model.destroy();

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
	fields: null,
	working: [],
	initialize: function(){
		var self = this;

		// get the TMDB config object
		var conf = new app.Config();

		conf.fetch({
			success: function(model){
				// only get new configs if there is no record in DB, or if >1 week has passed.
				if (typeof model.get('_id') === "undefined" || (new Date() -  new Date(model.get('date'))) > 604800000){
				// get a new config object
					$.get("http://api.themoviedb.org/3/configuration?api_key=" + self.apikey)
						.done(function(data){
							self.img.base_url = data.images.base_url;
							self.img.profile_size = data.images.profile_sizes[0];
							model.set(data);	
							model.save();
						});
				} else {
					// there is a valid config object in the db.
					self.img.base_url = model.get('images').base_url;
					self.img.profile_size = model.get('images').profile_sizes[0];
				}
			}, 
			error: function(model){

			}
		})


		this.collection = {
			TMDBcollection: new app.MovieCollection(),
			workingCast: new app.WorkingCast(),
			cast: []
		}

		// make sure the workingCast is empty
		this.collection.workingCast.fetch({
			success: function(collection){
				_.invoke(collection.toArray(), "destroy");
			}
		})

		this.listenTo(this, 'checkOverlap', this.getOverlap);
		this.listenTo(this.collection.workingCast, 'empty', this.removeAll);
		this.listenTo(this, 'gotOverlap', this.render);

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

		$('#searchMedia div').children('input').each(function(i, el){
			if ((self.collection.TMDBcollection.movieTitle = $.trim($(el).val())) != "") {

				// create a Cast collection for each input 
				if (typeof self.collection.cast[i] === "undefined"){
					self.collection.cast.push(new app.Cast());
				} 

				// fetch the TMDB information for each input
				self.collection.TMDBcollection.fetch({
					reset: true,
					success: function (collection, response, options){
						// at this point, you just got some JSON from the Rotten Tomatoes server. 
						// It's in the form of a model, but it's not saved to any collections. 
						collection.each(function(model){
							self.getCastList(i, model.get('mediaType'), model.get('TMDBid'));
						});

					}, 

					error: function(collection, response, options){
						console.log("There was an error!")
					}
				});
			}

		});
	}, 
	getCastList: function(i, mediaType, TMDBid){
		var self = this;

		// use the appropriate cast collection
		var cast = self.collection.cast[i];

		// get the media type 
		cast.mediaType = mediaType;
		// get the Mongo ID for saving the cast list into the DB
		// this.collection.cast.id = model.get('_id');
		// get the TMDB id to search by 
		cast.TMDBid = TMDBid;

		cast.fetch({
			success: function(collection, response, options){
				console.log("successfully fetched cast list")
				self.working.push(collection);
				self.trigger('checkOverlap', cast);
				// self.working.push(self.collection.workingCast.add(model));

			},
			error: function(collection, response, options){
				console.log("there was an error");
			}
		});


	},
	getOverlap: function(castCollection){
		var self = this;
		// this needs to be a Promise, somehow
		if (self.working.length === self.fields){
			var castOverlap = [];
			var castModels = [];
			var casts = self.working;
			// console.log("casts: ", casts);
			castOverlap = _.intersection.apply(this, _.map(casts, function(el){
				return el.pluck("TMDBid");
			}));

			// console.log("castOverlap: " , castOverlap);

			castModels = _.map(castOverlap, function(tmdbid, i, list){
				// get the list of roles for this tmdbid. 
				var roles = _.map(casts, function(cast, i, list){
					return cast.findWhere({TMDBid: tmdbid});
				})

				// console.log('roles', roles);
				// console.log('tmdbid', tmdbid);
				var actorModel = roles.reduce(function(memo, role, i){ 
					// console.log('memo', memo);
					return {
						name: role.get('name'),
						img: role.get('img'),
						TMDBid: tmdbid,
						character: memo.get('character') + ", " + role.get('character')
					}
				});

				// console.log('actorModel', actorModel);

				return actorModel;
			})

			// console.log("castModels: ", castModels);
			self.trigger('gotOverlap', castModels);

			// destroy the castCollections
			_.each(self.collection.cast, function(castCollection){
				_.invoke(castCollection.toArray(), "destroy")
				castCollection.mediaType = null;
				castCollection.TMDBid = null;
			});

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

// /models/actor.js

var app = app || {};

app.Actor = Backbone.Model.extend({
	// idAttribute: 'TMDBid',
	defaults: {
		character : "",
		TMDBid: null,
		name: "",
		img: ""
	},
	parse: function( response ) {
	    response.id = response._id;
	    return response;
	}
})
// /site/js/model/config.js

var app = app || {};

app.Config = Backbone.Model.extend({
	urlRoot: '/api/config', 
	parse: function(response){
		response.id = response._id;
		return response;
	}
});
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
		} else {
			console.log("TMDB has no record of that title!");
		}

	}
});
// site/js/collections/workingMovie.js

var app = app || {};

app.WorkingCast = Backbone.Collection.extend({
	model: app.Actor, 
	url: '/api/actor'
});