const LiveUser = require("../../models/liveUser.model");

//import model
const User = require("../../models/user.model");
const LiveHistory = require("../../models/liveHistory.model");
const UserWiseSubscription = require("../../models/userWiseSubscription.model");

//private key
const admin = require("../../util/privateKey");

//momemt
const moment = require("moment-timezone");

//mongoose
const mongoose = require("mongoose");

const liveUserFunction = async (liveUser, data) => {
  liveUser.firstName = data.fullName;
  liveUser.lastName = data.nickName;
  liveUser.image = data.image;
  liveUser.channel = data.channel;
  liveUser.userId = data._id;

  await liveUser.save();
  return liveUser;
};

//live the user
exports.liveUser = async (req, res) => {
  try {
    if (!req.query.userId || !req.query.liveType) {
      return res.status(200).json({ status: false, message: "userId and liveType must be requried." });
    }

    const liveType = Number(req.query.liveType);
    const userId = new mongoose.Types.ObjectId(req.query.userId);

    const [existUser, existLiveUser] = await Promise.all([User.findOne({ _id: userId, isActive: true }), LiveUser.findOne({ userId: userId })]);

    if (!existUser) {
      return res.status(200).json({ status: false, message: "user does not found." });
    }

    if (existUser.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by the admin!" });
    }

    if (existLiveUser) {
      console.log("delete existLiveUser");
      await LiveUser.deleteOne({ userId: existUser._id });
    }

    if (liveType == 1) {
      const { title, thumbnail } = req.body;

      if (!title || !thumbnail) {
        return res.status(200).json({ status: false, message: "Invalid details!" });
      }

      //when user is live then create liveUser's history
      const liveHistory = new LiveHistory();

      liveHistory.userId = existUser._id;
      liveHistory.startTime = moment().tz("Asia/Kolkata").format();

      existUser.isLive = true;
      existUser.channel = liveHistory._id.toString();
      existUser.liveHistoryId = liveHistory._id;

      let liveUserData;

      const liveUser = new LiveUser();
      liveUser.liveHistoryId = liveHistory._id;
      liveUser.title = title;
      liveUser.liveType = liveType;
      liveUser.channelName = existUser?.fullName || "";
      liveUser.channelId = existUser?.channelId || "";
      liveUser.thumbnail = req.body.thumbnail ? req.body.thumbnail : "";

      liveUserData = await liveUserFunction(liveUser, existUser);

      const [data] = await Promise.all([LiveUser.findOne({ _id: liveUser._id }), liveHistory.save(), existUser.save()]);

      res.status(200).json({
        status: true,
        message: "User is live Successfully.",
        liveUser: data,
      });

      //Find subscribers who are not live and send them notification
      if (existUser?.channelId && existUser.isChannel) {
        const channelSubscribedByUsers = await UserWiseSubscription.find({ channelId: existUser?.channelId }).distinct("userId");
        console.log("Channel subscribed by users: ", channelSubscribedByUsers);

        const subscribers = await User.find({
          isBlock: false,
          isLive: false,
          _id: { $in: channelSubscribedByUsers, $ne: existUser._id }, // Exclude the live user
        }).distinct("fcmToken");
        console.log("notification to subscribers who is not live:  ", subscribers);

        if (subscribers.length !== 0) {
          const adminPromise = await admin;

          const payload = {
            tokens: subscribers,
            notification: {
              title: `${existUser?.fullName} is live now!`,
              body: "Click and watch now!",
              image: existUser?.image,
            },
          };

          adminPromise
            .messaging()
            .sendMulticast(payload)
            .then((response) => {
              console.log("Successfully sent with response: ", response);
            })
            .catch((error) => {
              console.log("Error sending message:      ", error);
            });
        }
      }
    } else if (liveType == 2) {
      //when user is live then create liveUser's history
      const liveHistory = new LiveHistory();

      liveHistory.userId = existUser._id;
      liveHistory.startTime = moment().tz("Asia/Kolkata").format();

      existUser.isLive = true;
      existUser.channel = liveHistory._id.toString();
      existUser.liveHistoryId = liveHistory._id;

      let liveUserData;

      const liveUser = new LiveUser();
      liveUser.liveType = liveType;
      liveUser.liveHistoryId = liveHistory._id;
      liveUserData = await liveUserFunction(liveUser, existUser);

      const [data] = await Promise.all([LiveUser.findOne({ _id: liveUser._id }), liveHistory.save(), existUser.save()]);

      res.status(200).json({
        status: true,
        message: "User is live Successfully.",
        liveUser: data,
      });

      //Find subscribers who are not live and send them notification
      if (existUser?.channelId && existUser.isChannel) {
        const channelSubscribedByUsers = await UserWiseSubscription.find({ channelId: existUser?.channelId }).distinct("userId");
        console.log("Channel subscribed by users: ", channelSubscribedByUsers);

        const subscribers = await User.find({
          isBlock: false,
          isLive: false,
          _id: { $in: channelSubscribedByUsers, $ne: existUser._id }, // Exclude the live user
        }).distinct("fcmToken");
        console.log("notification to subscribers who is not live:  ", subscribers);

        if (subscribers.length !== 0) {
          const adminPromise = await admin;

          const payload = {
            tokens: subscribers,
            notification: {
              title: `${existUser?.fullName} is live now!`,
              body: "Click and watch now!",
              image: existUser?.image,
            },
          };

          adminPromise
            .messaging()
            .sendMulticast(payload)
            .then((response) => {
              console.log("Successfully sent with response: ", response);
            })
            .catch((error) => {
              console.log("Error sending message:      ", error);
            });
        }
      }
    } else {
      return res.status(200).json({ status: false, message: "liveType must be passed valid." });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//get live user list
exports.getliveUserList = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res.status(200).json({ status: false, message: "userId must be needed." });
    }

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    const userId = new mongoose.Types.ObjectId(req.query.userId);

    const [user, data] = await Promise.all([
      User.findOne({ _id: userId, isActive: true }),
      User.aggregate([
        {
          $match: {
            isBlock: false,
            isLive: true,
            _id: { $ne: userId },
          },
        },
        {
          $lookup: {
            from: "liveusers",
            let: { liveUserId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$$liveUserId", "$userId"],
                  },
                },
              },
            ],
            as: "liveUser",
          },
        },
        {
          $unwind: {
            path: "$liveUser",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $project: {
            _id: 1,
            isLive: 1,
            fullName: 1, //channelName
            nickName: 1,
            image: 1,
            channelId: 1,
            liveHistoryId: { $cond: [{ $eq: ["$isLive", true] }, "$liveUser.liveHistoryId", null] },
            view: { $cond: [{ $eq: ["$isLive", true] }, "$liveUser.view", 0] },
          },
        },
        { $skip: (start - 1) * limit },
        { $limit: limit },
      ]),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found." });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by the admin!" });
    }

    return res.status(200).json({
      status: true,
      message: "Retrive live user list.",
      liveUserList: data.length > 0 ? data : [],
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};
