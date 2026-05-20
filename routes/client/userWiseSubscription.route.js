//express
const express = require("express");
const route = express.Router();

const checkAccessWithSecretKey = require("../../checkAccess");

//controller
const userWiseSubscriptionController = require("../../controllers/client/userWiseSubscription.controller");

//user wise subscribed or unSubscribed the channel
route.post("/subscribedUnSubscibed", checkAccessWithSecretKey(), userWiseSubscriptionController.subscribedUnSubscibed);

//get all subscription channels subscribed by that user
route.get("/getSubscribedChannel", checkAccessWithSecretKey(), userWiseSubscriptionController.getSubscribedChannel);

//get type wise videos of the subscribed channels
route.get("/videoOfSubscribedChannel", checkAccessWithSecretKey(), userWiseSubscriptionController.videoOfSubscribedChannel);

module.exports = route;
