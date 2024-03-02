// import the required modules
const express = require("express");
const app = express();
const mc = require("mongodb").MongoClient;
const config = require("./config.js"); // import the config module which contains the database login and name information
let referRouter = express.Router();
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
    label({ label: 'referRouter.js' }),
    timestamp(),
    myFormat
  ),
  transports: [
	new winston.transports.File({ filename: 'error.log', level: 'error' }),
	new winston.transports.File({ filename: 'combined.log' }),
	]
});



app.use(express.json());

const getUser = async (email) => {
	
}	

referRouter.get("/", function (req, res, next){
	let uid = uuid.v4();
	mc.connect(config.db.host, function(err, client) {
		if(err) throw err;
		console.log(`We have successfully connected to the ${config.db.name} database.`);
	
		// Select the database by name
		db = client.db(config.db.name);
		
		let usersCollection = db.collection("Users");
		usersCollection.find({email: req.headers['remote-user']}).toArray(function(err, result){
			if(result.length > 0){
				logger.log("info", "UID: "+uid+"user found");
				res.status(200);
				res.set("Content-Type", "application/json");
				res.json(result[0]);
			}else{
				res.status(404).send("User not found");
			}
		});
		
	});
	
	
});
 

referRouter.get("/referralby/:id", function (req, res, next){
	let uid = uuid.v4();
	mc.connect(config.db.host, function(err, client) {
		if(err) throw err;
		console.log(`We have successfully connected to the ${config.db.name} database.`);
	
		// Select the database by name
		db = client.db(config.db.name);
		
		let usersCollection = db.collection("Users");
		usersCollection.find({referralcode: req.params.id}).toArray(function(err, result){
			if(result.length > 0){
				logger.log("info", "UID: "+uid+"user found");
				res.status(200);
				res.set("Content-Type", "application/json");
				res.json(result[0].email);
			}else{
				res.status(404).send("User not found");
			}
		});
		
	});
	
	
});

referRouter.post("/newUser", function (req, res, next){
	let uid = uuid.v4();
	logger.log("info", "UID: "+uid+" Adding new User");
	  
	mc.connect(config.db.host, function(err, client) {
		if(err) throw err;
		console.log(`We have successfully connected to the ${config.db.name} database.`);
	
		// Select the database by name
		db = client.db(config.db.name);
		
		let usersCollection = db.collection("Users");
		usersCollection.find({email: req.body.email}).toArray(function(err, result){
				
			if(err){ logger.log("error", "UID: "+uid+"  Error message: "+err); throw err; res.status(400).send("Unable to find object");}
			else{
				//console.log("email", result);
				if(result.length > 0){
					res.status(400).send("Record already exists");
					logger.log("error", "UID: "+uid+" User already exists");
				}else{
					logger.log("info", "UID: "+uid+"no user in db, adding user");
					usersCollection.insertOne({email: req.body.email, name: req.body.name, phone: req.body.phone, referredby: req.body.referralcode}, function(err, result2){
						if(err){ logger.log("error", "UID: "+uid+"  Error message: "+err); throw err; res.status(401).send("Unable to insert referral record");}
						else{
							logger.log("info", "UID: "+uid+" Inserted referral to database successfully, status code 200");
							console.log(result2.insertedId.toString());
							let code = result2.insertedId.toString();
							let changes = {referralcode: code};
							usersCollection.updateOne({email: req.body.email}, {$set:changes}, function(err, result3){
								if(err){  logger.log("error", "UID: "+uid+"  Error message: "+err); throw err; res.status(402).send("Unable to replace previous version");}
								else{
										
									logger.log("info", "UID: "+uid+" added referral to database successfully, status code 200");
									res.status(200);
									res.set("Content-Type", "application/json");
									res.json(result2);
								}
							});
										
						}
					});
				}
			}
		});
		
	});
	
	
	
});

referRouter.put("/byreferralcode", function (req, res, next){
	

	let uid = uuid.v4();
	
	console.log(req.body);
	
	
	mc.connect(config.db.host, function(err, client) {
	if(err) throw err;
	console.log(`We have successfully connected to the ${config.db.name} database.`);

	// Select the database by name
	db = client.db(config.db.name);
	
	let usersCollection = db.collection("Users");
	
	

		
		//find referral by user
	
		usersCollection.find({referralcode: req.body.referralcode}).toArray(function(err, result){
				
			if(err){ logger.log("error", "UID: "+uid+"  Error message: "+err); throw err; res.status(400).send("Unable to find object");}
			else{
				//console.log("email", result);
				if(result.length > 0){
					
					//user exists
					//console.log(result[0]);
					let referral = {
						name: req.body.name,
						email: req.body.email,
						phone: req.body.phone,
						promotion: req.body.promotioncode
					}
					let referrals = result[0].referrals;
					if(referrals === undefined)
						referrals = [];
					referrals.push(referral);
					let changes = {referrals: referrals};
					usersCollection.updateOne({referralcode: req.body.referralcode}, {$set:changes}, function(err, result2){
										if(err){  logger.log("error", "UID: "+uid+"  Error message: "+err); throw err; res.status(401).send("Unable to replace previous version");}
										else{
												
											logger.log("info", "UID: "+uid+" added referral to database successfully, status code 200");
											res.status(200);
											res.set("Content-Type", "application/json");
											res.json(result2);
										}
									});
								
					
					
				}else{
					res.status(400).send("No record with referralcode given found");
				}
			}
		});
		

	});

});
	


referRouter.post("/newreferral", function (req, res, next){
	let referralby, referralto;
	let uid = uuid.v4();
	let email = req.headers['remote-user'];
	console.log(req.body);
	if(email === req.body.email){
			logger.log("error", "UID: "+uid+" same email as referral"); 
			res.status(400).send("Unable to insert referral record");
	}else{
		
		let referralby;
		let referralto;
		mc.connect(config.db.host, function(err, client) {
		if(err) throw err;
		console.log(`We have successfully connected to the ${config.db.name} database.`);
	
		// Select the database by name
		db = client.db(config.db.name);
		
		let usersCollection = db.collection("Users");
		
		
	
			
			//find referral by user
		
			usersCollection.find({email: email}).toArray(function(err, result){
					
				if(err){ logger.log("error", "UID: "+uid+"  Error message: "+err); throw err; res.status(400).send("Unable to find object");}
				else{
					//console.log("email", result);
					if(result.length > 0){
						
						//user exists
						//console.log(result[0]);
						let referral = {
							name: req.body.name,
							email: req.body.email,
							phone: req.body.phone,
							promotion: req.body.promotioncode
						}
						let referrals = result[0].referrals;
						if(referrals === undefined)
							referrals = [];
						referrals.push(referral);
						let changes = {referrals: referrals};
						usersCollection.updateOne({email: email}, {$set:changes}, function(err, result2){
											if(err){  logger.log("error", "UID: "+uid+"  Error message: "+err); throw err; res.status(400).send("Unable to replace previous version");}
											else{
													
												logger.log("info", "UID: "+uid+" added referral to database successfully, status code 200");
												res.status(200);
												res.set("Content-Type", "application/json");
												res.json(result2);
											}
										});
									
						
						
					}else{
						//create record, then add referral
						
						//let referralcode = ("a1b2c3");
						
						let referral = {
							name: req.body.name,
							email: req.body.email,
							phone: req.body.phone,
						}
						usersCollection.insertOne({email: email, referrals: [referral]}, function(err, result2){
							if(err){ logger.log("error", "UID: "+uid+"  Error message: "+err); throw err; res.status(400).send("Unable to insert referral record");}
							else{
							
								//console.log(result2);
								
								logger.log("info", "UID: "+uid+" Inserted referral to database successfully, status code 200");
								console.log(result2.insertedId.toString());
								let code = result2.insertedId.toString();
								let changes = {referralcode: code};
								usersCollection.updateOne({email: email}, {$set:changes}, function(err, result2){
											if(err){  logger.log("error", "UID: "+uid+"  Error message: "+err); throw err; res.status(400).send("Unable to replace previous version");}
											else{
													
												logger.log("info", "UID: "+uid+" added referral to database successfully, status code 200");
												res.status(200);
												res.set("Content-Type", "application/json");
												res.json(result2);
											}
										});
										
								
							
								
							}
						});
					}
					
					
					
					
					
				}
			});
			
	});
		
	
		
	}

});


function sendToCamunda(referedby, referedto, id){
	/*
	try {
		//const response = await fetch(`${process.env.REACT_APP_APP_URL}`, {
	
		const response = await fetch('http://localhost:8080/engine-rest/process-definition/key/PromotionLevel/start', {
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
	
	*/

}

module.exports = referRouter;