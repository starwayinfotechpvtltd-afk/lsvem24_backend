//express
const express = require("express");
const route = express.Router();
const multer=require("multer")

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
});

const checkAccessWithSecretKey = require("../../checkAccess");

//controller
const videoController = require("../../controllers/client/video.controller");

//video Unlocked
route.post(
  "/unlockPrivateVideo",
  checkAccessWithSecretKey(),
  videoController.unlockPrivateVideo,
);

//channel name verify when upload viodeo or shorts
route.get(
  "/verifyChannelname",
  checkAccessWithSecretKey(),
  videoController.verifyChannelname,
);

//upload (normal videos or shorts) by the user
route.post(
  "/createVideo",
  checkAccessWithSecretKey(),
  upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnailFile", maxCount: 1 },
  ]),
  videoController.createVideo,
);

//when user share (normal videos or shorts) then shareCount increased
route.post(
  "/shareCount",
  checkAccessWithSecretKey(),
  videoController.shareCount,
);

//get shorts from home page directly
route.get(
  "/shortsOfUser",
  checkAccessWithSecretKey(),
  videoController.shortsOfUser,
);

//get all shorts for user (shorts)
route.get("/getShorts", checkAccessWithSecretKey(), videoController.getShorts);

//get all normal videos for user (home)
route.get("/getVideos", videoController.getVideos);

//get channel details of shorts for user
route.get(
  "/channeldetailsOfShorts",
  checkAccessWithSecretKey(),
  videoController.channeldetailsOfShorts,
);

//get all (normal videos or shorts) for user (home)
route.get(
  "/videosOfHome",
  checkAccessWithSecretKey(),
  videoController.videosOfHome,
);

//get particular normal video's details for user
route.get(
  "/detailsOfVideo",
  
  videoController.detailsOfVideo,
);

//create like or dislike for video (normal videos or shorts)
route.post(
  "/likeOrDislikeOfVideo",
  checkAccessWithSecretKey(),
  videoController.likeOrDislikeOfVideo,
);

//get all more like this (normal videos or shorts)
route.get(
  "/getAllLikeThis",
  checkAccessWithSecretKey(),
  videoController.getAllLikeThis,
);

//search (normal videos or shorts) for user
route.post("/search", checkAccessWithSecretKey(), videoController.search);

//previous search (normal videos or shorts) for user
route.get(
  "/searchData",
  checkAccessWithSecretKey(),
  videoController.searchData,
);

//search shorts for user
route.post(
  "/searchShorts",
  checkAccessWithSecretKey(),
  videoController.searchShorts,
);

//type wise searching (All OR videos OR shorts)
route.post(
  "/searchChannelVideoShortsByUser",
  checkAccessWithSecretKey(),
  videoController.searchChannelVideoShortsByUser,
);

//clear all searchHistory for particular user
route.delete(
  "/clearAllSearchHistory",
  checkAccessWithSecretKey(),
  videoController.clearAllSearchHistory,
);

//update (normal videos or shorts) by user
route.patch(
  "/modifyVideo",
  checkAccessWithSecretKey(),
  videoController.modifyVideo,
);

//delete (normal videos or shorts) by user
route.delete(
  "/deleteVideoRecord",
  checkAccessWithSecretKey(),
  videoController.deleteVideoRecord,
);

module.exports = route;
