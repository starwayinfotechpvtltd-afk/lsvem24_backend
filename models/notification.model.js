const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    videoId: { type: mongoose.Schema.Types.ObjectId, ref: "Video" },
    title: { type: String },
    message: { type: String },
    channelImage: { type: String },
    videoImage: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

notificationSchema.index({ userId: 1 });
notificationSchema.index({ videoId: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
