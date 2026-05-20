const UserWiseSubscription = require("../../models/userWiseSubscription.model");

//import model
const User = require("../../models/user.model");
const WatchHistory = require("../../models/watchHistory.model");
const History = require("../../models/history.model");
const Video = require("../../models/video.model");

//generateHistoryUniqueId
const { generateHistoryUniqueId } = require("../../util/generateHistoryUniqueId");

//private key
const admin = require("../../util/privateKey");

//mongoose
const mongoose = require("mongoose");

//user wise subscribed or unSubscribed the channel
exports.subscribedUnSubscibed = async (req, res) => {
  try {
    const { userId, channelId } = req.query;

    if (!userId || !channelId) {
      return res.status(200).json({ status: false, message: "Oops! Invalid details." });
    }

    const [user, channel, alreadySubscribedChannelByUser] = await Promise.all([
      User.findOne({ _id: userId, isActive: true }),
      User.findOne({ channelId: channelId }),
      UserWiseSubscription.findOne({ userId: userId, channelId: channelId }),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User not found." });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "You are blocked by the admin." });
    }

    if (!channel) {
      return res.status(200).json({ status: false, message: "Channel not found." });
    }

    // Check if user is trying to subscribe to their own channel
    if (user.channelId === channel.channelId) {
      return res.status(200).json({
        status: false,
        message: "You cannot subscribe to your own channel.",
      });
    }

    if (alreadySubscribedChannelByUser) {
      await UserWiseSubscription.deleteOne({ userId: user._id, channelId: channel.channelId });

      return res.status(200).json({
        status: true,
        message: "Successfully unsubscribed from the channel!",
        isSubscribed: false,
      });
    } else {
      if (channel.channelType === 2) {
        console.log("Paid Channel =======================", channel.channelType);

        const coinsRequired = channel?.subscriptionCost || 0;

        if (user.coin < coinsRequired) {
          return res.status(200).json({ status: false, message: "Insufficient coins to subscribe to this channel." });
        }

        res.status(200).json({
          status: true,
          message: "Successfully subscribed to the paid channel!",
          isSubscribed: true,
        });

        const [uniqueId1, uniqueId2] = await Promise.all([generateHistoryUniqueId(), generateHistoryUniqueId()]);

        const subscribedByUser = new UserWiseSubscription({
          userId: user._id,
          channelId: channel.channelId,
          isPublic: false,
        });

        await Promise.all([
          User.findOneAndUpdate({ _id: channel._id }, { $inc: { coin: coinsRequired } }, { new: true }),
          new History({
            userId: channel._id, //channel's user
            uniqueId: uniqueId1,
            coin: coinsRequired,
            type: 10,
            date: new Date().toISOString(),
          }).save(),
          User.findOneAndUpdate({ _id: user._id }, { $inc: { coin: -coinsRequired } }, { new: true }),
          new History({
            otherUserId: user._id, //login user
            uniqueId: uniqueId2,
            coin: coinsRequired,
            type: 10,
            date: new Date().toISOString(),
          }).save(),
          subscribedByUser.save(),
        ]);

        if (channel.fcmToken && channel.fcmToken !== null) {
          const adminInstance = await admin;
          const notificationPayload = {
            token: channel.fcmToken,
            notification: {
              title: "🎊 You've Earned Coins! 💰",
              body: `🎯 Awesome! You've gained ${coinsRequired} coins from a new subscription. Keep up the great work! 💪✨`,
            },
            data: {
              type: "COINS_EARNED",
            },
          };

          adminInstance
            .messaging()
            .send(notificationPayload)
            .then((response) => {
              console.log("Notification sent successfully: ", response);
            })
            .catch((error) => {
              console.error("Error sending notification: ", error);
            });
        }
      } else {
        console.log("Free subscription ====================", channel.channelType);

        const subscribedByUser = new UserWiseSubscription({
          userId: user._id,
          channelId: channel.channelId,
          isPublic: true,
        });

        await subscribedByUser.save();

        res.status(200).json({
          status: true,
          message: "Successfully subscribed to the channel!",
          isSubscribed: true,
        });

        if (channel.fcmToken && channel.fcmToken !== null) {
          const adminInstance = await admin;
          const notificationPayload = {
            token: channel.fcmToken,
            notification: {
              title: "🌟 New Subscriber!",
              body: `🎉 ${user?.fullName || "Subscriber"} has just joined your channel. Keep up the great content! 🚀`,
            },
            data: {
              type: "NEW_SUBSCRIBER",
            },
          };

          adminInstance
            .messaging()
            .send(notificationPayload)
            .then((response) => {
              console.log("Notification sent successfully: ", response);
            })
            .catch((error) => {
              console.error("Error sending notification: ", error);
            });
        }
      }
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};

//get all subscription channels subscribed by that user
exports.getSubscribedChannel = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!!" });
    }

    const userId = new mongoose.Types.ObjectId(req.query.userId);

    const [user, subscribedChannel] = await Promise.all([User.findOne({ _id: userId, isActive: true }), UserWiseSubscription.find({ userId: userId })]);

    if (!user) {
      return res.status(200).json({ status: false, message: "user does not found!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    if (!subscribedChannel || subscribedChannel.length === 0) {
      return res.status(200).json({ status: false, message: "No channels have been subscribed by that user." });
    }

    const channelsInfoPromises = subscribedChannel?.map(async (subscription) => {
      const channel = await User.findOne({ channelId: subscription.channelId });
      if (channel) {
        return {
          channelId: subscription?.channelId,
          channelName: channel?.fullName,
          channelImage: channel?.image,
        };
      }
    });

    const [totalSubscribedChannel, channelsInfo] = await Promise.all([UserWiseSubscription.countDocuments({ userId: user._id }), Promise.all(channelsInfoPromises)]);

    return res.status(200).json({
      status: true,
      message: "Retrive subscription channels subscribed by that user!",
      totalSubscribedChannel: totalSubscribedChannel,
      subscribedChannel: channelsInfo,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};

//get type wise videos of the subscribed channels
exports.videoOfSubscribedChannel = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    const userId = new mongoose.Types.ObjectId(req.query.userId);

    const user = await User.findOne({ _id: userId, isActive: true });
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found." });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by the admin." });
    }

    if (req.query.type === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0); //Set time to the beginning of the day

      const videoOfSubscribedChannel = await UserWiseSubscription.aggregate([
        {
          $match: { userId: user._id },
        },
        {
          $lookup: {
            from: "videos",
            localField: "channelId",
            foreignField: "channelId",
            as: "video",
          },
        },
        {
          $unwind: "$video",
        },
        {
          $lookup: {
            from: "users",
            localField: "video.channelId",
            foreignField: "channelId",
            as: "channel",
          },
        },
        {
          $unwind: {
            path: "$channel",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "watchhistories",
            let: { videoId: "$video._id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$videoId", "$$videoId"] },
                },
              },
            ],
            as: "views",
          },
        },
        {
          $match: {
            "video.createdAt": { $gte: today },
          },
        },
        {
          $lookup: {
            from: "savetowatchlaters",
            let: { videoId: "$video._id", userId: userId },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                  },
                },
              },
            ],
            as: "isSaveToWatchLater",
          },
        },
        {
          $project: {
            isSaveToWatchLater: {
              $cond: [{ $eq: [{ $size: "$isSaveToWatchLater" }, 0] }, false, true],
            },
            videoId: "$video._id",
            videoTitle: "$video.title",
            videoType: "$video.videoType",
            videoTime: "$video.videoTime",
            videoUrl: "$video.videoUrl",
            videoImage: "$video.videoImage",
            videoCreatedAt: "$video.createdAt",
            videoPrivacyType: "$video.videoPrivacyType",
            channelName: "$channel.fullName",
            channelId: "$channel.channelId",
            channelType: "$channel.channelType",
            subscriptionCost: "$channel.subscriptionCost",
            videoUnlockCost: "$channel.videoUnlockCost",
            channelImage: "$channel.image",
            views: { $size: "$views" },
          },
        },
      ]);

      return res.status(200).json({
        status: true,
        message: `Retrive videos of the subscribed channel with type is ${req.query.type}!`,
        videoOfSubscribedChannel,
      });
    } else if (req.query.type === "continueWatching") {
      const userWatchedChannels = await WatchHistory.distinct("videoChannelId", { userId: user._id });
      console.log("userWatchedChannels:             ", userWatchedChannels);

      const videoOfSubscribedChannel = await UserWiseSubscription.aggregate([
        {
          $match: { userId: user._id, channelId: { $in: userWatchedChannels } },
        },
        {
          $lookup: {
            from: "videos",
            localField: "channelId",
            foreignField: "channelId",
            as: "video",
          },
        },
        {
          $unwind: "$video",
        },
        {
          $lookup: {
            from: "users",
            localField: "video.channelId",
            foreignField: "channelId",
            as: "channel",
          },
        },
        {
          $unwind: "$channel",
        },
        {
          $lookup: {
            from: "watchhistories",
            let: { videoId: "$video._id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$videoId", "$$videoId"] },
                },
              },
            ],
            as: "views",
          },
        },
        {
          $lookup: {
            from: "savetowatchlaters",
            let: { videoId: "$video._id", userId: userId },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                  },
                },
              },
            ],
            as: "isSaveToWatchLater",
          },
        },
        {
          $project: {
            isSaveToWatchLater: {
              $cond: [{ $eq: [{ $size: "$isSaveToWatchLater" }, 0] }, false, true],
            },
            videoId: "$video._id",
            videoTitle: "$video.title",
            videoType: "$video.videoType",
            videoTime: "$video.videoTime",
            videoUrl: "$video.videoUrl",
            videoImage: "$video.videoImage",
            videoCreatedAt: "$video.createdAt",
            videoPrivacyType: "$video.videoPrivacyType",
            channelName: "$channel.fullName",
            channelId: "$channel.channelId",
            channelImage: "$channel.image",
            channelType: "$channel.channelType",
            subscriptionCost: "$channel.subscriptionCost",
            videoUnlockCost: "$channel.videoUnlockCost",
            views: { $size: "$views" },
          },
        },
      ]);

      return res.status(200).json({
        status: true,
        message: `Retrive videos of the subscribed channel with type is ${req.query.type}!`,
        videoOfSubscribedChannel,
      });
    } else if (req.query.type === "all") {
      const videoOfSubscribedChannel = await UserWiseSubscription.aggregate([
        {
          $match: { userId: user._id },
        },
        {
          $lookup: {
            from: "videos",
            localField: "channelId",
            foreignField: "channelId",
            as: "video",
          },
        },
        {
          $unwind: "$video",
        },
        {
          $lookup: {
            from: "users",
            localField: "video.channelId",
            foreignField: "channelId",
            as: "channel",
          },
        },
        {
          $unwind: "$channel",
        },
        {
          $lookup: {
            from: "watchhistories",
            let: { videoId: "$video._id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$videoId", "$$videoId"] },
                },
              },
            ],
            as: "views",
          },
        },
        {
          $lookup: {
            from: "savetowatchlaters",
            let: { videoId: "$video._id", userId: userId },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                  },
                },
              },
            ],
            as: "isSaveToWatchLater",
          },
        },
        {
          $project: {
            isSaveToWatchLater: {
              $cond: [{ $eq: [{ $size: "$isSaveToWatchLater" }, 0] }, false, true],
            },
            videoId: "$video._id",
            videoTitle: "$video.title",
            videoType: "$video.videoType",
            videoTime: "$video.videoTime",
            videoUrl: "$video.videoUrl",
            videoImage: "$video.videoImage",
            videoCreatedAt: "$video.createdAt",
            videoPrivacyType: "$video.videoPrivacyType",
            channelType: "$channel.channelType",
            subscriptionCost: "$channel.subscriptionCost",
            videoUnlockCost: "$channel.videoUnlockCost",
            channelName: "$channel.fullName",
            channelId: "$channel.channelId",
            channelImage: "$channel.image",
            views: { $size: "$views" },
          },
        },
      ]);

      return res.status(200).json({
        status: true,
        message: `Retrive videos of the subscribed channel with type is ${req.query.type}!`,
        videoOfSubscribedChannel,
      });
    } else {
      return res.status(200).json({ status: false, message: "type must be passed valid." });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};
