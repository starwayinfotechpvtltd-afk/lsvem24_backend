//express
const express = require("express");
const route = express.Router();

const checkAccessWithSecretKey = require("../../checkAccess");

//controller
const SaveToWatchController = require("../../controllers/client/saveToWatchLater.controller");

//user wise add video to saveToWatchLater
route.post("/addVideoToWatchLater", checkAccessWithSecretKey(), SaveToWatchController.addVideoToWatchLater);

//get all saveToWatchLater videos for that user
route.get("/getSaveToWatchLater", checkAccessWithSecretKey(), SaveToWatchController.getSaveToWatchLater);

//user wise remove video from saveToWatchLater
route.post("/removeVideoFromWatchLater", checkAccessWithSecretKey(), SaveToWatchController.removeVideoFromWatchLater);
route.delete("/removeVideoFromWatchLater", checkAccessWithSecretKey(), SaveToWatchController.removeVideoFromWatchLater);

module.exports = route;

