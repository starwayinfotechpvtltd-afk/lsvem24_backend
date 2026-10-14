const express = require("express");
const multer = require("multer");
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

const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
  }),
  limits: {
    fileSize: Infinity,
    fieldSize: 500 * 1024 * 1024,
  },
});

videoAd.post(
  "/uploadAd",
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  uploadVideoAd,
);
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
