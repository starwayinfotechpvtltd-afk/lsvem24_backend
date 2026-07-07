const Video = require("../../models/video.model");
const mongoose = require("mongoose");

//import model
const User = require("../../models/user.model");
const UserWiseSubscription = require("../../models/userWiseSubscription.model");
const Notification = require("../../models/notification.model");
const VideoComment = require("../../models/videoComment.model");
const Report = require("../../models/report.model");
const SaveToWatchLater = require("../../models/saveToWatchLater.model");
const LikeHistoryOfVideo = require("../../models/likeHistoryOfVideo.model");
const PlayList = require("../../models/playList.model");
const LikeHistoryOfVideoComment = require("../../models/likeHistoryOfVideoComment.model");
const WatchHistory = require("../../models/watchHistory.model");

//private key
const admin = require("../../util/privateKey");

//momemt
const moment = require("moment");

//generateUniqueVideoId
const { generateUniqueVideoId } = require("../../util/generateUniqueVideoId");

//deleteFromStorage
const { deleteFromStorage } = require("../../util/storageHelper");

//upload (normal videos or shorts) by the admin
exports.uploadVideo = async (req, res) => {
  try {
    if (
      !req.body.title ||
      !req.body.description ||
      !req.body.hashTag ||
      !req.body.videoType ||
      !req.body.videoTime ||
      !req.body.visibilityType ||
      !req.body.audienceType ||
      !req.body.commentType ||
      !req.body.scheduleType ||
      !req.body.location ||
      !req.body.latitude ||
      !req.body.longitude ||
      !req.body.userId ||
      !req.body.channelId ||
      !req.body.videoUrl ||
      !req.body.videoImage
    ) {
      if (req.body.videoImage) {
        await deleteFromStorage(req.body.videoImage);
      }

      if (req.body.videoUrl) {
        await deleteFromStorage(req.body.videoUrl);
      }

      return res
        .status(200)
        .json({ status: false, message: "Oops ! Invalid details!" });
    }

    if (req.body.scheduleType == 1 && !req.body.scheduleTime) {
      if (req.body.videoImage) {
        await deleteFromStorage(req.body.videoImage);
      }

      if (req.body.videoUrl) {
        await deleteFromStorage(req.body.videoUrl);
      }

      return res
        .status(200)
        .json({ status: false, message: "scheduleTime must be required!" });
    }

    if (req.body.videoType == 2) {
      if (global.settingJSON.durationOfShorts < parseInt(req.body.videoTime)) {
        if (req.body.videoImage) {
          await deleteFromStorage(req.body.videoImage);
        }

        if (req.body.videoUrl) {
          await deleteFromStorage(req.body.videoUrl);
        }

        return res
          .status(200)
          .json({
            status: false,
            message: "your duration of Shorts greater than decided by admin!",
          });
      }
    }

    const [uniqueVideoId, user] = await Promise.all([
      generateUniqueVideoId(),
      User.findOne({
        _id: req.body.userId,
        isActive: true,
        isAddByAdmin: true,
      }),
    ]);

    if (!user) {
      if (req.body.videoImage) {
        await deleteFromStorage(req.body.videoImage);
      }

      if (req.body.videoUrl) {
        await deleteFromStorage(req.body.videoUrl);
      }

      return res
        .status(200)
        .json({ status: false, message: "user does not found!" });
    }

    if (user.isBlock) {
      if (req.body.videoImage) {
        await deleteFromStorage(req.body.videoImage);
      }

      if (req.body.videoUrl) {
        await deleteFromStorage(req.body.videoUrl);
      }

      return res
        .status(200)
        .json({ status: false, message: "you are blocked by the admin!" });
    }

    const channel = await User.findOne({ channelId: user.channelId });
    if (!channel) {
      if (req.body.videoImage) {
        await deleteFromStorage(req.body.videoImage);
      }

      if (req.body.videoUrl) {
        await deleteFromStorage(req.body.videoUrl);
      }

      return res
        .status(200)
        .json({ status: false, message: "channel does not found!" });
    }

    if (user.channelId !== req.body.channelId) {
      if (req.body.videoImage) {
        await deleteFromStorage(req.body.videoImage);
      }

      if (req.body.videoUrl) {
        await deleteFromStorage(req.body.videoUrl);
      }

      return res
        .status(200)
        .json({
          status: false,
          message: "video has been uploaded only by own channelId",
        });
    }

    const video = new Video();

    video.title = req?.body?.title?.trim();
    video.description = req?.body?.description?.trim();
    video.videoType = req?.body?.videoType;
    video.videoTime = req?.body?.videoTime;
    video.visibilityType = req?.body?.visibilityType;
    video.audienceType = req?.body?.audienceType;
    video.commentType = req?.body?.commentType;
    video.videoUrl = req?.body?.videoUrl;
    video.videoImage = req?.body?.videoImage;
    video.isAddByAdmin = true;

    if (req?.body?.scheduleType) {
      video.scheduleType = req?.body?.scheduleType;

      if (req?.body?.scheduleType == 1) {
        video.scheduleTime = moment(req?.body?.scheduleTime).toISOString(); //e.g."2023-07-11T18:00:00.000Z"
      } else if (req?.body?.scheduleType == 2) {
        video.scheduleTime = "";
      } else {
        if (req.body.videoImage) {
          await deleteFromStorage(req.body.videoImage);
        }

        if (req.body.videoUrl) {
          await deleteFromStorage(req.body.videoUrl);
        }

        return res
          .status(200)
          .json({
            status: false,
            message: "scheduleType must be passed valid!",
          });
      }
    }

    video.location = req?.body?.location;
    video.locationCoordinates.latitude = req?.body?.latitude;
    video.locationCoordinates.longitude = req?.body?.longitude;
    video.userId = user._id;
    video.channelId = channel.channelId;

    //hashTag
    const multiplehashTag = req.body.hashTag.toString().split(",");
    video.hashTag = multiplehashTag;

    //uniqueVideoId
    video.uniqueVideoId = uniqueVideoId;

    await video.save();

    const data = await Video.findById(video._id).populate(
      "userId",
      "fullName nickName uniqueId image",
    );

    res.status(200).json({
      status: true,
      message: "Normal video or shorts has been uploaded by the admin!",
      video: data,
    });

    //if user subscribed that channel then send notification to that users
    const channelSubscribedByUsers = await UserWiseSubscription.find({
      channelId: req.body.channelId,
    }).distinct("userId");
    console.log("channelSubscribedByUsers: ", channelSubscribedByUsers);

    await channelSubscribedByUsers.map(async (userId) => {
      const user = await User.findById(userId);

      //Check if user exists and is not the same as the video uploader
      if (user._id.toString() !== req.body.userId.toString()) {
        const notification = new Notification();
        notification.title = "🔔 New Video Alert! 🔔";
        notification.message =
          "Hey there! We're excited to share our latest video. Don't miss out Click here to watch the video now!";
        notification.userId = user?._id;
        notification.videoId = video?._id;
        notification.channelImage = channel.image;
        notification.videoImage = video.videoImage;
        await notification.save();

        //checks if the user has an fcmToken
        if (user.fcmToken) {
          const adminPromise = await admin;

          const payload = {
            token: user.fcmToken,
            notification: {
              title: "🔔 New Video Alert! 🔔",
              body: "Hey there! We're excited to share our latest video. Don't miss out Click here to watch the video now!",
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
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//update (normal videos or shorts) by the admin
exports.updateVideo = async (req, res) => {
  try {
    if (
      !req.query.videoId ||
      !req.query.userId ||
      !req.query.channelId ||
      !req.query.videoType
    ) {
      if (req.body.videoImage) {
        await deleteFromStorage(req.body.videoImage);
      }

      if (req.body.videoUrl) {
        await deleteFromStorage(req.body.videoUrl);
      }

      return res
        .status(200)
        .json({ status: false, message: "OOps ! Invalid details!" });
    }

    const [user, video] = await Promise.all([
      User.findOne({ _id: req.query.userId, isActive: true }),
      Video.findOne({
        _id: req.query.videoId,
        isActive: true,
        videoType: req.query.videoType,
      }).populate("userId", "fullName nickName image"),
    ]);

    if (!user) {
      if (req.body.videoImage) {
        await deleteFromStorage(req.body.videoImage);
      }

      if (req.body.videoUrl) {
        await deleteFromStorage(req.body.videoUrl);
      }

      return res
        .status(200)
        .json({ status: false, message: "user does not found!" });
    }

    if (user.isBlock) {
      if (req.body.videoImage) {
        await deleteFromStorage(req.body.videoImage);
      }

      if (req.body.videoUrl) {
        await deleteFromStorage(req.body.videoUrl);
      }

      return res
        .status(200)
        .json({ status: false, message: "you are blocked by admin!" });
    }

    const channel = await User.findOne({ channelId: user.channelId });
    if (!channel) {
      if (req.body.videoImage) {
        await deleteFromStorage(req.body.videoImage);
      }

      if (req.body.videoUrl) {
        await deleteFromStorage(req.body.videoUrl);
      }

      return res
        .status(200)
        .json({ status: false, message: "channel does not found!" });
    }

    if (user.channelId !== req.query.channelId) {
      if (req.body.videoImage) {
        await deleteFromStorage(req.body.videoImage);
      }

      if (req.body.videoUrl) {
        await deleteFromStorage(req.body.videoUrl);
      }

      return res
        .status(200)
        .json({
          status: false,
          message: "video has been updated only by own channelId.",
        });
    }

    if (!video) {
      if (req.body.videoImage) {
        await deleteFromStorage(req.body.videoImage);
      }

      if (req.body.videoUrl) {
        await deleteFromStorage(req.body.videoUrl);
      }

      return res
        .status(200)
        .json({ status: false, message: "video does not found!" });
    }

    video.title = req?.body?.title ? req?.body?.title?.trim() : video.title;
    video.description = req?.body?.description
      ? req?.body?.description?.trim()
      : video.description;

    if (req.query.videoType == 2) {
      if (req?.body?.videoTime) {
        if (
          global.settingJSON.durationOfShorts < Number(req?.body?.videoTime)
        ) {
          if (req.body.videoImage) {
            await deleteFromStorage(req.body.videoImage);
          }

          if (req.body.videoUrl) {
            await deleteFromStorage(req.body.videoUrl);
          }

          return res
            .status(200)
            .json({
              status: false,
              message:
                "your duration of Shorts greater than decided by the admin.",
            });
        }

        video.videoTime = req?.body?.videoTime
          ? req?.body?.videoTime
          : video.videoTime;
      }
    }

    video.visibilityType = req?.body?.visibilityType
      ? req?.body?.visibilityType
      : video.visibilityType;
    video.audienceType = req?.body?.audienceType
      ? req?.body?.audienceType
      : video.audienceType;
    video.commentType = req?.body?.commentType
      ? req?.body?.commentType
      : video.commentType;

    if (req?.body?.scheduleType) {
      video.scheduleType = req?.body?.scheduleType
        ? req?.body?.scheduleType
        : video.scheduleType;

      if (req?.body?.scheduleType == 1) {
        video.scheduleTime = req?.body?.scheduleTime
          ? moment(req?.body?.scheduleTime).toDate()
          : video.scheduleTime; //e.g."2023-07-11T18:00:00.000Z"
      } else if (req?.body?.scheduleType == 2) {
        video.scheduleTime = "";
      } else {
        if (req.body.videoImage) {
          await deleteFromStorage(req.body.videoImage);
        }

        if (req.body.videoUrl) {
          await deleteFromStorage(req.body.videoUrl);
        }

        return res
          .status(200)
          .json({
            status: false,
            message: "scheduleType must be passed valid!",
          });
      }
    }

    video.location = req?.body?.location ? req?.body?.location : video.location;
    video.locationCoordinates.latitude = req?.body?.latitude
      ? req?.body?.latitude
      : video.latitude;
    video.locationCoordinates.longitude = req?.body?.longitude
      ? req?.body?.longitude
      : video.longitude;

    const multiplehashTag = req?.body?.hashTag
      ? req?.body?.hashTag.toString().split(",")
      : video.hashTag;
    video.hashTag = multiplehashTag;

    if (req?.body?.videoImage) {
      if (video.videoImage) {
        await deleteFromStorage(video.videoImage);
      }
      video.videoImage = req?.body?.videoImage
        ? req?.body?.videoImage
        : video.videoImage;
    }

    if (req?.body?.videoUrl) {
      if (video.videoUrl) {
        await deleteFromStorage(video.videoUrl);
      }
      video.videoUrl = req?.body?.videoUrl
        ? req?.body?.videoUrl
        : video.videoUrl;
    }

    await video.save();

    return res.status(200).json({
      status: true,
      message: "Video has been updated by admin!",
      video: video,
    });
  } catch (error) {
    if (req.body.videoImage) {
      await deleteFromStorage(req.body.videoImage);
    }

    if (req.body.videoUrl) {
      await deleteFromStorage(req.body.videoUrl);
    }

    console.log(error);
    return res
      .status(500)
      .json({
        status: false,
        message: error.message || "Internal Server Error",
      });
  }
};

//delete (normal videos or shorts) by admin (multiple or single)
exports.deleteVideo = async (req, res) => {
  try {
    if (!req.query.videoId) {
      return res
        .status(200)
        .json({ status: false, message: "videoId must be required!" });
    }

    const videoIds = req.query.videoId.split(",");

    const videos = await Promise.all(
      videoIds.map((videoId) => Video.findById(videoId)),
    );
    if (videos.some((video) => !video)) {
      return res
        .status(200)
        .json({
          status: false,
          message: "No videos found with the provided IDs.",
        });
    }

    res
      .status(200)
      .json({ status: true, message: "Video has been deleted by the admin." });

    await videos.map(async (video) => {
      if (video.videoImage) {
        await deleteFromStorage(video.videoImage);
      }

      if (video.videoUrl) {
        await deleteFromStorage(video.videoUrl);
      }

      await Promise.all([
        Notification.deleteMany({ videoId: video._id }),
        LikeHistoryOfVideo.deleteMany({ videoId: video._id }),
        VideoComment.deleteMany({ videoId: video._id }),
        Report.deleteMany({ videoId: video._id }),
        SaveToWatchLater.deleteMany({ videoId: video._id }),
        WatchHistory.deleteMany({ videoId: video._id }),
        PlayList.updateMany(
          {},
          { $pull: { videoId: video._id } },
          { multi: true },
        ),
        Video.deleteOne({ _id: video._id }),
        LikeHistoryOfVideoComment.deleteMany(),
      ]);
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//get all normal videos or shorts
// exports.videosOrShorts = async (req, res) => {
//   try {
//     if (!req.query.videoType || !req.query.start || !req.query.limit || !req.query.startDate || !req.query.endDate) {
//       return res.status(200).json({ status: false, message: "Oops ! Invalid details!!" });
//     }

//     const start = req.query.start ? parseInt(req.query.start) : 1;
//     const limit = req.query.limit ? parseInt(req.query.limit) : 20;

//     let dateFilterQuery = {};
//     if (req?.query?.startDate !== "All" && req?.query?.endDate !== "All") {
//       const startDate = new Date(req?.query?.startDate);
//       const endDate = new Date(req?.query?.endDate);
//       endDate.setHours(23, 59, 59, 999);

//       dateFilterQuery = {
//         createdAt: {
//           $gte: startDate,
//           $lte: endDate,
//         },
//       };
//     }
//     //console.log("dateFilterQuery:   ", dateFilterQuery);

//     const [totalVideosOrShorts, data] = await Promise.all([
//       Video.countDocuments({ videoType: Number(req.query.videoType) }),
//       Video.aggregate([
//         {
//           $match: { videoType: Number(req.query.videoType) },
//         },
//         {
//           $match: dateFilterQuery,
//         },
//         {
//           $lookup: {
//             from: "users",
//             localField: "userId",
//             foreignField: "_id",
//             as: "user",
//           },
//         },
//         {
//           $unwind: {
//             path: "$user",
//             preserveNullAndEmptyArrays: false,
//           },
//         },
//         {
//           $project: {
//             uniqueVideoId: 1,
//             title: 1,
//             description: 1,
//             hashTag: 1,
//             videoType: 1,
//             videoTime: 1,
//             videoUrl: 1,
//             videoImage: 1,
//             visibilityType: 1,
//             audienceType: 1,
//             commentType: 1,
//             scheduleType: 1,
//             scheduleTime: 1,
//             location: 1,
//             locationCoordinates: 1,
//             channelId: 1,
//             createdAt: 1,
//             uniqueId: "$user.uniqueId",
//             fullName: "$user.fullName",
//             nickName: "$user.nickName",
//             image: "$user.image",
//             userId: "$user._id",
//           },
//         },
//         { $sort: { createdAt: -1 } },
//         { $skip: (start - 1) * limit }, //how many records you want to skip
//         { $limit: limit },
//       ]),
//     ]);

//     return res.status(200).json({
//       status: true,
//       message: "Retrive videoType wise videos or shorts for admin!",
//       totalVideosOrShorts: totalVideosOrShorts,
//       videosOrShorts: data.length > 0 ? data : [],
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
//   }
// };

exports.getUserVideos = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;  // userId, 

    const skip = (Number(page) - 1) * Number(limit);

    // Base filter
    const filter = {
      videoType: 1,
    };

    // If userId exists, add user filter
    // if (userId) {
    //   filter.userId = new mongoose.Types.ObjectId(userId);
    // }

    const [totalVideos, videos] = await Promise.all([
      Video.countDocuments(filter),

      Video.aggregate([
        {
          $match: filter,
        },

        // {
        //   $lookup: {
        //     from: "users",
        //     localField: "userId",
        //     foreignField: "_id",
        //     as: "user",
        //   },
        // },

        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $project: {
            title: 1,
            description: 1,
            videoUrl: 1,
            videoImage: 1,
            videoTime: 1,
            createdAt: 1,

            // userId: "$user._id",
            fullName: "$user.fullName",
            nickName: "$user.nickName",
            image: "$user.image",
          },
        },

        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: Number(limit) },
      ]),
    ]);

    return res.status(200).json({
      status: true,
      message: "Videos fetched successfully",
      totalVideos,
      videos,
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.getUserShorts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;  // userId, 

    const skip = (Number(page) - 1) * Number(limit);

    // Base filter for shorts
    const filter = {
      videoType: 2,
    };

    // If userId exists, fetch only that user's shorts
    // if (userId) {
    //   filter.userId = new mongoose.Types.ObjectId(userId);
    // }

    const [totalShorts, shorts] = await Promise.all([
      Video.countDocuments(filter),

      Video.aggregate([
        {
          $match: filter,  
        },

        // {
        //   $lookup: {
        //     from: "users",
        //     localField: "userId",
        //     foreignField: "_id",
        //     as: "user",
        //   },
        // },

        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $project: {
            title: 1,
            description: 1,
            videoUrl: 1,
            videoImage: 1,
            videoTime: 1,
            createdAt: 1,

            // userId: "$user._id",
            fullName: "$user.fullName",
            nickName: "$user.nickName",
            image: "$user.image",
          },
        },

        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: Number(limit) },
      ]),
    ]);

    return res.status(200).json({
      status: true,
      message: "Shorts fetched successfully",
      totalShorts,
      shorts,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
