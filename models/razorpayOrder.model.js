const mongoose = require("mongoose");

const razorpayOrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    purpose: { type: String, enum: ["coin_plan", "premium_plan"], required: true },
    coinPlanId: { type: mongoose.Schema.Types.ObjectId, ref: "CoinPlan", default: null },
    premiumPlanId: { type: mongoose.Schema.Types.ObjectId, ref: "PremiumPlan", default: null },
    amount: { type: Number, required: true }, // amount in currency sub-units (e.g. paise)
    currency: { type: String, default: "INR" },
    receipt: { type: String, default: "" },
    status: {
      type: String,
      enum: ["created", "pending", "fulfilled", "failed"],
      default: "created",
      index: true,
    },
    paymentId: { type: String, default: null },
    signature: { type: String, default: null },
    failureReason: { type: String, default: null },
    fulfilledAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

razorpayOrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model("RazorpayOrder", razorpayOrderSchema);
