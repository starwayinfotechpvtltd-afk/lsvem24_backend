const mongoose = require("mongoose");

const userWiseSubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    channelId: { type: String, default: null },
    isPublic: { type: Boolean, default: true }, // true for public, false for private
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userWiseSubscriptionSchema.index({ userId: 1 });
userWiseSubscriptionSchema.index({ channelId: 1 });

module.exports = mongoose.model("UserWiseSubscription", userWiseSubscriptionSchema);
