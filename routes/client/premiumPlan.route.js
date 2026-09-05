//express
const express = require("express");
const route = express.Router();

//checkAccessWithSecretKey
const checkAccessWithSecretKey = require("../../checkAccess");

//controller
const premiumPlanController = require("../../controllers/client/premiumPlan.controller");

//get all premiumPlan for
route.get("/", checkAccessWithSecretKey(), premiumPlanController.index);

//when user purchase the premiumPlan create premiumPlan history by user
route.post("/createHistory", checkAccessWithSecretKey(), premiumPlanController.createHistory);

//get premiumPlanHistory of particular user (user)
route.get("/planHistoryOfUser", checkAccessWithSecretKey(), premiumPlanController.planHistoryOfUser);

//get coinPlanHistory of particular user (user)
route.get("/fetchCoinplanHistoryOfUser", premiumPlanController.fetchCoinplanHistoryOfUser);

module.exports = route;
