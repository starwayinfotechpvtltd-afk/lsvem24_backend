//express
const express = require("express");
const route = express.Router();

const checkAccessWithSecretKey = require("../../checkAccess");

//controller
const settingController = require("../../controllers/admin/setting.controller");

//create Setting
//route.post("/create", checkAccessWithSecretKey(), settingController.store);

//update Setting
route.patch("/update", checkAccessWithSecretKey(), settingController.update);

//get setting data
route.get("/", checkAccessWithSecretKey(), settingController.index);

//handle setting switch
route.patch("/handleSwitch", checkAccessWithSecretKey(), settingController.handleSwitch);

//handle water mark setting
route.patch("/updateWatermarkSetting", checkAccessWithSecretKey(), settingController.updateWatermarkSetting);

//handle update storage
route.patch("/switchStorageOption", checkAccessWithSecretKey(), settingController.switchStorageOption);

module.exports = route;
