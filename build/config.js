let config 		= {};
config.db 		= {};
config.birthday = {};
config.renewal 	= {};

// create properties on the config.db object for the host and database names
const username = "ericgershtein"; // username for the MongoDB Atlas on cloud
const password = "ericgershtein"; // password for the MongoDB on cloud
const dbname = "mortgage-applications"; // name of the database that we want to connect to

const connectionURL = `mongodb+srv://${username}:${password}@cluster0.cwpom.mongodb.net/${dbname}?retryWrites=true&w=majority`; // full URL for connecting to our MongoDB database; includes the database username, password, and the database name
//mongodb+srv://ericgershtein:<password>@cluster0.cwpom.mongodb.net/myFirstDatabase?retryWrites=true&w=majority
// create properties on the config.db object for the host and database names
config.db.host = connectionURL;
config.db.name = dbname;

config.birthday.reminder = 3; //3 days reminder before birthday
config.renewal.reminder = 3; //90 days reminder before renewal date
config.renewal.emailTimer = 3; //set to 3 days

config.birthday.subject = "Happy Birthday %%firstname%%";
config.birthday.text = "Dear %%firstname%% %%lastname%%,\n\nWe wanted to personally wish you a Happy Birthday! \n\nWishing you all the best on your special day,\n-Olena";

module.exports = config;