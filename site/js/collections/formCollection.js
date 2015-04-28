// site/js/collections/formCollection.js

var app = app || {};

app.FormCollection = Backbone.Collection.extend({
	model: app.FormModel,
	localStorage: new Backbone.LocalStorage('whosthat-formCollection'),
	initialize: function(){
		this.fetch();
		if (this.size() === 0){
			// default to 2 inputs
			this.create();
			this.create();
		}
	}
});

