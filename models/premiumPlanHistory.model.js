const mongoose = require("mongoose");

const PremiumPlanHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    premiumPlanId: { type: mongoose.Schema.Types.ObjectId, ref: "PremiumPlan" },
    paymentGateway: { type: String },
    date: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

PremiumPlanHistorySchema.index({ userId: 1 });
PremiumPlanHistorySchema.index({ premiumPlanId: 1 });

module.exports = mongoose.model("PremiumPlanHistory", PremiumPlanHistorySchema);
