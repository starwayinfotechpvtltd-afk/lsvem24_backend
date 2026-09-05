const express = require("express");
const route = express.Router();

//multer
const multer = require("multer");
const storage = require("../../");
const upload = multer({ storage });

//Controller
const coinplanController = require("../../controllers/admin/coinplan.controller");

//checkAccessWithSecretKey
const checkAccessWithSecretKey = require("../../checkAccess");

//create coinplan
route.post("/store", checkAccessWithSecretKey(), coinplanController.store);

//update coinplan
route.patch("/update", checkAccessWithSecretKey(), coinplanController.update);

//handle isPopular switch
route.patch("/handleisPopularSwitch", checkAccessWithSecretKey(), coinplanController.handleisPopularSwitch);

//handle isActive switch
route.patch("/handleisActiveSwitch", checkAccessWithSecretKey(), coinplanController.handleisActiveSwitch);

//delete coinplan
route.delete("/delete", checkAccessWithSecretKey(), coinplanController.delete);

//get coinplan
route.get("/fetchCoinplan", checkAccessWithSecretKey(), coinplanController.fetchCoinplan);

//get coinplan histories of users (admin earning)
route.get("/retrieveUserCoinplanRecords", checkAccessWithSecretKey(), coinplanController.retrieveUserCoinplanRecords);

module.exports = route;
