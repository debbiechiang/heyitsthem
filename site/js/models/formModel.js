// site/js/models/formModel.js

var app = app || {};

app.FormModel = Backbone.Model.extend({
	defaults: {
		query: null,
		id: null
	}
});