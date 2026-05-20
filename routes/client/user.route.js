//express
const express = require("express");
const route = express.Router();

const checkAccessWithSecretKey = require("../../checkAccess");

//controller
const UserController = require("../../controllers/client/user.controller");

//user login or sign up
route.post("/login", checkAccessWithSecretKey(), UserController.store);

//check the user is exists or not for loginType 4 (email-password)
route.post("/checkUser", checkAccessWithSecretKey(), UserController.checkUser);

//check referral code is valid and apply referral code by user
route.patch("/validateAndApplyReferralCode", checkAccessWithSecretKey(), UserController.validateAndApplyReferralCode);

//earn coin from watching ad
route.patch("/handleAdWatchReward", checkAccessWithSecretKey(), UserController.handleAdWatchReward);

//earn coin from engagement video reward
route.patch("/handleEngagementVideoWatchReward", checkAccessWithSecretKey(), UserController.handleEngagementVideoWatchReward);

//get user profile who login
route.get("/profile", checkAccessWithSecretKey(), UserController.getProfile);

//update details of the channel (create your channel button)
route.patch("/update", checkAccessWithSecretKey(), UserController.update);

//update profile of the user (when user login or signUp)
route.patch("/updateProfile", checkAccessWithSecretKey(), UserController.updateProfile);

//update password
route.patch("/updatePassword", checkAccessWithSecretKey(), UserController.updatePassword);

//set password
route.post("/setPassword", checkAccessWithSecretKey(), UserController.setPassword);

//get particular channel's details (home page)
route.get("/detailsOfChannel", checkAccessWithSecretKey(), UserController.detailsOfChannel);

//get particular's channel's videoType wise videos (videos, shorts) (your videos)
route.get("/videosOfChannel", checkAccessWithSecretKey(), UserController.videosOfChannel);

//get particular's channel's playLists
route.get("/playListsOfChannel", checkAccessWithSecretKey(), UserController.playListsOfChannel);

//get particular channel's about
route.get("/aboutOfChannel", checkAccessWithSecretKey(), UserController.aboutOfChannel);

//search channel for user
route.post("/searchChannel", checkAccessWithSecretKey(), UserController.searchChannel);

//delete user account
route.delete("/deleteUserAccount", checkAccessWithSecretKey(), UserController.deleteUserAccount);

//get referral history of particular user
route.get("/loadReferralHistoryByUser", checkAccessWithSecretKey(), UserController.loadReferralHistoryByUser);

//get coin history of particular user
route.get("/retriveCoinHistoryByUser", checkAccessWithSecretKey(), UserController.retriveCoinHistoryByUser);

//get wallet history of particular user
route.get("/fetchWalletHistoryByUser", checkAccessWithSecretKey(), UserController.fetchWalletHistoryByUser);

module.exports = route;
