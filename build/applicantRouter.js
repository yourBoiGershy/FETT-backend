// import the required modules
const express = require("express");
const app = express();
const mc = require("mongodb").MongoClient;
const config = require("./config.js"); // import the config module which contains the database login and name information
let applicantRouter = express.Router();
var ObjectId = require('mongodb').ObjectID;
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
    label({ label: 'applicantRouter.js' }),
    timestamp(),
    myFormat
  ),
  transports: [
	new winston.transports.File({ filename: 'error.log', level: 'error' }),
	new winston.transports.File({ filename: 'combined.log' }),
	]
});




app.use(express.json());

applicantRouter.get("", function (req, res, next){
	let uid = uuid.v4();
	//console.log(uid);
	logger.log("info", "UID: "+uid+" Applicant get request with no ID");
	logger.log("info", "UID: "+uid+" Header: "+JSON.stringify(req.headers));  
	mc.connect(config.db.host, function(err, client) {
		db = client.db(config.db.name);
		let applicantCollection = db.collection("Applicants");
		applicantCollection.findOne({'email': req.headers['remote-user']}, function(err, result2){
			if(err){ logger.log("error", "UID: "+uid+"  Error message: "+err); throw err; res.status(404).send("Unable to find object");}
			else
				//console.log(result2);
				if(result2.length > 0){
					logger.log("info", "UID: "+uid+" FindOne function successful, status code is 200"); 
					res.status(200);
					res.set("Content-Type", "application/json");
					res.json(result2);
				}else{
						res.status(404).send("Unable to find object");
						logger.log("error", "UID: "+uid+"  Error message: 404 Object Not Found");
				}
		});
		
	});
	
});

applicantRouter.get("/:id", function (req, res, next){
	let uid = uuid.v4();
	//console.log(uid);
	logger.log("info", "UID: "+uid+" Applicant get request with ID: "+req.params.id);
	logger.log("info", "UID: "+uid+" Header: "+JSON.stringify(req.headers));  
	mc.connect(config.db.host, function(err, client) {
		if(err) throw err;
		//console.log(`We have successfully connected to the ${config.db.name} database.`);
	
		// Select the database by name
		db = client.db(config.db.name);
		
		let applicantCollection = db.collection("Applicants");
		
		if(ObjectId.isValid(req.params.id)){
			
			let uId = ObjectId(req.params.id);
			
			applicantCollection.find({_id:uId}).toArray(function(err, result){
					
				if(err){  logger.log("error", "UID: "+uid+"  Error message: "+err); throw err; res.status(404).send("Unable to find object");}
				else{
					if(result.length > 0){
						
						logger.log("info", "UID: "+uid+" Find function is success, checking access privileges"); 
						if(req.headers['remote-user'] == result[0].email || req.headers['remote-user'] == result[0].createdby){
							logger.log("info", "UID: "+uid+" Access granted, status code is 200"); 
							res.status(200);
							res.set("Content-Type", "application/json");
							res.json(result);
						}
						else if(result[0].emails !== undefined){
							//check other emails
							console.log(result[0].emails);
							let coapplicant = result[0].emails.find(e => e == req.headers['remote-user']);
							console.log(coapplicant, req.headers['remote-user']);
							if(coapplicant !== undefined){
								logger.log("info", "UID: "+uid+" Access granted to coapplicant, status code is 200"); 
								res.status(200);
								res.set("Content-Type", "application/json");
								let response = {};
								response.PERSONALINFO = result.PERSONALINFO;
								response.ASSETINFO = result.ASSETINFO;
								response.LIABILITYINFO = result.LIABILITYINFO;
								response.OTHERPROPERTIES = result.OTHERPROPERTIES;
								response.index = result.index;
								res.json(result);
							}else{
								logger.log("error", "UID: "+uid+"  Error message: 401 Access Denied");
								res.status(401).send("Access Denied");
							}
							
							
						}else{	
							logger.log("error", "UID: "+uid+"  Error message: 401 Access Denied");
							res.status(401).send("Access Denied");
						}
					}else{
						res.status(404).send("Unable to find object");
						logger.log("error", "UID: "+uid+"  Error message: 404 Object Not Found");
					}
				}
			});
		}else{
			res.status(404).send("Unable to find object");
			logger.log("error", "UID: "+uid+"  Error message: 404 Object Not Found");
		}
		
	});
});

applicantRouter.put("/:id", function  (req, res){
	let uid = uuid.v4();
	//console.log(uid);
	logger.log("info", "UID: "+uid+" Applicant put request with ID: "+req.params.id);
	logger.log("info", "UID: "+uid+" Header: "+JSON.stringify(req.headers));  
	mc.connect(config.db.host, function(err, client) {
		if(err) throw err;
		console.log(`We have successfully connected to the ${config.db.name} database.`);
	
		// Select the database by name
		db = client.db(config.db.name);
		
		let applicantCollection = db.collection("Applicants");
		let changes = req.body;
		if(ObjectId.isValid(req.params.id)){
			let uId = ObjectId(req.params.id);
			applicantCollection.find({_id:uId}).toArray(function(err, result){
					
				if(err){  logger.log("error", "UID: "+uid+"  Error message: "+err); throw err; res.status(404).send("Unable to find object");}
				else{
					if(result.length > 0){
						//console.log(result);
						//console.log(result[0].email);
						//console.log(result[0].createdby);
						logger.log("info", "UID: "+uid+" Find function is success, checking access privileges"); 
						let coapplicant = result[0].emails.find(e => e == req.headers['remote-user']);
						if(req.headers['remote-user'] == result[0].email || req.headers['remote-user'] == result[0].createdby || coapplicant !== undefined){
							logger.log("info", "UID: "+uid+" Access granted, updating record..."); 
							applicantCollection.updateOne({_id:uId}, {$set:changes}, function(err, result2){
								if(err){  logger.log("error", "UID: "+uid+"  Error message: "+err); throw err; res.status(400).send("Unable to replace previous version");}
								else{
									//console.log(result);
										let complete = changes.complete;
										let r;
										if(complete === undefined || complete === false)
											r = updateCamunda(req.params.id, false);
										else
											r = updateCamunda(req.params.id, true);
										
								
										console.log(r);
										if(r == 200){
											res.status(200);
											res.set("Content-Type", "application/json");
											res.json(result2);
										}else{
											res.status(500);
											res.set("Content-Type", "application/json");
											res.json(result2);
										}
								}
										
								
							});
						}
						else{
							logger.log("error", "UID: "+uid+"  Error message: 401 Access Denied");
							res.status(401).send("Access Denied");
						}
					}else{
						res.status(404).send("Unable to find object");
						logger.log("error", "UID: "+uid+"  Error message: 404 Object Not Found");
					}
				}
			});
			
		}else{
			res.status(404).send("Unable to find object");
			logger.log("error", "UID: "+uid+"  Error message: 404 Object Not Found");
		}
	});
});

async function updateCamunda(id, complete){
	let message = {
		"messageName":"UpdateCalled",
		"businessKey":id,
		"processVariables":{
			"complete": {
				"type":"String",
				"value": complete
			},
			"timerCounter":{
				"type":"Integer",
				"value": 2
			},
			"timerExpression":{
				"type":"String",
				"value":"P2D"
			}
		}
		
	};
	message = JSON.stringify(message);
	try {
		//const response = await fetch(`${process.env.REACT_APP_APP_URL}`, {
	
		const response = await fetch('http://localhost:8080/engine-rest/message', {
			headers: { "Content-Type": "application/json" },
			method: 'POST',
			body: message
		});
		
		if (!response.ok) {
		
			throw new Error(
				`This is an HTTP error: status is ${response.status}`
			);
			return(500);
		} else {
			
			return(200);
			
		}
		await response;
	} catch (err) {
		console.log(err.message);
		
	}
	
	
}


module.exports = applicantRouter;
