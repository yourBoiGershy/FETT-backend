const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const { auth } = require('express-oauth2-jwt-bearer');
const app = express();
const mc = require("mongodb").MongoClient;
const config = require("./config.js"); // import the config module which contains the database login and name information

let groupsRouter = express.Router();
var ObjectId = require('mongodb').ObjectID;



// Optimized route to fetch a single group by projectId
groupsRouter.get('/project/:projectId', async (req, res) => {
    let client;
    try {
        client = await mc.connect(config.db.host);
        const db = client.db(config.db.name);
        const groups = db.collection("Groups");

        const projectId = req.params.projectId;
        if (!ObjectId.isValid(projectId)) {
            res.status(400).send('Invalid Project ID');
            return;
        }

        // Use findOne for a 1:1 relationship to retrieve a single document
        let group = await groups.findOne({ projectId: new ObjectId(projectId) });

        if (group) {
            res.status(200).json(group);
        } else {
            res.status(404).send('Group not found for the given Project ID');
        }
    } catch (error) {
        console.error('Error fetching group for project', error);
        res.status(500).send('Error fetching group');
    } finally {
        if (client) {
            client.close();
        }
    }
});

groupsRouter.get('/project/:projectId/email/:email', async (req, res) => {
    let client;
    try {
        const { projectId, email } = req.params; // Destructure for clarity
        if (!email || !projectId) {
            return res.status(400).send('Email and Project ID parameters are required');
        }

        client = await mc.connect(config.db.host);
        const db = client.db(config.db.name);
        const groups = db.collection("Groups");

        // Validate projectId format if necessary (e.g., if using MongoDB's ObjectId)
        // if (!ObjectId.isValid(projectId)) {
        //     return res.status(400).send('Invalid Project ID');
        // }

        // Adjusted query to also filter by projectId
        const query = {
            projectId: new ObjectId(projectId), // Adjust based on your schema, use ObjectId(projectId) if needed
            $or: [
                { managers: email },
                { employees: email },
                { observers: email }
            ]
        };

        const group = await groups.findOne(query);

        if (group) {
            let role;
            if (group.managers.includes(email)) {
                role = 'manager';
            } else if (group.employees.includes(email)) {
                role = 'employee';
            } else if (group.observers.includes(email)) {
                role = 'observer';
            }

            res.status(200).json({
                group: role
            });
        } else {
            // Email not found within the specified project
            res.status(404).json({
                message: 'Email not found in any group within the specified project'
            });
        }
    } catch (error) {
        console.error('Error searching for email within project in groups', error);
        res.status(500).send('Internal server error occurred while searching for email within project in groups');
    } finally {
        if (client) {
            await client.close();
        }
    }
});



module.exports = groupsRouter;
