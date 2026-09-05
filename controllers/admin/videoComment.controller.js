const VideoComment = require("../../models/videoComment.model");

//import model
const Video = require("../../models/video.model");

//get particular video's comment
exports.getComment = async (req, res) => {
  try {
    if (!req.query.videoId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!!" });
    }

    const video = await Video.findOne({ _id: req.query.videoId, isActive: true });
    if (!video) {
      return res.status(200).json({ status: false, message: "video does not found!" });
    }

    const data = await VideoComment.aggregate([
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
          from: "videos",
          localField: "videoId",
          foreignField: "_id",
          as: "video",
        },
      },
      {
        $unwind: {
          path: "$video",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          videoTitle: "$video.title",
          uniqueVideoId: "$video.uniqueVideoId",
          uniqueId: "$user.uniqueId",
          fullName: "$user.fullName",
          nickName: "$user.nickName",
          userImage: "$user.image",
          commentText: 1,
          createdAt: 1,
          videoId: 1,
          userId: 1,
        },
      },
    ]);

    return res.status(200).json({ status: true, message: "finally, get all comments for that video!", videoComment: data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};

//get comments of all videos added by user and admin
exports.commentsOfVideos = async (req, res) => {
  try {
    if (!req.query.start || !req.query.limit || !req.query.startDate || !req.query.endDate || !req.query.videoType) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!!" });
    }

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

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

    const [totalComments, data] = await Promise.all([
      VideoComment.countDocuments({ videoType: Number(req.query.videoType) }),

      VideoComment.aggregate([
        { $match: { videoType: Number(req.query.videoType) } },
        {
          $match: dateFilterQuery,
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
            from: "videos",
            localField: "videoId",
            foreignField: "_id",
            as: "video",
          },
        },
        {
          $unwind: {
            path: "$video",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $project: {
            videoTitle: "$video.title",
            uniqueVideoId: "$video.uniqueVideoId",
            uniqueId: "$user.uniqueId",
            fullName: "$user.fullName",
            nickName: "$user.nickName",
            userImage: "$user.image",
            commentText: 1,
            videoId: 1,
            userId: 1,
            createdAt: 1,
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: (start - 1) * limit }, //how many records you want to skip
        { $limit: limit },
      ]),
    ]);

    return res.status(200).json({
      status: true,
      message: "finally, get comments of all videos added by user and admin!",
      totalComments: totalComments,
      commentsOfVideos: data,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//delete videoComment by admin (multiple or single)
exports.deleteVideoComment = async (req, res) => {
  try {
    if (!req.query.videoCommentId) {
      return res.status(200).json({ status: false, message: "videoCommentId must be required!" });
    }

    const videoCommentIds = req.query.videoCommentId.split(",");

    const videoComments = await Promise.all(videoCommentIds.map((videoCommentId) => VideoComment.findById(videoCommentId)));
    if (videoComments.some((videoComment) => !videoComment)) {
      return res.status(200).json({ status: false, message: "No videoComments found with the provided IDs." });
    }

    const result = await VideoComment.deleteMany({ _id: { $in: videoCommentIds } });
    if (result.deletedCount > 0) {
      return res.status(200).json({ status: true, message: "finally, videoComments deleted by admin." });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};
