// Module dependencies

var application_root = __dirname,
	express = require('express'), // web framework
	bodyParser = require('body-parser'), // parser for reading request body
	path = require('path'), // utilities for dealing with filepaths
	mongoose = require('mongoose'); // mongodb integration

// create server
var app = express();

// configure server
app.configure( function(){
	// parses request body and populates request.body
	app.use(express.bodyParser());
	// checks request.body for HTTP method overrides
	app.use(express.methodOverride());
	// perform route lookup based on URL and HTTP method
	app.use(app.router);
	// where to serve static content
	app.use(express.static(path.join(application_root, 'site')));
	// show all erros in development 
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true}));

});

// Routes
// app.get('/api', function(req, res){
// 	res.send('Library API is running');
// });
// get all books
app.get('/api/media', function(req, res){

	// MongoDB function find (conditions, fields, options, callback)
	// but since we are getting all books we only need the callback.
	return MediaModel.find(function(err, media){
		if (!err){
			return res.send(media);
		} else {
			return console.log(err);
		}
	})
}); 
// insert a new book
app.post('/api/media', function (req, res){
	// console.log(req.body);
	var media = new MediaModel({
		title: req.body.title,
		link: req.body.link,
		year: req.body.year, 
		TMDBid: req.body.TMDBid,
		castlink: req.body.castlink
	});

	return media.save(function(err){
		if (!err){
			console.log("created " + media.title + "(" + media.TMDBid + ", _id: " + media._id + ")");
			// we return this because MongoDB creates an _id attribute
			// which the client needs when updating or deleting a specific movie
			return res.send(media);
		} else {
			console.log(err);
		}
	})
});

// update a book
app.put('/api/media', function(req, res){
	console.log('Updating movie ' + req.body.title);
	console.log(req.body);
	return MediaModel.findById(req.body._id, function(err, media){
		if (!err){
			media.title = req.body.title;
			media.link = req.body.link;
			media.year = req.body.releaseDate;
			media.cast = req.body.cast;
			media.castlink = req.body.castlink;
			media.TMDBid = +req.body.id;
		}

		return media.save(function(err){
			if (!err) {
				console.log('media updated');
				console.log(media);
				return res.send(media);
			} else {
				console.log(err);
			}
			return res.send(media);
		});
	});
});
// get a single movie by id
app.get('/api/media/:id', function(req, res){
	return MediaModel.find({ TMDBid: req.params.TMDBid}, function(err, book){
		if (!err){
			return res.send(book);
		} else {
			return console.log(err);
		}
	})
})

// start server 
var port = 4711;
app.listen(port, function(){
	console.log('Express server listening on port %d in %s mode', port, app.settings.env);
});

// connect to database
mongoose.connect('mongodb://localhost/library_database');

// schemas
// var Characters = new mongoose.Schema({
// 	characters: String
// });
var Actors = new mongoose.Schema({
	id: Number,
	name: String, 
	character: String,
	img: String
});

var Media = new mongoose.Schema({
	title: String,
	TMDBid: String,
	popularity: Number,
	mediaType: String,
	cast: [ Actors ]
});

// Models
// var ActorModel = mongoose.model('Actor', Actors);
var MediaModel = mongoose.model('Media', Media);

