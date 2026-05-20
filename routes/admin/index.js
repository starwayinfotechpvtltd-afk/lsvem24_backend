//express
const express = require("express");
const route = express.Router();

//admin middleware
const AdminMiddleware = require("../../middleware/admin.middleware");

//require admin's route.js
const user = require("./user.route");
const FAQ = require("./FAQ.route");
const admin = require("./admin.route");
const premiumPlan = require("./premiumPlan.route");
const contact = require("./contact.route");
const soundList = require("./soundList.route");
const soundCategory = require("./soundCategory.route");
const dashboard = require("./dashboard.route");
const setting = require("./setting.route");
const withdraw = require("./withdraw.route");
const file = require("./file.route");
const video = require("./video.route");
const videoComment = require("./videoComment.route");
const report = require("./report.route");
const advertise = require("./advertise.route");
const currency = require("./currency.route");
const withDrawalRequest = require("./withDrawalRequest.route");
const monetizationRequest = require("./monetizationRequest.route");
const login = require("./login.route");
const adRewardCoin = require("./adRewardCoin.route");
const dailyRewardCoin = require("./dailyRewardCoin.route");
const coinplan = require("./coinplan.route");
const ads=require("./ads.route")

//exports admin's route.js
route.use("/admin", admin);
route.use("/user", AdminMiddleware, user);
route.use("/contact", AdminMiddleware, contact);
route.use("/FAQ", AdminMiddleware, FAQ);
route.use("/premiumPlan", AdminMiddleware, premiumPlan);
route.use("/soundList", AdminMiddleware, soundList);
route.use("/soundCategory", AdminMiddleware, soundCategory);
route.use("/dashboard", AdminMiddleware, dashboard);
route.use("/setting", AdminMiddleware, setting);
route.use("/withdraw", AdminMiddleware, withdraw);
route.use("/file", AdminMiddleware, file);
route.use("/video", AdminMiddleware, video);
route.use("/videoComment", AdminMiddleware, videoComment);
route.use("/report", AdminMiddleware, report);
route.use("/advertise", AdminMiddleware, advertise);
route.use("/currency", AdminMiddleware, currency);
route.use("/withDrawalRequest", AdminMiddleware, withDrawalRequest);
route.use("/monetizationRequest", AdminMiddleware, monetizationRequest);
route.use("/adRewardCoin", AdminMiddleware, adRewardCoin);
route.use("/dailyRewardCoin", AdminMiddleware, dailyRewardCoin);
route.use("/coinplan", AdminMiddleware, coinplan);
route.use("/login", login);
route.use("/ads", ads);

module.exports = route;
