// site/js/views/form

var app = app || {};

app.FormView = Backbone.View.extend({
	el: "#searchMedia div",
	// template: _.template($('#formTemplate').html()),
	events: {
		// 'blur .tt-input': 'updateQuery'
	},
	initialize: function(){
		this.collection =  new app.FormCollection();
		this.render();


		// this.listenTo(this.model, 'change', this.render);
		// this.listenTo(this.collection, 'blur', this.addAll);
	}, 
	render: function(){
		this.$el.html('');
		// console.log(this.collection);
		this.collection.each(function(query){
			this.renderQuery(query);
		}, this);

	}, 
	renderQuery: function(query){
		var itemView = new app.QueryView({
			model: query
		});

		this.$el.append( itemView.render().el );
	},
	addAll: function(){
		console.log(this.collection);
		this.collection.each(this.addOne, this);
	},
	addOne: function(query){
		console.log(query);
		var view = new FormView({ model: query});
		$('#searchMedia').append(view.render().el);
	}
});
