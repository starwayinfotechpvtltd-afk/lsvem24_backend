//express
const express = require("express");
const route = express.Router();

const checkAccessWithSecretKey = require("../../checkAccess");

//controller
const ReportController = require("../../controllers/client/report.controller");

//when user report the video
route.post("/reportToVideo", checkAccessWithSecretKey(), ReportController.reportToVideo);

module.exports = route;
