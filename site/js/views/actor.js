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