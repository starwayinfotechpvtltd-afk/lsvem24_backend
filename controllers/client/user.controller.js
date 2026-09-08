const User = require("../../models/user.model");

//day.js
const dayjs = require("dayjs");

//Cryptr
const Cryptr = require("cryptr");
const cryptr = new Cryptr("myTotallySecretKey");

//import model
const PlayList = require("../../models/playList.model");
const WatchHistory = require("../../models/watchHistory.model");
const Video = require("../../models/video.model");
const LikeHistoryOfVideo = require("../../models/likeHistoryOfVideo.model");
const LikeHistoryOfvideoComment = require("../../models/likeHistoryOfVideoComment.model");
const LiveHistory = require("../../models/liveHistory.model");
const LiveUser = require("../../models/liveUser.model");
const MonetizationRequest = require("../../models/monetizationRequest.model");
const Notification = require("../../models/notification.model");
const PremiumPlanHistory = require("../../models/premiumPlanHistory.model");
const Report = require("../../models/report.model");
const SaveToWatchLater = require("../../models/saveToWatchLater.model");
const SearchHistory = require("../../models/searchHistory.model");
const UserWiseSubscription = require("../../models/userWiseSubscription.model");
const VideoComment = require("../../models/videoComment.model");
const WithdrawRequest = require("../../models/withDrawRequest.model");
const History = require("../../models/history.model");
const WalletHistory = require("../../models/walletHistory.model");
const VideoWatchReward = require("../../models/videoWatchReward.model");
const CheckIn = require("../../models/checkIn.model");
const CoinPlanHistory = require("../../models/coinplanHistory.model");

//mongoose
const mongoose = require("mongoose");

//uuid
const uuid = require("uuid");

//deleteFromStorage
const { deleteFromStorage } = require("../../util/storageHelper");

//generateUniqueId
const { generateUniqueId } = require("../../util/generateUniqueId");

//checkPlan
const { checkPlan } = require("../../util/checkPlan");

//monetization service
const { monetizationEnabled } = require("../../util/monetizationEnabled");

//generateReferralCode
const { generateReferralCode } = require("../../util/generateReferralCode");

//generateHistoryUniqueId
const {
  generateHistoryUniqueId,
} = require("../../util/generateHistoryUniqueId");

//private key
const admin = require("../../util/privateKey");

//user function
const userFunction = async (user, data_) => {
  const data = data_.body;
  const file = data_.file;

  user.image = file ? process?.env?.baseURL + file.path : user.image;
  user.fullName = data.fullName ? data.fullName : user.fullName;
  user.nickName = data.nickName ? data.nickName : user.nickName;
  user.email = data.email.trim() ? data.email.trim() : user.email;
  user.gender = data.gender ? data.gender : user.gender;
  user.age = data.age ? data.age : user.age;
  user.mobileNumber = data.mobileNumber ? data.mobileNumber : user.mobileNumber;

  user.country = data.country ? data.country : user.country;
  user.ipAddress = data.ipAddress ? data.ipAddress : user.ipAddress;

  user.descriptionOfChannel = data.descriptionOfChannel
    ? data.descriptionOfChannel
    : user.descriptionOfChannel;

  user.socialMediaLinks.instagramLink = data.instagramLink
    ? data.instagramLink
    : user.socialMediaLinks.instagramLink;
  user.socialMediaLinks.facebookLink = data.facebookLink
    ? data.facebookLink
    : user.socialMediaLinks.facebookLink;
  user.socialMediaLinks.twitterLink = data.twitterLink
    ? data.twitterLink
    : user.socialMediaLinks.twitterLink;
  user.socialMediaLinks.websiteLink = data.websiteLink
    ? data.websiteLink
    : user.socialMediaLinks.websiteLink;

  user.loginType = data.loginType ? data.loginType : user.loginType;
  user.password = data.password ? cryptr.encrypt(data.password) : user.password;
  user.identity = data.identity;
  user.fcmToken = data.fcmToken;
  user.uniqueId = !user.uniqueId
    ? await Promise.resolve(generateUniqueId())
    : user.uniqueId;

  await user.save();

  //return user with decrypt password
  user.password = data.password
    ? await cryptr.decrypt(user.password)
    : user.password;
  return user;
};

//user login or sign up
exports.store = async (req, res) => {
  console.log("Login data", req.body);
  try {
    if (
      !req.body.identity ||
      req.body.loginType === undefined ||
      req.body.fcmToken === undefined
    ) {
      return res
        .status(200)
        .json({ status: false, message: "Oops ! Invalid details." });
    }

    let userQuery;

    if (
      req.body.loginType === 1 ||
      req.body.loginType === 2 ||
      req.body.loginType === 3
    ) {
      if (!req.body.email) {
        return res
          .status(200)
          .json({ status: false, message: "email must be required." });
      }

      userQuery = await User.findOne({ email: req.body.email.trim() });
    } else if (req.body.loginType === 4) {
      if (!req.body.email || !req.body.password) {
        return res.status(200).json({
          status: false,
          message: "email and password both must be required.",
        });
      }

      const user = await User.findOne({
        email: req.body.email.trim(),
        loginType: 4,
      });

      if (user) {
        if (cryptr.decrypt(user.password) !== req.body.password) {
          return res.status(200).json({
            status: false,
            message: "Oops ! Password doesn't match.",
          });
        }
        userQuery = user;
      } else {
        userQuery = user;
      }
    } else {
      return res
        .status(200)
        .json({ status: false, message: "loginType must be passed valid." });
    }

    const user = userQuery;
    console.log("exist user:    ", user);

    if (user) {
      if (user.isBlock) {
        return res
          .status(200)
          .json({ status: false, message: "You are blocked by the admin." });
      }

      user.fcmToken = req.body.fcmToken ? req.body.fcmToken : user.fcmToken;

      const user_ = await userFunction(user, req);

      return res.status(200).json({
        status: true,
        message: "User login Successfully.",
        user: user_,
        signUp: false,
      });
    } else {
      console.log("User signup:    ");

      let referralCode;
      let isUnique = false;

      while (!isUnique) {
        referralCode = generateReferralCode();
        const existingUser = await User.findOne({ referralCode });
        if (!existingUser) {
          isUnique = true;
        }
      }

      const bonusCoins = settingJSON.loginRewardCoins
        ? settingJSON.loginRewardCoins
        : 5000;

      const newUser = new User();

      newUser.coin = bonusCoins;
      newUser.earnedCoin = bonusCoins;
      newUser.referralCode = referralCode;
      newUser.date = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      });

      console.log("New user created with referral code:", referralCode);

      const user = await userFunction(newUser, req);

      res.status(200).json({
        status: true,
        message: "User Signup Successfully.",
        user: user,
        signUp: true,
      });

      try {
        const uniqueId = await generateHistoryUniqueId();

        await History.create({
          userId: newUser._id,
          coin: bonusCoins,
          uniqueId: uniqueId,
          type: 3,
          date: new Date().toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
          }),
        });

        if (user.fcmToken && user.fcmToken !== null) {
          const payload = {
            token: user.fcmToken,
            notification: {
              title: "🎁 You've Earned a Login Bonus! 🎁",
              body: "You've just received an exclusive login bonus! 🌟 We're thrilled to have you with us. Enjoy your reward!",
            },
            data: {
              type: "LOGINBONUS",
            },
          };

          adminPromise
            .messaging()
            .send(payload)
            .then((response) => {
              console.log("Successfully sent with response: ", response);
            })
            .catch((error) => {
              console.log("Error sending message: ", error);
            });
        }
      } catch (err) {
        console.log("Background task error:", err);
      }
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Sever Error",
    });
  }
};

//check the user is exists or not for loginType 4 (email-password)
exports.checkUser = async (req, res) => {
  try {
    console.log("📥 CheckUser request:", {
      email: req.body.email,
      loginType: req.body.loginType,
      hasPassword: !!req.body.password,
    });

    // Validate input
    if (
      !req.body.email ||
      req.body.loginType === undefined ||
      !req.body.password
    ) {
      console.log("❌ Missing required fields");
      return res.status(200).json({
        status: false,
        message: "Oops ! Invalid details.",
        isLogin: false,
      });
    }

    // Find user by email and loginType
    const user = await User.findOne({
      email: req.body.email.trim().toLowerCase(), // ✅ Add toLowerCase for consistency
      loginType: 4, // Email/Password login
    });

    console.log("🔍 User found:", !!user);

    // User doesn't exist - can signup
    if (!user) {
      console.log("✅ User not found - can signup");
      return res.status(200).json({
        status: true,
        message: "User must have sign up!!", // ✅ Keep exact message for Flutter
        isLogin: false,
      });
    }

    // User exists - check password
    console.log("🔐 Checking password...");

    try {
      const decryptedPassword = cryptr.decrypt(
        user.password ? user.password.toString() : "",
      );

      if (decryptedPassword !== req.body.password) {
        console.log("❌ Password mismatch");
        return res.status(200).json({
          status: false,
          message: "Password doesn't match for this user.",
          isLogin: false,
        });
      } else {
        console.log("✅ Password matches - can login");
        return res.status(200).json({
          status: true,
          message: "User login Successfully.",
          isLogin: true,
        });
      }
    } catch (decryptError) {
      console.error("❌ Password decryption error:", decryptError);
      return res.status(200).json({
        status: false,
        message: "Error verifying password.",
        isLogin: false,
      });
    }
  } catch (error) {
    console.error("❌ CheckUser error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
      isLogin: false,
    });
  }
};

//check referral code is valid and apply referral code by user
exports.validateAndApplyReferralCode = async (req, res) => {
  try {
    const { userId, referralCode } = req.query;

    if (!userId || !referralCode) {
      return res
        .status(200)
        .json({ status: false, message: "Invalid input details." });
    }

    if (!settingJSON) {
      return res.status(400).json({ message: "Referral settings not found" });
    }

    const [uniqueId, user, referralCodeUser] = await Promise.all([
      generateHistoryUniqueId(),
      User.findById(userId), //the user being referred
      User.findOne({ referralCode: referralCode.trim() }), //the referring user (who share their referral code) by their referral code
    ]);

    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "Referred user does not found!" });
    }

    if (user.isBlock) {
      return res
        .status(200)
        .json({
          status: false,
          message: "Your account has been blocked by the administrator.",
        });
    }

    if (user.referralCode === referralCode.trim()) {
      return res
        .status(200)
        .json({
          status: false,
          message: "You cannot use your own referral code.",
        });
    }

    if (!referralCodeUser) {
      return res
        .status(200)
        .json({
          status: false,
          message: "Invalid referral code. The referred user does not exist.",
        });
    }

    if (!user.isReferral) {
      res
        .status(200)
        .json({ message: "Referral tracked and updated successfully" });

      const [updatedUser, updatedReferralCodeUser, referralHistory] =
        await Promise.all([
          User.findOneAndUpdate(
            { _id: user._id },
            {
              $set: { isReferral: true },
            },
            { new: true },
          ),
          User.findOneAndUpdate(
            { _id: referralCodeUser._id },
            {
              $inc: {
                coin: settingJSON?.referralRewardCoins,
                earnedCoin: settingJSON?.referralRewardCoins,
                referralCount: 1,
              },
            },
            { new: true },
          ),
          History({
            userId: referralCodeUser._id,
            uniqueId: uniqueId,
            coin: settingJSON?.referralRewardCoins,
            type: 4,
            date: new Date().toLocaleString("en-US", {
              timeZone: "Asia/Kolkata",
            }),
          }).save(),
        ]);
    } else {
      return res
        .status(200)
        .json({
          status: false,
          message: "Referral code has already been used by this user.",
        });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//earn coin from watching ad
exports.handleAdWatchReward = async (req, res) => {
  try {
    if (!req.query.userId || !req.query.coinEarnedFromAd) {
      return res
        .status(200)
        .json({ status: false, message: "Oops ! Invalid details!" });
    }

    const coinEarnedFromAd = parseInt(req.query.coinEarnedFromAd);

    const [uniqueId, user] = await Promise.all([
      generateHistoryUniqueId(),
      User.findOne({ _id: req.query.userId, isActive: true }),
    ]);

    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "User does not found!" });
    }

    if (user.isBlock) {
      return res
        .status(200)
        .json({ status: false, message: "you are blocked by the admin." });
    }

    const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD' format
    console.log("Today in Ad reward: ", today);

    if (
      user.watchAds &&
      user.watchAds.date !== null &&
      new Date(user.watchAds.date).toISOString().slice(0, 10) === today &&
      user.watchAds.count >= settingJSON.maxAdPerDay
    ) {
      return res
        .status(200)
        .json({ status: false, message: "Ad view limit exceeded for today." });
    }

    const [updatedReceiver, historyEntry] = await Promise.all([
      User.findOneAndUpdate(
        { _id: user._id },
        {
          $inc: {
            coin: coinEarnedFromAd,
            earnedCoin: coinEarnedFromAd,
            "watchAds.count": 1,
          },
          $set: {
            "watchAds.date": today,
          },
        },
        { new: true },
      ),
      History({
        userId: user._id,
        uniqueId: uniqueId,
        coin: coinEarnedFromAd,
        type: 2,
        date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      }).save(),
    ]);

    console.log("updatedReceiver", updatedReceiver.coin);

    return res
      .status(200)
      .json({
        status: true,
        message: "Coin earned successfully.",
        data: updatedReceiver,
      });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//earn coin from engagement video reward
exports.handleEngagementVideoWatchReward = async (req, res) => {
  try {
    const userId = req.query.userId;
    const videoId = req.query.videoId;
    const totalWatchTime = req.query.totalWatchTime;

    if (!userId || !videoId) {
      return res
        .status(200)
        .json({ status: false, message: "Oops! Invalid details." });
    }

    const coinEarned = parseInt(settingJSON.watchingVideoRewardCoins);
    console.log("coinEarned ", coinEarned);

    const [user, video, uniqueId] = await Promise.all([
      User.findOne({ _id: userId }),
      Video.findOne({ _id: videoId }),
      generateHistoryUniqueId(),
    ]);

    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "User not found!" });
    }

    if (user.isBlock) {
      return res
        .status(200)
        .json({ status: false, message: "You are blocked by the admin." });
    }

    if (!video) {
      return res
        .status(200)
        .json({ status: false, message: "Video not found!" });
    }

    const videoWatchRewardAlreadyExist = await VideoWatchReward.findOne({
      userId: user._id,
      videoId: video._id,
    });

    console.log(
      "videoWatchRewardAlreadyExist ",
      videoWatchRewardAlreadyExist,
    );

    if (videoWatchRewardAlreadyExist) {
      return res
        .status(200)
        .json({ status: true, message: "Coin already earned for this video." });
    } else {
      res
        .status(200)
        .json({ status: true, message: "Coin earned successfully." });

      const [newVideoWatchReward, updatedReceiver, historyEntry] =
        await Promise.all([
          VideoWatchReward.create({
            userId: user._id,
            videoId: videoId,
            videoUserId: video?.userId,
            videoChannelId: video?.channelId,
            totalWatchTime: totalWatchTime,
          }),
          User.findOneAndUpdate(
            { _id: user._id },
            {
              $inc: {
                coin: coinEarned,
                earnedCoin: coinEarned,
              },
            },
            { new: true },
          ),
          History({
            userId: user._id,
            uniqueId: uniqueId,
            coin: coinEarned,
            type: 5,
            date: new Date().toLocaleString("en-US", {
              timeZone: "Asia/Kolkata",
            }),
          }).save(),
        ]);
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//update details of the channel (create your channel button)
exports.update = async (req, res) => {
  try {
    if (!req.query.userId || !req.query.isChannel || !req.body.channelType) {
      return res
        .status(200)
        .json({ status: false, message: "Oops ! Invalid details!" });
    }

    const user = await User.findOne({ _id: req.query.userId, isActive: true });
    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "User does not found!" });
    }

    if (user.isBlock) {
      return res
        .status(200)
        .json({ status: false, message: "you are blocked by admin!" });
    }

    if (req.query.isChannel === "true") {
      const isChannel = await User.findOne({ _id: user._id, isChannel: true });
      if (!isChannel) {
        return res
          .status(200)
          .json({
            status: false,
            message:
              "channel of that user does not created please firstly create channel of that user!",
          });
      }

      if (req.body.fullName && req.body.fullName !== user.fullName) {
        //Check if the new channelName is different from the current one
        const isDuplicateFullName = await User.findOne({
          fullName: req.body.fullName.trim(),
        });
        if (isDuplicateFullName) {
          return res
            .status(200)
            .json({
              status: false,
              message:
                "The provided channelName is already in use. Please choose a different one.",
            });
        }

        user.fullName = req.body.fullName
          ? req.body.fullName.trim()
          : user.fullName; //channelName
      }

      if (req?.body?.image) {
        if (user.image) {
          await deleteFromStorage(user.image);
        }

        user.image = req?.body?.image ? req?.body?.image : user.image;
      }

      user.channelType = req.body.channelType ? req.body.channelType.toString().trim() : (user.channelType || "Artist");
      user.channelCategory = req.body.channelCategory ? req.body.channelCategory.toString().trim() : user.channelType;
      user.subscriptionCost = 10;
      user.videoUnlockCost = 10;
      user.descriptionOfChannel = req.body.descriptionOfChannel
        ? req.body.descriptionOfChannel
        : user.descriptionOfChannel;
      user.socialMediaLinks.instagramLink = req.body.instagramLink
        ? req.body.instagramLink
        : user.socialMediaLinks.instagramLink;
      user.socialMediaLinks.facebookLink = req.body.facebookLink
        ? req.body.facebookLink
        : user.socialMediaLinks.facebookLink;
      user.socialMediaLinks.twitterLink = req.body.twitterLink
        ? req.body.twitterLink
        : user.socialMediaLinks.twitterLink;
      user.socialMediaLinks.websiteLink = req.body.websiteLink
        ? req.body.websiteLink
        : user.socialMediaLinks.websiteLink;
      await user.save();

      return res.status(200).json({ status: true, message: "Success", user });
    } else if (req.query.isChannel === "false") {
      const isChannel = await User.findOne({ _id: user._id, isChannel: false });
      if (!isChannel) {
        return res
          .status(200)
          .json({
            status: false,
            message:
              "channel of that user already created please passed valid isChannel true!",
          });
      }

      if (req.body.fullName && req.body.fullName !== user.fullName) {
        // Check if the new channelName is different from the current one
        const isDuplicateFullName = await User.findOne({
          fullName: req.body.fullName.trim(),
        });
        if (isDuplicateFullName) {
          return res
            .status(200)
            .json({
              status: false,
              message:
                "The provided channelName is already in use. Please choose a different one.",
            });
        }

        user.fullName = req.body.fullName
          ? req.body.fullName.trim()
          : user.fullName; //channelName
      }

      user.channelId = uuid.v4();
      user.isChannel = true;
      user.channelType = req.body.channelType ? req.body.channelType.toString().trim() : "Artist";
      user.channelCategory = req.body.channelCategory ? req.body.channelCategory.toString().trim() : user.channelType;
      user.subscriptionCost = 10;
      user.videoUnlockCost = 10;

      if (req?.body?.image) {
        if (user.image) {
          await deleteFromStorage(user.image);
        }

        user.image = req?.body?.image ? req?.body?.image : user.image;
      }

      user.descriptionOfChannel = req.body.descriptionOfChannel
        ? req.body.descriptionOfChannel
        : user.descriptionOfChannel;
      user.socialMediaLinks.instagramLink = req.body.instagramLink
        ? req.body.instagramLink
        : user.socialMediaLinks.instagramLink;
      user.socialMediaLinks.facebookLink = req.body.facebookLink
        ? req.body.facebookLink
        : user.socialMediaLinks.facebookLink;
      user.socialMediaLinks.twitterLink = req.body.twitterLink
        ? req.body.twitterLink
        : user.socialMediaLinks.twitterLink;
      user.socialMediaLinks.websiteLink = req.body.websiteLink
        ? req.body.websiteLink
        : user.socialMediaLinks.websiteLink;
      await user.save();

      return res.status(200).json({ status: true, message: "Success", user });
    } else {
      return res
        .status(500)
        .json({
          status: false,
          message: "isChannel must be passed true or false.",
        });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//update profile of the user (when user login or signUp)
exports.updateProfile = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res
        .status(200)
        .json({ status: false, message: "userId must be requried." });
    }

    const user = await User.findOne({ _id: req.query.userId, isActive: true });
    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "User does not found." });
    }

    if (user.isBlock) {
      return res
        .status(200)
        .json({ status: false, message: "you are blocked by the admin." });
    }

    if (req?.body?.image) {
      if (user.image) {
        await deleteFromStorage(user.image);
      }

      user.image = req?.body?.image ? req?.body?.image : user?.image;
    }

    if (req.body.fullName && req.body.fullName !== user.fullName) {
      // Check if the new channelName is different from the current one
      const isDuplicateFullName = await User.findOne({
        fullName: req.body.fullName.trim(),
      });
      if (isDuplicateFullName) {
        return res
          .status(200)
          .json({
            status: false,
            message:
              "The provided channelName is already in use. Please choose a different one.",
          });
      }

      user.fullName = req.body.fullName
        ? req.body.fullName.trim()
        : user.fullName; //channelName
    }

    user.channelType = req.body.channelType
      ? req.body.channelType
      : user.channelType;
    user.nickName = req.body.nickName ? req.body.nickName : user.nickName;
    user.gender = req.body.gender ? req.body.gender : user.gender;
    user.age = req.body.age ? req.body.age : user.age;
    user.mobileNumber = req.body.mobileNumber
      ? req.body.mobileNumber
      : user.mobileNumber;
    user.country = req.body.country ? req.body.country : user.country;
    user.ipAddress = req.body.ipAddress ? req.body.ipAddress : user.ipAddress;
    user.descriptionOfChannel = req.body.descriptionOfChannel
      ? req.body.descriptionOfChannel
      : user.descriptionOfChannel;

    user.subscriptionCost = req.body.subscriptionCost
      ? Number(req.body.subscriptionCost)
      : user.subscriptionCost;
    user.videoUnlockCost = req.body.videoUnlockCost
      ? Number(req.body.videoUnlockCost)
      : user.videoUnlockCost;

    user.socialMediaLinks.instagramLink = req.body.instagramLink
      ? req.body.instagramLink
      : user.socialMediaLinks.instagramLink;
    user.socialMediaLinks.facebookLink = req.body.facebookLink
      ? req.body.facebookLink
      : user.socialMediaLinks.facebookLink;
    user.socialMediaLinks.twitterLink = req.body.twitterLink
      ? req.body.twitterLink
      : user.socialMediaLinks.twitterLink;
    user.socialMediaLinks.websiteLink = req.body.websiteLink
      ? req.body.websiteLink
      : user.socialMediaLinks.websiteLink;

    await user.save();

    return res
      .status(200)
      .json({ status: true, message: "Success", user: user });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//get user profile who login
exports.getProfile = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res
        .status(200)
        .json({ status: false, message: "Oops ! Invalid details!" });
    }

    console.log("Get profile: ", req.query.userId)

    const user = await User.findOne({ _id: req.query.userId, isActive: true });
    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "User does not found!" });
    }

    if (user.isBlock) {
      return res
        .status(200)
        .json({ status: false, message: "you are blocked by the admin." });
    }

    if (user.plan.planStartDate !== null && user.plan.premiumPlanId !== null) {
      console.log("Check plan in get user profile API");

      const [updateUser, monetizationUpdateUser] = await Promise.all([
        checkPlan(user._id),
        !user.isMonetization
          ? monetizationEnabled(user._id)
          : Promise.resolve(),
      ]);

      if (!user.isMonetization) {
        console.log(
          "Check monetization with checkPlan function in get user profile API",
        );
        console.log(
          "monetizationUpdateUser isMonetization",
          monetizationUpdateUser.isMonetization,
        );

        updateUser.isMonetization = monetizationUpdateUser.isMonetization; //Merge the updates from both functions
      }

      return res
        .status(200)
        .json({
          status: true,
          message: "Profile of the user updated by admin!",
          user: updateUser,
        });
    }

    if (!user.isMonetization) {
      console.log("check monetization in get user profile API");

      const updateUser = await monetizationEnabled(user._id);
      return res
        .status(200)
        .json({
          status: true,
          message: "Retrive profile of the user.",
          user: updateUser,
        });
    }

    return res
      .status(200)
      .json({
        status: true,
        message: "Retrive profile of the user.",
        user: user,
      });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//update password
exports.updatePassword = async (req, res) => {
  try {
    if (!req.body.oldPass || !req.body.newPass || !req.body.confirmPass) {
      return res
        .status(200)
        .json({ status: false, message: "Oops ! Invalid details." });
    }

    const user = await User.findOne({ _id: req.user._id });
    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "User does not found." });
    }

    if (cryptr.decrypt(user.password) !== req.body.password) {
      return res.status(200).json({
        status: false,
        message: "Oops ! Password doesn't match!!",
      });
    }

    if (req.body.newPass !== req.body.confirmPass) {
      return res.status(200).json({
        status: false,
        message: "Oops ! New Password and Confirm Password doesn't match!!",
      });
    }

    const hash = cryptr.encrypt(req.body.newPass);
    await User.updateOne({ _id: req.user._id }, { $set: { password: hash } });

    return res.status(200).json({
      status: true,
      message: "Password changed Successfully!",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

//set Password
exports.setPassword = async (req, res) => {
  try {
    if (!req.body.newPassword || !req.body.confirmPassword || !req.body.email) {
      return res
        .status(200)
        .json({ status: false, message: "Oops ! Invalid details." });
    }

    const user = await User.findOne({ email: req.body.email.trim() });
    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "User does not found." });
    }

    if (user.isBlock) {
      return res
        .status(200)
        .json({ status: false, message: "you are blocked by admin!" });
    }

    if (req.body.newPassword === req.body.confirmPassword) {
      user.password = cryptr.encrypt(req.body.newPassword);
      await user.save();

      user.password = await cryptr.decrypt(user.password);

      return res.status(200).json({
        status: true,
        message: "Password Changed Successfully!!",
        user,
      });
    } else {
      return res
        .status(200)
        .json({ status: false, message: "Password does not matched!!" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error!!",
    });
  }
};

//get particular channel's details (home)
exports.detailsOfChannel = async (req, res, next) => {
  try {
    if (!req.query.channelId) {
      return res
        .status(200)
        .json({ status: false, message: "Oops ! Invalid details." });
    }

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    const channelId = req.query.channelId.toString().trim();
    const channelQuery = mongoose.Types.ObjectId.isValid(channelId)
      ? { $or: [{ channelId: channelId }, { _id: new mongoose.Types.ObjectId(channelId) }] }
      : { channelId: channelId };

    let user = null;
    let userId = null;
    if (req.query.userId && req.query.userId.toString().trim() !== "" && mongoose.Types.ObjectId.isValid(req.query.userId)) {
      userId = new mongoose.Types.ObjectId(req.query.userId);
      user = await User.findOne({ _id: userId, isActive: true });
    }

    if (user && user.isBlock) {
      return res
        .status(200)
        .json({ status: false, message: "you are blocked by admin!" });
    }

    const channel = await User.findOne(channelQuery);
    if (!channel) {
      return res
        .status(200)
        .json({ status: false, message: "channel does not found!" });
    }

    const channelIdentifiers = [channel.channelId, channel._id ? channel._id.toString() : null].filter(Boolean);

    const [
      totalVideosOfChannel,
      isSubscribedChannel,
      totalSubscribers,
      data,
    ] = await Promise.all([
      Video.countDocuments({ channelId: { $in: channelIdentifiers } }),
      userId
        ? UserWiseSubscription.findOne({ userId: userId, channelId: { $in: channelIdentifiers } })
        : null,
      UserWiseSubscription.countDocuments({ channelId: { $in: channelIdentifiers } }),
      Video.aggregate([
        {
          $match: {
            channelId: { $in: channelIdentifiers },
            scheduleType: 2,
            visibilityType: 1,
          },
        },
        {
          $lookup: {
            from: "users",
            let: { vChannelId: "$channelId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      { $eq: ["$channelId", "$$vChannelId"] },
                      { $eq: [{ $toString: "$_id" }, "$$vChannelId"] },
                    ],
                  },
                },
              },
            ],
            as: "channel",
          },
        },
        {
          $unwind: {
            path: "$channel",
            preserveNullAndEmptyArrays: true,
          },
        },
        ...(userId
          ? [
              {
                $lookup: {
                  from: "userwisesubscriptions",
                  let: {
                    subChannelId: "$channel.channelId",
                    subUserId: userId,
                  },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $eq: ["$channelId", "$$subChannelId"] },
                            { $eq: ["$userId", "$$subUserId"] },
                          ],
                        },
                      },
                    },
                  ],
                  as: "isSubscribed",
                },
              },
              {
                $lookup: {
                  from: "savetowatchlaters",
                  let: { videoId: "$_id", saveUserId: userId },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $eq: ["$videoId", "$$videoId"] },
                            { $eq: ["$userId", "$$saveUserId"] },
                          ],
                        },
                      },
                    },
                  ],
                  as: "isSaveToWatchLater",
                },
              },
            ]
          : []),
        {
          $project: {
            title: 1,
            videoType: 1,
            videoTime: 1,
            videoUrl: 1,
            videoImage: 1,
            channelId: 1,
            videoPrivacyType: 1,
            createdAt: 1,
            channelType: {
              $cond: [
                { $eq: ["$channel.channelType", 2] },
                2,
                { $cond: [{ $eq: ["$channel.channelType", "2"] }, 2, 1] },
              ],
            },
            subscriptionCost: { $ifNull: ["$channel.subscriptionCost", 10] },
            videoUnlockCost: { $ifNull: ["$channel.videoUnlockCost", 10] },
            views: 1,
            isSubscribed: userId
              ? { $cond: [{ $gt: [{ $size: { $ifNull: ["$isSubscribed", []] } }, 0] }, true, false] }
              : { $literal: false },
            isSaveToWatchLater: userId
              ? { $cond: [{ $gt: [{ $size: { $ifNull: ["$isSaveToWatchLater", []] } }, 0] }, true, false] }
              : { $literal: false },
          },
        },
        {
          $lookup: {
            from: "watchhistories",
            localField: "_id",
            foreignField: "videoId",
            as: "viewsList",
          },
        },
        {
          $addFields: {
            views: { $size: "$viewsList" },
          },
        },
        { $project: { viewsList: 0 } },
        { $sort: { createdAt: -1 } },
        { $skip: (start - 1) * limit },
        { $limit: limit },
      ]),
    ]);

    const isSubscribed = isSubscribedChannel ? true : false;
    const channelName = channel.fullName || "";
    const channelImage = channel.image || "";
    const parsedChannelType = Number(channel.channelType) === 2 ? 2 : 1;
    const subscriptionCost = Number(channel.subscriptionCost) || 10;
    const videoUnlockCost = Number(channel.videoUnlockCost) || 10;

    let now = dayjs();
    const channelData = data?.map((item) => ({
      ...item,
      time:
        now.diff(item.createdAt, "minute") === 0
          ? "Just Now"
          : now.diff(item.createdAt, "minute") <= 60 &&
              now.diff(item.createdAt, "minute") >= 0
            ? now.diff(item.createdAt, "minute") + " minutes ago"
            : now.diff(item.createdAt, "hour") >= 24
              ? now.diff(item.createdAt, "day") >= 365
                ? Math.floor(now.diff(item.createdAt, "day") / 365) +
                  " years ago"
                : now.diff(item.createdAt, "day") >= 30
                  ? Math.floor(now.diff(item.createdAt, "day") / 30) +
                    " months ago"
                  : now.diff(item.createdAt, "day") >= 7
                    ? Math.floor(now.diff(item.createdAt, "day") / 7) +
                      " weeks ago"
                    : now.diff(item.createdAt, "day") + " days ago"
              : now.diff(item.createdAt, "hour") + " hours ago",
    }));

    return res.status(200).json({
      status: true,
      message: "Retrive particular channel's details.",
      totalVideosOfChannel: totalVideosOfChannel,
      totalSubscribers: totalSubscribers,
      isSubscribed: isSubscribed,
      channelName: channelName,
      channelImage: channelImage,
      channelType: parsedChannelType,
      subscriptionCost: subscriptionCost,
      videoUnlockCost: videoUnlockCost,
      detailsOfChannel: channelData && channelData.length > 0 ? channelData : [],
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//get particular's channel's videoType wise videos (videos, shorts) (your videos)
exports.videosOfChannel = async (req, res) => {
  try {
    if (
      !req.query.channelId ||
      !req.query.videoType
    ) {
      return res
        .status(200)
        .json({ status: false, message: "Oops ! Invalid details!!" });
    }

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;

    const channelId = req.query.channelId.toString().trim();
    const channelQuery = mongoose.Types.ObjectId.isValid(channelId)
      ? { $or: [{ channelId: channelId }, { _id: new mongoose.Types.ObjectId(channelId) }] }
      : { channelId: channelId };

    let user = null;
    let userId = null;
    if (req.query.userId && req.query.userId.toString().trim() !== "" && mongoose.Types.ObjectId.isValid(req.query.userId)) {
      userId = new mongoose.Types.ObjectId(req.query.userId);
      user = await User.findOne({ _id: userId, isActive: true });
    }

    if (user && user.isBlock) {
      return res
        .status(200)
        .json({ status: false, message: "you are blocked by admin!" });
    }

    const channel = await User.findOne(channelQuery);
    if (!channel) {
      return res
        .status(200)
        .json({ status: false, message: "channel does not found!" });
    }

    const channelIdentifiers = [channel.channelId, channel._id ? channel._id.toString() : null].filter(Boolean);

    const data = await Video.aggregate([
      {
        $match: {
          channelId: { $in: channelIdentifiers },
          videoType: Number(req.query.videoType),
          isActive: true,
          scheduleType: 2,
        },
      },
      {
        $lookup: {
          from: "users",
          let: { vChannelId: "$channelId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$channelId", "$$vChannelId"] },
                    { $eq: [{ $toString: "$_id" }, "$$vChannelId"] },
                  ],
                },
              },
            },
          ],
          as: "channel",
        },
      },
      {
        $unwind: {
          path: "$channel",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "watchhistories",
          localField: "_id",
          foreignField: "videoId",
          as: "viewsList",
        },
      },
      {
        $addFields: {
          views: { $size: "$viewsList" },
        },
      },
      ...(userId
        ? [
            {
              $lookup: {
                from: "userwisesubscriptions",
                let: {
                  subChannelId: "$channel.channelId",
                  subUserId: userId,
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$channelId", "$$subChannelId"] },
                          { $eq: ["$userId", "$$subUserId"] },
                        ],
                      },
                    },
                  },
                ],
                as: "isSubscribed",
              },
            },
          ]
        : []),
      {
        $project: {
          title: 1,
          videoType: 1,
          videoTime: 1,
          videoUrl: 1,
          videoImage: 1,
          channelId: 1,
          createdAt: 1,
          videoPrivacyType: 1,
          channelType: {
            $cond: [
              { $eq: ["$channel.channelType", 2] },
              2,
              { $cond: [{ $eq: ["$channel.channelType", "2"] }, 2, 1] },
            ],
          },
          subscriptionCost: { $ifNull: ["$channel.subscriptionCost", 10] },
          videoUnlockCost: { $ifNull: ["$channel.videoUnlockCost", 10] },
          views: 1,
          isSubscribed: userId
            ? { $cond: [{ $gt: [{ $size: { $ifNull: ["$isSubscribed", []] } }, 0] }, true, false] }
            : { $literal: false },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: (start - 1) * limit },
      { $limit: limit },
    ]);

    let now = dayjs();
    const videosTypeWiseOfChannel = data.map((item) => ({
      ...item,
      time:
        now.diff(item.createdAt, "minute") === 0
          ? "Just Now"
          : now.diff(item.createdAt, "minute") <= 60 &&
              now.diff(item.createdAt, "minute") >= 0
            ? now.diff(item.createdAt, "minute") + " minutes ago"
            : now.diff(item.createdAt, "hour") >= 24
              ? now.diff(item.createdAt, "day") >= 365
                ? Math.floor(now.diff(item.createdAt, "day") / 365) +
                  " years ago"
                : now.diff(item.createdAt, "day") >= 30
                  ? Math.floor(now.diff(item.createdAt, "day") / 30) +
                    " months ago"
                  : now.diff(item.createdAt, "day") >= 7
                    ? Math.floor(now.diff(item.createdAt, "day") / 7) +
                      " weeks ago"
                    : now.diff(item.createdAt, "day") + " days ago"
              : now.diff(item.createdAt, "hour") + " hours ago",
    }));

    return res.status(200).json({
      status: true,
      message: "Retrive particular channel's videos or shorts.",
      videosTypeWiseOfChannel:
        videosTypeWiseOfChannel.length > 0 ? videosTypeWiseOfChannel : [],
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//get particular's channel's playLists (another or own channel's playlist)
exports.playListsOfChannel = async (req, res, next) => {
  try {
    if (!req.query.channelId) {
      return res
        .status(200)
        .json({ status: false, message: "Oops ! Invalid details." });
    }

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;

    const channelId = req.query.channelId.toString().trim();
    const channelQuery = mongoose.Types.ObjectId.isValid(channelId)
      ? { $or: [{ channelId: channelId }, { _id: new mongoose.Types.ObjectId(channelId) }] }
      : { channelId: channelId };

    let user = null;
    let userId = null;
    if (req.query.userId && req.query.userId.toString().trim() !== "" && mongoose.Types.ObjectId.isValid(req.query.userId)) {
      userId = new mongoose.Types.ObjectId(req.query.userId);
      user = await User.findOne({ _id: userId, isActive: true });
    }

    if (user && user.isBlock) {
      return res
        .status(200)
        .json({ status: false, message: "you are blocked by admin!" });
    }

    const channel = await User.findOne(channelQuery);
    if (!channel) {
      return res
        .status(200)
        .json({ status: false, message: "channel does not found." });
    }

    const channelIdentifiers = [channel.channelId, channel._id ? channel._id.toString() : null].filter(Boolean);

    const data = await PlayList.aggregate([
      {
        $match: {
          channelId: { $in: channelIdentifiers },
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
        $unwind: "$video",
      },
      {
        $lookup: {
          from: "users",
          let: { vChanId: "$video.channelId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$channelId", "$$vChanId"] },
                    { $eq: [{ $toString: "$_id" }, "$$vChanId"] },
                  ],
                },
              },
            },
          ],
          as: "channel",
        },
      },
      {
        $unwind: {
          path: "$channel",
          preserveNullAndEmptyArrays: true,
        },
      },
      ...(userId
        ? [
            {
              $lookup: {
                from: "userwisesubscriptions",
                let: {
                  subChannelId: "$channel.channelId",
                  subUserId: userId,
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$channelId", "$$subChannelId"] },
                          { $eq: ["$userId", "$$subUserId"] },
                        ],
                      },
                    },
                  },
                ],
                as: "isSubscribed",
              },
            },
          ]
        : []),
      {
        $project: {
          channelId: 1,
          userId: 1,
          playListName: 1,
          playListType: 1,
          channelName: "$channel.fullName",
          channelType: {
            $cond: [
              { $eq: ["$channel.channelType", 2] },
              2,
              { $cond: [{ $eq: ["$channel.channelType", "2"] }, 2, 1] },
            ],
          },
          subscriptionCost: { $ifNull: ["$channel.subscriptionCost", 10] },
          videoUnlockCost: { $ifNull: ["$channel.videoUnlockCost", 10] },
          videoId: "$video._id",
          videoPrivacyType: "$video.videoPrivacyType",
          videoTitle: "$video.title",
          videoUrl: "$video.videoUrl",
          videoImage: "$video.videoImage",
          videoTime: "$video.videoTime",
          isSubscribed: userId
            ? { $cond: [{ $gt: [{ $size: { $ifNull: ["$isSubscribed", []] } }, 0] }, true, false] }
            : { $literal: false },
        },
      },
      {
        $group: {
          _id: "$_id",
          channelId: { $first: "$channelId" },
          userId: { $first: "$userId" },
          playListName: { $first: "$playListName" },
          playListType: { $first: "$playListType" },
          channelName: { $first: "$channelName" },
          subscriptionCost: { $first: "$subscriptionCost" },
          videoUnlockCost: { $first: "$videoUnlockCost" },
          isSubscribed: { $first: "$isSubscribed" },
          videos: {
            $push: {
              videoId: "$videoId",
              videoName: "$videoTitle",
              videoUrl: "$videoUrl",
              videoImage: "$videoImage",
              videoTime: "$videoTime",
              videoPrivacyType: "$videoPrivacyType",
            },
          },
          totalVideo: { $sum: 1 },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: (start - 1) * limit },
      { $limit: limit },
    ]);

    return res.status(200).json({
      status: true,
      message: "get particular's channel's playLists.",
      playListsOfChannel: data,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//get particular channel's about
exports.aboutOfChannel = async (req, res) => {
  try {
    if (!req.query.channelId) {
      return res
        .status(200)
        .json({ status: false, message: "Oops ! Invalid details!!" });
    }

    const channelId = req.query.channelId.toString().trim();
    const channelQuery = mongoose.Types.ObjectId.isValid(channelId)
      ? { $or: [{ channelId: channelId }, { _id: new mongoose.Types.ObjectId(channelId) }] }
      : { channelId: channelId };

    const channel = await User.findOne(channelQuery).select(
      "fullName descriptionOfChannel socialMediaLinks date country channelId channelType channelCategory",
    );

    if (!channel) {
      return res
        .status(200)
        .json({ status: false, message: "channel does not found!" });
    }

    const channelIdentifiers = [channel.channelId, channel._id ? channel._id.toString() : null].filter(Boolean);

    const totalViewsOfthatChannelVideos = await WatchHistory.countDocuments({
      videoChannelId: { $in: channelIdentifiers },
    });

    return res.status(200).json({
      status: true,
      message: "finally, get particular channel's details!",
      aboutOfChannel: { channel, totalViewsOfthatChannelVideos },
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//search channel for user
exports.searchChannel = async (req, res) => {
  try {
    if (!req.body.searchString || !req.body.userId) {
      return res.status(200).json({
        status: false,
        message: "Oops ! Invalid details!",
      });
    }

    const searchString = req.body.searchString.trim();
    const userId = new mongoose.Types.ObjectId(req.body.userId);

    const [channel, user, response] = await Promise.all([
      User.find({ fullName: { $regex: searchString, $options: "i" } }),
      User.findOne({ _id: userId, isActive: true }),
      User.aggregate([
        {
          $match: {
            channelId: { $ne: null },
            fullName: { $regex: searchString, $options: "i" },
          },
        },
        {
          $lookup: {
            from: "userwisesubscriptions",
            let: {
              channelId: "$channelId",
              userId: userId,
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$channelId", "$$channelId"] },
                      { $eq: ["$userId", "$$userId"] },
                    ],
                  },
                },
              },
            ],
            as: "isSubscribed",
          },
        },
        {
          $lookup: {
            from: "videos",
            let: {
              channelId: "$channelId",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$channelId", "$$channelId"],
                  },
                },
              },
            ],
            as: "totalVideos",
          },
        },
        {
          $lookup: {
            from: "userwisesubscriptions",
            localField: "channelId",
            foreignField: "channelId",
            as: "totalSubscribers",
          },
        },
        {
          $project: {
            channelId: 1,
            fullName: 1,
            image: 1,
            isSubscribed: {
              $cond: [{ $eq: [{ $size: "$isSubscribed" }, 0] }, false, true],
            },
            totalVideos: { $size: "$totalVideos" },
            totalSubscribers: { $size: "$totalSubscribers" },
          },
        },
      ]),
    ]);

    if (!channel) {
      return res
        .status(200)
        .json({ status: false, message: "channel does not found!" });
    }

    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "user does not found!" });
    }

    if (user.isBlock) {
      return res
        .status(200)
        .json({ status: false, message: "you are blocked by admin!" });
    }

    return res
      .status(200)
      .json({ status: true, message: "Success!", searchData: response });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//delete user account
exports.deleteUserAccount = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res
        .status(200)
        .json({ status: false, message: "userId must be required!" });
    }

    const userId = new mongoose.Types.ObjectId(req.query.userId);

    const [user, videosToDelete] = await Promise.all([
      User.findById(userId),
      Video.find({ userId: userId }),
    ]);

    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "User does not found!" });
    }

    if (user.isBlock) {
      return res
        .status(200)
        .json({ status: false, message: "you are blocked by the admin." });
    }

    if (user.image) {
      await deleteFromStorage(user.image);
    }

    await videosToDelete.map(async (video) => {
      if (video.videoImage) {
        await deleteFromStorage(video.videoImage);
      }

      if (video.videoUrl) {
        await deleteFromStorage(video.videoUrl);
      }

      await Video.deleteOne({ _id: video._id });
    });

    await Promise.all([
      WatchHistory.deleteMany({ userId: user?._id }),
      LikeHistoryOfVideo.deleteMany({ userId: user?._id }),
      VideoComment.deleteMany({ userId: user?._id }),
      LikeHistoryOfvideoComment.deleteMany({ userId: user?._id }),
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

    await User.deleteOne({ _id: user?._id });

    return res
      .status(200)
      .json({ status: true, message: "User account has been deleted." });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//get referral history of particular user
exports.loadReferralHistoryByUser = async (req, res) => {
  try {
    if (!req.query.startDate || !req.query.endDate || !req.query.userId) {
      return res
        .status(200)
        .json({ status: false, message: "Oops ! Invalid details!" });
    }

    const userId = new mongoose.Types.ObjectId(req.query.userId);
    const startDate = req?.query?.startDate || "All";
    const endDate = req?.query?.endDate || "All";

    let dateFilterQuery = {};
    if (req?.query?.startDate !== "All" && req?.query?.endDate !== "All") {
      const formatStartDate = new Date(startDate);
      const formatEndDate = new Date(endDate);
      formatEndDate.setHours(23, 59, 59, 999);

      dateFilterQuery = {
        createdAt: {
          $gte: formatStartDate,
          $lte: formatEndDate,
        },
      };
    }
    //console.log("dateFilterQuery:   ", dateFilterQuery);

    const [user, referralHistory] = await Promise.all([
      User.findOne({ _id: userId, isActive: true }),
      History.find({ userId: userId, type: 4, ...dateFilterQuery })
        .populate("userId", "fullName nickName")
        .sort({ createdAt: -1 }),
    ]);

    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "User does not found." });
    }

    if (user.isBlock) {
      return res
        .status(200)
        .json({ status: false, message: "you are blocked by admin!" });
    }

    return res.status(200).json({
      status: true,
      message: "Retrive Refferal history for that user.",
      data: referralHistory,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

//get coin history of particular user
exports.retriveCoinHistoryByUser = async (req, res) => {
  try {
    if (!req.query.startDate || !req.query.endDate || !req.query.userId) {
      return res
        .status(200)
        .json({ status: false, message: "Oops ! Invalid details!" });
    }

    const userId = new mongoose.Types.ObjectId(req.query.userId);
    const startDate = req?.query?.startDate || "All";
    const endDate = req?.query?.endDate || "All";

    let dateFilterQuery = {};
    if (req?.query?.startDate !== "All" && req?.query?.endDate !== "All") {
      const formatStartDate = new Date(startDate);
      const formatEndDate = new Date(endDate);
      formatEndDate.setHours(23, 59, 59, 999);

      dateFilterQuery = {
        createdAt: {
          $gte: formatStartDate,
          $lte: formatEndDate,
        },
      };
    }
    //console.log("dateFilterQuery:   ", dateFilterQuery);

    const [user, history] = await Promise.all([
      User.findOne({ _id: userId, isActive: true }).lean(),
      History.aggregate([
        {
          $match: {
            ...dateFilterQuery,
            $or: [{ userId: userId }, { otherUserId: userId }],
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "otherUserId",
            foreignField: "_id",
            as: "sender",
          },
        },
        {
          $unwind: {
            path: "$sender",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "receiver",
          },
        },
        {
          $unwind: {
            path: "$receiver",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            type: 1,
            payoutStatus: 1,
            coin: 1,
            uniqueId: 1,
            date: 1,
            reason: 1,
            createdAt: 1,
            senderName: { $ifNull: ["$sender.name", ""] },
            receiverName: { $ifNull: ["$receiver.name", ""] },
            isIncome: {
              $cond: {
                if: { $eq: ["$otherUserId", userId] },
                then: false,
                else: true,
              },
            },
          },
        },
        { $sort: { createdAt: -1 } },
      ]),
    ]);

    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "User not found." });
    }

    if (user.isBlock) {
      return res
        .status(200)
        .json({ status: false, message: "You are blocked by the admin." });
    }

    return res
      .status(200)
      .json({
        status: true,
        message: "Retrieve all histories.",
        data: history,
      });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};

//get wallet history of particular user
exports.fetchWalletHistoryByUser = async (req, res) => {
  try {
    if (!req.query.startDate || !req.query.endDate || !req.query.userId) {
      return res
        .status(200)
        .json({ status: false, message: "Oops ! Invalid details!" });
    }

    const userId = new mongoose.Types.ObjectId(req.query.userId);
    const startDate = req?.query?.startDate || "All";
    const endDate = req?.query?.endDate || "All";

    let dateFilterQuery = {};
    if (req?.query?.startDate !== "All" && req?.query?.endDate !== "All") {
      const formatStartDate = new Date(startDate);
      const formatEndDate = new Date(endDate);
      formatEndDate.setHours(23, 59, 59, 999);

      dateFilterQuery = {
        createdAt: {
          $gte: formatStartDate,
          $lte: formatEndDate,
        },
      };
    }
    //console.log("dateFilterQuery:   ", dateFilterQuery);

    const [user, walletHistory] = await Promise.all([
      User.findOne({ _id: userId, isActive: true }),
      WalletHistory.find({
        coin: { $ne: 0 },
        amount: { $ne: 0 },
        userId: userId,
        ...dateFilterQuery,
      }).sort({ createdAt: -1 }),
    ]);

    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "User does not found." });
    }

    if (user.isBlock) {
      return res
        .status(200)
        .json({ status: false, message: "you are blocked by admin!" });
    }

    return res.status(200).json({
      status: true,
      message: "Retrive wallet history for that user.",
      total: user.totalEarningAmount || 0,
      data: walletHistory,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Internal Server Error" });
  }
};

// become influencer
exports.becomeInfluencer = async (req, res) => {
  try {
    const userId = req.query.userId || req.body.userId;
    const influencerName = req.body.influencerName;
    const influencerType = req.body.influencerType;
    const socialMediaLink = req.body.socialMediaLink || "";
    const influencerImages = Array.isArray(req.body.influencerImages) ? req.body.influencerImages : [];
    const productLink = req.body.productLink || "";
    const productImages = Array.isArray(req.body.productImages) ? req.body.productImages : [];

    if (!userId || !influencerName || !influencerType) {
      return res.status(200).json({
        status: false,
        message: "Please fill up all required details (Name and Type)!",
      });
    }

    if (influencerImages.length < 2 || influencerImages.length > 5) {
      return res.status(200).json({
        status: false,
        message: "Please upload minimum 2 and maximum 5 images for 'Upload your image'!",
      });
    }

    if (productImages.length > 5) {
      return res.status(200).json({
        status: false,
        message: "Maximum 5 product images are allowed!",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(200).json({ status: false, message: "Invalid user ID!" });
    }

    const user = await User.findOne({ _id: userId, isActive: true });
    if (!user) {
      return res.status(200).json({ status: false, message: "User not found!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "You are blocked by admin!" });
    }

    // Determine coin cost by influencer type
    // Creator: 100, Celebrity: 499, Businessman: 999
    let requiredCoins = 100;
    const normalizedType = influencerType.trim();
    if (normalizedType.toLowerCase() === "creator") {
      requiredCoins = 100;
    } else if (normalizedType.toLowerCase() === "celebrity") {
      requiredCoins = 499;
    } else if (normalizedType.toLowerCase() === "businessman") {
      requiredCoins = 999;
    } else {
      requiredCoins = 100;
    }

    const userPurchasedCoin = user.purchasedCoin || 0;
    if (userPurchasedCoin <= 0) {
      return res.status(200).json({
        status: false,
        message: `Your purchased coin balance is empty! You must have purchased coins to become a ${normalizedType} influencer.`,
        requiredCoins: requiredCoins,
        purchasedCoin: userPurchasedCoin,
      });
    }

    if (userPurchasedCoin < requiredCoins) {
      return res.status(200).json({
        status: false,
        message: `Insufficient purchased coins! You need ${requiredCoins} purchased coins to become a ${normalizedType}. You currently have ${userPurchasedCoin} purchased coins.`,
        requiredCoins: requiredCoins,
        purchasedCoin: userPurchasedCoin,
      });
    }

    // Deduct strictly from purchasedCoin and update influencer status
    user.purchasedCoin = Math.max(0, user.purchasedCoin - requiredCoins);
    user.coin = Math.max(0, (user.purchasedCoin || 0) + (user.earnedCoin || 0));
    user.isInfluencer = true;
    user.influencerName = influencerName.trim();
    user.influencerType = normalizedType;
    user.influencerSocialLink = (socialMediaLink || "").trim();
    user.influencerImages = influencerImages;
    user.influencerProductLink = (productLink || "").trim();
    user.influencerProductImages = productImages;
    if (req.body.isSharePhoneNumber !== undefined) {
      user.isSharePhoneNumber = Boolean(req.body.isSharePhoneNumber);
    }

    if (user.socialMediaLinks && socialMediaLink && socialMediaLink.trim().length > 0) {
      if (!user.socialMediaLinks.instagramLink) {
        user.socialMediaLinks.instagramLink = socialMediaLink.trim();
      }
    }

    const uniqueId = await generateHistoryUniqueId();
    await Promise.all([
      user.save(),
      new History({
        userId: user._id,
        uniqueId: uniqueId,
        coin: requiredCoins,
        type: 11, // BECOME_INFLUENCER
        date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      }).save(),
    ]);

    return res.status(200).json({
      status: true,
      message: `Congratulations ${influencerName.trim()}! You are now a verified ${normalizedType} Influencer 🎉`,
      user: user,
      deductedCoins: requiredCoins,
      remainingCoins: user.coin,
    });
  } catch (error) {
    console.error("becomeInfluencer error:", error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

// get influencers filtered by active tab
exports.getInfluencers = async (req, res) => {
  try {
    const userId = req.query.userId;
    const tab = req.query.tab || "All"; // All, Influencer, Celebrity, Businessman, Trending, Popular
    const search = req.query.search ? req.query.search.trim() : "";

    let query = { isActive: true, isBlock: false };

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      query._id = { $ne: new mongoose.Types.ObjectId(userId) };
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { influencerName: { $regex: search, $options: "i" } },
        { nickName: { $regex: search, $options: "i" } },
        { country: { $regex: search, $options: "i" } },
      ];
    }

    let sort = { createdAt: -1 };
    const normalizedTab = tab.trim().toLowerCase();

    if (normalizedTab === "influencer") {
      query.$or = [
        { isInfluencer: true, influencerType: { $in: [/^creator$/i, /^influencer$/i, ""] } },
        { isInfluencer: true },
      ];
    } else if (normalizedTab === "celebrity") {
      query.$or = [
        { isInfluencer: true, influencerType: /^celebrity$/i },
        { "plan.productKey": /^celebrity/i },
        { "plan.amount": 1499 },
      ];
    } else if (normalizedTab === "businessman") {
      query.$or = [
        { isInfluencer: true, influencerType: /^businessman$/i },
        { "plan.productKey": /^business/i },
        { "plan.amount": 1999 },
      ];
    } else if (normalizedTab === "trending") {
      query.isInfluencer = true;
      sort = { referralCount: -1, coin: -1, totalWatchTime: -1 };
    } else if (normalizedTab === "popular") {
      sort = { coin: -1, totalWatchTime: -1, createdAt: -1 };
    }

    let users = await User.find(query)
      .select(
        "_id fullName nickName image email mobileNumber country isInfluencer isSharePhoneNumber influencerName influencerType influencerSocialLink influencerImages influencerProductLink influencerProductImages isVerified channelId descriptionOfChannel coin totalWatchTime referralCount createdAt"
      )
      .sort(sort)
      .limit(100);

    if (users.length === 0 && (normalizedTab === "all" || normalizedTab === "trending" || normalizedTab === "popular")) {
      delete query.isInfluencer;
      delete query.$or;
      users = await User.find(query)
        .select(
          "_id fullName nickName image email mobileNumber country isInfluencer isSharePhoneNumber influencerName influencerType influencerSocialLink influencerImages influencerProductLink influencerProductImages isVerified channelId descriptionOfChannel coin totalWatchTime referralCount createdAt"
        )
        .sort(sort)
        .limit(50);
    }

    const influencersWithFollowers = await Promise.all(
      users.map(async (u) => {
        const uObj = u.toObject ? u.toObject() : { ...u };
        const count = await UserWiseSubscription.countDocuments({
          $or: [{ channelId: u._id.toString() }, { channelId: u.channelId || "NONE" }],
        });
        uObj.followerCount = count || 0;
        return uObj;
      })
    );

    return res.status(200).json({
      status: true,
      message: "Influencers retrieved successfully",
      influencers: influencersWithFollowers,
    });
  } catch (error) {
    console.error("getInfluencers error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// Check follow status of an influencer
exports.checkFollowStatus = async (req, res) => {
  try {
    const { userId, influencerId } = req.query;
    if (!userId || !influencerId) {
      return res.status(200).json({
        status: false,
        message: "userId and influencerId are required",
      });
    }

    const influencer = await User.findById(influencerId);
    if (!influencer) {
      return res.status(200).json({
        status: false,
        message: "Influencer not found",
      });
    }

    // Determine follow cost dynamically based on influencer type
    const rawType = (influencer.influencerType || "").toString().trim().toLowerCase();
    let followCost = 500;
    if (rawType === "celebrity") {
      followCost = 1000;
    } else if (rawType === "businessman") {
      followCost = 2000;
    } else {
      followCost = 500;
    }

    const followRecord = await UserWiseSubscription.findOne({
      userId: userId,
      channelId: influencerId,
    });

    const isFollowed = !!followRecord;
    const followerCount = await UserWiseSubscription.countDocuments({
      $or: [{ channelId: influencer._id.toString() }, { channelId: influencer.channelId || "NONE" }],
    });
    const canSharePhone = influencer.isSharePhoneNumber !== false;

    return res.status(200).json({
      status: true,
      isFollowed: isFollowed,
      followerCount: followerCount || 0,
      followCost: followCost,
      influencerType: influencer.influencerType || "Creator",
      isSharePhoneNumber: canSharePhone,
      email: isFollowed ? influencer.email : undefined,
      mobileNumber: (isFollowed && canSharePhone) ? influencer.mobileNumber : undefined,
      influencerSocialLink: isFollowed ? influencer.influencerSocialLink : undefined,
      influencerImages: influencer.influencerImages || [],
      influencerProductLink: influencer.influencerProductLink || "",
      influencerProductImages: influencer.influencerProductImages || [],
    });
  } catch (error) {
    console.error("checkFollowStatus error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// Follow an influencer with dynamic coin deduction & permanent unlock
exports.followInfluencer = async (req, res) => {
  try {
    const { userId, influencerId } = req.body;
    if (!userId || !influencerId) {
      return res.status(200).json({
        status: false,
        message: "userId and influencerId are required",
      });
    }

    const user = await User.findById(userId);
    const influencer = await User.findById(influencerId);

    if (!user || !influencer) {
      return res.status(200).json({
        status: false,
        message: "User or Influencer not found",
      });
    }

    const followerCount = await UserWiseSubscription.countDocuments({
      $or: [{ channelId: influencer._id.toString() }, { channelId: influencer.channelId || "NONE" }],
    });
    const canSharePhone = influencer.isSharePhoneNumber !== false;

    // Check if already followed (permanent follow)
    const existingFollow = await UserWiseSubscription.findOne({
      userId: user._id,
      channelId: influencer._id.toString(),
    });

    if (existingFollow) {
      return res.status(200).json({
        status: true,
        message: "Already following this influencer! Details are permanently unlocked.",
        isFollowed: true,
        followerCount: followerCount || 0,
        isSharePhoneNumber: canSharePhone,
        email: influencer.email,
        mobileNumber: canSharePhone ? influencer.mobileNumber : undefined,
        influencerSocialLink: influencer.influencerSocialLink,
        influencerImages: influencer.influencerImages || [],
        influencerProductLink: influencer.influencerProductLink || "",
        influencerProductImages: influencer.influencerProductImages || [],
      });
    }

    // Determine coin cost by influencer type:
    // Creator: 500 Coins, Celebrity: 1000 Coins, Businessman: 2000 Coins
    const rawType = (influencer.influencerType || "").toString().trim().toLowerCase();
    let followCost = 500;
    if (rawType === "celebrity") {
      followCost = 1000;
    } else if (rawType === "businessman") {
      followCost = 2000;
    } else {
      followCost = 500;
    }

    const userPurchasedCoin = user.purchasedCoin || 0;
    if (userPurchasedCoin <= 0) {
      return res.status(200).json({
        status: false,
        message: `Your purchased coin balance is empty! You must have purchased coins to follow this ${influencer.influencerType || "Creator"}.`,
        requiredCoins: followCost,
        purchasedCoin: userPurchasedCoin,
      });
    }

    if (userPurchasedCoin < followCost) {
      return res.status(200).json({
        status: false,
        message: `Insufficient purchased coins! You need ${followCost} purchased coins to follow this ${influencer.influencerType || "Creator"}. You currently have ${userPurchasedCoin} purchased coins.`,
        requiredCoins: followCost,
        purchasedCoin: userPurchasedCoin,
      });
    }

    // Deduct strictly from user's purchasedCoin
    user.purchasedCoin = Math.max(0, user.purchasedCoin - followCost);
    user.coin = Math.max(0, (user.purchasedCoin || 0) + (user.earnedCoin || 0));

    // Influencer receives the follow coins into earnedCoin
    influencer.earnedCoin = (influencer.earnedCoin || 0) + followCost;
    influencer.coin = (influencer.purchasedCoin || 0) + (influencer.earnedCoin || 0);

    const uniqueId1 = await generateHistoryUniqueId();
    const uniqueId2 = await generateHistoryUniqueId();

    const newFollow = new UserWiseSubscription({
      userId: user._id,
      channelId: influencer._id.toString(),
      isPublic: false,
    });

    await Promise.all([
      user.save(),
      influencer.save(),
      newFollow.save(),
      new History({
        userId: user._id,
        uniqueId: uniqueId1,
        coin: followCost,
        type: 10, // UNLOCK_SUBSCRIPTION
        date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      }).save(),
      new History({
        userId: influencer._id,
        uniqueId: uniqueId2,
        coin: followCost,
        type: 10,
        date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      }).save(),
    ]);

    const updatedFollowerCount = await UserWiseSubscription.countDocuments({
      $or: [{ channelId: influencer._id.toString() }, { channelId: influencer.channelId || "NONE" }],
    });

    return res.status(200).json({
      status: true,
      isFollowed: true,
      followerCount: updatedFollowerCount || 0,
      message: `Successfully followed and permanently unlocked ${influencer.influencerName || influencer.fullName}! 🎉`,
      isSharePhoneNumber: canSharePhone,
      email: influencer.email,
      mobileNumber: canSharePhone ? influencer.mobileNumber : undefined,
      influencerSocialLink: influencer.influencerSocialLink,
      influencerImages: influencer.influencerImages || [],
      influencerProductLink: influencer.influencerProductLink || "",
      influencerProductImages: influencer.influencerProductImages || [],
      deductedCoins: followCost,
      remainingCoins: user.coin,
    });
  } catch (error) {
    console.error("followInfluencer error:", error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};



