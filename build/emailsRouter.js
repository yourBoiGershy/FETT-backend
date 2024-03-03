const express = require("express");
const nodemailer = require("nodemailer");
let emailsRouter = express.Router();
const config = require("./config.js"); // import the config module which contains the database login and name information

emailsRouter.post("/sendEmail", async (req, res) => {
	// Assuming the request body includes 'to', 'subject', and 'text' fields
	const { to, subject, text } = req.body;

	//console.log(config.smtp.host)
	// SMTP configuration
	let smtpConfig = {
		host: config.smtp.host,
		port: config.smtp.port,
		secure: false, // true for 465, false for other ports
		auth: {
			user: config.smtp.auth.user,
			pass: config.smtp.auth.pass
		}
	};


	smtpConfig.secure = false; // Use secure connection in production


	// Create a transporter object using the SMTP configuration
	const transporter = nodemailer.createTransport(smtpConfig);

	// Email options
	const mailOptions = {
		from: config.smtp.user, // Sender address
		to: to, // List of recipients
		subject: subject, // Subject line
		text: text // Plain text body
	};

	// Send the email
	transporter.sendMail(mailOptions, (error, info) => {
		if (error) {
			console.error("Error sending email:", error);
			return res.status(500).send("Failed to send email");
		}
		console.log("Email sent:", info.response);
		res.status(200).send("Email sent successfully");
	});
});

module.exports = emailsRouter;
