const SaveToWatchLater = require("../../models/saveToWatchLater.model");

//import model
const User = require("../../models/user.model");
const Video = require("../../models/video.model");

//mongoose
const mongoose = require("mongoose");

//user wise add video to saveToWatchLater
exports.addVideoToWatchLater = async (req, res) => {
  try {
    if (!req.query.userId || !req.query.videoId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!!" });
    }

    const [user, video, SaveToWatchLaterExist] = await Promise.all([
      User.findOne({ _id: req.query.userId, isActive: true }),
      Video.findOne({ _id: req.query.videoId, isActive: true }),
      SaveToWatchLater.findOne({
        userId: req.query.userId,
        videoId: req.query.videoId,
      }),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "user does not found!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    if (!video) {
      return res.status(200).json({ status: false, message: "video does not found!" });
    }

    if (SaveToWatchLaterExist) {
      return res.status(200).json({
        status: true,
        message: "video added to watchLater already exists!! ",
      });
    } else {
      const saveToWatchLater = await new SaveToWatchLater();

      saveToWatchLater.userId = user._id;
      saveToWatchLater.videoId = video._id;
      await saveToWatchLater.save();

      return res.status(200).json({ status: true, message: "finally, video added to saveToWatchLater!", saveToWatchLater });
    }
  } catch {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};

//get all saveToWatchLater videos for that user
exports.getSaveToWatchLater = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!!" });
    }

    const userId = new mongoose.Types.ObjectId(req.query.userId);

    const [user, getSaveToWatchLater] = await Promise.all([
      User.findOne({ _id: userId, isActive: true }),
      SaveToWatchLater.aggregate([
        {
          $match: { userId: userId },
        },
        {
          $lookup: {
            from: "videos",
            localField: "videoId",
            foreignField: "_id",
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
            from: "userwisesubscriptions",
            let: { loginUserId: userId, channelId: "$channel.channelId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$userId", "$$loginUserId"] }, { $eq: ["$channelId", "$$channelId"] }],
                  },
                },
              },
            ],
            as: "subscription",
          },
        },
        {
          $addFields: {
            isSubscribed: { $gt: [{ $size: "$subscription" }, 0] },
          },
        },
        {
          $project: {
            userId: 1,
            videoId: "$video._id",
            videoTitle: "$video.title",
            videoType: "$video.videoType",
            videoTime: "$video.videoTime",
            videoUrl: "$video.videoUrl",
            videoImage: "$video.videoImage",
            videoPrivacyType: "$video.videoPrivacyType",
            channelName: "$channel.fullName",
            subscriptionCost: "$channel.subscriptionCost",
            videoUnlockCost: "$channel.videoUnlockCost",
            channelType: "$channel.channelType",
            isSubscribed: 1,
          },
        },
      ]),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "user does not found!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    return res.status(200).json({ status: true, message: "finally, get all saveToWatchLater videos for that user!", getSaveToWatchLater });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};
