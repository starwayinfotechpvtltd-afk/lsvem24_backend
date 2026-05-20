const mongoose = require("mongoose");

const LiveViewSchema = new mongoose.Schema(
  {
    fullName: { type: String },
    nickName: { type: String },
    image: { type: String },
    agoraId: { type: String },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    liveHistoryId: { type: mongoose.Schema.Types.ObjectId, ref: "LiveHistory" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

LiveViewSchema.index({ userId: 1 });
LiveViewSchema.index({ liveHistoryId: 1 });

module.exports = mongoose.model("LiveView", LiveViewSchema);
