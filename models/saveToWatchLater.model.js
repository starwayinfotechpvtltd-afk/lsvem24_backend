const mongoose = require("mongoose");

const saveToWatchLaterSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    videoId: { type: mongoose.Schema.Types.ObjectId, ref: "Video" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

saveToWatchLaterSchema.index({ userId: 1 });
saveToWatchLaterSchema.index({ videoId: 1 });

module.exports = mongoose.model("SaveToWatchLater", saveToWatchLaterSchema);
