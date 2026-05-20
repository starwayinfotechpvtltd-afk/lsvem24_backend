const Report = require("../../models/report.model");

//import model
const Video = require("../../models/video.model");
const Notification = require("../../models/notification.model");
const VideoComment = require("../../models/videoComment.model");
const SaveToWatchLater = require("../../models/saveToWatchLater.model");
const LikeHistoryOfVideo = require("../../models/likeHistoryOfVideo.model");
const PlayList = require("../../models/playList.model");
const LikeHistoryOfVideoComment = require("../../models/likeHistoryOfVideoComment.model");
const WatchHistory = require("../../models/watchHistory.model");

//deleteFromStorage
const { deleteFromStorage } = require("../../util/storageHelper");

//get all reports of the video or shorts
exports.getReports = async (req, res) => {
  try {
    if (!req.query.videoType || !req.query.start || !req.query.limit || !req.query.startDate || !req.query.endDate) {
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
    //console.log("dateFilterQuery:   ", dateFilterQuery);

    const [totalReports, report] = await Promise.all([
      Report.aggregate([
        {
          $match: { videoType: Number(req.query.videoType) },
        },
        {
          $match: dateFilterQuery,
        },
        {
          $group: {
            _id: "$videoType",
            totalReports: { $sum: 1 },
          },
        },
      ]),

      Report.aggregate([
        {
          $match: { videoType: Number(req.query.videoType) },
        },
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
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            "user.isActive": true,
            "user.isBlock": false,
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
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            "video.isActive": true,
          },
        },
        {
          $project: {
            reportType: 1,
            createdAt: 1,
            uniqueId: "$user.uniqueId",
            fullName: "$user.fullName",
            nickName: "$user.nickName",
            image: "$user.image",
            videoTitle: "$video.title",
            videoImage: "$video.videoImage",
            uniqueVideoId: "$video.uniqueVideoId",
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: (start - 1) * limit }, //how many records you want to skip
        { $limit: limit },
      ]),
    ]);

    return res.status(200).json({
      status: true,
      message: "finally, get reports of the video or shorts!",
      totalReports: totalReports.length > 0 ? totalReports[0].totalReports : 0,
      reports: report.length > 0 ? report : [],
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//delete reports of the video by admin (multiple or single)
exports.deleteVideoReport = async (req, res) => {
  try {
    if (!req.query.reportId) {
      return res.status(200).json({ status: false, message: "reportId must be required!" });
    }

    const reportArray = req.query.reportId.split(",");

    const reports = await Promise.all(reportArray.map((reportId) => Report.findById(reportId)));
    if (reports.some((report) => !report)) {
      return res.status(200).json({ status: false, message: "No reports of the video found with the provided IDs." });
    }

    res.status(200).json({ status: true, message: "Selected reports and associated video data have been successfully deleted." });

    await reports.map(async (report) => {
      const video = await Video.findById(report?.videoId);
      if (video?.videoImage) {
        await deleteFromStorage(video?.videoImage);
      }

      if (video?.videoUrl) {
        await deleteFromStorage(video?.videoUrl);
      }

      await Promise.all([
        Notification.deleteMany({ videoId: video._id }),
        LikeHistoryOfVideo.deleteMany({ videoId: video._id }),
        VideoComment.deleteMany({ videoId: video._id }),
        Report.deleteMany({ videoId: video._id }),
        SaveToWatchLater.deleteMany({ videoId: video._id }),
        WatchHistory.deleteMany({ videoId: video._id }),
        PlayList.updateMany({}, { $pull: { videoId: video._id } }, { multi: true }),
        Video.deleteOne({ _id: video._id }),
        LikeHistoryOfVideoComment.deleteMany(),
      ]);
    });

    await Report.deleteMany({ _id: { $in: reportArray } });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};
