const { HISTORY_TYPE } = require("../types/constant");

const mongoose = require("mongoose");

const historySchema = new mongoose.Schema(
  {
    otherUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, //sender
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, //receiver
    coinplan: { type: mongoose.Schema.Types.ObjectId, ref: "CoinPlan", default: null },
    paymentGateway: { type: String, default: "" },
    type: { type: Number, enum: HISTORY_TYPE },
    coin: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    uniqueId: { type: String, unique: true, trim: true, default: "" },
    date: { type: String, default: "" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

historySchema.index({ createdAt: -1 });
historySchema.index({ userId: 1 });

module.exports = new mongoose.model("History", historySchema);
