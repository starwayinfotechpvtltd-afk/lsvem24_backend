const mongoose = require("mongoose");

const watchHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    videoId: { type: mongoose.Schema.Types.ObjectId, ref: "Video" },
    videoUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    videoChannelId: { type: String },
    totalWatchTime: { type: Number, default: 0 }, //that value always save in minutes for Monetization
    totalWithdrawableAmount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

watchHistorySchema.index({ userId: 1 });
watchHistorySchema.index({ videoId: 1 });
watchHistorySchema.index({ videoUserId: 1 });
watchHistorySchema.index({ videoChannelId: 1 });

module.exports = mongoose.model("WatchHistory", watchHistorySchema);
