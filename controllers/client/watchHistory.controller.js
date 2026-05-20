const WatchHistory = require("../../models/watchHistory.model");

//import model
const User = require("../../models/user.model");
const Video = require("../../models/video.model");

//mongoose
const mongoose = require("mongoose");

//when user view the video create watchHistory of the particular video
exports.createWatchHistory = async (req, res) => {
  try {
    if (!req.query.userId || !req.query.videoId || !req.query.videoUserId || !req.query.videoChannelId || !req.query.currentWatchTime) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    const { userId, videoId, videoUserId, videoChannelId, currentWatchTime } = req.query;
    console.log("requested parameters:      ", req.query);

    const watchTimeInMinutes = Math.floor(parseFloat(currentWatchTime)); //Rounds to the nearest integer (e.g., 1234.567 becomes 1235)
    console.log("watchTimeInMinutes =================", watchTimeInMinutes);

    const watchTimeInHours = watchTimeInMinutes / 60; // Convert minutes to hours
    console.log("watchTimeInHours ====================", watchTimeInHours);

    const [user, video, alreadyWatchHistory] = await Promise.all([
      User.findOne({ _id: userId, isActive: true }),
      Video.findOne({
        _id: videoId,
        userId: videoUserId,
        channelId: videoChannelId,
        isActive: true,
      }),
      WatchHistory.findOne({ userId: userId, videoId: videoId }),
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

    if (!settingJSON || !settingJSON.earningPerHour) {
      return res.status(200).json({ status: false, message: "earningPerHour not configured in settings!" });
    }

    res.status(200).json({ status: true, message: "When user view the video then created watchHistory for that video." });

    const earningPerHour = settingJSON.earningPerHour;
    const totalEarnings = Math.floor(watchTimeInHours * earningPerHour);

    console.log("watchTimeInHours * earningPerHour ", watchTimeInHours * earningPerHour);
    console.log("totalEarnings                     ", totalEarnings);

    const updatePromises = [];

    if (userId.toString() === videoUserId.toString()) {
      console.log("========= own video watched ==============");
    } else {
      console.log("=========== video of another user watched =====================");

      updatePromises.push(
        User.updateOne(
          {
            _id: videoUserId,
            channelId: videoChannelId,
          },
          {
            $inc: {
              totalWatchTime: watchTimeInMinutes,
              totalCurrentWatchTime: watchTimeInMinutes,
              totalWithdrawableAmount: totalEarnings,
            },
          }
        )
      );

      if (!alreadyWatchHistory) {
        updatePromises.push(
          WatchHistory.create({
            userId: user._id,
            videoId: video._id,
            videoUserId: video.userId,
            videoChannelId: video.channelId,
            totalWatchTime: watchTimeInMinutes,
            totalWithdrawableAmount: totalEarnings,
          })
        );
      } else {
        updatePromises.push(
          WatchHistory.updateOne(
            { _id: alreadyWatchHistory._id },
            {
              $inc: {
                totalWatchTime: watchTimeInMinutes,
                totalWithdrawableAmount: totalEarnings,
              },
            }
          )
        );
      }

      await Promise.all(updatePromises);
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

//get user wise watchHistory
exports.getWatchHistory = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!!" });
    }

    const userId = new mongoose.Types.ObjectId(req.query.userId);

    const [user, watchHistory] = await Promise.all([
      User.findOne({ _id: userId, isActive: true }),
      WatchHistory.aggregate([
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
          $project: {
            videoId: "$video._id",
            videoTitle: "$video.title",
            videoType: "$video.videoType",
            videoTime: "$video.videoTime",
            videoUrl: "$video.videoUrl",
            videoImage: "$video.videoImage",
            views: { $size: "$views" },
            channelName: "$channel.fullName",
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

    return res.status(200).json({ status: true, message: "get the history for that user!", watchHistory: watchHistory });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};
