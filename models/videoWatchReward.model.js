const mongoose = require("mongoose");

const videoWatchRewardSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    videoId: { type: mongoose.Schema.Types.ObjectId, ref: "Video" },
    videoUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    videoChannelId: { type: String },
    totalWatchTime: { type: Number, default: 0 }, //that value always save in minutes for Monetization
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

videoWatchRewardSchema.index({ userId: 1 });
videoWatchRewardSchema.index({ videoId: 1 });
videoWatchRewardSchema.index({ videoUserId: 1 });
videoWatchRewardSchema.index({ videoChannelId: 1 });

module.exports = mongoose.model("VideoWatchReward", videoWatchRewardSchema);
