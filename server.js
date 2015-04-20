// Module dependencies

var application_root = __dirname,
	express = require('express'), // web framework
	bodyParser = require('body-parser'), // parser for reading request body
	path = require('path'), // utilities for dealing with filepaths
	mongoose = require('mongoose'); // mongodb integration

// create server
var app = express();

app = express();  
var port = process.env.OPENSHIFT_NODEJS_PORT ||  process.env.OPENSHIFT_INTERNAL_PORT || 4711;  
var ipaddr = process.env.OPENSHIFT_NODEJS_IP || process.env.OPENSHIFT_INTERNAL_IP || 'localhost';  


var url = 'mongodb://localhost/library_database';
// var port = process.env.PORT || 4711;

// if OPENSHIFT env variables are present, use the available connection info:
if (process.env.OPENSHIFT_MONGODB_DB_URL) {
	url = process.env.OPENSHIFT_MONGODB_DB_URL + process.env.OPENSHIFT_APP_NAME;
}

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

console.log(url);

var connect = function(){
	mongoose.connect(url);
}

connect();

var db = mongoose.connection;

db.on('error', function(error){
	console.log('Error loading the db -- ' + error);
});

db.on('disconnected', connect);

// start server 
app.listen(port, ipaddr, function(){
	console.log('Express server listening on port %d in %s mode', port, app.settings.env);
});

// connect to database
// mongoose.connect(OPENSHIFT_MONGODB_DB_URL);
// mongoose.connect('mongodb://localhost/library_database');

// Routes
// get the config object
app.get('/api/config', function(req, res){
	return ConfigModel.findOne(function(err, config){
		if (!err){
			return res.send(config);
		} else {
			return console.log(err);
		}
	})
});
// post new config object
app.post('/api/config', function(req, res){
	var config = new ConfigModel({
		date: new Date(),
		images: req.body.images,
		change_keys: req.body.change_keys
	}); 

	return config.save(function(err){
		if (!err){ 
			console.log("saved new TMDB config object"); 
			return res.send(config)
		} else {
			return console.log(err);
		}
	})
})

// update the config object
app.put('/api/config/:id', function(req, res){
	console.log('Inputting an updated config object');
	return ConfigModel.findById(req.body.id, function(err, config){
		if (!err){
			config.date = new Date();
			config.images = req.body.images;
			config.change_keys = req.body.change_keys;
		}

		return config.save(function(err, config){
			if (!err){
				return res.send(config);
			} else {
				console.log(err)
			}

			return res.send(config);
		})
	})
});

// schemas
var Actors = new mongoose.Schema({
	TMDBid: Number,
	name: String, 
	character: String,
	img: String
});

var Config = new mongoose.Schema({
	images: mongoose.Schema.Types.Mixed,
	change_keys: Array,
	date: Date, 
	id: Number
})

// Models
var ActorModel = mongoose.model('Actor', Actors);
var ConfigModel = mongoose.model('Config', Config);


