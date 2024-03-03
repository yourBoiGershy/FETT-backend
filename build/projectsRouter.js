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

	mc.connect(config.db.host, async (err, client) => {
		db = client.db(config.db.name);
		let projects = db.collection("Projects");

		projects.find({ owner: userID }).toArray(function (err, result) {
			if (err) throw err;
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

//Get project by ID
projectsRouter.get("/:id", async (req, res, err) => {
	let projectID = req.params.id;

	mc.connect(config.db.host, async(err, client) => {
		db = client.db(config.db.name);
		let projects = db.collection("Projects");

		//Get project by ID - each ID is unique
		projects.findOne({_id: ObjectId(projectID)}, function(err, result){
			if(err) throw err;
			res.status(200);
			res.set("Content-Type", "application/json");
			res.json(result);
			return;
		});
	});
});

//Update project
projectsRouter.patch("/:id", async (req, res, err) => {
	let projectID = req.params.id;
	let projectData = req.body;

	mc.connect(config.db.host, async (err, client) => {
		db = client.db(config.db.name);
		let projects = db.collection("Projects");

		projects.updateOne({ _id: ObjectId(projectID) }, { $set: projectData }, function (err, result) {
			if (err) throw err;
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

	mc.connect(config.db.host, async (err, client) => {
		db = client.db(config.db.name);
		let projects = db.collection("Projects");

		projects.deleteOne({ _id: ObjectId(projectID) }, function (err, result) {
			if (err) throw err;
			res.status(200);
			res.set("Content-Type", "application/json");
			res.json(result);
			return;
		});
	});
});

function locateSubtaskArray(tasks, parentID) {
	if(parentID === null) return tasks; // If the parentID is null, return the top-level tasks array

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

projectsRouter.patch("/:id/addTask", async (req, res, err) => {
	let projectID = req.params.id;
	/*	
		taskData {
			parentId : int ? // if null, then it is a top level task
			id: Int
			name: String
			description: String
			status: String
			assignnees: [String]
			priority: String
			subtasks: [taskData]
		}
	*/

	let taskData = req.body;

	mc.connect(config.db.host, async(err, client) => {
		db = client.db(config.db.name);
		let projects = db.collection("Projects");

		projects.findOne({_id: ObjectId(projectID)}, function(err, result){
			if(err) throw err;
			//Task array from database
			let tasks = result.tasks;
			console.log(taskData)
			//Add the task to the subtask array
			subtasksArray = locateSubtaskArray(tasks, taskData.parentId);
			subtasksArray.push(taskData); 
			
			projects.updateOne({_id: ObjectId(projectID)}, {$set: {tasks: tasks}}, function(err, result){
				if(err) throw err;
				res.status(200);
				res.set("Content-Type", "application/json");
				res.json(result);
				return;
			});
		});
	});
});

projectsRouter.patch("/:id/updateTask", async (req, res, err) => {
	let projectID = req.params.id;
	let taskData = req.body;

	mc.connect(config.db.host, async(err, client) => {
		db = client.db(config.db.name);
		let projects = db.collection("Projects");
		

		projects.findOne({_id: ObjectId(projectID)}, function(err, result){
			if(err) throw err;
			let tasks = result.tasks;

			if(taskData.parentId === null) {

					//if the parent ID is null just delete the top level task 
				for (let i = 0; i < tasks.length; i++) {
					if (tasks[i].id === taskData.id) {
						//Only update the fields in taskData
						for (let key in taskData) {
							tasks[i][key] = taskData[key];
						}

						break;
					}
				}
				//If the task is a top level task, then we can just update the task in the tasks array
			} else {
				subtasksArray = locateSubtaskArray(tasks, taskData.parentId);
				//Update the subtasks array, find the task by ID and update it
				for (let i = 0; i < subtasksArray.length; i++) {
					if (subtasksArray[i].id === taskData.id) {
						//Only update the fields in taskData
						for (let key in taskData) {
							subtasksArray[i][key] = taskData[key];
						}
						break;
					}
				}
			}
			
			projects.updateOne({_id: ObjectId(projectID)}, {$set: {tasks: tasks}}, function(err, result){
				if(err) throw err;
				res.status(200);
				res.set("Content-Type", "application/json");
				res.json(result);
				return;
			});
		});
	});
});

projectsRouter.patch("/:id/deleteTask", async (req, res, err) => {
	let projectID = req.params.id;
	let taskData = req.body;
	//Only need to send tasks array, and parentId and id of the task to delete

	mc.connect(config.db.host, async(err, client) => {
		db = client.db(config.db.name);
		let projects = db.collection("Projects");
		
		projects.findOne({_id: ObjectId(projectID)}, function(err, result){
			if(err) throw err;
			let tasks = result.tasks;
			
			if(taskData.parentId === null) {
				//if the parent ID is null just delete the top level task 
				for (let i = 0; i < tasks.length; i++) {
					if (tasks[i].id === taskData.id) {
						tasks.splice(i, 1);
						break;
					}
				}
			}
			else {
				//If the task is a subtask, then we need to find the parent task and delete the subtask
				subtasksArray = locateSubtaskArray(tasks, taskData.parentId);
				for (let i = 0; i < subtasksArray.length; i++) {
					if (subtasksArray[i].id === taskData.id) {
						subtasksArray.splice(i, 1);
						break;
					}
				}
			}

			projects.updateOne({_id: ObjectId(projectID)}, {$set: {tasks: tasks}}, function(err, result){
				if(err) throw err;
				res.status(200);
				res.set("Content-Type", "application/json");
				res.json(result);
				return;
			});
		});
	});
});

//Get assignees for a project
projectsRouter.get("/:id/getAssignees", async (req, res, err) => {
	let projectID = req.params.id;

	mc.connect(config.db.host, async(err, client) => {
		db = client.db(config.db.name);
		let projects = db.collection("Projects");

		projects.findOne({_id: ObjectId(projectID)}, function(err, result){
			if(err) throw err;
			res.status(200);
			res.set("Content-Type", "application/json");
			res.json(result.assignees);
			return;
		});
	});
});

module.exports = projectsRouter;
