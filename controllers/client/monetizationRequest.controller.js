const MonetizationRequest = require("../../models/monetizationRequest.model");

//import models
const User = require("../../models/user.model");
const Video = require("../../models/video.model");
const UserWiseSubscription = require("../../models/userWiseSubscription.model");
const WatchHistory = require("../../models/watchHistory.model");

//private key
const admin = require("../../util/privateKey");

//monetization request made by particular user
exports.createMonetizationRequest = async (req, res) => {
  try {
    const userId = req.body?.userId || req.query?.userId;
    if (!userId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!!" });
    }

    const user = await User.findOne({ _id: userId, isActive: true });
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found." });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    if (!user.isChannel) {
      return res.status(200).json({ status: false, message: "channel of that user does not created please firstly create channel of that user!" });
    }

    const idProof = req.body?.idProof || req.query?.idProof || "";
    const selfie = req.body?.selfie || req.query?.selfie || "";
    const idProofType = req.body?.idProofType || req.query?.idProofType || "Government ID";

    if (!idProof || !selfie) {
      return res.status(200).json({
        status: false,
        message: "Please upload your ID proof and take a selfie before submitting.",
      });
    }

    const currentSettings = global.settingJSON || require("../../setting");
    const minSubScriber = (currentSettings && currentSettings.minSubScriber) ? currentSettings.minSubScriber : 500;
    const minWatchTime = (currentSettings && currentSettings.minWatchTime) ? currentSettings.minWatchTime : 3000;
    const minShortsViews = (currentSettings && currentSettings.minShortsViews) ? currentSettings.minShortsViews : 3000000;

    if (currentSettings && currentSettings.isMonetization === false) {
      return res.status(200).json({
        status: false,
        message: "Apologies ! The administrator has disabled the monetization settings.",
      });
    }

    const existRequest = await MonetizationRequest.findOne({ userId: user._id });
    if (existRequest?.status == 1) {
      return res.status(200).json({ status: true, message: "Monetization request already send by you to admin.", monetizationRequest: existRequest });
    } else if (existRequest?.status == 2 || user.isMonetization) {
      return res.status(200).json({
        status: false,
        message: "Your channel has already been approved and monetized.",
        monetizationRequest: existRequest,
      });
    } else {
      const channelIdentifiers = [user.channelId, user._id ? user._id.toString() : null].filter(Boolean);

      const userVideos = await Video.find({
        $or: [
          { channelId: { $in: channelIdentifiers } },
          { userId: user._id },
        ],
      }).select("_id videoType visibilityType");

      const longVideoIds = userVideos
        .filter((v) => (v.videoType === 1 || !v.videoType) && (v.visibilityType === 1 || !v.visibilityType))
        .map((v) => v._id);

      const shortsVideoIds = userVideos
        .filter((v) => v.videoType === 2 && (v.visibilityType === 1 || !v.visibilityType))
        .map((v) => v._id);

      const [totalSubscribers, longWatchHistoryResults, shortsViewsResults, deleteExistRequest] = await Promise.all([
        UserWiseSubscription.countDocuments({ channelId: { $in: channelIdentifiers } }),
        WatchHistory.aggregate([
          {
            $match: {
              $or: [
                { videoId: { $in: longVideoIds } },
                { videoChannelId: { $in: channelIdentifiers } },
                { videoUserId: user._id },
              ],
            },
          },
          {
            $lookup: {
              from: "videos",
              localField: "videoId",
              foreignField: "_id",
              as: "video",
            },
          },
          { $unwind: "$video" },
          {
            $match: {
              "video.videoType": 1, // long video
              "video.visibilityType": 1, // public
            },
          },
          {
            $group: {
              _id: null,
              totalWatchTime: { $sum: "$totalWatchTime" },
            },
          },
        ]),
        WatchHistory.aggregate([
          {
            $match: {
              $or: [
                { videoId: { $in: shortsVideoIds } },
                { videoChannelId: { $in: channelIdentifiers } },
                { videoUserId: user._id },
              ],
            },
          },
          {
            $lookup: {
              from: "videos",
              localField: "videoId",
              foreignField: "_id",
              as: "video",
            },
          },
          { $unwind: "$video" },
          {
            $match: {
              "video.videoType": 2, // shorts video
              "video.visibilityType": 1, // public
            },
          },
          {
            $count: "totalShortsViews",
          },
        ]),
        existRequest?.deleteOne(),
      ]);

      const totalWatchTimeMinutes = longWatchHistoryResults.length > 0 ? (longWatchHistoryResults[0].totalWatchTime || 0) : 0;
      const maxWatchTimeMinutes = Math.max(totalWatchTimeMinutes, user.totalWatchTime || 0);
      const totalWatchTimeHours = parseFloat((maxWatchTimeMinutes / 60).toFixed(2));
      const totalShortsViews = shortsViewsResults.length > 0 ? (shortsViewsResults[0].totalShortsViews || 0) : 0;

      const saveMonetizationRequest = await MonetizationRequest.create({
        userId: user._id,
        channelId: user.channelId || (user._id ? user._id.toString() : ""),
        channelName: user.fullName,
        totalSubScribers: totalSubscribers,
        totalWatchTime: maxWatchTimeMinutes,
        totalWatchTimeInHours: totalWatchTimeHours,
        minWatchTime: minWatchTime,
        minSubScriber: minSubScriber,
        totalShortsViews: totalShortsViews,
        minShortsViews: minShortsViews,
        status: 1,
        idProof: idProof,
        selfie: selfie,
        idProofType: idProofType,
        requestDate: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      });

      const messageText = existRequest?.status == 3
        ? "Monetization request already declined by admin and new request has been created."
        : "Monetization request has been send to admin.";

      res.status(200).json({
        status: true,
        message: messageText,
        monetizationRequest: saveMonetizationRequest,
      });

      //checks if the user has an fcmToken
      if (user.fcmToken && user.fcmToken !== null) {
        const adminPromise = await admin;

        const payload = {
          token: user.fcmToken,
          notification: {
            title: "📈 Monetization Request Submitted 📈",
            body: "Your monetization request has been successfully submitted and is now being reviewed. We will inform you of the outcome as soon as possible. Thank you for your patience.",
          },
        };

        adminPromise
          .messaging()
          .send(payload)
          .then((response) => {
            console.log("Successfully sent with response: ", response);
          })
          .catch((error) => {
            console.log("Error sending message:      ", error);
          });
      }
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//get monetization for the particular user (after monetiization on)
exports.getMonetizationForUser = async (req, res) => {
  try {
    if (!req.query.userId || !req.query.startDate || !req.query.endDate) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    const user = await User.findOne({ _id: req.query.userId, isActive: true });
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    const channelIdentifiers = [user.channelId, user._id ? user._id.toString() : null].filter(Boolean);

    let dateFilterQuery = {};
    if (req?.query?.startDate !== "All" && req?.query?.endDate !== "All") {
      const startDate = new Date(req?.query?.startDate);
      const endDate = new Date(req?.query?.endDate);
      endDate.setHours(23, 59, 59, 999);

      dateFilterQuery = {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      };
    }

    const [channel, totalSubscribers, dateWiseotalSubscribers, totalViewsOfthatChannelVideos, watchHistoryResults] = await Promise.all([
      User.findOne({
        $or: [
          { channelId: { $in: channelIdentifiers } },
          { _id: user._id },
        ],
      }).select("fullName image channelId totalWithdrawableAmount"),
      UserWiseSubscription.countDocuments({ channelId: { $in: channelIdentifiers } }),
      UserWiseSubscription.countDocuments({ channelId: { $in: channelIdentifiers }, ...dateFilterQuery }),
      WatchHistory.countDocuments({ videoChannelId: { $in: channelIdentifiers }, ...dateFilterQuery }),
      WatchHistory.aggregate([
        { $match: { videoChannelId: { $in: channelIdentifiers }, ...dateFilterQuery } },
        {
          $group: {
            _id: null,
            totalWatchTime: { $sum: "$totalWatchTime" },
          },
        },
      ]),
    ]);
    // Calculate total watch time and total withdrawable amount for the channel
    const totalWatchTimeMinutes = watchHistoryResults.length > 0 ? watchHistoryResults[0].totalWatchTime : 0;
    const totalWatchTimeHours = totalWatchTimeMinutes / 60; // Convert total watch time from minutes to hours

    return res.status(200).json({
      status: true,
      message: "Retrive Monetization of the particular user.",
      monetizationOfChannel: {
        channel,
        totalSubscribers,
        dateWiseotalSubscribers,
        totalViewsOfthatChannelVideos,
        totalWatchTime: totalWatchTimeHours,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};


//get minimum criteria and actual result of particular user (check monetization for user)
exports.getMonetization = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res.status(200).json({ status: false, message: "userId must be requried" });
    }

    const user = await User.findOne({ _id: req.query.userId, isActive: true });
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    const currentSettings = global.settingJSON || require("../../setting");
    const minSubScriber = (currentSettings && currentSettings.minSubScriber) ? currentSettings.minSubScriber : 500;
    const minWatchTime = (currentSettings && currentSettings.minWatchTime) ? currentSettings.minWatchTime : 3000;
    const minShortsViews = (currentSettings && currentSettings.minShortsViews) ? currentSettings.minShortsViews : 3000000;

    const channelIdentifiers = [user.channelId, user._id ? user._id.toString() : null].filter(Boolean);

    // Find all video IDs of this user/channel to ensure accurate matching
    const userVideos = await Video.find({
      $or: [
        { channelId: { $in: channelIdentifiers } },
        { userId: user._id },
      ],
    }).select("_id videoType visibilityType");

    const longVideoIds = userVideos
      .filter((v) => (v.videoType === 1 || !v.videoType) && (v.visibilityType === 1 || !v.visibilityType))
      .map((v) => v._id);

    const shortsVideoIds = userVideos
      .filter((v) => v.videoType === 2 && (v.visibilityType === 1 || !v.visibilityType))
      .map((v) => v._id);

    const [totalSubscribers, longWatchHistoryResults, shortsViewsResults] = await Promise.all([
      UserWiseSubscription.countDocuments({ channelId: { $in: channelIdentifiers } }),
      WatchHistory.aggregate([
        {
          $match: {
            $or: [
              { videoId: { $in: longVideoIds } },
              { videoChannelId: { $in: channelIdentifiers } },
              { videoUserId: user._id },
            ],
          },
        },
        {
          $lookup: {
            from: "videos",
            localField: "videoId",
            foreignField: "_id",
            as: "video",
          },
        },
        { $unwind: "$video" },
        {
          $match: {
            "video.videoType": 1, // long video
            "video.visibilityType": 1, // public
          },
        },
        {
          $group: {
            _id: null,
            totalWatchTime: { $sum: "$totalWatchTime" },
          },
        },
      ]),
      WatchHistory.aggregate([
        {
          $match: {
            $or: [
              { videoId: { $in: shortsVideoIds } },
              { videoChannelId: { $in: channelIdentifiers } },
              { videoUserId: user._id },
            ],
          },
        },
        {
          $lookup: {
            from: "videos",
            localField: "videoId",
            foreignField: "_id",
            as: "video",
          },
        },
        { $unwind: "$video" },
        {
          $match: {
            "video.videoType": 2, // shorts video
            "video.visibilityType": 1, // public
          },
        },
        {
          $count: "totalShortsViews",
        },
      ]),
    ]);

    // Calculate total watch time of public long videos
    const totalWatchTimeMinutes = longWatchHistoryResults.length > 0 ? (longWatchHistoryResults[0].totalWatchTime || 0) : 0;
    const maxWatchTimeMinutes = Math.max(totalWatchTimeMinutes, user.totalWatchTime || 0);
    const totalWatchTimeHours = parseFloat((maxWatchTimeMinutes / 60).toFixed(2));
    const totalShortsViews = shortsViewsResults.length > 0 ? (shortsViewsResults[0].totalShortsViews || 0) : 0;

    // Check monetization qualification:
    // Minimum 500 subscribers AND (total 3000 public watch hours for long videos OR total 3 million public shorts views)
    const hasEnoughSubscribers = totalSubscribers >= minSubScriber;
    const hasEnoughWatchHoursOrShortsViews = totalWatchTimeHours >= minWatchTime || totalShortsViews >= minShortsViews;
    const isEligible = hasEnoughSubscribers && hasEnoughWatchHoursOrShortsViews;

    const existRequest = await MonetizationRequest.findOne({ userId: user._id });
    const isMonetized = Boolean(user.isMonetization || existRequest?.status === 2);

    const dataOfMonetization = {
      minWatchTime: minWatchTime,
      minSubScriber: minSubScriber,
      minShortsViews: minShortsViews,
      totalSubscribers: totalSubscribers,
      totalWatchTime: totalWatchTimeHours,
      totalShortsViews: totalShortsViews,
      isEligible: isEligible,
      isMonetization: isMonetized,
      requestStatus: existRequest ? existRequest.status : null,
      requestReason: existRequest ? (existRequest.reason || "") : "",
      idProof: existRequest ? (existRequest.idProof || "") : "",
      selfie: existRequest ? (existRequest.selfie || "") : "",
      idProofType: existRequest ? (existRequest.idProofType || "") : "",
    };

    return res.status(200).json({
      status: true,
      message: "Retrive Monetization of the particular user.",
      dataOfMonetization: dataOfMonetization,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};
