const MonetizationRequest = require("../../models/monetizationRequest.model");

//import models
const User = require("../../models/user.model");
const UserWiseSubscription = require("../../models/userWiseSubscription.model");
const WatchHistory = require("../../models/watchHistory.model");

//private key
const admin = require("../../util/privateKey");

//monetization request made by particular user
exports.createMonetizationRequest = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!!" });
    }

    const user = await User.findOne({ _id: req.query.userId, isActive: true });
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found." });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    if (!user.isChannel) {
      return res.status(200).json({ status: false, message: "channel of that user does not created please firstly create channel of that user!" });
    }

    if (!user.isMonetization) {
      return res.status(200).json({ status: false, message: "Oops ! Monetization is not allowed for your account." });
    }

    if (!settingJSON || !settingJSON.minSubScriber || !settingJSON.minWatchTime) {
      return res.status(200).json({
        status: false,
        message: "minSubScriber and minWatchTime not configured in settings.",
      });
    }

    if (!settingJSON.isMonetization) {
      return res.status(200).json({
        status: false,
        message: "Apologies ! The administrator has disabled the monetization settings.",
      });
    }

    const existRequest = await MonetizationRequest.findOne({ userId: user._id });
    if (existRequest?.status == 1) {
      return res.status(200).json({ status: true, message: "Monetization request already send by you to admin.", monetizationRequest: existRequest });
    } else if (existRequest?.status == 2) {
      return res.status(200).json({
        status: false,
        message: "Your monetization request has already been approved by the admin, and as such, you are unable to submit the same request for a second time.",
        monetizationRequest: existRequest,
      });
    } else if (existRequest?.status == 3) {
      const [totalSubscribers, deleteExistRequest] = await Promise.all([UserWiseSubscription.countDocuments({ channelId: user.channelId }), existRequest.deleteOne()]);

      const watchTimeInMinutes = Math.floor(parseFloat(user?.totalWatchTime));
      const watchTimeInHours = watchTimeInMinutes / 60; // Convert minutes to hours
      const roundedWatchTimeInHours = Math.floor(watchTimeInHours);
      const minWatchTime = settingJSON?.minWatchTime;
      const minSubScriber = settingJSON?.minSubScriber;

      const saveMonetizationRequest = await MonetizationRequest.create({
        userId: user._id,
        channelId: user.channelId,
        channelName: user.fullName,
        totalSubScribers: totalSubscribers,
        totalWatchTime: watchTimeInMinutes,
        totalWatchTimeInHours: roundedWatchTimeInHours,
        minWatchTime: minWatchTime,
        minSubScriber: minSubScriber,
        status: 1,
        requestDate: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      });

      res.status(200).json({
        status: true,
        message: "Monetization request already declined by admin and new request has been created.",
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
    } else {
      const [totalSubscribers, deleteExistRequest] = await Promise.all([UserWiseSubscription.countDocuments({ channelId: user.channelId }), existRequest?.deleteOne()]);

      const watchTimeInMinutes = Math.floor(parseFloat(user?.totalWatchTime));
      const watchTimeInHours = watchTimeInMinutes / 60; // Convert minutes to hours
      const roundedWatchTimeInHours = Math.floor(watchTimeInHours);
      const minWatchTime = settingJSON?.minWatchTime;
      const minSubScriber = settingJSON?.minSubScriber;

      const saveMonetizationRequest = await MonetizationRequest.create({
        userId: user._id,
        channelId: user.channelId,
        channelName: user.fullName,
        totalSubScribers: totalSubscribers,
        totalWatchTime: watchTimeInMinutes,
        totalWatchTimeInHours: roundedWatchTimeInHours,
        minWatchTime: minWatchTime,
        minSubScriber: minSubScriber,
        status: 1,
        requestDate: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      });

      res.status(200).json({ status: true, message: "Monetization request has been send to admin.", monetizationRequest: saveMonetizationRequest });

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
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
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
      User.findOne({ channelId: user.channelId }).select("fullName image channelId totalWithdrawableAmount"),
      UserWiseSubscription.countDocuments({ channelId: user.channelId }),
      UserWiseSubscription.countDocuments({ channelId: user.channelId, ...dateFilterQuery }),
      WatchHistory.countDocuments({ videoChannelId: user.channelId, ...dateFilterQuery }),
      WatchHistory.aggregate([
        { $match: { videoChannelId: user.channelId, ...dateFilterQuery } },
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

    if (!global.settingJSON || !settingJSON.minSubScriber || !settingJSON.minWatchTime) {
      return res.status(200).json({
        status: false,
        message: "minSubScriber and minWatchTime not configured in settings.",
      });
    }

    const [totalSubscribers, watchHistoryResults] = await Promise.all([
      UserWiseSubscription.countDocuments({ channelId: user.channelId }),
      WatchHistory.aggregate([
        { $match: { videoChannelId: user.channelId } },
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

    const dataOfMonetization = {
      minWatchTime: settingJSON.minWatchTime,
      minSubScriber: settingJSON.minSubScriber,
      totalSubscribers: totalSubscribers,
      totalWatchTime: totalWatchTimeHours,
      isMonetization: user.isMonetization,
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
