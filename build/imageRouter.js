// import the required modules
const express = require("express");
const app = express();
const mc = require("mongodb").MongoClient;
const config = require("./config.js"); // import the config module which contains the database login and name information
let imageRouter = express.Router();
var ObjectId = require('mongodb').ObjectID;

//import fetch from 'node-fetch';
//import fetch from 'node-fetch';
const fetch = require('node-fetch');

const uuid = require('node-uuid');
const winston = require("winston");
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

const logger = createLogger({
  format: combine(
    label({ label: 'imageRouter.js' }),
    timestamp(),
    myFormat
  ),
  transports: [
	new winston.transports.File({ filename: 'error.log', level: 'error' }),
	new winston.transports.File({ filename: 'combined.log' }),
	]
});



app.use(express.json());

imageRouter.post("", function (req, res, next){
	let uid = uuid.v4();
	//console.log(uid);
	logger.log("info", "UID: "+uid+" Application post request with no ID");
	logger.log("info", "UID: "+uid+" Header: "+JSON.stringify(req.headers)); 
	//console.log(req.headers);	
	
	let x = req.body.image;

	mc.connect(config.db.host, function(err, client) {
		if(err) throw err;
		console.log(`We have successfully connected to the ${config.db.name} database.`, req.body);
	
	
	
		// Select the database by name
		db = client.db(config.db.name);

	
		let imagesCollection = db.collection("Images");
		
		
		imagesCollection.insertOne({image:x}, function(err, result2){
				if(err){ logger.log("error", "UID: "+uid+"  Error message: "+err); throw err; res.status(400).send("Unable to insert application");}
				else{
				
					//console.log(result2);
					let r = result2.insertedId;
					logger.log("info", "UID: "+uid+" Inserted application to database successfully, status code 200");
					res.status(200);
					res.set("Content-Type", "application/json");
					res.json(r);
				}
		});
				
			
		
		
	});

 
	
	
});

module.exports = imageRouter;