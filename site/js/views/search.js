// sites/js/views/search.js

var app = app || {};

app.SearchView = Backbone.View.extend({
	el: "#searchMedia", 
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
				if (typeof model.get("_id") === "undefined" || (new Date() -  new Date(model.get("date"))) > 604800000){
					// get a new config object
					$.get("http://api.themoviedb.org/3/configuration?api_key=" + self.apikey)
						.done(function(data){
							self.img.base_url = data.images.base_url;
							self.img.profile_size = data.images.profile_sizes[1];
							model.set(data);	
							model.save();
						});
				} else {
					// there is a valid config object in the db.
					self.img.base_url = model.get("images").base_url;
					self.img.profile_size = model.get("images").profile_sizes[1];
				}
			}, 
			error: function(model){
				// get a new config obj anyway (?)
				$.get("http://api.themoviedb.org/3/configuration?api_key=" + self.apikey)
					.done(function(data){
						self.img.base_url = data.images.base_url;
						self.img.profile_size = data.images.profile_sizes[1];
						model.set(data);	
						model.save();
					});
			}
		})
		
		// TMDBCollection is a getter for the TMDB media api.
		// cast is a getter for the TMDB credits api. 
		// media (localStorage) is where autocorrect stores the quick-pull data from the TMDB media api.
		// workingCast (localStorage) is where the cast info is stored to compute overlap. 
		this.collection = {
			TMDBcollection: new app.MovieCollection(),
			workingCast: new app.WorkingCast(),
			media: [{mediaType: null, TMDBid: null}, {mediaType: null, TMDBid: null}],
			cast: []
		}

		// make sure the workingCast is empty
		this.collection.workingCast.fetch({
			success: function(collection){
				_.invoke(collection.toArray(), "destroy");
			}
		});

		// events
		this.listenTo(this.collection.workingCast, "empty", this.removeAll);
		this.listenTo(this, "checkOverlap", this.getOverlap);
		this.listenTo(this, "gotOverlap", this.render);
		this.listenTo(this, "noResults", this.render);


	}, 
	events: {
		"click #search": "searchTMDB"
		// "typeahead:selected": "processAutocomplete"
	}, 
	searchTMDB: function(e){
		e.preventDefault(); 

		var self = this;

		// emit search event for the queries 
		self.trigger("search");

		// get the number of fields to check
		self.fields = app.queries.collection.size();

		// reset workingCast
		self.working = [];
		self.collection.workingCast.trigger("empty");
		self.collection.workingCast.reset();

		// typeahead will generate extra inputs, so after this.initialize 
		// you must use .tt-input to mean the original inputs. 
		app.queries.collection.each(function(el, i){
			if ((self.collection.TMDBcollection.movieTitle = el.get('query')) != "") {
				if (self.collection.media[i].TMDBid !== null){
					// the movie has been autocompleted and you can trust that this is the right 
					// media title. Init a cast search on it. 
					// console.log("Searching for "+ self.collection.media[i].title + ", " + self.collection.media[i].TMDBid);
					self.getCastList(i, self.collection.media[i].mediaType, self.collection.media[i].TMDBid);
				} else {
					// this didn"t autocomplete so you need to init a new search for it.
					self.collection.TMDBcollection.fetch({
						reset: true,
						success: function (collection, response, options){
							if (collection.length > 0){
								// take the first result returned
								var model = collection.shift();

								self.collection.media[i] = model.toJSON();
								self.getCastList(i, model.get("mediaType"), model.get("TMDBid"));
							} else {
								self.trigger("noResults");
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
		// var self = this; 
		// var i = parseInt(dataset.slice(4), 10);
		// self.collection.media[i] = suggestion;
	},
	getCastList: function(i, mediaType, TMDBid){
		var self = this;
		var cast = self.collection.cast[i];
		// use the appropriate cast collection
		// var cast = self.collection.cast[i];

		// get the media type 
		cast.mediaType = mediaType;
		// get the Mongo ID for saving the cast list into the DB
		// this.collection.cast.id = model.get("_id");
		// get the TMDB id to search by 
		cast.TMDBid = TMDBid;

		// console.log("cast", cast);
		if (cast.mediaType === "movie"){
			cast.fetch({
				success: function(collection, response, options){
					self.working.push(collection);
					self.trigger("checkOverlap", cast);
					// self.working.push(self.collection.workingCast.add(model));

				},
				error: function(collection, response, options){
					console.log("there was an error");
				}
			});
		} else {
			// it"s TV and you need to iterate through the cast list per season
			// thanks TMDB

			var seasons; 
			var promises = [];
			var fullCast; 
			// send request to get the number of seasons
			$.get("http://api.themoviedb.org/3/tv/" + TMDBid, {api_key: "3ad868d8cde55463944788618a489c37"}, function(data, textStatus, jqXHR){

				seasons = data.number_of_seasons;
			}).then(function(){
				_.times(seasons, function(n){
					cast.season = n+1;

					// var url = "http://api.themoviedb.org/3/tv/" + TMDBid + "/season/" + (n+1) + "/credits?api_key=3ad868d8cde55463944788618a489c37";
					// console.log(url);
					var p = cast.fetch({
						success: function(collection, response, options){
							// console.log(collection);
							if (!fullCast){
								fullCast = collection.clone(); 
							} else {
								while(collection.length > 0) {
									var entry = collection.pop();
									if (fullCast.where({TMDBid : entry.get("TMDBid")}).length === 0){
										fullCast.add(entry);
									}
								}
							};
						},
						error: function(collection, response, options){

						}

					});

					promises.push(p);
				});

				$.when.apply($, promises).done(function(){
					// console.log(cast, fullCast);
					self.working.push(fullCast);
					self.trigger("checkOverlap", fullCast);
				});
			});


			

			// send requests for each season
			// _.each(seasons, function(el, i, list){
			// 	$.get("http://api.themoviedb.org/3/tv/" + TMDBid + "/season/" + i + "/credits", {api_key: "3ad868d8cde55463944788618a489c37"}, function(data, textStatus, jqXHR){
			// 		console.log(" cast for season " + i , data.cast);
			// 	});
			// });
		}
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
						name: role.get("name"),
						img: role.get("img"),
						TMDBid: tmdbid,
						character: memo.get("character") + ", " + role.get("character")
					}
				});


				return actorModel;
			})

			self.trigger("gotOverlap", castModels);

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

		if (castOverlap.length){
			_.each(castOverlap, function(actor){
				var actorModel  = new app.Actor(actor);
				actorModel.set({
					"base_url": self.img.base_url,
					"profile_size": self.img.profile_size
				});

				// keep track of the actors with views in the workingCast collection
				self.collection.workingCast.create(actorModel);

				actorView = new app.ActorView({
					model: actorModel
				});

				actorView.listenTo(self.collection.workingCast, "empty", actorView.deleteActor);
				self.$('#actors').append(actorView.render().el);
			});
		} else {
			console.log('NO OVERLAP FOUND');
			actorView = new app.ActorView({
				model: new app.Actor()
			});

			actorView.listenTo(self.collection.workingCast, "empty", actorView.deleteActor);
			self.$('#actors').append(actorView.render().el);
		}

		return this;
	}
	
});
