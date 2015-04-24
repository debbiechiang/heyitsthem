// sites/js/app.js


var app = app || {};

$(function(){
	app.tmdb = new app.SearchView();
	app.queries = new app.FormView();
})