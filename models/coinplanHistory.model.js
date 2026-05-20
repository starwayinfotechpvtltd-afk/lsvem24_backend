const mongoose = require("mongoose");

const CoinPlanHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    coinplanId: { type: mongoose.Schema.Types.ObjectId, ref: "CoinPlan" },
    paymentGateway: { type: String },
    date: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

CoinPlanHistorySchema.index({ userId: 1 });
CoinPlanHistorySchema.index({ coinplanId: 1 });

module.exports = mongoose.model("CoinPlanHistory", CoinPlanHistorySchema);
