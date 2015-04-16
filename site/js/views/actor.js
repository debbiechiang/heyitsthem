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