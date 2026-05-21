const mongoose = require("mongoose");

const razorpayPaymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    purpose: {
      type: String,
      enum: ["premium_plan", "coin_plan"],
      required: true,
    },
    premiumPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PremiumPlan",
      default: null,
    },
    coinPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CoinPlan",
      default: null,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    receipt: { type: String, default: null },
    status: {
      type: String,
      enum: ["created", "paid", "processing", "failed", "fulfilled"],
      default: "created",
    },
    paymentGateway: { type: String, default: "Razorpay" },
    failureReason: { type: String, default: null },
    fulfilledAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

razorpayPaymentSchema.index({ userId: 1, createdAt: -1 });
razorpayPaymentSchema.index({ razorpayOrderId: 1 });
razorpayPaymentSchema.index({ razorpayPaymentId: 1 });
razorpayPaymentSchema.index({ status: 1 });

module.exports = mongoose.model("RazorpayPayment", razorpayPaymentSchema);
