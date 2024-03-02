// import the required modules
const express = require("express");
const app = express();
const mc = require("mongodb").MongoClient;
const config = require("./config.js"); // import the config module which contains the database login and name information
let applicationRouter = express.Router();
var ObjectId = require('mongodb').ObjectID;

const uuid = require('node-uuid');
const winston = require("winston");
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

const logger = createLogger({
  format: combine(
    label({ label: 'applicationRouter.js' }),
    timestamp(),
    myFormat
  ),
  transports: [
	new winston.transports.File({ filename: 'error.log', level: 'error' }),
	new winston.transports.File({ filename: 'combined.log' }),
	]
});



app.use(express.json());

applicationRouter.get("", function (req, res, next){
	let uid = uuid.v4();
	//console.log(uid);
	logger.log("info", "UID: "+uid+" Application get request with no ID");
	logger.log("info", "UID: "+uid+" Header: "+JSON.stringify(req.headers));  
	mc.connect(config.db.host, function(err, client) {
		db = client.db(config.db.name);
		let applicationCollection = db.collection("Application");
		applicationCollection.find({'email': req.headers['remote-user']}).toArray(function(err, result2){
			if(err){ logger.log("error", "UID: "+uid+"  Error message: "+err); throw err; res.status(404).send("Object not found");}
			else
				//console.log(result2);
				if(result2.length>0){
					logger.log("info", "UID: "+uid+" Find function successful, status code is 200"); 
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


applicationRouter.get("/:id", function (req, res, next){
	let uid = uuid.v4();
	//console.log(uid);
	logger.log("info", "UID: "+uid+" Application get request with ID"+req.params.id);
	logger.log("info", "UID: "+uid+" Header: "+JSON.stringify(req.headers));  
	mc.connect(config.db.host, function(err, client) {
		if(err) throw err;
		console.log(`We have successfully connected to the ${config.db.name} database.`);
	
		// Select the database by name
		db = client.db(config.db.name);
		
		let applicationCollection = db.collection("Application");
		if(ObjectId.isValid(req.params.id)){
			
			let uId = ObjectId(req.params.id);
			
			applicationCollection.find({_id:uId}).toArray(function(err, result){
					
				if(err){ logger.log("error", "UID: "+uid+"  Error message: "+err); throw err; res.status(400).send("Unable to find object");}
				else{
					if(result.length > 0){
						//console.log(result);
						logger.log("info", "UID: "+uid+" find function is success, checking access privileges"); 
						//if(req.headers['remote-user'] == result[0].createdby){
						if(1==1){
							logger.log("info", "UID: "+uid+" access granted, status 200"); 
							res.status(200);
							res.set("Content-Type", "application/json");
							res.json(result);
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

applicationRouter.get("/byapplicantid/:id", function (req, res, next){
	let uid = uuid.v4();
	//console.log(uid);
	logger.log("info", "UID: "+uid+" Application get by applicant id request with ID "+req.params.id);
	logger.log("info", "UID: "+uid+" Header: "+JSON.stringify(req.headers));  
	mc.connect(config.db.host, function(err, client) {
		if(err) throw err;
		console.log(`We have successfully connected to the ${config.db.name} database.`);
	
		// Select the database by name
		db = client.db(config.db.name);
		
		let applicationCollection = db.collection("Application");
		if(ObjectId.isValid(req.params.id)){
			
			let uId = ObjectId(req.params.id);
			
			applicationCollection.find({applicants: uId}).toArray(function(err, result){
					
				if(err){ logger.log("error", "UID: "+uid+"  Error message: "+err); throw err; res.status(400).send("Unable to find object");}
				else{
					if(result.length > 0){
						//console.log(result[0].createdby, req.headers['remote-user']);
						logger.log("info", "UID: "+uid+" find function is success, checking access privileges"); 
						if(req.headers['remote-user'] == result[0].createdby){
							logger.log("info", "UID: "+uid+" access granted, status 200"); 
							res.status(200);
							res.set("Content-Type", "application/json");
							res.json(result);
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


applicationRouter.post("", function (req, res, next){
	let uid = uuid.v4();
	//console.log(uid);
	logger.log("info", "UID: "+uid+" Application post request with no ID");
	logger.log("info", "UID: "+uid+" Header: "+JSON.stringify(req.headers)); 
	//console.log(req.headers);	
	
	let x = req.body.numPersons;
	let created = req.headers['remote-user'];
	let applicants = [];
	
	for(let i = 1; i < x+1; i ++){
		applicants[i-1] = req.body.data[i];
		applicants[i-1].createdby = created;
		applicants[i-1].state = "MORTGAGEPREFERENCES";
		
		
	}

	mc.connect(config.db.host, function(err, client) {
		if(err) throw err;
		console.log(`We have successfully connected to the ${config.db.name} database.`, req.body);
	
	
	
		// Select the database by name
		db = client.db(config.db.name);

	
		let applicantsCollection = db.collection("Applicants");
		let applicationCollection = db.collection("Application");
		
		logger.log("info", "UID: "+uid+" Locally created applicants, inserting them into database...");
		applicantsCollection.insertMany(applicants, function(err, result){
			
			if(err){ logger.log("error", "UID: "+uid+"  Error message: "+err); throw err; res.status(400).send("Unable to insert applicants");}
			
			else{
				
				logger.log("info", "UID: "+uid+" Inserted applicants into database successfully, inserting application into database...");
				//console.log(result);
				listOfId = [];
				
				for(let i = 0; i < x; i ++){
					listOfId.push(result.insertedIds[i]);
				}
				
				let newApp;
				if(req.body.newApplication === undefined){
					newApp = true;
				}else
					newApp = req.body.newApplication;
				
				let name;
				if(req.body.name === undefined){
					name = "";
				}else
					name = req.body.name;
				let email;
				if(req.body.email === undefined){
					email = "";
				}else
					email = req.body.email;
				let mortgageInfo;
				if(req.body.context === undefined){
					mortgageInfo = {};
				}else{
					mortgageInfo = req.body.context;
					delete mortgageInfo.captcha;
					delete mortgageInfo.email;
					delete mortgageInfo.name;
					delete mortgageInfo.phone;
					
				}
				
				let date = new Date();
				applicationCollection.insertOne({applicants: listOfId, createdby: created, newApplication: newApp, name: name, email: email, activityDate: date, MORTGAGEPREFERENCES: mortgageInfo}, function(err, result2){
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
				
			}
		});
		
		
	});

 
	
	
});
applicationRouter.delete("/:id", function(req, res){
	let uid = uuid.v4();
	//console.log(uid);
	logger.log("info", "UID: "+uid+" Application delete request with ID"+req.params.id);
	logger.log("info", "UID: "+uid+" Header: "+JSON.stringify(req.headers));
	mc.connect(config.db.host, function(err, client) {
		if(err) throw err;
		console.log(`We have successfully connected to the ${config.db.name} database.`);
	
		// Select the database by name
		db = client.db(config.db.name);
		
		let applicationCollection = db.collection("Application");
		if(ObjectId.isValid(req.params.id)){
			let uId = ObjectId(req.params.id);
			
			applicationCollection.find({_id:uId}).toArray(function(err, result){
					
				if(err){ logger.log("error", "UID: "+uid+"  Error message: "+err); throw err; res.status(400).send("Unable to find object");}
				else{
					if(result.length > 0){
						//console.log(result);
						logger.log("info", "UID: "+uid+" found record, checking access privileges"); 
						if(req.headers['remote-user'] == result[0].createdby){
							logger.log("info", "UID: "+uid+" access granted, deleting record..."); 
							applicationCollection.deleteOne({_id:uId}, function(err, result2){
							if(err){ logger.log("error", "UID: "+uid+"  Error message: "+err); throw err; res.status(400).send("Unable to find object");}
							else{
								//console.log(result);
								logger.log("info", "UID: "+uid+" Application has been deleted, status code 200");
								res.status(200);
								res.set("Content-Type", "application/json");
								res.json(result2);
				}
			});
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

applicationRouter.put("/:id", function  (req, res){
	let uid = uuid.v4();
	//console.log(uid);
	//console.log(req.body);
	logger.log("info", "UID: "+uid+" Application put request with ID"+req.params.id);
	logger.log("info", "UID: "+uid+" Header: "+JSON.stringify(req.headers));
	mc.connect(config.db.host, function(err, client) {
		if(err){  console.log("error with mc.connect"); throw err;}
		console.log(`We have successfully connected to the ${config.db.name} database.`);
	
		// Select the database by name
		db = client.db(config.db.name);
		
		let applicationCollection = db.collection("Application");
		let changes = req.body;
		let date = new Date();
		//console.log(changes);
		changes.activityDate = date;
		//console.log(changes);
		if(ObjectId.isValid(req.params.id)){
		
			let uId = ObjectId(req.params.id);
			applicationCollection.find({_id:uId}).toArray(function(err, result){
					
				if(err){  logger.log("error", "UID: "+uid+"  Error message: "+err); throw err; res.status(404).send("Unable to find object");}
				else{
					if(result.length > 0){
						//console.log(result);
						//console.log(result[0].email);
						//console.log(result[0].createdby);
						logger.log("info", "UID: "+uid+" Find function is success, checking access privileges"); 
						
							
							
						applicationCollection.updateOne({_id:uId}, {$set:changes}, function(err, result2){
							if(err){ logger.log("error", "UID: "+uid+"  Error message: "+err);  throw err; res.status(400).send("Unable to find object");}
							else{
								logger.log("info", "UID: "+uid+" Application has been updated, status code 200");
								//console.log(result);
								
								
								
								res.status(200);
								res.set("Content-Type", "application/json");
								res.json(result2);
							}
						});
						}else{
							res.status(404).send("Unable to find object");
							logger.log("error", "UID: "+uid+"  Error message: 404 Object Not Found");
						}
				}
			});
		}
				
	});
});



applicationRouter.put("/:id/newapplication", function (req, res){
	
	let uid = uuid.v4();
	//console.log(uid);
	logger.log("info", "UID: "+uid+" Application put request with ID"+req.params.id);
	logger.log("info", "UID: "+uid+" Header: "+JSON.stringify(req.headers));
	let x = req.body.numPersons;
	let emails = [];
	let created = req.headers['remote-user'];
	let applicants = [];
	
	for(let i = 1; i < x+1; i ++){
		applicants[i-1] = req.body.data[i];
		applicants[i-1].createdby = created;
		applicants[i-1].state = "MORTGAGEPREFERENCES";
		emails[i-1] = applicants[i-1].email;
	}
	for(let i = 0; i < x; i ++){
		applicants[i].emails = emails;
	}

	mc.connect(config.db.host, function(err, client) {
		if(err) throw err;
		//console.log(`We have successfully connected to the ${config.db.name} database.`, req.body);
	
	
	
		// Select the database by name
		db = client.db(config.db.name);

	
		let applicantsCollection = db.collection("Applicants");
		let applicationCollection = db.collection("Application");
		
		logger.log("info", "UID: "+uid+" Locally created applicants, inserting them into database...");
		applicantsCollection.insertMany(applicants, function(err, result){
			
			if(err){ logger.log("error", "UID: "+uid+"  Error message: "+err); throw err; res.status(400).send("Unable to insert applicants");}
			
			else{
				
				logger.log("info", "UID: "+uid+" Inserted applicants into database successfully, inserting application into database...");
				//console.log(result);
				listOfId = [];
				
				for(let i = 0; i < x; i ++){
					listOfId.push(result.insertedIds[i]);
				}
				//changes.applicants = listOfId;
				
				if(ObjectId.isValid(req.params.id)){
					let date = new Date();
					let uId = ObjectId(req.params.id);
					applicationCollection.updateOne({_id:uId}, {$set:{applicants: listOfId, newApplication: false, activityDate: date, emails: emails}}, function(err, result){
						if(err){ logger.log("error", "UID: "+uid+"  Error message: "+err);  throw err; res.status(400).send("Unable to find object");}
						else{
							logger.log("info", "UID: "+uid+" Application has been updated, status code 200");
							//console.log(result);
							let temp = [];
							for (let i of listOfId) {
								console.log(i);
								temp.push({"applicant": i});
							}
							
							temp = JSON.stringify(temp);
							
							
							let r = sendToCamunda(req.body, req.params.id, temp);
							console.log(r);
							if(r == 200){
						
								res.status(200);
								res.set("Content-Type", "application/json");
								res.json(result);
							}else{
								res.status(200);
								res.set("Content-Type", "application/json");
								res.json(result);
							}
							
						}
					});
				}else{
					res.status(404).send("Unable to find object");
					logger.log("error", "UID: "+uid+"  Error message: 404 Object Not Found");
				}
			
				
				
			}
		});
		
		
	});
});

async function sendToCamunda(body, id, ids){
	
	
	
	let message = {
		"messageName":"AddCoApplication",
		"businessKey":id,
		"processVariables":{
			"emails":{
				"valueInfo":{
					"objectTypeName":"java.util.ArrayList", 
					"serializationDataFormat": "application/json"
				},
				"type": "Object", 
				"value": body.emails 
			},
			"ids":{
				"valueInfo":{
					"objectTypeName":"java.util.ArrayList", 
					"serializationDataFormat": "application/json"
				},
				"type": "Object", 
				"value": ids 
			},
			"numPersons":{
				"type":"Integer",
				"value": body.numPersons
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



module.exports = applicationRouter;

