// sites/js/app.js


var app = app || {};

$(function(){
	imdb = new app.SearchView();
})
// views/actor.js

var app = app || {};

app.ActorView = Backbone.View.extend({
	tagName: 'li',
	template: _.template( $('#actorTemplate').html() ),
	initialize: function(){
		this.model.on('destroy', function(){
			console.log('DESTROYED!');
		}, this)
	},
	deleteActor: function(){
		console.log(this.model.get('id'));
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
			media: [],
			cast: []
		}

		// make sure the workingCast is empty
		this.collection.workingCast.fetch({
			success: function(collection){
				_.invoke(collection.toArray(), "destroy");
			}
		});

		// loop through the inputs and: 
		_.each(this.$("input"), function(el, i){
			// create a Cast collection for each input 
			if (typeof self.collection.cast[i] === "undefined"){
				self.collection.cast.push(new app.Cast());
			} 
			
			// init typeahead to get suggestions for correct media properties. 
			$(el).typeahead({
				minLength: 2,
				highlight:true
			}, {
				name: "tmdb" + i,
				source: _.throttle(_.bind(self.getSuggestion, this), 300, {leading: false}),
				displayKey: "title",
				templates: {
					"suggestion": _.template("<p><i class='<%= mediaType %>' /><%= title %> (<%= date %>)</p>")
				}
			});
		}, this);

		// events
		this.listenTo(this.collection.workingCast, "empty", this.removeAll);
		this.listenTo(this, "checkOverlap", this.getOverlap);
		this.listenTo(this, "gotOverlap", this.render);
		this.listenTo(this, "noResults", this.render);


	}, 
	events: {
		"click #search": "searchTMDB",
		"typeahead:selected": "processAutocomplete"
	}, 
	searchTMDB: function(e){
		e.preventDefault(); 

		var self = this;

		// get the number of fields to check
		self.fields = this.$(".tt-input").length;

		// reset workingCast
		self.working = [];
		self.collection.media = [];
		self.collection.workingCast.trigger("empty");
		self.collection.workingCast.reset();

		// typeahead will generate extra inputs, so after this.initialize 
		// you must use .tt-input to mean the original inputs. 
		this.$(".tt-input").each(function(i, el){
			if ((self.collection.TMDBcollection.movieTitle = $.trim($(el).val())) != "") {
				if (typeof self.collection.media[i] != "undefined"){
					// the movie has been autocompleted and you can trust that this is the right 
					// media title. Init a cast search on it. 

					self.getCastList(i, self.collection.media[i].mediaType, self.collection.media[i].TMDBid);
				} else {
					// this didn't autocomplete so you need to init a new search for it.
					self.collection.TMDBcollection.fetch({
						reset: true,
						success: function (collection, response, options){
							if (collection.length > 0){
								// take the first result returned
								var model = collection.shift();

								self.collection.media[i] = model;
								self.getCastList(i, model.get("mediaType"), model.get("TMDBid"));
							} else {
								self.trigger('noResults');
							}
						}, 

						error: function(collection, response, options){
							console.log("There was an error! Possibly there were no results found!")
						}
					});
				}

			}

		});
	}, 
	getSuggestion: function(query, cb){
			var self = this;

			self.collection.TMDBcollection.movieTitle = $.trim(query);

			// fetch the TMDB information for each input
			self.collection.TMDBcollection.fetch({
				reset: true,
				success: function (collection, response, options){
					cb(collection.toJSON());
				}, 

				error: function(collection, response, options){
					console.log("There was an error!")
				}
			})

	},
	processAutocomplete: function(event, suggestion, dataset){
		var self = this; 

		var i = dataset.slice(4);

		self.collection.media[i] = suggestion;
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

		// console.log("cast", cast);

		cast.fetch({
			success: function(collection, response, options){
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


		if (self.working.length === self.fields){
			var castOverlap = [];
			var castModels = [];
			var casts = self.working;
			castOverlap = _.intersection.apply(this, _.map(casts, function(el){
				return el.pluck("TMDBid");
			}));


			castModels = _.map(castOverlap, function(tmdbid, i, list){
				// get the list of roles for this tmdbid. 
				var roles = _.map(casts, function(cast, i, list){
					return cast.findWhere({TMDBid: tmdbid});
				})

				var actorModel = roles.reduce(function(memo, role, i){ 
					return {
						name: role.get('name'),
						img: role.get('img'),
						TMDBid: tmdbid,
						character: role.get('character') + ", " + memo.get('character')
					}
				});


				return actorModel;
			})

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
		var actorView; 
		if (castOverlap){
			_.each(castOverlap, function(actor){
				var actorModel  = new app.Actor(actor);
				actorModel.set({
					'base_url': self.img.base_url,
					'profile_size': self.img.profile_size
				});

				// keep track of the actors with views in the workingCast collection
				self.collection.workingCast.create(actorModel);

				actorView = new app.ActorView({
					model: actorModel
				});

				actorView.listenTo(self.collection.workingCast, 'empty', actorView.deleteActor);
				self.$el.append(actorView.render().el);
			});
		} else {
			actorView = new app.ActorView({
				model: new app.Actor()
			});

			actorView.listenTo(self.collection.workingCast, 'empty', actorView.deleteActor);
			self.$el.append(actorView.render().el);
		}

		return this;
	}
	
});

// /models/actor.js

var app = app || {};

app.Actor = Backbone.Model.extend({
	// idAttribute: 'TMDBid',
	defaults: {
		character : "No overlap found",
		TMDBid: null,
		name: "",
		img: ""
	},
	parse: function( response ) {
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
				if (response.results[i].media_type === "movie" || response.results[i].media_type === "tv"){
					var med = response.results[i];

					var mediaObj = {
						title: (med.media_type === "movie") ? med.title : med.name,
						date: (med.media_type === "movie") ? new Date(med.release_date).getFullYear() : new Date(med.first_air_date).getFullYear(),
						popularity: med.popularity,
						TMDBid: med.id,
						mediaType: med.media_type,
						poster: med.poster_path 
					}
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
// site/js/collections/workingMovie.js

var app = app || {};

app.WorkingCast = Backbone.Collection.extend({
	model: app.Actor, 
	url: '/api/actor', 
	localStorage: new Backbone.LocalStorage('whosthat-workingCast')
});