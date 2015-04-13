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
				source: _.throttle(_.bind(self.getSuggestion, this), 500, {leading: false}),
				displayKey: "title",
				templates: {
					"suggestion": _.template("<p><i class='<%= mediaType %>' /><%= title %></p>")
				}
			});
		}, this);

		this.listenTo(this, "checkOverlap", this.getOverlap);
		this.listenTo(this.collection.workingCast, "empty", this.removeAll);
		this.listenTo(this, "gotOverlap", this.render);

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
		self.collection.workingCast.trigger("empty");
		self.collection.workingCast.reset();

		// typeahead will generate extra inputs, so after this.initialize 
		// you must use .tt-input to mean the original inputs. 
		this.$(".tt-input").each(function(i, el){
			if ((self.collection.TMDBcollection.movieTitle = $.trim($(el).val())) != "") {

				self.collection.TMDBcollection.fetch({
					reset: true,
					success: function (collection, response, options){
						// at this point, you just got some JSON from the Rotten Tomatoes server. 
						// It's in the form of a model, but it's not saved to any collections. 
						collection.each(function(model){
							self.getCastList(i, model.get("mediaType"), model.get("TMDBid"));
						});

					}, 

					error: function(collection, response, options){
						console.log("There was an error!")
					}
				});

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
					// at this point, you just got some JSON from the Rotten Tomatoes server. 
					// It's in the form of a model, but it's not saved to any collections. 
					// collection.each(function(model){
						// self.getCastList(i, model.get('mediaType'), model.get('TMDBid'));
					// });
					// console.log(collection.toJSON());
					cb(collection.toJSON());
					// return collection

				}, 

				error: function(collection, response, options){
					console.log("There was an error!")
				}
			})

	},
	processAutocomplete: function(event, suggestion, dataset){
		console.log( suggestion );
	},
	getCastList: function(i, mediaType, TMDBid){
		var self = this;
		console.log(i, mediaType, TMDBid);
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
						character: memo.get('character') + ", " + role.get('character')
					}
				});


				return actorModel;
			})

			// console.log(castOverlap);
			// console.log(castModels);

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
