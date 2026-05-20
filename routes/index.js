//express
const express = require("express");
const route = express.Router();

//admin index.js
const admin = require("./admin/index");

//client index.js
const client = require("./client/index");

route.use("/admin", admin);
route.use("/client", client);

module.exports = route;
