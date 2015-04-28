// sites/js/views/queryView

var app = app || {}; 

app.QueryView = Backbone.View.extend({
	template: _.template($('#formTemplate').html()),
	initialize: function(){
		this.listenTo(this.model, 'change', this.render);
		this.listenTo(app.tmdb, 'search', this.searchInit);
	},
	events: {
		'blur .tt-input': 'updateQuery'
	},
	updateQuery: function(){
		var self = this; 
		var newQuery = self.$('.tt-input').val().trim();

		if (newQuery){
			self.model.set({ query: newQuery});
			// as of now, the model .hasChange() d. 
			app.tmdb.collection.media[self.model.collection.indexOf(self.model)] = undefined;
		}
	},
	searchInit: function(){
		var self = this; 
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