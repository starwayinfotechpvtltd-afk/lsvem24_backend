const mongoose = require("mongoose");

const VideoAdSchema = new mongoose.Schema(
  {
    video: String,
    image: String,
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    country: { type: String, trim: true },
    state: { type: String, trim: true },
    city: { type: String, trim: true },
    type: {
      type: String,
      enum: ["skippable", "non-skippable", "banner"],
      default: "skippable",
    },
    category: { type: String, trim: true },
    budget: { type: Number, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uniqueAdsId: { type: String, default: null },

    zones: [{ type: mongoose.Schema.Types.ObjectId, ref: "Zone" }],
    placement: {
      type: String,
      enum: ["pre-roll", "mid-roll", "both"],
      default: "pre-roll",
    },
    adRuns: {
      type: String,
      enum: ["long videos", "short videos", "both videos"],
      default: "long videos",
    },

    duration: { type: Number },
    skipAfter: { type: Number, default: 5 },
    ctaText: String,
    ctaLink: String,
    targetTags: [String],
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    expiresAt: Date,
  },
  { timestamps: true },
);

const VideoAd = mongoose.model("VideoAd", VideoAdSchema);
module.exports = VideoAd;
