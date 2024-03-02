// import the required modules
const express = require("express");
const app = express();
const cors = require('cors');
const mc = require("mongodb").MongoClient;
const config = require("./config.js"); // import the config module which contains the database login and name information

let db;
app.locals.db = db;

const applicationRouter = require("./applicationRouter.js");

const PORT = process.env.PORT || 8000;

// MIDDLEWARE
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({extended: true}));
app.use((req,_,next)=> {
    console.log(`${req.method}: ${req.url}`);
    if (Object.keys(req.body).length > 0){
        //console.log('Body:');
        //console.log(req.body);
    }
    next();
});

app.use("/api/application", applicationRouter);

// This gives you a 'client' object that you can use to interact with the database
mc.connect(config.db.host, function(err, client) {
  if(err) throw err;
	console.log(`We have successfully connected to the ${config.db.name} database.`);



    // Only start listening now, when we know the database is available.
  	app.listen(8000);
  	console.log("Server started, and is listening on port 8000...");

});
