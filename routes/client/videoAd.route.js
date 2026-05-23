const express = require("express");
const {
  uploadVideoAd,
  getAllVideoAd,
  videoAdById,
  getAdsByLocation,
  getShortsFeedAds,
  getLongVideoAds,
  trackAdView,
  trackAdClick,
} = require("../../controllers/client/videoAd.controller");

const videoAd = express.Router();

// JSON body: { image, video } URLs after client compress + file upload
videoAd.post("/uploadAd", uploadVideoAd);
videoAd.get("/getAllVideoAd", getAllVideoAd);
videoAd.get("/videoAdById/:id", videoAdById); // Changed to GET with param

// Zone-based ad delivery — primary endpoint for Flutter app
videoAd.get("/getAds", getAdsByLocation);
videoAd.get("/getShortsFeedAds", getShortsFeedAds);
videoAd.get("/getLongVideoAds", getLongVideoAds);

// Analytics tracking
videoAd.patch("/track/:id/view", trackAdView);
videoAd.patch("/track/:id/click", trackAdClick);

module.exports = videoAd; 
