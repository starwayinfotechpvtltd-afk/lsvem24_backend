//express
const express = require("express");
const route = express.Router();

//checkAccessWithSecretKey
const checkAccessWithSecretKey = require("../../checkAccess");

//controller
const premiumPlanController = require("../../controllers/admin/premiumPlan.controller");

//create premiumPlan by admin
route.post("/create", checkAccessWithSecretKey(), premiumPlanController.store);

//update premiumPlan by admin
route.patch("/update", checkAccessWithSecretKey(), premiumPlanController.update);

//delete premiumPlan by admin
route.delete("/delete", checkAccessWithSecretKey(), premiumPlanController.destroy);

//get premiumPlan for admin
route.get("/", checkAccessWithSecretKey(), premiumPlanController.index);

//handle activation of premiumPlan
route.patch("/handleisActive", checkAccessWithSecretKey(), premiumPlanController.handleisActive);

//get premiumPlan histories of users (admin earning)
route.get("/getpremiumPlanHistory", checkAccessWithSecretKey(), premiumPlanController.getpremiumPlanHistory);

module.exports = route;
