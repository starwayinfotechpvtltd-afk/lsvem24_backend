//express
const express = require("express");
const route = express.Router();

const checkAccessWithSecretKey = require("../../checkAccess");

//controller
const liveUserController = require("../../controllers/client/liveUser.controller");

//live the user
route.post("/live", checkAccessWithSecretKey(), liveUserController.liveUser);

//get live user list
route.get("/getliveUserList", checkAccessWithSecretKey(), liveUserController.getliveUserList);

module.exports = route;
