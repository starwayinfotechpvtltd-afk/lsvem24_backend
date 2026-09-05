const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    email: { type: String },
    otp: { type: Number },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("OTP", otpSchema);
