const VideoComment = require("../../models/videoComment.model");

const mongoose = require("mongoose");

//import model
const User = require("../../models/user.model");
const Video = require("../../models/video.model");
const LikeHistoryOfVideoComment = require("../../models/likeHistoryOfVideoComment.model");
const History = require("../../models/history.model");

const { sendFcmMessage } = require("../../util/fcmNotification");

//generateHistoryUniqueId
const { generateHistoryUniqueId } = require("../../util/generateHistoryUniqueId");

//day.js
const dayjs = require("dayjs");

//create user wise comment for video
exports.createComment = async (req, res) => {
  try {
    if (!req.body.userId || !req.body.videoId || !req.body.commentText) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!" });
    }

    const [uniqueId, user, video] = await Promise.all([generateHistoryUniqueId(), User.findOne({ _id: req.body.userId, isActive: true }), Video.findOne({ _id: req.body.videoId, isActive: true })]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not Exist!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    if (!video) {
      return res.status(200).json({ status: false, message: "video does not found!!" });
    }

    if (video?.commentType === 2) {
      return res.status(200).json({ status: false, message: "Comments are disabled for this video." });
    }

    const videoComment = new VideoComment();
    videoComment.userId = user._id;
    videoComment.videoId = video._id;
    videoComment.channelId = video?.channelId;
    videoComment.videoType = video.videoType;
    videoComment.commentText = req.body.commentText;
    await videoComment.save();

    const videoCommentAlreadyExist = await VideoComment.find({
      userId: user._id,
      videoId: video._id,
    });
    const commentingRewardCoins = settingJSON.commentingRewardCoins || 0;

    if (videoCommentAlreadyExist.length === 1 && commentingRewardCoins > 0) {
      await Promise.all([
        User.findOneAndUpdate(
          { _id: user._id },
          { $inc: { coin: commentingRewardCoins } },
          { new: true },
        ),
        History({
          userId: user._id,
          uniqueId,
          coin: commentingRewardCoins,
          type: 6,
          date: new Date().toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
          }),
        }).save(),
      ]);

      if (user.fcmToken) {
        sendFcmMessage({
          token: user.fcmToken,
          notification: {
            title: "🚀 You've Earned Coins for Your Comment! Keep Engaging! 🌟",
            body: `You've earned ${commentingRewardCoins} coins for commenting on a video! Keep engaging for more rewards! 🎬💬`,
          },
          data: { type: "ENGAGEMENT_COMMENTING_REWARD" },
        });
      }
    }

    return res.status(200).json({
      status: true,
      message: "Comment passed on video by that user.",
      videoComment,
    });
  } catch (error) {
    console.log(error);
    if (res.headersSent) return;
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

//create like or dislike for comment
exports.likeOrDislike = async (req, res) => {
  try {
    if (!req.query.userId || !req.query.videoCommentId || !req.query.likeOrDislike)
      return res.status(200).json({
        status: false,
        message: "Oops ! Invalid details!!",
      });

    const [user, videoComment] = await Promise.all([User.findOne({ _id: req.query.userId, isActive: true }), VideoComment.findById(req.query.videoCommentId)]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    if (!videoComment) {
      return res.status(200).json({ status: false, message: "videoComment does not found!" });
    }

    let [likedOrDislikedComment, alreadylikedOrDislikedComment] = await Promise.all([
      VideoComment.findOne({
        userId: user._id,
        _id: videoComment._id,
        $or: [{ like: { $gt: 0 } }, { dislike: { $gt: 0 } }],
      }),

      LikeHistoryOfVideoComment.findOne({
        userId: user._id,
        videoCommentId: videoComment._id,
        $or: [{ likeOrDislike: "like" }, { likeOrDislike: "dislike" }],
      }),
    ]);

    if (alreadylikedOrDislikedComment) {
      if (req.query.likeOrDislike === "like") {
        console.log("like request");

        //If the request is for a like, decrease the dislike count (if any) and increase the like count
        await LikeHistoryOfVideoComment.deleteOne({
          userId: user._id,
          videoCommentId: videoComment._id,
          likeOrDislike: "dislike",
        });

        //Create or update the "like" history in LikeHistoryOfVideoComment table
        let likeHistoryOfVideoComment;

        likeHistoryOfVideoComment = await LikeHistoryOfVideoComment.findOne({
          userId: user._id,
          videoCommentId: videoComment._id,
          likeOrDislike: "like",
        });

        if (!likeHistoryOfVideoComment) {
          likeHistoryOfVideoComment = new LikeHistoryOfVideoComment({
            userId: user._id,
            videoCommentId: videoComment._id,
            likeOrDislike: "like",
          });

          await likeHistoryOfVideoComment.save();

          //Decrease dislike count if greater than 0
          if (likedOrDislikedComment.dislike > 0) {
            likedOrDislikedComment.dislike -= 1;
          }
          likedOrDislikedComment.like += 1;
          await likedOrDislikedComment.save();
        }

        return res.status(200).json({
          status: true,
          message: "like count increased and dislike count decreased (if any).",
          isLike: true,
        });
      } else if (req.query.likeOrDislike === "dislike") {
        console.log("dislike request");

        //If the request is for a dislike, decrease the like count (if any) and increase the dislike count
        await LikeHistoryOfVideoComment.deleteOne({
          userId: user._id,
          videoCommentId: videoComment._id,
          likeOrDislike: "like",
        });

        //Create or update the "dislike" history in LikeHistoryOfVideoComment table
        let likeHistoryOfVideoComment;

        likeHistoryOfVideoComment = await LikeHistoryOfVideoComment.findOne({
          userId: user._id,
          videoCommentId: videoComment._id,
          likeOrDislike: "dislike",
        });

        if (!likeHistoryOfVideoComment) {
          likeHistoryOfVideoComment = new LikeHistoryOfVideoComment({
            userId: user._id,
            videoCommentId: videoComment._id,
            likeOrDislike: "dislike",
          });

          await likeHistoryOfVideoComment.save();

          // Decrease like count if greater than 0
          if (likedOrDislikedComment.like > 0) {
            likedOrDislikedComment.like -= 1;
          }
          likedOrDislikedComment.dislike += 1;
          await likedOrDislikedComment.save();
        }

        return res.status(200).json({
          status: true,
          message: "dislike count increased and like count decreased (if any).",
          isLike: false,
        });
      } else {
        return res.status(200).json({ status: false, message: "likeOrDislike must be passed valid" });
      }
    } else {
      console.log("else");

      if (req.query.likeOrDislike === "like") {
        videoComment.like += 1;
        await videoComment.save();

        const likeHistoryOfVideoComment = await new LikeHistoryOfVideoComment();

        likeHistoryOfVideoComment.userId = user._id;
        likeHistoryOfVideoComment.videoCommentId = videoComment._id;
        likeHistoryOfVideoComment.likeOrDislike = "like";
        await likeHistoryOfVideoComment.save();

        return res.status(200).json({ status: true, message: "likeOrDislike wise like or dislike updated", isLike: true });
      } else if (req.query.likeOrDislike === "dislike") {
        videoComment.dislike += 1;
        await videoComment.save();

        const likeHistoryOfVideoComment = await new LikeHistoryOfVideoComment();

        likeHistoryOfVideoComment.userId = user._id;
        likeHistoryOfVideoComment.videoCommentId = videoComment._id;
        likeHistoryOfVideoComment.likeOrDislike = "dislike";
        await likeHistoryOfVideoComment.save();

        return res.status(200).json({ status: true, message: "likeOrDislike wise like or dislike updated", isLike: false });
      } else {
        return res.status(200).json({ status: true, message: "likeOrDislike must be passed valid" });
      }
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};

//get commentType wise all comments for particular video (top, mostLiked, newest)
exports.getComments = async (req, res) => {
  try {
    if (!req.query.videoId || !req.query.commentType) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!!" });
    }

    const [video] = await Promise.all([ Video.findOne({ _id: req.query.videoId, isActive: true })]);  // User.findOne({ _id: req.query.userId, isActive: true }),

    // if (!user) {
    //   return res.status(404).json({ status: false, message: "user does not found!!" });
    // }

    // if (user.isBlock) {
    //   return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    // }

    if (!video) {
      return res.status(200).json({ status: false, message: "video does not found!!" });
    }

    let now = dayjs();

    if (req.query.commentType === "top") {
      const videoComment = await VideoComment.aggregate([
        {
          $match: { videoId: video._id, recursiveCommentId: null },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: "likehistoryofvideocomments",
            let: {
              videoCommentId: "$_id",
              // userId: user._id,
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$videoCommentId", "$$videoCommentId"] }],  // , { $eq: ["$userId", "$$userId"] }
                  },
                },
              },
            ],
            as: "likeHistory",
          },
        },
        {
          $unwind: {
            path: "$likeHistory",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            // userId: "$user._id",
            fullName: "$user.fullName",
            userImage: "$user.image",
            commentText: 1,
            like: 1,
            dislike: 1,
            totalReplies: 1,
            createdAt: 1,
            recursiveCommentId: 1,
            videoId: 1,

            isLike: {
              $cond: [{ $eq: ["$likeHistory.likeOrDislike", "like"] }, true, false],
            },
            isDislike: {
              $cond: [{ $eq: ["$likeHistory.likeOrDislike", "dislike"] }, true, false],
            },

            time: {
              $let: {
                vars: {
                  timeDiff: { $subtract: [now.toDate(), "$createdAt"] },
                },
                in: {
                  $concat: [
                    {
                      $switch: {
                        branches: [
                          {
                            case: { $gte: ["$$timeDiff", 31536000000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 31536000000] } } }, " years ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 2592000000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 2592000000] } } }, " months ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 604800000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 604800000] } } }, " weeks ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 86400000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 86400000] } } }, " days ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 3600000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 3600000] } } }, " hours ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 60000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 60000] } } }, " minutes ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 1000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 1000] } } }, " seconds ago"] },
                          },
                          { case: true, then: "Just now" },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        { $sort: { totalReplies: -1 } },
      ]);

      return res.status(200).json({ status: true, message: "finally, get all comments for that video!", videoComment });
    } else if (req.query.commentType === "mostLiked") {
      const videoComment = await VideoComment.aggregate([
        {
          $match: { videoId: video._id, recursiveCommentId: null },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: "likehistoryofvideocomments",
            let: {
              videoCommentId: "$_id",
              // userId: user._id,
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$videoCommentId", "$$videoCommentId"] }],  // , { $eq: ["$userId", "$$userId"] }
                  },
                },
              },
            ],
            as: "likeHistory",
          },
        },
        {
          $unwind: {
            path: "$likeHistory",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            // userId: "$user._id",
            fullName: "$user.fullName",
            userImage: "$user.image",
            commentText: 1,
            like: 1,
            dislike: 1,
            totalReplies: 1,
            createdAt: 1,
            recursiveCommentId: 1,
            videoId: 1,

            isLike: {
              $cond: [{ $eq: ["$likeHistory.likeOrDislike", "like"] }, true, false],
            },
            isDislike: {
              $cond: [{ $eq: ["$likeHistory.likeOrDislike", "dislike"] }, true, false],
            },

            time: {
              $let: {
                vars: {
                  timeDiff: { $subtract: [now.toDate(), "$createdAt"] },
                },
                in: {
                  $concat: [
                    {
                      $switch: {
                        branches: [
                          {
                            case: { $gte: ["$$timeDiff", 31536000000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 31536000000] } } }, " years ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 2592000000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 2592000000] } } }, " months ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 604800000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 604800000] } } }, " weeks ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 86400000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 86400000] } } }, " days ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 3600000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 3600000] } } }, " hours ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 60000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 60000] } } }, " minutes ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 1000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 1000] } } }, " seconds ago"] },
                          },
                          { case: true, then: "Just now" },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        { $sort: { like: -1 } },
      ]);

      return res.status(200).json({ status: true, message: "finally, get all comments for that video!", videoComment });
    } else if (req.query.commentType === "newest") {
      const videoComment = await VideoComment.aggregate([
        {
          $match: { videoId: video._id, recursiveCommentId: null },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: "likehistoryofvideocomments",
            let: {
              videoCommentId: "$_id",
              // userId: user._id,
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$videoCommentId", "$$videoCommentId"] }], // , { $eq: ["$userId", "$$userId"] }
                  },
                },
              },
            ],
            as: "likeHistory",
          },
        },
        {
          $unwind: {
            path: "$likeHistory",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            // userId: "$user._id",
            fullName: "$user.fullName",
            userImage: "$user.image",
            commentText: 1,
            like: 1,
            dislike: 1,
            totalReplies: 1,
            createdAt: 1,
            recursiveCommentId: 1,
            videoId: 1,

            isLike: {
              $cond: [{ $eq: ["$likeHistory.likeOrDislike", "like"] }, true, false],
            },
            isDislike: {
              $cond: [{ $eq: ["$likeHistory.likeOrDislike", "dislike"] }, true, false],
            },

            time: {
              $let: {
                vars: {
                  timeDiff: { $subtract: [now.toDate(), "$createdAt"] },
                },
                in: {
                  $concat: [
                    {
                      $switch: {
                        branches: [
                          {
                            case: { $gte: ["$$timeDiff", 31536000000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 31536000000] } } }, " years ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 2592000000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 2592000000] } } }, " months ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 604800000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 604800000] } } }, " weeks ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 86400000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 86400000] } } }, " days ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 3600000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 3600000] } } }, " hours ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 60000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 60000] } } }, " minutes ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 1000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 1000] } } }, " seconds ago"] },
                          },
                          { case: true, then: "Just now" },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        { $sort: { createdAt: -1 } },
      ]);

      return res.status(200).json({ status: true, message: "finally, get all comments for that video!", videoComment });
    } else {
      return res.status(200).json({ status: false, message: "commentType must be passed valid!" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};

//create user wise reply to particular comment of particular video
exports.createCommentReply = async (req, res) => {
  try {
    if (!req.body.userId || !req.body.videoId || !req.body.commentText || !req.body.videoCommentId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!!" });
    }

    const [user, video, videoCommentAlreadyExist] = await Promise.all([
      User.findOne({ _id: req.body.userId, isActive: true }),
      Video.findOne({ _id: req.body.videoId, isActive: true }),
      VideoComment.findById(req.body.videoCommentId),
    ]);

    if (!user) {
      return res.status(404).json({ status: false, message: "user does not found!!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    if (!video) {
      return res.status(200).json({ status: false, message: "video does not found!!" });
    }

    if (!videoCommentAlreadyExist) {
      return res.status(200).json({ status: false, message: "videoComment does not found!" });
    }

    const videoComment = new VideoComment();

    videoComment.userId = user._id;
    videoComment.videoId = video._id;
    videoComment.commentText = req.body.commentText?.trim();
    videoComment.recursiveCommentId = videoCommentAlreadyExist._id;

    videoCommentAlreadyExist.totalReplies += 1;

    await Promise.all([videoComment.save(), videoCommentAlreadyExist.save()]);

    return res.status(200).json({ status: true, message: "Comment reply given by user for that video!", videoComment });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};

//get all replies for particular comment
exports.repliesOfVideoComment = async (req, res) => {
  try {
    if (!req.query.userId || !req.query.videoId || !req.query.recursiveCommentId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!" });
    }

    const [user, video, replyOfVideoComment] = await Promise.all([
      User.findOne({ _id: req.query.userId, isActive: true }),
      Video.findOne({ _id: req.query.videoId, isActive: true }),
      VideoComment.findOne({ recursiveCommentId: req?.query?.recursiveCommentId }),
    ]);

    if (!user) {
      return res.status(404).json({ status: false, message: "user does not found!!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    if (!video) {
      return res.status(200).json({ status: false, message: "video does not found!" });
    }

    if (!replyOfVideoComment) {
      return res.status(200).json({ status: false, message: "replyOfVideoComment does not found!" });
    }

    let now = dayjs();
    const repliesOfComment = await VideoComment.aggregate([
      {
        $match: { videoId: video._id, recursiveCommentId: replyOfVideoComment.recursiveCommentId },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "likehistoryofvideocomments",
          let: {
            videoCommentId: "$_id",
            userId: user._id,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$videoCommentId", "$$videoCommentId"] }, { $eq: ["$userId", "$$userId"] }],
                },
              },
            },
          ],
          as: "likeHistory",
        },
      },
      {
        $unwind: {
          path: "$likeHistory",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          userId: "$user._id",
          fullName: "$user.fullName",
          userImage: "$user.image",
          commentText: 1,
          like: 1,
          dislike: 1,
          totalReplies: 1,
          createdAt: 1,
          recursiveCommentId: 1,
          videoId: 1,
          isLike: {
            $cond: [{ $eq: ["$likeHistory.likeOrDislike", "like"] }, true, false],
          },
          isDislike: {
            $cond: [{ $eq: ["$likeHistory.likeOrDislike", "dislike"] }, true, false],
          },
          time: {
            $let: {
              vars: {
                timeDiff: { $subtract: [now.toDate(), "$createdAt"] },
              },
              in: {
                $concat: [
                  {
                    $switch: {
                      branches: [
                        {
                          case: { $gte: ["$$timeDiff", 31536000000] },
                          then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 31536000000] } } }, " years ago"] },
                        },
                        {
                          case: { $gte: ["$$timeDiff", 2592000000] },
                          then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 2592000000] } } }, " months ago"] },
                        },
                        {
                          case: { $gte: ["$$timeDiff", 604800000] },
                          then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 604800000] } } }, " weeks ago"] },
                        },
                        {
                          case: { $gte: ["$$timeDiff", 86400000] },
                          then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 86400000] } } }, " days ago"] },
                        },
                        {
                          case: { $gte: ["$$timeDiff", 3600000] },
                          then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 3600000] } } }, " hours ago"] },
                        },
                        {
                          case: { $gte: ["$$timeDiff", 60000] },
                          then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 60000] } } }, " minutes ago"] },
                        },
                        {
                          case: { $gte: ["$$timeDiff", 1000] },
                          then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 1000] } } }, " seconds ago"] },
                        },
                        { case: true, then: "Just now" },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return res.status(200).json({
      status: true,
      message: "finally, get originalVideoComment and all replies of particular comment for that video!",
      repliesOfComment: repliesOfComment,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};
