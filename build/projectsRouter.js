// import the required modules
const express = require("express");
const app = express();
const mc = require("mongodb").MongoClient;
const config = require("./config.js"); // import the config module which contains the database login and name information
let projectsRouter = express.Router();
var ObjectId = require('mongodb').ObjectID;
const fetch = require('node-fetch');


app.use(express.json());

// emailsRouter.get("/getNewsletterEmails", async (req, res, err) => {

// 	mc.connect(config.db.host, async (err, client) => {

// 		res.status(200);
// 		res.set("Content-Type", "application/json");
// 		res.json({});
// 		return;
// 	});

// })


/*
---Projects Router---

Connects to projects databse:

Projects {
name: String
description: String
status: String
Owner: String
Task {
	name: String
	description: String
	status: String // eventually we want to use Solace Event Broker
}

Routes:

GET:
/getProjects -> returns all projects under the current user
/:id -> returns a specific project using projectID

POST:
/createProject -> creates a new project
../task -> creates a new task under a project

PUT:
/:id -> updates a specific project using projectID
../task -> updates a task

DELETE:
/:id -> deletes a project using projectID

*/

//Get all projects for the logged in user
projectsRouter.get("/getProjects", async (req, res, err) => {
	let userID = req.body.userID;

	mc.connect(config.db.host, async(err, client) => {
		db = client.db(config.db.name);
		let projects = db.collection("Projects");

		projects.find({owner: userID}).toArray(function(err, result){
			if(err) throw err;
			res.status(200);
			res.set("Content-Type", "application/json");
			res.json(result);
			return;
		});
	});
});

//Create project for the logged in user as owner
projectsRouter.post("/createProject", async (req, res, err) => {
	let projectData = {
		name : req.body.name,
		description : req.body.description,
		status : req.body.status,
		owner : req.body.owner,
		assignees : req.body.assignees ? req.body.assignees : [],
		tasks : []
	}
	
	mc.connect(config.db.host, async(err, client) => {

		db = client.db(config.db.name);
		let projects = db.collection("Projects");

		projects.insertOne(projectData, function(err, result){
			if(err) throw err;
			res.status(200);
			res.set("Content-Type", "application/json");
			res.json(result.insertedId);
			return;
		});
	});
});


//Update project
projectsRouter.patch("/:id", async (req, res, err) => {
	let projectID = req.params.id;
	let projectData = req.body;

	mc.connect(config.db.host, async(err, client) => {
		db = client.db(config.db.name);
		let projects = db.collection("Projects");

		projects.updateOne({_id: ObjectId(projectID)}, {$set: projectData}, function(err, result){
			if(err) throw err;
			res.status(200);
			res.set("Content-Type", "application/json");
			res.json(result);
			return;
		});
	});
});


//Delete project
projectsRouter.delete("/:id", async (req, res, err) => {
	let projectID = req.params.id;

	mc.connect(config.db.host, async(err, client) => {
		db = client.db(config.db.name);
		let projects = db.collection("Projects");

		projects.deleteOne({_id: ObjectId(projectID)}, function(err, result){
			if(err) throw err;
			res.status(200);
			res.set("Content-Type", "application/json");
			res.json(result);
			return;
		});
	});
});

function locateSubtaskArray(tasks, parentID) {
    // Function to recursively search for the object with the specified parentID
    function findSubtaskArray(tasksArray, id) {
        for (let task of tasksArray) {
            if (task.id === id) {
                return task.subtasks; // Return the subtasks array of the found task
            }
            if (task.subtasks && task.subtasks.length > 0) {
                const result = findSubtaskArray(task.subtasks, id);
                if (result) return result; // If found in nested subtasks, return the result
            }
        }
        return null; // If not found, return null
    }

    // Start the recursive search from the root tasks array
    return findSubtaskArray(tasks, parentID);
}

// projectsRouter.patch("/:id/addTask", async (req, res, err) => {
// 	let projectID = req.params.id;
// 	let taskData = req.body;

// 	mc.connect(config.db.host, async(err, client) => {
// 		db = client.db(config.db.name);
// 		let projects = db.collection("Projects");

// 		projects.find({_id: ObjectId(projectID)}).toArray(function(err, result){
// 			if(err) throw err;
// 			let tasks = result[0].tasks;
// 			let subtasks = locateSubtaskArray(tasks, taskData.parentID);
// 			subtasks.push(taskData);
// 			projects.updateOne({_id: ObjectId(projectID)}, {$set: {tasks: tasks}}, function(err, result2){
// 				if(err) throw err;
// 				res.status(200);
// 				res.set("Content-Type", "application/json");
// 				res.json(result2);
// 				return;
// 			});
// 		});
// 	});
// });






// projectsRouter.patch("/:id/addTask", async (req, res, err) => {
// 	//Add a task to the task array in the project

// }


// projectsRouter.patch("/:id/addTask", async (req, res, err) => {
// 	//Add a task to the task array in the project

// }

module.exports = projectsRouter;
