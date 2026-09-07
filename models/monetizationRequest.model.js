const mongoose = require("mongoose");

const { MONETIZATIONREQUEST_STATUS } = require("../types/constant");

const monetizationRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    channelId: { type: String, default: "" }, //channelId of the particular that user
    channelName: { type: String, default: "" }, //channelName of the particular that user

    totalSubScribers: { type: String, default: "" }, //total subScriber at request time
    totalWatchTime: { type: Number, default: 0 }, //total watch time of long videos of the particular channel at request time in minutes
    totalWatchTimeInHours: { type: Number, default: 0 }, //total watch time of long videos of the particular channel at request time in hours
    minWatchTime: { type: Number, default: 3000 }, //minimum watch time required by admin at request time in hours (long videos)
    minSubScriber: { type: Number, default: 500 }, //minimum subscriber required by admin at request time
    totalShortsViews: { type: Number, default: 0 }, //total public shorts views at request time
    minShortsViews: { type: Number, default: 3000000 }, //minimum public shorts views required at request time

    status: { type: Number, default: 1, enum: MONETIZATIONREQUEST_STATUS },
    reason: { type: String, default: "" },
    requestDate: { type: String, default: "" },
    idProof: { type: String, default: "" }, // URL/path to uploaded ID document
    selfie: { type: String, default: "" }, // URL/path to uploaded user selfie
    idProofType: { type: String, default: "" }, // Type of ID: e.g. Passport, Driving License, etc.
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("MonetizationRequest", monetizationRequestSchema);
