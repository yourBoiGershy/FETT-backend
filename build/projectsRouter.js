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

projectsRouter.get("/getProjects", async (req, res) => {
    let email = req.headers.email;

    mc.connect(config.db.host, async (err, client) => {
        if (err) {
            console.error('Database connection failed', err);
            res.status(500).send('Database connection failed');
            return;
        }

        try {
            const db = client.db(config.db.name);
            const projects = db.collection("Projects");
            const groups = db.collection("Groups");

            let projectsResult = await projects.find({owner: email}).toArray();

            // Enhance each project with the user's group
            const projectsWithGroup = await Promise.all(projectsResult.map(async (project) => {
                // Fetch the corresponding group based on projectId
                const group = await groups.findOne({projectId: project._id.toString()});
                
                // Log the group if it exists
                if (group) {
                    console.log("Group found:", group);
                    
                    // Determine the user's role in the group
                    let role = null;
                    if (group.managers.includes(email)) {
                        role = 'manager';
                    } else if (group.employees.includes(email)) {
                        role = 'employee';
                    } else if (group.observers.includes(email)) {
                        role = 'observer';
                    }

                    return { ...project, group: role }; // Attach the role to the project
                } else {
                    console.log("No group found for project ID:", project._id.toString());
                    return { ...project, group: null }; // No group found
                }
            }));

            res.status(200).json(projectsWithGroup);
        } catch (error) {
            console.error('Error fetching projects and groups', error);
            res.status(500).send('Error fetching projects and groups');
        } finally {
            await client.close();
        }
    });
});

async function findUserGroupByEmailAndProjectId(email, projectId, client) {
    const db = client.db(config.db.name);
    const groups = db.collection("Groups");
    console.log(email, projectId)
    const query = {
        projectId: projectId,
        $or: [
            { managers: email },
            { employees: email },
            { observers: email }
        ]
    };

    const group = await groups.findOne(query);
	console.log(group)
    if (group) {
        if (group.managers.includes(email)) {
            return 'manager';
        } else if (group.employees.includes(email)) {
            return 'employee';
        } else if (group.observers.includes(email)) {
            return 'observer';
        }
    }
    return null; // No group found
}


projectsRouter.post("/createProject", async (req, res) => {
    let projectData = {
        name: req.body.name,
        description: req.body.description,
        status: req.body.status,
        owner: req.body.owner,
        assignees: req.body.assignees ? req.body.assignees : [],
        tasks: []
    };

    mc.connect(config.db.host, async (err, client) => {
        if (err) {
            console.error('Database connection failed', err);
            res.status(500).send('Database connection failed');
            return;
        }

        try {
            const db = client.db(config.db.name);
            const projects = db.collection("Projects");
            // Insert the new project
            const projectResult = await projects.insertOne(projectData);

            // Check if the project was successfully created
            if (projectResult.insertedId) {
                const groups = db.collection("Groups");
				
                // Initialize group data for the new project
                let groupData = {
                    projectId: projectResult.insertedId.toString(),
                    managers: [projectData.owner],
                    employees: [],
                    observers: []
                };
				console.log(groupData)
                // Create a new group for the project
                const groupResult = await groups.insertOne(groupData);
				console.log(groupResult.insertedId)
                // Check if the group was successfully created
                if (groupResult.insertedId) {
                    res.status(200).json({
                        projectId: projectResult.insertedId,
                        groupId: groupResult.insertedId,
                        message: "Project and corresponding group created successfully"
                    });
                } else {
                    throw new Error('Group creation failed');
                }
            } else {
                throw new Error('Project creation failed');
            }
        } catch (error) {
            console.error('Error creating project or group', error);
            res.status(500).send('Error creating project or group');
        } finally {
            client.close();
        }
    });
});


projectsRouter.get("/:id", async (req, res) => {
    let projectID = req.params.id;
	//console.log(req.headers)
    let email = req.headers.email; // Assuming you're passing the user's email as a query parameter

    mc.connect(config.db.host, async (err, client) => {
        if (err) {
            console.error('Database connection failed', err);
            res.status(500).send('Database connection failed');
            return;
        }

        try {
            const db = client.db(config.db.name);
            const projects = db.collection("Projects");
            const groups = db.collection("Groups");

            // Fetch the project by ID
            const project = await projects.findOne({ _id: ObjectId(projectID) });

            if (!project) {
                res.status(404).send('Project not found');
                return;
            }
			console.log(projectID, projectID.toString())
            // Fetch the corresponding group based on projectId
            const group = await groups.findOne({ projectId: projectID.toString() });
			//console.log(group)
            let role = null; // Initialize role as null

            // If a group is found and an email is provided, determine the user's role
            if (group && email) {
                console.log("Group found for project:", group);

                if (group.managers.includes(email)) {
                    role = 'manager';
                } else if (group.employees.includes(email)) {
                    role = 'employee';
                } else if (group.observers.includes(email)) {
                    role = 'observer';
                }
            } else {
                console.log("No group found for project ID:", projectID);
            }

            // Attach the role to the project information and return it
            const projectWithRole = { ...project, group: role };

            res.status(200).json(projectWithRole);
        } catch (error) {
            console.error('Error fetching project and determining group role', error);
            res.status(500).send('Error fetching project and determining group role');
        } finally {
            await client.close();
        }
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
