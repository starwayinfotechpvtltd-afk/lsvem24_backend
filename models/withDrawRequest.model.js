const mongoose = require("mongoose");

const { WITHDRAWAL_STATUS } = require("../types/constant");

const withdrawRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    channelId: { type: String, default: "" }, //channelId of the particular that user
    channelName: { type: String, default: "" }, //channelName of the particular that user
    requestAmount: { type: Number, default: 0 },
    paymentGateway: { type: String, default: "" },
    paymentDetails: { type: Array, default: [] },
    status: { type: Number, default: 1, enum: WITHDRAWAL_STATUS },
    reason: { type: String, default: "" },
    uniqueId: { type: String, unique: true, default: "" },
    requestDate: { type: String, default: "" },
    paymentDate: { type: String, default: "" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

withdrawRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model("WithdrawRequest", withdrawRequestSchema);
