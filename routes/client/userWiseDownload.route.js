//express
const express = require("express");
const route = express.Router();

const checkAccessWithSecretKey = require("../../checkAccess");

//controller
const UserWiseDownloadController = require("../../controllers/client/userWiseDownload.controller");

//when user view the video create watchHistory for history
route.post("/downloadVideoHistory", checkAccessWithSecretKey(), UserWiseDownloadController.downloadVideoHistory);

//get user wise watchHistory
route.get("/getdownloadVideoHistory", checkAccessWithSecretKey(), UserWiseDownloadController.getdownloadVideoHistory);

module.exports = route;
