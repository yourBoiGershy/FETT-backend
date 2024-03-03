const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const { auth } = require('express-oauth2-jwt-bearer');
const app = express();
const mc = require("mongodb").MongoClient;
const config = require("./config.js"); // import the config module which contains the database login and name information

let usersRouter = express.Router();
var ObjectId = require('mongodb').ObjectID;

const uuid = require('node-uuid');
const e = require('express');

usersRouter.get('', (req, res) => {
    mc.connect(config.db.host, async (err, client) => {
        if (err) {
            console.error('Database connection failed', err);
            res.status(500).send('Database connection failed');
            return;
        }
        const db = client.db(config.db.name);
        const users = db.collection("Users");

        try {
            let usersList = await users.find().toArray(); // Use find().toArray() to get all documents
            res.status(200).json(usersList); // Return the list of users
        } catch (error) {
            console.error('Error fetching users', error);
            res.status(500).send('Error fetching users');
        } finally {
            client.close(); // Ensure the database connection is closed after operation
        }
    });
});

usersRouter.get('/email/:email', (req, res) => {
    const email = req.params.email; // Extract the email from the request parameters
    
    mc.connect(config.db.host, { useUnifiedTopology: true }, async (err, client) => {
        if (err) {
            console.error('An error occurred connecting to MongoDB: ', err);
            res.status(500).send('Error connecting to the database');
            return;
        }

        const db = client.db(config.db.name);
        const users = db.collection("Users");

        try {
            const user = await users.findOne({ email: email }); // Find the user by email
            if (user) {
                res.status(200).json(user); // Return the found user
            } else {
                res.status(404).send('User not found'); // User not found
            }
        } catch (error) {
            console.error('An error occurred fetching the user: ', error);
            res.status(500).send('Error fetching the user');
        } finally {
            client.close(); // Ensure the database connection is closed
        }
    });
});


usersRouter.put('', (req, res) => {
    mc.connect(config.db.host, async (err, client) => {
        if (err) {
            console.error('Database connection failed', err);
            res.status(500).send('Database connection failed');
            return;
        }
        //if exists 

        const db = client.db(config.db.name);
        const users = db.collection("Users");
        let email = req.body.email;

        users.findOne({ email: email }, async (err, result) => {
            //if they didn't find it
            let user = {
                email: req.body.email,
                fname: req.body.fname,
                lname: req.body.lname,
            }

            if (result == null) {
                users.insertOne(user, (err, result) => {
                    if (err) {
                        console.error('Error creating new user', err);
                        res.status(500).send('Error creating new user');
                        return;
                    }
                    res.status(201).json(user);
                });
            } 
            else {
                users.updateOne({email: email}, {$set: {fname: req.body.fname, lname: req.body.lname}}, (err, result) => {
                    if (err) {
                        console.error('Error updating user', err);
                        res.status(500).send('Error updating user');
                        return;
                    }
                    res.status(200).json(user);
                });
            }           
        });    
    });
});

// module.exports = usersRouter;
// =======
//         const db = client.db(config.db.name);
//         const users = db.collection("Users");
        
//         //console.log(req.headers)
//         let newUser = {
//             email: req.headers.email ? req.headers.email : 'default@example.com',
//         };

//         try {
          
//             const result = await users.insertOne(newUser);
//             if (result.acknowledged === true && result.insertedId) {
                
//                 newUser._id = result.insertedId; 
//                 res.status(201).json(newUser);
//             } else {
//                 throw new Error('User creation failed');
//             }
//         } catch (error) {
//             console.error('Error creating new user', error);
//             res.status(500).send('Error creating new user');
//         } finally {
      
//             client.close();
//         }
//     });
// });

module.exports = usersRouter;
