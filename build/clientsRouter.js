// import the required modules
const express = require("express");
const app = express();
const mc = require("mongodb").MongoClient;
const config = require("./config.js"); // import the config module which contains the database login and name information
let clientsRouter = express.Router();
const { ObjectId, BSONTypeError } = require('mongodb');
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
		label({ label: 'clientsRouter.js' }),
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

app.use(express.json());

clientsRouter.get("/test", function (req, res, next) {
	res.status(200);
	res.set("Content-Type", "application/json");
	res.json(req.headers.toString());
	return;
});


clientsRouter.get("/count", function (req, res, next) {

	if (check_access(req.headers, res)) {
		mc.connect(config.db.host, function (err, client) {
			db = client.db(config.db.name);
			let clients = db.collection("Clients");
			clients.count(req.query, function (err, result) {
				if (err) { logger.log("error", "UID: " + uid + "  Error message: " + err); throw err; res.status(404).send("Unable to find object"); }
				else {
					res.status(200);
					res.set("Content-Type", "application/json");
					res.json(result);
					return;
				}

			});



		});
	} else {
		res.status(401).send("No access with groups:", groups, jwtToken);
	}




});

// Helper function to check if a string is a valid ObjectId
function isValidObjectId(id) {
    if (ObjectId.isValid(id)) {
        try {
            new ObjectId(id);
            return true;
        } catch (e) {
            return false;
        }
    }
    return false;
}

clientsRouter.get("", async (req, res, next) => {
    if (!check_access(req.headers, res)) {
        res.status(401).send("No access");
        return;
    }

    try {
        const client = await mc.connect(config.db.host);
        const db = client.db(config.db.name);
        const clientsCollection = db.collection("Clients");
        const propertiesCollection = db.collection("Properties");

        const skipping = parseInt(req.query.skip) || 0;
        const limiting = parseInt(req.query.limit) || 0;

        delete req.query.limit;
        delete req.query.skip;

        const clients = await clientsCollection.find(req.query).skip(skipping).limit(limiting).toArray();

        for (let client of clients) {
            if (client.properties && client.properties.length) {
                // Filter out invalid ObjectId strings before conversion
                const propertyIds = client.properties
                    .filter(id => isValidObjectId(id))
                    .map(id => new ObjectId(id));

                if (propertyIds.length > 0) {
                    const properties = await propertiesCollection.find({ _id: { $in: propertyIds } }).toArray();
                    client.properties = properties;
                }
            }
        }

        res.status(200).set("Content-Type", "application/json").json(clients);
    } catch (err) {
        console.error("Error fetching clients:", err);
        res.status(500).send("Internal Server Error");
    }
});


function calculateDaysUntilNextBirthday(birthdayStr, reminder) {
	const today = new Date();
	const currentYear = today.getFullYear();
	const birthday = new Date(birthdayStr);
	
	// Set the birthday year to the current year or the next year if the birthday has already passed
	birthday.setFullYear(currentYear);
	//console.log(today, birthday, birthdayStr)
	if (birthday < today) {
		birthday.setFullYear(currentYear + 1);
	}

	// Calculate the time difference and convert it to days
	const timeDiff = birthday.getTime() - today.getTime();
	const daysUntilBirthday = Math.ceil(timeDiff / (1000 * 3600 * 24));
	//console.log(daysUntilBirthday)
	return daysUntilBirthday;
}

function checkBirthdayReminder(client, reminder) {
	
    if (!client.subscription || !client.subscription.birthday) {
        return false;
    }

    const daysUntilBirthday = calculateDaysUntilNextBirthday(client.client.dateofbirth, reminder);
    
    // Check if the days until birthday falls within the reminder range
    if (daysUntilBirthday > reminder - 1 && daysUntilBirthday <= reminder) {
        return true;
    }

    return false;
}

clientsRouter.get("/getBirthdays", function (req, res, next) {

	let reminder = config.birthday.reminder; //3 day in advance reminder

	mc.connect(config.db.host, function (err, client) {
		db = client.db(config.db.name);
		let clients = db.collection("Clients");
		clients.find().toArray(function (err, result) {
			if (err) { logger.log("error", "UID: " + uid + "  Error message: " + err); throw err; res.status(404).send("Unable to find object"); }
			else {


				let birthdays = [];

				for (c of result) {
					if(checkBirthdayReminder(c, reminder)){
						c.client.id = c['_id']
						birthdays.push(c.client)
					}
				}
				console.log("returning", birthdays)
				res.status(200);
				res.set("Content-Type", "application/json");
				res.json(birthdays);

				return
			}
		});

	});
});

clientsRouter.get("/birthdays", function (req, res, next) {

	let reminder = config.birthday.reminder; //3 day in advance reminder

	if (check_access(req.headers, res)) {
		/////
		mc.connect(config.db.host, function (err, client) {
			db = client.db(config.db.name);
			let clients = db.collection("Clients");
			clients.find().toArray(function (err, result) {
				if (err) { logger.log("error", "UID: " + uid + "  Error message: " + err); throw err; res.status(404).send("Unable to find object"); }
				else {


					let birthdays = [];

					for (c of result) {
						let today = new Date();
						let birthday = new Date(c.client.dateofbirth);
						let time = birthday.getTime() - today.getTime();
						let days = time / (1000 * 3600 * 24);
						//console.log(days)
						if (days > reminder - 1 && days <= reminder && c.subscription.birthday == true) {
							c.client.id = c['_id']
							//console.log(c.client);
							birthdays.push(c.client)

						}
					}
					console.log("returning", birthdays)
					res.status(200);
					res.set("Content-Type", "application/json");
					res.json(birthdays);

					return
				}
			});

		});
	}


});



clientsRouter.get("/emails", function (req, res, next) {

	if (check_access(req.headers, res)) {


		mc.connect(config.db.host, function (err, client) {
			db = client.db(config.db.name);
			let clients = db.collection("Clients");
			clients.find({ "subscription.email": true }).toArray(function (err, result) {
				if (err) { logger.log("error", "UID: " + uid + "  Error message: " + err); throw err; res.status(404).send("Unable to find object"); }
				else

					res.status(200);
				res.set("Content-Type", "application/json");
				let emails = []
				for (c of result) {
					emails.push(c.client)
				}
				res.json(emails);
				return

			});



		});



	}



});

clientsRouter.post("", function (req, res) {
    if (check_access(req.headers, res)) {
        mc.connect(config.db.host, function (err, client) {
            if (err) {
                logger.log("error", "Database connection error: " + err);
                res.status(500).send("Internal Server Error");
                return;
            }

            const db = client.db(config.db.name);
            const clients = db.collection("Clients");

            // Directly insert the new client without checking for email uniqueness
            clients.insertOne(req.body, function (err, result) {
                if (err) {
                    logger.log("error", "Error inserting client: " + err);
                    res.status(500).send("Internal Server Error");
                    return;
                }

                // Assuming MongoDB is used, `result.insertedId` holds the ID of the newly added client
                // Modify the response to include the ID of the newly added client
                res.status(201).set("Content-Type", "application/json").json({ id: result.insertedId });
            });
        });
    }
});



clientsRouter.post("/birthdays/:businessKey", function (req, res, next) {
	let businessKey = req.params.id;
	console.log(businessKey);
	let body = req.body
	let birthday = body.birthday
	let id = ObjectId(body.id)

	mc.connect(config.db.host, function (err, client) {
		db = client.db(config.db.name);
		let clients = db.collection("Clients");
		clients.updateOne({ _id: id }, { $set: { birthday: birthday } }, function (err, result) {
			console.log("Found applicant")
			if (err) { logger.log("error", "UID: " + uid + "  Error message: " + err); throw err; res.status(404).send("Unable to find client"); }
			else {

				console.log(result);
				delete body.birthday;
				updateCamunda(body);

				res.status(200).send();
				return
			}
		});

	});
});


clientsRouter.put("/:id", function (req, res) {
	if (check_access(req.headers, res)) {

		mc.connect(config.db.host, function (err, client) {
			db = client.db(config.db.name);
			let clients = db.collection("Clients");
			let cId = ObjectId(req.params.id);

			clients.updateOne({ _id: cId }, { $set: req.body }, function (err, result) {
				if (err) { logger.log("error", "CID: " + cId + "  Error message: " + err); throw err; res.status(400).send("Unable to replace previous version"); }
				else {
					res.status(200);
					res.set("Content-Type", "application/json");
					res.json(result);
				}


			});
		});

	}




});

clientsRouter.put("/:id/setBirthdayEmail", function (req, res) {
    if (check_access(req.headers, res)) {
        mc.connect(config.db.host, function (err, client) {
            if (err) {
                logger.log("error", "Database connection error: " + err);
                return res.status(500).send("Database connection error");
            }
            const db = client.db(config.db.name);
            const clients = db.collection("Clients");
            const cId = ObjectId(req.params.id);
			console.log(req.body)
            // Define the birthday object to be added/updated in the client document
            const birthdayUpdate = {
                "birthday": {
                    "text": config.birthday.text,
                    "subject": config.birthday.subject,
                    "send": false,
					"scheduled": req.body.client_birthday?req.body.client_birthday:null
                }
            };

            // Update the client document with the new birthday sub-object
            clients.updateOne({ _id: cId }, { $set: birthdayUpdate }, function (err, result) {
                if (err) {
                    logger.log("error", "CID: " + cId + "  Error message: " + err);
                    return res.status(400).send("Unable to update client with birthday info");
                }

                res.status(200).json({
                    "email_body": birthdayUpdate.birthday.text,
                    "email_subject": birthdayUpdate.birthday.subject
                });
            });
        });
    }
});


clientsRouter.put("/:id/update-properties", function (req, res) {
	console.log("in update properties")
	if (check_access(req.headers, res)) {

		mc.connect(config.db.host, function (err, client) {
			db = client.db(config.db.name);
			let clients = db.collection("Clients");
			let cId = ObjectId(req.params.id);
			let propertyIdArray = req.body.map(id => ObjectId(id));
			console.log(propertyIdArray)	
			clients.updateOne({ _id: cId }, { $set: {properties: propertyIdArray} }, function (err, result) {
				if (err) { logger.log("error", "CID: " + cId + "  Error message: " + err); throw err; res.status(400).send("Unable to replace previous version"); }
				else {
					res.status(200);
					res.set("Content-Type", "application/json");
					res.json(result);
				}

			});
		});

	}
});

clientsRouter.delete("/:id/removeProperty", function (req, res, next) {

	if (check_access(req.headers, res)) {
		mc.connect(config.db.host, function (err, client) {
			if (err) throw err;
			//console.log(`We have successfully connected to the ${config.db.name} database.`);

			// Select the database by name
			db = client.db(config.db.name);


			let properties = db.collection("Properties")

			if (ObjectId.isValid(req.params.id)) {

				let cId = ObjectId(req.params.id);
				let pId = ObjectId(req.body.id);

				properties.updateOne({ _id: pId }, { $pull: { clients: cId } }, function (err, result) {
					if (err) { logger.log("error", "UID: " + uid + "  Error message: " + err); throw err; res.status(404).send("Unable to find object"); }
					else {

						res.status(200);
						res.set("Content-Type", "application/json");
						res.json(result);
						return;

					}

				});
			} else {
				res.status(404).send("Invalid ID");
				logger.log("error", "UID: " + uid + "  Error message: 404 Object Not Found");
			}

		});
	}


});

clientsRouter.get("/:id", function (req, res, next) {

	if (check_access(req.headers, res)) {
		mc.connect(config.db.host, function (err, client) {
			if (err) throw err;
			//console.log(`We have successfully connected to the ${config.db.name} database.`);

			// Select the database by name
			db = client.db(config.db.name);

			let clients = db.collection("Clients");
			let properties = db.collection("Properties")

			if (ObjectId.isValid(req.params.id)) {

				let cId = ObjectId(req.params.id);


				clients.findOne({ _id: cId }, function (err, result) {
					if (err) { logger.log("error", "UID: " + uid + "  Error message: " + err); throw err; res.status(404).send("Unable to find object"); }
					else {
						let list_of_properties = result.properties;

						properties.find({ _id: { $in: list_of_properties } }).toArray(function (err, result2) {
							result.properties = result2
							res.status(200);
							res.set("Content-Type", "application/json");
							res.json(result);
							return;
						})
					}

				});
			} else {
				res.status(404).send("Invalid ID");
				logger.log("error", "UID: " + uid + "  Error message: 404 Object Not Found");
			}

		});
	}


});

clientsRouter.post("/preview-email", async function (req, res, next) {

	message = JSON.stringify(req.body);
	try {
		//const response = await fetch(`${process.env.REACT_APP_APP_URL}`, {

		const response = await fetch('http://localhost:8080/engine-rest/process-definition/key/PreviewEmail/start', {
			headers: { "Content-Type": "application/json" },
			method: 'POST',
			body: message
		});

		console.log(response);
		if (!response.ok) {

			throw new Error(
				`This is an HTTP error: status is ${response.status}`
			);
			res.status(500).send("Error starting email preview process");
		} else {

			res.status(204).send();

		}


	} catch (err) {
		console.log(err.message);

	}


});


async function startPreviewEmailProcess(body) {

	message = JSON.stringify(body);
	try {
		//const response = await fetch(`${process.env.REACT_APP_APP_URL}`, {

		const response = await fetch('http://localhost:8080/engine-rest/process-definition/key/PreviewEmail/start', {
			headers: { "Content-Type": "application/json" },
			method: 'POST',
			body: message
		});

		console.log(response);
		if (!response.ok) {

			throw new Error(
				`This is an HTTP error: status is ${response.status}`
			);
			return (500);
		} else {

			return (200);

		}


	} catch (err) {
		console.log(err.message);

	}
}
async function updateCamunda(body) {

	message = JSON.stringify(body);
	try {
		//const response = await fetch(`${process.env.REACT_APP_APP_URL}`, {

		const response = await fetch('http://localhost:8080/engine-rest/message', {
			headers: { "Content-Type": "application/json" },
			method: 'POST',
			body: message
		});

		console.log(response);
		if (!response.ok) {

			throw new Error(
				`This is an HTTP error: status is ${response.status}`
			);
			return (500);
		} else {

			return (200);

		}


	} catch (err) {
		console.log(err.message);

	}


}
module.exports = clientsRouter;
