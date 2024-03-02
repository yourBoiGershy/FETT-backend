let config = {};
config.db = {};

// create properties on the config.db object for the host and database names
const username = "ericgershtein"; // username for the MongoDB Atlas on cloud
const password = "ericgershtein"; // password for the MongoDB on cloud
const dbname = "fett-backend"; // name of the database that we want to connect to

const connectionURL = `mongodb+srv://${username}:${password}@cluster0.cwpom.mongodb.net/${dbname}?retryWrites=true&w=majority`; // full URL for connecting to our MongoDB database; includes the database username, password, and the database name
//mongodb+srv://ericgershtein:<password>@cluster0.cwpom.mongodb.net/myFirstDatabase?retryWrites=true&w=majority
// create properties on the config.db object for the host and database names
config.db.host = connectionURL;
config.db.name = dbname;

module.exports = config;