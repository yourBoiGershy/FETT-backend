const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let Applicant = require("./applicantModel");

let applicationSchema = Schema ({
	
	applicants: [{type: String}]
	
});

module.exports = mongoose.model("Application", applicationSchema);