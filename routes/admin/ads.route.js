//express
const express = require("express");
const route = express.Router();

const checkAccessWithSecretKey = require("../../checkAccess");

//controller
const adsController = require("../../controllers/admin/ads.controller");

//upload (normal video or short) by the admin
route.post("/uploadads", checkAccessWithSecretKey(), adsController.createAd);

//update (normal video or short) by the admin
route.get("/allads", checkAccessWithSecretKey(), adsController.getAllAds);

//delete (normal video or short) by admin (multiple or single)
route.get("/adsById/:id", checkAccessWithSecretKey(), adsController.getAdById);

route.get("/adsByUser/:id", checkAccessWithSecretKey(), adsController.getAdByUser);

//get all normal video or short
route.get("/updateAds", checkAccessWithSecretKey(), adsController.updateAd);

route.get("/deleteAds", checkAccessWithSecretKey(), adsController.deleteAd);

route.get("/bulkDeleteAds", checkAccessWithSecretKey(), adsController.bulkDeleteAds);

route.get("/toggleStatus", checkAccessWithSecretKey(), adsController.toggleAdStatus);

route.get("/bulkToggleStatus", checkAccessWithSecretKey(), adsController.bulkToggleStatus);

route.get("/recordView", checkAccessWithSecretKey(), adsController.recordView);

route.get("/recordClick", checkAccessWithSecretKey(), adsController.recordClick);

route.get("/getAnalytics", checkAccessWithSecretKey(), adsController.getAnalytics);

route.get("/getActiveAds", checkAccessWithSecretKey(), adsController.getActiveAds);

route.get("/resetAdStats", checkAccessWithSecretKey(), adsController.resetAdStats);

module.exports = route;
