const Report = require("../../models/report.model");

//import model
const User = require("../../models/user.model");
const Video = require("../../models/video.model");

//when user report the video
exports.reportToVideo = async (req, res) => {
  try {
    if (!req.query.userId || !req.query.videoId || !req.query.reportType) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!!" });
    }

    const [user, video, alreadyReportedVideo] = await Promise.all([
      User.findOne({ _id: req.query.userId, isActive: true }),
      Video.findOne({ _id: req.query.videoId, isActive: true }),
      Report.findOne({
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

    if (alreadyReportedVideo) {
      return res.status(200).json({
        status: true,
        message: "this video already reported by that user! ",
      });
    } else {
      const reportToVideo = new Report();

      reportToVideo.userId = user._id;
      reportToVideo.videoId = video._id;
      reportToVideo.videoType = video.videoType;
      reportToVideo.reportType = req.query.reportType;

      await reportToVideo.save();

      return res.status(200).json({
        status: true,
        message: "finally, this video repoted by that user!",
        reportToVideo,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};
