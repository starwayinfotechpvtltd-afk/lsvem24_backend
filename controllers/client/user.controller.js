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
const { checkPremiumExpiry } = require("../../util/checkPremiumExpiry");

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
    if (user) {
      await checkPremiumExpiry(user);
    }
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

      console.log(
        "settingJSON.loginRewardCoins =",
        settingJSON.loginRewardCoins,
      );
      console.log("bonusCoins =", bonusCoins);
      console.log("typeof bonusCoins =", typeof bonusCoins);
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
          const adminPromise = await admin;
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
    await checkPremiumExpiry(user);

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
      return res.status(200).json({
        status: false,
        message: "Your account has been blocked by the administrator.",
      });
    }

    if (user.referralCode === referralCode.trim()) {
      return res.status(200).json({
        status: false,
        message: "You cannot use your own referral code.",
      });
    }

    if (!referralCodeUser) {
      return res.status(200).json({
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
              $set: { isReferral: true, referredBy: referralCodeUser._id },
            },
            { new: true },
          ),
          User.findOneAndUpdate(
            { _id: referralCodeUser._id },
            {
              $inc: {
                coin: settingJSON?.referralRewardCoins,
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
      return res.status(200).json({
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

    console.log("Handle ad watch reword called");

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

    return res.status(200).json({
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
    if (!req.query.userId || !req.query.videoId || !req.query.totalWatchTime) {
      return res
        .status(200)
        .json({ status: false, message: "Oops ! Invalid details!" });
    }

    const coinEarned = Number(settingJSON?.watchingVideoRewardCoins || 0);

    if (!Number.isFinite(coinEarned)) {
      return res.status(200).json({
        status: false,
        message: "Invalid watchingVideoRewardCoins setting",
      });
    }
    console.log("coinEarned ", coinEarned);

    const totalWatchTime = Number(req.query.totalWatchTime);
    if (!Number.isFinite(totalWatchTime) || totalWatchTime <= 0) {
      return res.status(200).json({
        status: false,
        message: "Invalid watch time!",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(req.query.userId) ||
      !mongoose.Types.ObjectId.isValid(req.query.videoId)
    ) {
      return res.status(200).json({
        status: false,
        message: "Invalid userId or videoId",
      });
    }

    const userId = new mongoose.Types.ObjectId(req.query.userId);
    const videoId = new mongoose.Types.ObjectId(req.query.videoId);

    const [uniqueId, user, video, alreadyVideoWatchReward] = await Promise.all([
      generateHistoryUniqueId(),
      User.findOne({ _id: userId, isActive: true }),
      Video.findOne({ _id: videoId }),
      VideoWatchReward.findOne({
        userId: userId,
        videoId: videoId,
      }),
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

    if (alreadyVideoWatchReward) {
      return res.status(200).json({
        status: true,
        message: "Reward already earned by that user!",
      });
    }

    if (!video) {
      return res.status(200).json({
        status: false,
        message: "Video not found!",
      });
    }

    await Promise.all([
      VideoWatchReward.create({
        userId,
        videoId,
        videoUserId: video.userId,
        videoChannelId: video.channelId,
        totalWatchTime,
      }),

      User.findOneAndUpdate(
        { _id: user._id },
        {
          $inc: {
            coin: coinEarned,
          },
        },
        { new: true },
      ),

      History.create({
        userId: user._id,
        uniqueId,
        coin: coinEarned,
        type: 5,
        date: new Date().toLocaleString("en-US", {
          timeZone: "Asia/Kolkata",
        }),
      }),
    ]);

    return res.status(200).json({
      status: true,
      message: "Coin earned successfully.",
    });
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
        return res.status(200).json({
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
          return res.status(200).json({
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

      user.channelType = parseInt(req?.body?.channelType) || 1;
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
        return res.status(200).json({
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
          return res.status(200).json({
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
      user.channelType = parseInt(req?.body?.channelType) || 1;
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
      return res.status(500).json({
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

    if (req.body.fullName) {
      const newChannelName = req.body.fullName.trim();

      // Only check if the user is changing the channel name
      if (newChannelName !== user.fullName) {
        const isDuplicateFullName = await User.findOne({
          _id: { $ne: user._id }, // Ignore the current user
          fullName: {
            $regex: `^${newChannelName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            $options: "i",
          },
        });

        if (isDuplicateFullName) {
          return res.status(200).json({
            status: false,
            message: "Channel name already exists. Please use another name.",
          });
        }

        user.fullName = newChannelName;
      }
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

    console.log("Get profile: ", req.query.userId);

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

      return res.status(200).json({
        status: true,
        message: "Profile of the user updated by admin!",
        user: updateUser,
      });
    }

    if (!user.isMonetization) {
      console.log("check monetization in get user profile API");

      const updateUser = await monetizationEnabled(user._id);
      return res.status(200).json({
        status: true,
        message: "Retrive profile of the user.",
        user: updateUser,
      });
    }

    return res.status(200).json({
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
    if (
      !req.query.channelId ||
      // !req.query.userId ||
      !req.query.start ||
      !req.query.limit
    ) {
      return res
        .status(200)
        .json({ status: false, message: "Oops ! Invalid details." });
    }

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    // const userId = new mongoose.Types.ObjectId(req.query.userId);
    const channelId = req.query.channelId.toString();

    const [
      channel,
      // user,
      totalVideosOfChannel,
      isSubscribedChannel,
      totalSubscribers,
      data,
    ] = await Promise.all([
      User.findOne({ channelId: channelId }),
      // User.findOne({ _id: userId, isActive: true }),
      Video.countDocuments({ channelId: channelId }),
      UserWiseSubscription.findOne({ channelId: channelId }), // userId: userId,
      UserWiseSubscription.countDocuments({ channelId: channelId }),
      Video.aggregate([
        {
          $match: {
            channelId: channelId,
            scheduleType: 2,
            visibilityType: 1,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "channelId",
            foreignField: "channelId",
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
            from: "userwisesubscriptions",
            let: {
              channelId: "$channel.channelId",
              // userId: userId,
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$channelId", "$$channelId"] },
                      // { $eq: ["$userId", "$$userId"] },
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
            from: "watchhistories",
            localField: "_id",
            foreignField: "videoId",
            as: "views",
          },
        },
        {
          $lookup: {
            from: "savetowatchlaters",
            let: { videoId: "$_id" }, // , userId: userId
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$videoId", "$$videoId"] },
                      // { $eq: ["$userId", "$$userId"] },
                    ],
                  },
                },
              },
            ],
            as: "isSaveToWatchLater",
          },
        },
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
            channelType: "$channel.channelType",
            subscriptionCost: "$channel.subscriptionCost",
            videoUnlockCost: "$channel.videoUnlockCost",
            views: { $size: "$views" },
            isSubscribed: {
              $cond: [{ $eq: [{ $size: "$isSubscribed" }, 0] }, false, true],
            },
            isSaveToWatchLater: {
              $cond: [
                { $eq: [{ $size: "$isSaveToWatchLater" }, 0] },
                false,
                true,
              ],
            },
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: (start - 1) * limit },
        { $limit: limit },
      ]),
    ]);

    if (!channel) {
      return res
        .status(200)
        .json({ status: false, message: "channel does not found!" });
    }

    // if (!user) {
    //   return res
    //     .status(200)
    //     .json({ status: false, message: "User does not found!" });
    // }

    // if (user.isBlock) {
    //   return res
    //     .status(200)
    //     .json({ status: false, message: "you are blocked by admin!" });
    // }

    const [
      isSubscribed,
      channelName,
      channelImage,
      channelType,
      subscriptionCost,
      videoUnlockCost,
    ] = await Promise.all([
      isSubscribedChannel ? true : false,
      channel.fullName,
      channel.image,
      channel.channelType,
      channel.subscriptionCost,
      channel.videoUnlockCost,
    ]);

    let now = dayjs();
    const channelData = data?.map((data) => ({
      ...data,
      time:
        now.diff(data.createdAt, "minute") === 0
          ? "Just Now"
          : now.diff(data.createdAt, "minute") <= 60 &&
              now.diff(data.createdAt, "minute") >= 0
            ? now.diff(data.createdAt, "minute") + " minutes ago"
            : now.diff(data.createdAt, "hour") >= 24
              ? now.diff(data.createdAt, "day") >= 365
                ? Math.floor(now.diff(data.createdAt, "day") / 365) +
                  " years ago"
                : now.diff(data.createdAt, "day") >= 30
                  ? Math.floor(now.diff(data.createdAt, "day") / 30) +
                    " months ago"
                  : now.diff(data.createdAt, "day") >= 7
                    ? Math.floor(now.diff(data.createdAt, "day") / 7) +
                      " weeks ago"
                    : now.diff(data.createdAt, "day") + " days ago"
              : now.diff(data.createdAt, "hour") + " hours ago",
    }));

    return res.status(200).json({
      status: true,
      message: "Retrive particular channel's details.",
      totalVideosOfChannel: totalVideosOfChannel,
      totalSubscribers: totalSubscribers,
      isSubscribed: isSubscribed,
      channelName: channelName,
      channelImage: channelImage,
      channelType: channelType,
      subscriptionCost: subscriptionCost,
      videoUnlockCost: videoUnlockCost,
      detailsOfChannel: channelData.length > 0 ? channelData : [],
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
      !req.query.userId ||
      !req.query.channelId ||
      !req.query.videoType ||
      !req.query.start ||
      !req.query.limit
    ) {
      return res
        .status(200)
        .json({ status: false, message: "Oops ! Invalid details!!" });
    }

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const userId = new mongoose.Types.ObjectId(req.query.userId);

    const [user, channel, data] = await Promise.all([
      User.findOne({ _id: userId, isActive: true }),
      User.findOne({ channelId: req.query.channelId }),
      Video.aggregate([
        {
          $match: {
            channelId: req.query.channelId,
            videoType: Number(req.query.videoType),
            isActive: true,
            scheduleType: 2,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "channelId",
            foreignField: "channelId",
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
            as: "views",
          },
        },
        {
          $lookup: {
            from: "userwisesubscriptions",
            let: {
              channelId: "$channel.channelId",
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
          $project: {
            title: 1,
            videoType: 1,
            videoTime: 1,
            videoUrl: 1,
            videoImage: 1,
            channelId: 1,
            createdAt: 1,
            videoPrivacyType: 1,
            channelType: "$channel.channelType",
            subscriptionCost: "$channel.subscriptionCost",
            videoUnlockCost: "$channel.videoUnlockCost",
            views: { $size: "$views" },
            isSubscribed: {
              $cond: [{ $eq: [{ $size: "$isSubscribed" }, 0] }, false, true],
            },
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: (start - 1) * limit },
        { $limit: limit },
      ]),
    ]);

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

    if (!channel) {
      return res
        .status(200)
        .json({ status: false, message: "channel does not found!" });
    }

    let now = dayjs();
    const videosTypeWiseOfChannel = data.map((data) => ({
      ...data,
      time:
        now.diff(data.createdAt, "minute") === 0
          ? "Just Now"
          : now.diff(data.createdAt, "minute") <= 60 &&
              now.diff(data.createdAt, "minute") >= 0
            ? now.diff(data.createdAt, "minute") + " minutes ago"
            : now.diff(data.createdAt, "hour") >= 24
              ? now.diff(data.createdAt, "day") >= 365
                ? Math.floor(now.diff(data.createdAt, "day") / 365) +
                  " years ago"
                : now.diff(data.createdAt, "day") >= 30
                  ? Math.floor(now.diff(data.createdAt, "day") / 30) +
                    " months ago"
                  : now.diff(data.createdAt, "day") >= 7
                    ? Math.floor(now.diff(data.createdAt, "day") / 7) +
                      " weeks ago"
                    : now.diff(data.createdAt, "day") + " days ago"
              : now.diff(data.createdAt, "hour") + " hours ago",
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
    if (
      // !req.query.userId ||
      !req.query.channelId ||
      !req.query.start ||
      !req.query.limit
    ) {
      return res
        .status(200)
        .json({ status: false, message: "Oops ! Invalid details." });
    }

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    // const userId = new mongoose.Types.ObjectId(req.query.userId);

    const [channel, data] = await Promise.all([
      // user,
      // User.findOne({ _id: userId, isActive: true }),
      User.findOne({ channelId: req.query.channelId }),
      PlayList.aggregate([
        {
          $match: {
            channelId: req.query.channelId,
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
            from: "userwisesubscriptions",
            let: {
              channelId: "$channel.channelId",
              // userId: userId,
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$channelId", "$$channelId"] },
                      // { $eq: ["$userId", "$$userId"] },
                    ],
                  },
                },
              },
            ],
            as: "isSubscribed",
          },
        },
        {
          $project: {
            channelId: 1,
            // userId: 1,
            playListName: 1,
            playListType: 1,
            channelName: "$channel.fullName",
            channelType: "$channel.channelType",
            subscriptionCost: "$channel.subscriptionCost",
            videoUnlockCost: "$channel.videoUnlockCost",
            videoId: "$video._id",
            videoPrivacyType: "$video.videoPrivacyType",
            videoTitle: "$video.title",
            videoUrl: "$video.videoUrl",
            videoImage: "$video.videoImage",
            videoTime: "$video.videoTime",
            isSubscribed: {
              $cond: [{ $eq: [{ $size: "$isSubscribed" }, 0] }, false, true],
            },
          },
        },
        {
          $group: {
            _id: "$_id",
            channelId: { $first: "$channelId" },
            // userId: { $first: "$userId" },
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
      ]),
    ]);

    // if (!user) {
    //   return res
    //     .status(200)
    //     .json({ status: false, message: "User does not found!" });
    // }

    // if (user.isBlock) {
    //   return res
    //     .status(200)
    //     .json({ status: false, message: "you are blocked by admin!" });
    // }

    if (!channel) {
      return res
        .status(200)
        .json({ status: false, message: "channel does not found." });
    }

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

    const [channel, totalViewsOfthatChannelVideos] = await Promise.all([
      User.findOne({ channelId: req.query.channelId }).select(
        "fullName descriptionOfChannel socialMediaLinks date country channelId",
      ),
      WatchHistory.countDocuments({ videoChannelId: req.query.channelId }),
    ]);

    if (!channel) {
      return res
        .status(200)
        .json({ status: false, message: "channel does not found!" });
    }

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
    if (!req.body.searchString) {
      // || !req.body.userId
      return res.status(200).json({
        status: false,
        message: "Oops ! Invalid details!",
      });
    }

    const searchString = req.body.searchString.trim();
    // const userId = new mongoose.Types.ObjectId(req.body.userId);

    const [channel, response] = await Promise.all([
      // user,
      User.find({ fullName: { $regex: searchString, $options: "i" } }),
      // User.findOne({ _id: userId, isActive: true }),
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
              // userId: userId,
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$channelId", "$$channelId"] },
                      // { $eq: ["$userId", "$$userId"] },
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

    // if (!user) {
    //   return res
    //     .status(200)
    //     .json({ status: false, message: "user does not found!" });
    // }

    // if (user.isBlock) {
    //   return res
    //     .status(200)
    //     .json({ status: false, message: "you are blocked by admin!" });
    // }

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

    return res.status(200).json({
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
