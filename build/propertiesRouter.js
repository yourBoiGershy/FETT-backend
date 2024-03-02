// import the required modules
const express = require("express");
const app = express();
const mc = require("mongodb").MongoClient;
const config = require("./config.js"); // import the config module which contains the database login and name information
let propertiesRouter = express.Router();
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
		label({ label: 'propertiesRouter.js' }),
		timestamp(),
		myFormat
	),
	transports: [
		new winston.transports.File({ filename: 'error.log', level: 'error' }),
		new winston.transports.File({ filename: 'combined.log' }),
	]
});


//const production = true
const production = false


function check_access(req_headers, res) {
	let jwtToken = req_headers['token-user'];

	if (jwtToken !== undefined) {

		try {
			jwtToken = JSON.parse(Buffer.from(jwtToken.split('.')[1], 'base64').toString());
			logger.log("info", "jwt token: ", jwtToken);
			let groups = jwtToken['https://login.olenamortgages.com/roles']
			logger.log("info", "groups: ", groups);
			if (groups !== undefined) {

				for (g in groups) {
					let group = groups[g]

					if (group == "internal") {
						return true
					}
				}
			}
		} catch (Exception) {

		}
	}
	if (production) {
		res.status(401).send("Access Denied");
		return false
	} else
		return true
}

propertiesRouter.get("", function (req, res, next) {


	mc.connect(config.db.host, function (err, client) {
		db = client.db(config.db.name);
		let properties = db.collection("Properties");
		properties.find().toArray(function (err, result) {
			if (err) { logger.log("error", "UID: " + uid + "  Error message: " + err); throw err; res.status(404).send("Unable to find object"); }
			else {

				res.status(200);
				res.set("Content-Type", "application/json");

				res.json(result);
				return;
			}

		});



	});




});

propertiesRouter.get("/:id/findClient", function (req, res) {

	mc.connect(config.db.host, function (err, client) {
		db = client.db(config.db.name);

		let clients = db.collection("Clients");

		let insertedId;


		clients.find(req.query).toArray(function (err, result) {
			if (err) { logger.log("error", "UID: " + uid + "  Error message: " + err); throw err; res.status(400).send("Unable to insert application"); }
			else {

				res.status(200);
				res.set("Content-Type", "application/json");

				res.json(result);
				return;
			}
		});
	});



});

propertiesRouter.get("/getRenewals", async (req, res, next) => {
	if (check_access) {
		let reminder = config.renewal.reminder; //3 month in advance reminder
		let timer = config.renewal.emailTimer
		mc.connect(config.db.host, async (err, client) => {
			db = client.db(config.db.name);
			let properties = db.collection("Properties");
			let clients = db.collection("Clients")
			let emailCollection = db.collection("Emails")

			let date = new Date();
			let emailTimer = date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate()+"T19:00:00"
			//date = date.toLocaleDateString()
			//console.log(date, date.getMonth())
			
			date.setMonth(date.getMonth() + reminder);
			
			//months are based on a 0-11 scale, so we need to add 1 to get whats in DB, and mod 13 to ensure we dont get a number > 12
			let d = date.getMonth()+1 + "/" + date.getDate() + '/' + date.getFullYear()
			//console.log(d)

			let p = await properties.find({ renewaldate: d }).project({_id: true, renewal_email: true, clients: true}).toArray()
			

			for(index in p){
				//console.log(p[index])
				list_of_clients = p[index].clients
				let c = await clients.find({ _id: { $in: list_of_clients }, 'subscription.renewal': true, 'client.email': {$exists: true} }).project({client: {email: true}}).toArray()		
				let to = ""
				console.log(c, c.client)
				for (client of c)
					to += client.client.email + ","

				

				if(p[index].renewal_email === undefined){ //if no email history
					
					let e = await emailCollection.insertOne({active: true, emailTimer: emailTimer, to: to, type: "renewal"})
					p[index].renewal_email = e.insertedId
					await properties.updateOne({_id: p[index]['_id']}, {$set: {renewal_email: [e.insertedId]}})
				}else{
					let eId = new ObjectId(p[index].renewal_email[p[index].renewal_email.length-1])
					let email = await emailCollection.findOne({_id: eId})
					console.log(email, eId)
					if(email.active == false){ //if email history exists but no active email
						let e = await emailCollection.insertOne({active: true, emailTimer: emailTimer, to: to, type: "renewal"})
						
						p[index].renewal_email.push(e.insertedId)
						await properties.updateOne({_id: p[index]['_id']}, {$push: {renewal_email: e.insertedId}})
					}
				}
			}

			res.status(200).send(p)

		});
		//res.status(500).send("Internal error")
	}else
		res.status(403).send("Access Denied")

});

async function getClients(list_of_ids){
	mc.connect(config.db.host, async function (err, client) {
		db = client.db(config.db.name);
		
		let clients = db.collection("Clients");
		let c = await clients.find({ _id: { $in: list_of_ids } }).toArray()
	
		return c
	});
}

propertiesRouter.get("/:id/for_renewals/:email_id", async (req, res, next) => {
	
	mc.connect(config.db.host, async (err, client) => {
		db = client.db(config.db.name);
		let properties = db.collection("Properties");
		let clients = db.collection("Clients");
		let emailCollection = db.collection("Emails")
		let cId = ObjectId(req.params.id);
		let eId = ObjectId(req.params.email_id);


		properties.findOne({ _id: cId }, async (err, result) => {
			if (err) { logger.log("error", "UID: " + uid + "  Error message: " + err); res.status(404).send("Unable to find object"); throw err; }
			else {
				//console.log(result)
				if(result.renewal_email === undefined){ //if no email history
					console.log("not active")
					res.status(404).send;
					return
				}else{
					let eId = new ObjectId(result.renewal_email[result.renewal_email.length-1])
					let email = await emailCollection.findOne({_id: eId})
					console.log(email)
					if(email.active == false){ //if email history exists but no active email
						console.log("not active")
						res.status(404).send;
						return
					}
				}
				
				let list_of_clients = result.clients

				list_of_clients = list_of_clients.map(function (id) { return ObjectId(id); });


				//properties.find({ _id: {$in: list_of_clients}}, function (err, result2){

				clients.find({ _id: { $in: list_of_clients }, 'subscription.renewal': true, 'client.email': {$exists: true} }).project({_id: true, client: true, renewal_email: true}).toArray(async (err, result2) => {
					if (err) { logger.log("error", "UID: " + uid + "  Error message: " + err); res.status(404).send("Unable to find object"); throw err; }
					result.clients = result2
					
					let emails = "";
					for (client of result2){
						emails += client.client.email+","
					}
					if(emails.length > 0)
						emails = emails.slice(0, -1)
					result.emails = emails
					console.log(eId)
					let email_data = await emailCollection.findOne({_id: eId})
					console.log(email_data)
					if(email_data == null || email_data.active != true ){
						res.status(404).send("Email is no longer active")
						return
					}

					result.renewal = email_data
					res.status(200);
					res.set("Content-Type", "application/json");
					res.json(result);
					return;
				})
				

			



			}

		});
	})
})

propertiesRouter.get("/:id", function (req, res, next) {
    mc.connect(config.db.host, function (err, client) {
        if (err) {
            logger.log("error", "Database connection error: " + err);
            res.status(500).send("Internal Server Error");
            return;
        }

        const db = client.db(config.db.name);
        let properties = db.collection("Properties");
        let clients = db.collection("Clients");
        let propertyId = ObjectId(req.params.id);

        properties.findOne({ _id: propertyId }, function (err, propertyResult) {
            if (err || !propertyResult) {
                logger.log("error", "UID: " + uid + "  Error message: " + err);
                res.status(404).send("Unable to find property");
                return;
            }

            // Search for clients that have this property ID in their properties list
            clients.find({ properties: propertyId }).toArray(function (err, clientResults) {
                if (err) {
                    logger.log("error", "UID: " + uid + "  Error message: " + err);
                    res.status(500).send("Internal Server Error");
                    return;
                }

                // Update the clients array of the property
                propertyResult.clients = clientResults;

                res.status(200);
                res.set("Content-Type", "application/json");
                res.json(propertyResult);
            });
        });
    });
});
/*
propertiesRouter.get("/:id", function (req, res, next) {


	mc.connect(config.db.host, function (err, client) {
		db = client.db(config.db.name);
		let properties = db.collection("Properties");
		let clients = db.collection("Clients");
		let cId = ObjectId(req.params.id);


		properties.findOne({ _id: cId }, function (err, result) {
			if (err) { logger.log("error", "UID: " + uid + "  Error message: " + err); throw err; res.status(404).send("Unable to find object"); }
			else {

				let list_of_clients = result.clients

				list_of_clients = list_of_clients.map(function (id) { return ObjectId(id); });


				//properties.find({ _id: {$in: list_of_clients}}, function (err, result2){

				clients.find({ _id: { $in: list_of_clients } }).toArray(function (err, result2) {

					result.clients = result2
					res.status(200);
					res.set("Content-Type", "application/json");
					res.json(result);
					return;
				})



			}

		});



	});

});
*/



propertiesRouter.post("", function (req, res) {
	req.body.clients = [];
	mc.connect(config.db.host, function (err, client) {
		db = client.db(config.db.name);
		let properties = db.collection("Properties");
		properties.insertOne(req.body, function (err, result) {
			if (err) { logger.log("error", "UID: " + uid + "  Error message: " + err); throw err; res.status(400).send("Unable to insert application"); }
			else {
				res.status(200);
				res.set("Content-Type", "application/json");
				res.json(result);
				return
			}
		});
	});


});


propertiesRouter.put("/:id", function (req, res) {



	mc.connect(config.db.host, function (err, client) {
		db = client.db(config.db.name);
		let properties = db.collection("Properties");
		let cId = ObjectId(req.params.id);
		//let data = req.body;

		properties.updateOne({ _id: cId }, { $set: req.body }, function (err, result) {
			if (err) { logger.log("error", "CID: " + cId + "  Error message: " + err); throw err; res.status(400).send("Unable to replace previous version"); }
			else {
				res.status(200);
				res.set("Content-Type", "application/json");
				res.json(result);
			}


		});
	});



});

propertiesRouter.post("/:id/newClient", function (req, res) {
    mc.connect(config.db.host, function (err, client) {
        if (err) {
            logger.log("error", "Database connection error: " + err);
            res.status(500).send("Internal Server Error");
            return;
        }

        const db = client.db(config.db.name);
        const clients = db.collection("Clients");

        clients.findOne({ 
            "client.firstname": req.body.firstname, 
            "client.lastname": req.body.lastname, 
            "client.dateofbirth": req.body.dateofbirth 
        }, function (err, existingClient) {
            if (err) {
                logger.log("error", "Error finding client: " + err);
                res.status(500).send("Internal Server Error");
                return;
            }

            if (existingClient) {
                res.status(400).send("Client already exists");
                return;
            }

            const newClientData = {
                client: {
                    firstname: req.body.firstname,
                    lastname: req.body.lastname,
                    dateofbirth: req.body.dateofbirth,
                    email: req.body.email,
                    phone: req.body.phone
                },
                subscription: {},
                properties: [ObjectId(req.params.id)]
            };

            clients.insertOne(newClientData, function (err, result) {
                if (err) {
                    logger.log("error", "Error inserting client: " + err);
                    res.status(500).send("Internal Server Error");
                    return;
                }

                // Return the inserted client data
                res.status(200).json(newClientData);
            });
        });
    });
});

propertiesRouter.put("/:id/addExistingClients", function (req, res) {
    mc.connect(config.db.host, function (err, client) {
        if (err) {
            logger.log("error", "Database connection error: " + err);
            res.status(500).send("Internal Server Error");
            return;
        }

        const db = client.db(config.db.name);
        const properties = db.collection("Properties");
        const clients = db.collection("Clients");
        const cId = ObjectId(req.params.id);
        const newListOfClientIds = req.body.add.map(clientId => ObjectId(clientId));

        properties.findOne({ _id: cId }, function (err, property) {
            if (err) {
                logger.log("error", "Error finding property: " + err);
                res.status(500).send("Internal Server Error");
                return;
            }

            const currentClientIds = property.clients || [];
            const clientsToRemovePropertyFrom = currentClientIds.filter(id => !newListOfClientIds.includes(id));

            clients.updateMany({ _id: { $in: clientsToRemovePropertyFrom } }, { $pull: { properties: cId } }, function (err, removeResult) {
                if (err) {
                    logger.log("error", "Error updating clients: " + err);
                    res.status(500).send("Internal Server Error");
                    return;
                }

                clients.updateMany({ _id: { $in: newListOfClientIds } }, { $addToSet: { properties: cId } }, function (err, addResult) {
                    if (err) {
                        logger.log("error", "Error updating clients: " + err);
                        res.status(500).send("Internal Server Error");
                        return;
                    }

                    properties.updateOne({ _id: cId }, { $set: { clients: newListOfClientIds } }, function (err, updateResult) {
                        if (err) {
                            logger.log("error", "Error updating property: " + err);
                            res.status(500).send("Internal Server Error");
                            return;
                        }

                        // Fetch the new list of clients and return them
                        clients.find({ _id: { $in: newListOfClientIds } }).toArray(function (err, updatedClients) {
                            if (err) {
                                logger.log("error", "Error retrieving updated clients: " + err);
                                res.status(500).send("Internal Server Error");
                                return;
                            }
							console.log(updatedClients, newListOfClientIds)
                            res.status(200).set("Content-Type", "application/json").json(updatedClients);
                        });
                    });
                });
            });
        });
    });
});





propertiesRouter.delete("/:id", function (req, res) {

	mc.connect(config.db.host, function (err, client) {
		db = client.db(config.db.name);
		let properties = db.collection("Properties");
		let cId = ObjectId(req.params.id);


		properties.findOne({ _id: cId }, function (err, result) {
			if (err) { logger.log("error", "cId: " + cId + "  Error message: " + err); throw err; res.status(404).send("Unable to find object"); }
			else {

				properties.deleteOne({ _id: cId }, function (err, result2) {
					if (err) { logger.log("error", "cId: " + cId + "  Error message: " + err); throw err; res.status(400).send("Unable to find object"); }
					else {
						//console.log(result);
						logger.log("info", "cId: " + cId + " property has been deleted, status code 200");
						res.status(200);
						res.set("Content-Type", "application/json");
						res.json(result2);
					}
				});

			}

		});



	});

})



propertiesRouter.delete("/:id/deleteClients", function (req, res) {

	mc.connect(config.db.host, function (err, client) {
		db = client.db(config.db.name);
		let properties = db.collection("Properties");
		let cId = ObjectId(req.params.id);
		//let data = req.body;
		properties.findOne({ _id: cId }, function (err, r) {
			if (err) { logger.log("error", "CID: " + cId + "  Error message: " + err); throw err; res.status(400).send("Unable to replace previous version"); }
			else {
				let list_of_clients = r.clients
				let index = list_of_clients.indexOf(req.body)
				list_of_clients.splice(index, 1)

				properties.updateOne({ _id: cId }, { $set: { clients: list_of_clients } }, function (err, result2) {
					if (err) { logger.log("error", "CID: " + cId + "  Error message: " + err); throw err; res.status(400).send("Unable to replace previous version"); }
					else {
						res.status(200);
						res.set("Content-Type", "application/json");
						res.json(list_of_clients);
					}


				});

			}
		});

	});

})








app.use(express.json());
module.exports = propertiesRouter;