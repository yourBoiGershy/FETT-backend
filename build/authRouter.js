const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const { auth } = require('express-oauth2-jwt-bearer');
const app = express();
const mc = require("mongodb").MongoClient;
const authConfig = require("./authConfig.js"); // import the config module which contains the database login and name information

let authRouter = express.Router();
var ObjectId = require('mongodb').ObjectID;

//import fetch from 'node-fetch';
//import fetch from 'node-fetch';
const fetch = require('node-fetch');

const uuid = require('node-uuid');


app.use(express.json());

const checkJwt = auth({
    audience: authConfig.authorizationParams.audience,
    issuerBaseURL: `https://${authConfig.domain}`,
});

authRouter.get('/external', checkJwt, (req, res) => {
    res.send({
        msg: 'Your access token was successfully validated!',
    });
});

authRouter.get('', checkJwt, (req, res) => {
    res.send({
        msg: 'Your access token was successfully validated!',
    });
});

module.exports = authRouter;