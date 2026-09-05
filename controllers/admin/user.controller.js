const User = require("../../models/user.model");

//Cryptr
const Cryptr = require("cryptr");
const cryptr = new Cryptr("myTotallySecretKey");

//uuid
const uuid = require("uuid");

//deleteFromStorage
const { deleteFromStorage } = require("../../util/storageHelper");

//generateUniqueId
const { generateUniqueId } = require("../../util/generateUniqueId");

//checkPlan
const { checkPlan } = require("../../util/checkPlan");

//import model
const Video = require("../../models/video.model");
const VideoComment = require("../../models/videoComment.model");
const Report = require("../../models/report.model");
const UserWiseSubscription = require("../../models/userWiseSubscription.model");
const SaveToWatchLater = require("../../models/saveToWatchLater.model");
const Notification = require("../../models/notification.model");
const LikeHistoryOfVideo = require("../../models/likeHistoryOfVideo.model");
const LikeHistoryOfVideoComment = require("../../models/likeHistoryOfVideoComment.model");
const LiveHistory = require("../../models/liveHistory.model");
const PlayList = require("../../models/playList.model");
const PremiumPlanHistory = require("../../models/premiumPlanHistory.model");
const SearchHistory = require("../../models/searchHistory.model");
const WithdrawRequest = require("../../models/withDrawRequest.model");
const History = require("../../models/history.model");
const WalletHistory = require("../../models/walletHistory.model");
const VideoWatchReward = require("../../models/videoWatchReward.model");
const CheckIn = require("../../models/checkIn.model");
const CoinPlanHistory = require("../../models/coinplanHistory.model");
const WatchHistory = require("../../models/watchHistory.model");
const LiveUser = require("../../models/liveUser.model");
const MonetizationRequest = require("../../models/monetizationRequest.model");

//create user by admin
exports.fakeUser = async (req, res) => {
  try {
    if (
      !req.body.fullName ||
      !req.body.nickName ||
      !req.body.email ||
      !req.body.gender ||
      !req.body.age ||
      !req.body.mobileNumber ||
      !req.body.image ||
      !req.body.country ||
      !req.body.ipAddress ||
      !req.body.instagramLink ||
      !req.body.facebookLink ||
      !req.body.twitterLink ||
      !req.body.websiteLink ||
      !req.body.password
    ) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!" });
    }

    const user = new User();

    user.fullName = req?.body?.fullName;
    user.nickName = req?.body?.nickName;
    user.email = req?.body?.email;
    user.gender = req?.body?.gender;
    user.age = req?.body?.age;
    user.mobileNumber = req?.body?.mobileNumber;
    user.image = req?.body?.image;
    user.country = req?.body?.country;
    user.ipAddress = req?.body?.ipAddress;
    user.password = cryptr.encrypt(req?.body?.password);
    user.isAddByAdmin = true;
    user.uniqueId = await Promise.resolve(generateUniqueId());
    user.date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

    user.socialMediaLinks.instagramLink = req?.body?.instagramLink;
    user.socialMediaLinks.facebookLink = req?.body?.facebookLink;
    user.socialMediaLinks.twitterLink = req?.body?.twitterLink;
    user.socialMediaLinks.websiteLink = req?.body?.websiteLink;

    await user.save();

    const data = await User.findById(user._id);
    data.password = cryptr.decrypt(data?.password);

    return res.status(200).json({
      status: true,
      message: "finally, user has been created by admin!",
      user: data,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

//update details of the channel or profile of the user
exports.updateUser = async (req, res) => {
  try {
    if (!req.query.userId || !req.query.isChannel) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!" });
    }

    const user = await User.findOne({ _id: req.query.userId, isActive: true });
    if (!user) {
      return res.status(200).json({ status: false, message: "user does not found!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    if (req.query.isChannel === "true") {
      const isChannel = await User.findOne({ isChannel: true });
      if (!isChannel) return res.status(200).json({ status: false, message: "channel of that user does not created please firstly create channel of that user!" });

      if (req?.body?.image) {
        if (user.image) {
          await deleteFromStorage(user.image);
        }

        user.image = req?.body?.image ? req?.body?.image : user.image;
      }

      if (req.body.fullName && req.body.fullName !== user.fullName) {
        //Check if the new channelName is different from the current one
        const isDuplicateFullName = await User.findOne({ fullName: req.body.fullName.trim() });
        if (isDuplicateFullName) {
          return res.status(200).json({ status: false, message: "The provided channelName is already in use. Please choose a different one." });
        }

        user.fullName = req.body.fullName ? req.body.fullName.trim() : user.fullName; //channelName
      }

      user.nickName = req.body.nickName ? req.body.nickName : user.nickName;
      user.gender = req.body.gender ? req.body.gender : user.gender;
      user.age = req.body.age ? req.body.age : user.age;
      user.mobileNumber = req.body.mobileNumber ? req.body.mobileNumber : user.mobileNumber;
      user.country = req.body.country ? req.body.country : user.country;
      user.ipAddress = req.body.ipAddress ? req.body.ipAddress : user.ipAddress;
      user.descriptionOfChannel = req.body.descriptionOfChannel ? req.body.descriptionOfChannel : user.descriptionOfChannel;
      user.socialMediaLinks.instagramLink = req.body.instagramLink ? req.body.instagramLink : user.instagramLink;
      user.socialMediaLinks.facebookLink = req.body.facebookLink ? req.body.facebookLink : user.facebookLink;
      user.socialMediaLinks.twitterLink = req.body.twitterLink ? req.body.twitterLink : user.twitterLink;
      user.socialMediaLinks.websiteLink = req.body.websiteLink ? req.body.websiteLink : user.websiteLink;

      await user.save();

      const data = await User.findById(user._id);

      if (data.password) {
        try {
          data.password = cryptr.decrypt(data.password);
        } catch (err) {
          console.warn("Failed to decrypt password:", err.message);
          data.password = null;
        }
      } else {
        data.password = null;
      }

      return res.status(200).json({ status: true, message: "finally, update details of the channel or profile of the user by admin!", user: data });
    } else if (req.query.isChannel === "false") {
      const isChannel = await User.findOne({ isChannel: false });
      if (!isChannel) return res.status(200).json({ status: false, message: "channel of that user already created please passed valid isChannel true!" });

      user.channelId = uuid.v4();
      user.isChannel = true;

      if (req?.body?.image) {
        if (user.image) {
          await deleteFromStorage(user.image);
        }

        user.image = req?.body?.image ? req?.body?.image : user.image;
      }

      if (req.body.fullName && req.body.fullName !== user.fullName) {
        //Check if the new channelName is different from the current one
        const isDuplicateFullName = await User.findOne({ fullName: req.body.fullName.trim() });
        if (isDuplicateFullName) {
          return res.status(200).json({ status: false, message: "The provided channelName is already in use. Please choose a different one." });
        }

        user.fullName = req.body.fullName ? req.body.fullName.trim() : user.fullName; //channelName
      }

      user.nickName = req.body.nickName ? req.body.nickName : user.nickName;
      user.gender = req.body.gender ? req.body.gender : user.gender;
      user.age = req.body.age ? req.body.age : user.age;
      user.mobileNumber = req.body.mobileNumber ? req.body.mobileNumber : user.mobileNumber;
      user.country = req.body.country ? req.body.country : user.country;
      user.ipAddress = req.body.ipAddress ? req.body.ipAddress : user.ipAddress;
      user.descriptionOfChannel = req.body.descriptionOfChannel ? req.body.descriptionOfChannel : user.descriptionOfChannel;
      user.socialMediaLinks.instagramLink = req.body.instagramLink ? req.body.instagramLink : user.instagramLink;
      user.socialMediaLinks.facebookLink = req.body.facebookLink ? req.body.facebookLink : user.facebookLink;
      user.socialMediaLinks.twitterLink = req.body.twitterLink ? req.body.twitterLink : user.twitterLink;
      user.socialMediaLinks.websiteLink = req.body.websiteLink ? req.body.websiteLink : user.websiteLink;

      await user.save();

      const data = await User.findById(user._id);

      if (data.password) {
        try {
          data.password = cryptr.decrypt(data.password);
        } catch (err) {
          console.warn("Failed to decrypt password:", err.message);
          data.password = null;
        }
      } else {
        data.password = null;
      }

      return res.status(200).json({ status: true, message: "finally, update details of the channel or profile of the user by admin!", user: data });
    } else {
      return res.status(500).json({ status: false, message: "isChannel must be passed true or false!" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

//handle activation of the users (multiple or single)
exports.isActive = async (req, res) => {
  try {
    const userIds = req.query.userId.split(",");

    const users = await User.find({ _id: { $in: userIds } });

    for (const user of users) {
      user.isActive = !user.isActive;
      await user.save();
    }

    return res.status(200).json({ status: true, message: "finally, activation of user handled by admin!", users });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//handle block of the users (multiple or single)
exports.isBlock = async (req, res) => {
  try {
    const userIds = req.query.userId.split(",");

    const users = await User.find({ _id: { $in: userIds } });

    if (users.length !== userIds.length) {
      return res.status(200).json({ status: false, message: "Oops ! Not all users found." });
    }

    for (const user of users) {
      user.isBlock = !user.isBlock;
      await user.save();
    }

    return res.status(200).json({ status: true, message: "finally, block of the user handled by admin!", users });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//get users (who is added by admin or real)
exports.getUsers = async (req, res) => {
  try {
    if (!req.query.startDate || !req.query.endDate) {
      return res.status(200).json({ status: false, message: "Oops! Invalid details!" });
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

    if (req.query.type === "realUser") {
      const [totalUsers, users] = await Promise.all([
        User.countDocuments({ isAddByAdmin: false }),

        User.aggregate([
          { $match: { isAddByAdmin: false, ...dateFilterQuery } },
          {
            $project: {
              uniqueId: 1,
              fullName: 1,
              nickName: 1,
              email: 1,
              ipAddress: 1,
              isActive: 1,
              isBlock: 1,
              image: 1,
              isChannel: 1,
              isAddByAdmin: 1,
              channelId: 1,
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
        message: "finally, get all the real users!",
        totalUsers: totalUsers,
        users: users,
      });
    } else if (req.query.type === "addByAdmin") {
      const [totalUsersAddByAdmin, users] = await Promise.all([
        User.countDocuments({ isAddByAdmin: true }),

        User.aggregate([
          { $match: { isAddByAdmin: true, ...dateFilterQuery } },
          {
            $project: {
              uniqueId: 1,
              fullName: 1,
              nickName: 1,
              email: 1,
              ipAddress: 1,
              isActive: 1,
              isBlock: 1,
              image: 1,
              isChannel: 1,
              isAddByAdmin: 1,
              channelId: 1,
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
        message: "finally, get the all users who has been added by admin!",
        totalUsersAddByAdmin: totalUsersAddByAdmin,
        users: users,
      });
    } else {
      return res.status(200).json({ status: false, message: "type must be passed valid!" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

//delete the users (multiple or single)
exports.deleteUsers = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res.status(200).json({ status: false, message: "userId must be required!" });
    }

    const userIds = req.query.userId.split(",");

    const users = await Promise.all(userIds.map((userId) => User.findById(userId)));
    if (users.some((user) => !user)) {
      return res.status(200).json({ status: false, message: "No users found with the provided IDs." });
    }

    await users.map(async (user) => {
      if (user.image) {
        await deleteFromStorage(user.image);
      }

      const videosToDelete = await Video.find({ userId: user?._id });

      await videosToDelete.map(async (video) => {
        if (video?.videoImage) {
          await deleteFromStorage(video?.videoImage);
        }

        if (video?.videoUrl) {
          await deleteFromStorage(video?.videoUrl);
        }

        await Video.deleteOne({ _id: video._id });
      });

      await Promise.all([
        WatchHistory.deleteMany({ userId: user?._id }),
        LikeHistoryOfVideo.deleteMany({ userId: user?._id }),
        VideoComment.deleteMany({ userId: user?._id }),
        LikeHistoryOfVideoComment.deleteMany({ userId: user?._id }),
        LiveUser.deleteMany({ userId: user?._id }),
        LiveHistory.deleteMany({ userId: user?._id }),
        MonetizationRequest.deleteMany({ userId: user?._id }),
        Notification.deleteMany({ userId: user?._id }),
        PlayList.deleteMany({ userId: user?._id }),
        PremiumPlanHistory.deleteMany({ userId: user?._id }),
        Report.deleteMany({ userId: user?._id }),
        SaveToWatchLater.deleteMany({ userId: user?._id }),
        SearchHistory.deleteMany({ userId: user?._id }),
        UserWiseSubscription.deleteMany({ userId: user?._id }),
        WithdrawRequest.deleteMany({ userId: user?._id }),
        History.deleteMany({ userId: user?._id }),
        History.deleteMany({ otherUserId: user?._id }),
        CheckIn.deleteMany({ userId: user?._id }),
        CoinPlanHistory.deleteMany({ userId: user?._id }),
        VideoWatchReward.deleteMany({ userId: user?._id }),
        WalletHistory.deleteMany({ userId: user?._id }),
      ]);
    });

    const result = await User.deleteMany({ _id: { $in: userIds } });
    if (result.deletedCount > 0) {
      return res.status(200).json({ status: true, message: "User has been deleted by admin!" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//get user profile
exports.getProfile = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!" });
    }

    const user = await User.findOne({ _id: req.query.userId, isActive: true });
    if (!user) {
      return res.status(200).json({ status: false, message: "user does not found!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    const data = await User.findById(user._id);
    if (data.password !== null) {
      data.password = cryptr.decrypt(data.password);
    }

    return res.status(200).json({ status: true, message: "Retrive Profile of the user get by admin.", user: data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

//get users who is added by admin for channel creation
exports.getUsersAddByAdminForChannel = async (req, res) => {
  try {
    const users = await User.find({ isAddByAdmin: true }).select("fullName nickName channelId isChannel isActive isAddByAdmin isBlock");

    return res.status(200).json({
      status: true,
      message: "finally, get the all users who has been added by admin for channel creation!",
      users: users,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

//get the all channels of the user (who has been added by admin or real)
exports.channelsOfUser = async (req, res) => {
  try {
    if (!req.query.startDate || !req.query.endDate) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!" });
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

    if (req.query.type === "addByadmin") {
      const [totalChannels, channels] = await Promise.all([
        User.countDocuments({ isAddByAdmin: true, isChannel: true }),
        User.aggregate([
          { $match: { isAddByAdmin: true, isChannel: true, ...dateFilterQuery } },
          {
            $lookup: {
              from: "userwisesubscriptions",
              localField: "channelId",
              foreignField: "channelId",
              as: "subscriptions",
            },
          },
          {
            $addFields: {
              totalSubscribes: { $size: "$subscriptions" },
            },
          },
          {
            $project: {
              uniqueId: 1,
              fullName: 1,
              nickName: 1,
              email: 1,
              ipAddress: 1,
              isActive: 1,
              image: 1,
              isChannel: 1,
              isAddByAdmin: 1,
              channelId: 1,
              createdAt: 1,
              totalSubscribes: 1,
            },
          },
          { $sort: { createdAt: -1 } },
          { $skip: (start - 1) * limit },
          { $limit: limit },
        ]),
      ]);

      return res.status(200).json({
        status: true,
        message: "Successfully retrieved all channels added by admin!",
        totalChannels: totalChannels,
        channels: channels,
      });
    } else if (req.query.type === "realUser") {
      const [totalChannels, channels] = await Promise.all([
        User.countDocuments({ isAddByAdmin: false, isChannel: true }),
        User.aggregate([
          { $match: { isAddByAdmin: false, isChannel: true, ...dateFilterQuery } },
          {
            $lookup: {
              from: "userwisesubscriptions",
              localField: "channelId",
              foreignField: "channelId",
              as: "subscriptions",
            },
          },
          {
            $addFields: {
              totalSubscribes: { $size: "$subscriptions" },
            },
          },
          {
            $project: {
              uniqueId: 1,
              fullName: 1,
              nickName: 1,
              email: 1,
              ipAddress: 1,
              isActive: 1,
              image: 1,
              isChannel: 1,
              isAddByAdmin: 1,
              channelId: 1,
              createdAt: 1,
              totalSubscribes: 1,
            },
          },
          { $sort: { createdAt: -1 } },
          { $skip: (start - 1) * limit },
          { $limit: limit },
        ]),
      ]);

      return res.status(200).json({
        status: true,
        message: "Successfully retrieved all channels of the real user!",
        totalChannels: totalChannels,
        channels: channels,
      });
    } else {
      return res.status(200).json({ status: false, message: "type must be passed valid!" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//update password of user added by admin
exports.updatePassword = async (req, res) => {
  try {
    if (!req.body.oldPass || !req.body.newPass || !req.body.confirmPass || !req.body.userId) return res.status(200).json({ status: false, message: "Oops ! Invalid details!!" });

    const user = await User.findOne({ _id: req.body.userId, isActive: true });
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    if (cryptr.decrypt(user.password) !== req.body.oldPass) {
      return res.status(200).json({
        status: false,
        message: "Oops ! password doesn't matched!",
      });
    }

    if (req.body.newPass !== req.body.confirmPass) {
      return res.status(200).json({
        status: false,
        message: "Oops ! New Password and Confirm Password doesn't match!!",
      });
    }

    const hash = cryptr.encrypt(req.body.newPass);
    user.password = hash;

    const data = await User.findById(user._id);
    data.password = cryptr.decrypt(hash);

    console.log("decrypt password in update password of user by admin ========", data.password);

    return res.status(200).json({
      status: true,
      message: "Password changed Successfully!",
      user: data,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

//handle unnecessary channel is inActive
exports.deleteChannelByAdmin = async (req, res) => {
  try {
    if (!req.query.channelId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!" });
    }

    const user = await User.findOne({ channelId: req.query.channelId.trim(), isChannel: true });
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found with that channel!" });
    }

    res.status(200).json({ status: true, message: "Now, Channel is not active.", user: user });

    const deleteChannel = user.channelId;
    const videosToDelete = await Video.find({ channelId: deleteChannel });

    await videosToDelete.map(async (video) => {
      if (video?.videoImage) {
        await deleteFromStorage(video?.videoImage);
      }

      if (video?.videoUrl) {
        await deleteFromStorage(video?.videoUrl);
      }

      await Promise.all([
        Report.deleteMany({ videoId: videosToDelete?._id }),
        SaveToWatchLater.deleteMany({ videoId: videosToDelete?._id }),
        Notification.deleteMany({ videoId: videosToDelete?._id }),
        Video.deleteOne({ _id: video._id }),
      ]);
    });

    await Promise.all([
      VideoComment.deleteMany({ channelId: deleteChannel }),
      UserWiseSubscription.deleteMany({ channelId: deleteChannel }),
      LikeHistoryOfVideo.deleteMany({ channelId: deleteChannel }),
      PlayList.deleteMany({ channelId: deleteChannel }),
      LikeHistoryOfVideoComment.deleteMany({ userId: user?._id }),
    ]);

    user.isChannel = false;
    user.channelId = null;
    user.descriptionOfChannel = null;
    await user.save();
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};
