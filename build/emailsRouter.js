// import the required modules
const express = require("express");
const app = express();
const mc = require("mongodb").MongoClient;
const config = require("./config.js"); // import the config module which contains the database login and name information
let emailsRouter = express.Router();
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

emailsRouter.get("/getNewsletterEmails", async (req, res, err) => {

	mc.connect(config.db.host, async (err, client) => {

		res.status(200);
		res.set("Content-Type", "application/json");
		res.json({});
		return;
	});

})
emailsRouter.get("", async (req, res, err) => {

	mc.connect(config.db.host, async (err, client) => {

		db = client.db(config.db.name);

		var skipping = parseInt(req.query.skip) || 0;
   		var limiting = parseInt(req.query.limit) || 0;
		

		let emails = db.collection("Emails");
		let email = await emails.find().skip(skipping).limit(limiting).toArray();

		res.status(200);
		res.set("Content-Type", "application/json");
		res.json(email);
		return;
	});
})

emailsRouter.get("/emailSubscription", async (req, res, err) => {
	mc.connect(config.db.host, async (err, client) => {

		db = client.db(config.db.name);



		let clients = db.collection("Clients");

		let emails = await clients.find({'subscription.email': true, 'client.email': {$exists: true} }).project({'client.email': true, _id: false}).toArray();
		//console.log(emails)
		let e = []
		for (let index in emails){
			//console.log(emails[index])
			e.push(emails[index].client.email)
		}

		res.status(200);
		res.set("Content-Type", "application/json");
		res.json(e.toString());
		return;
	});

})

emailsRouter.get("/:id", async (req, res, err) => {

	mc.connect(config.db.host, async (err, client) => {

		db = client.db(config.db.name);

		let eId = ObjectId(req.params.id);

		let emails = db.collection("Emails");
		let email = await emails.findOne({ _id: eId });

		res.status(200);
		res.set("Content-Type", "application/json");
		res.json(email);
		return;
	});

})

emailsRouter.put("/:id/setDefaults", async (req, res, err) => {
	mc.connect(config.db.host, async (err, client) => {
		db = client.db(config.db.name);

		let eId = ObjectId(req.params.id);
		let emails = db.collection("Emails");
		let email_data = req.body

		let r = await emails.updateOne({ _id: eId }, { $set: { text: email_data.text, subject: email_data.subject } });

		res.status(200).send()
		return
	});

})

emailsRouter.put("/:id", async (req, res, err) => {
	mc.connect(config.db.host, async (err, client) => {
		db = client.db(config.db.name);

		let eId = ObjectId(req.params.id);
		let emails = db.collection("Emails");
		console.log("Renewal", req.body.renewal)

		let email_data = req.body.renewal
		delete req.body.renewal
		console.log(email_data)
		let status = await updateCamunda(req.body)
		let r = await emails.updateOne({ _id: eId }, {
			$set: {
				text: email_data.text, subject: email_data.subject, cancel_email: email_data.cancel_email,
				to: email_data.to, bcc: email_data.bcc, cc: email_data.cc
			}
		});
		console.log(status, r);
		res.status(status).send()
		return
	});

})

emailsRouter.put("/:eId/inactive", async (req, res, err) => {

	mc.connect(config.db.host, async (err, client) => {
		db = client.db(config.db.name);
		let eId = ObjectId(req.params.eId);
		//let pId = ObjectId(req.params.id);
		let emails = db.collection("Emails")


		await emails.updateOne({ _id: eId }, { $set: { active: false } })



		res.status(200).send();
		return

	})
})

async function updateCamunda(body) {

	message = JSON.stringify(body);
	console.log(message)
	try {
		//const response = await fetch(`${process.env.REACT_APP_APP_URL}`, {

		const response = await fetch('http://localhost:8080/engine-rest/message', {
			headers: { "Content-Type": "application/json" },
			method: 'POST',
			body: message
		});

		//console.log(response);
		if (!response.ok) {

			return (500);


		} else {

			return (200);

		}


	} catch (err) {
		console.log(err.message);

	}


}

emailsRouter.post("/preview-email", async function (req, res, next) {

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

emailsRouter.post("/", async function (req, res, next) {
	console.log(req.body)
	message = req.body;
	//create new email


	mc.connect(config.db.host, async (err, client) => {
		db = client.db(config.db.name);
		
		let emails = db.collection("Emails")

		let email_data = req.body.email_data
		
		email_data.active = true
		let e = await emails.insertOne(email_data)
		console.log(e)
		let id = e.insertedId
		message.processVariables.process_id = {value: id, type: "String"}
		message.id = id
		message = JSON.stringify(message)
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
				res.status(500).send("Error starting email preview process");
			} else {
	
				res.status(200).send(id);
	
			}
	
	
		} catch (err) {
			console.log(err.message);
	
		}
	})


	


});

emailsRouter.post("/:id", async function (req, res, next) {
	console.log(req.body)
	message = JSON.stringify(req.body);
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
			res.status(500).send("Error starting email preview process");
		} else {

			res.status(204).send();

		}


	} catch (err) {
		console.log(err.message);

	}


});

emailsRouter.post("/newsletter", async function (req, res, next) {
	
	message = JSON.stringify(req.body);
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
			res.status(500).send("Error starting email preview process");
		} else {

			res.status(204).send();

		}


	} catch (err) {
		console.log(err.message);

	}


});





module.exports = emailsRouter;
