// sites/js/views/queryView

var app = app || {}; 

app.QueryView = Backbone.View.extend({
	template: _.template($('#formTemplate').html()),
	initialize: function(){
		this.listenTo(this.model, 'change', this.render);
		this.listenTo(app.tmdb, 'search', this.searchInit);
	},
	events: {
		"typeahead:selected": "updateQuery",
		"blur .tt-input": "updateQuery"
	},
	updateQuery: function(event, suggestion, dataset){
		var self = this; 
		if (event.type === "typeahead:selected"){
			// process autocomplete
			var self = this; 
			var i = parseInt(dataset.slice(4), 10);
			var query = self.$('.tt-input').val().trim();

			// save the autocompletes
			app.tmdb.collection.media[i] = suggestion;

			// also save the query
			self.model.set({query: query});
			self.model.save();
		} else {
			// process a focusout
			var newQuery = self.$('.tt-input').val().trim();
			var oldQuery = self.model.get('query');

			if (oldQuery !== null && oldQuery !== newQuery){
				// as of now, the model .hasChange() d. 
				// the query is no longer what was last autocompleted, so reset the 
				// TMDBid of the media collection.
				app.tmdb.collection.media[self.model.collection.indexOf(self.model)].TMDBid = null;
			}
		}

	},
	searchInit: function(){
		var self = this; 
		var query = self.$('.tt-input').val().trim();

		self.model.set({query: query});
		self.model.save();
	},
	render: function(){
		var self = this; 
		var i = self.model.collection.indexOf(self.model);

		self.$el.html(self.template({mod: self.model})); 
		self.$('input').typeahead({
			minLength: 2,
			highlight:true
		}, {
			name: "tmdb" + i,
			source: _.throttle(_.bind(app.tmdb.getSuggestion, app.tmdb), 300, {leading: false}),
			displayKey: "title",
			templates: {
				"suggestion": _.template("<p><i class='<%= mediaType %>' /><%= title %> (<%= date %>)</p>")
			}
		});
		if (typeof app.tmdb.collection.cast[i] === "undefined"){
			app.tmdb.collection.cast.push(new app.Cast());
		} 
		return self;
	}
	
});