const PlayList = require("../../models/playList.model");

//import model
const User = require("../../models/user.model");
const Video = require("../../models/video.model");

//user wise new playList
exports.newPlayList = async (req, res, next) => {
  try {
    if (!req.body.channelId || !req.body.userId || !req.body.videoId || !req.body.playListName || !req.body.playListType) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!!" });
    }

    const [user, channel, video] = await Promise.all([
      User.findOne({ _id: req.body.userId, isActive: true }),
      User.findOne({ channelId: req.body.channelId }),
      Video.findOne({ _id: req.body.videoId, isActive: true }),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "user does not found!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    if (!channel) {
      return res.status(200).json({ status: false, message: "channel does not found!" });
    }

    if (!video) {
      return res.status(200).json({ status: false, message: "video does not found!" });
    }

    const playList = new PlayList();

    playList.userId = user._id;
    playList.channelId = channel.channelId;
    playList.playListName = req.body.playListName;
    playList.playListType = Number(req.body.playListType);

    //multiple videoId
    const multipleVideo = req.body.videoId.toString().split(",");
    playList.videoId = multipleVideo;

    await playList.save();

    const data = await PlayList.findById(playList._id).populate("videoId", "title videoImage videoUrl");

    return res.status(200).json({ status: true, message: "playList created by that user!", playList: data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};

//user wise update playist
exports.updatePlayList = async (req, res, next) => {
  try {
    if (!req.body.userId || !req.body.playListId || !req.body.channelId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!" });
    }

    const [user, playList] = await Promise.all([
      User.findOne({ _id: req?.body?.userId, isActive: true }),
      PlayList.findOne({ _id: req?.body?.playListId, userId: req?.body?.userId }),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "user does not found!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by the admin." });
    }

    if (!playList) {
      return res.status(200).json({ status: false, message: "No playList was found for that user." });
    }

    playList.playListName = req?.body?.playListName ? req?.body?.playListName : playList.playListName;
    playList.playListType = Number(req?.body?.playListType) ? Number(req?.body?.playListType) : playList.playListType;

    if (req?.body?.videoId) {
      const [video, alreadyExistVideoInPlayList] = await Promise.all([
        Video.findOne({ _id: req?.body?.videoId, isActive: true }),
        PlayList.findOne({ videoId: { $in: [req?.body?.videoId] }, userId: user._id, _id: playList._id }),
      ]);

      if (!video) {
        return res.status(200).json({ status: false, message: "video does not found!" });
      }

      if (alreadyExistVideoInPlayList) {
        return res.status(200).json({ status: false, message: "The video already exists in the playlist." });
      }

      //If videoId is provided, add it to the existing videoId array
      playList.videoId.push(req?.body?.videoId);
    }

    await playList.save();

    const data = await PlayList.findById(playList._id).populate("videoId", "title videoImage videoUrl");

    return res.status(200).json({ status: true, message: "playList updated by the user.", playList: data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};
