const WithDrawRequest = require("../../models/withDrawRequest.model");

//import model
const User = require("../../models/user.model");
const WalletHistory = require("../../models/walletHistory.model");

//private key
const admin = require("../../util/privateKey");

//mongoose
const mongoose = require("mongoose");

//generateHistoryUniqueId
const { generateHistoryUniqueId } = require("../../util/generateHistoryUniqueId");

//get setting details
exports.fetchSettingDetails = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!" });
    }

    const userId = new mongoose.Types.ObjectId(req.query.userId);

    const user = await User.findOne({ _id: userId, isActive: true });
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found." });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    const data = {
      coin: user.coin || 0,
      purchasedCoin: user.purchasedCoin || 0,
      earnedCoin: user.earnedCoin || 0,
      minCoinForCashOut: settingJSON.minCoinForCashOut,
      minConvertCoin: settingJSON.minConvertCoin,
      minWithdrawalRequestedAmount: settingJSON.minWithdrawalRequestedAmount,
      referralRewardCoins: settingJSON.referralRewardCoins,
      watchingVideoRewardCoins: settingJSON.watchingVideoRewardCoins,
      commentingRewardCoins: settingJSON.commentingRewardCoins,
      likeVideoRewardCoins: settingJSON.likeVideoRewardCoins,
      currency: settingJSON.currency,
    };

    return res.status(200).json({
      status: true,
      message: "Success",
      data: data,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//convert coin into amount at a time wallet history created and coin has been deducted (in default currency)
exports.coinToAmountConverter = async (req, res) => {
  try {
    if (!req.query.coin || !req.query.userId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    if (!settingJSON) {
      return res.status(200).json({ status: false, message: "Setting does not found." });
    }

    const userId = new mongoose.Types.ObjectId(req.query.userId);
    const coin = parseInt(req.query.coin);

    if (isNaN(coin) || coin <= 0) {
      return res.status(200).json({ status: false, message: "Please enter a valid coin amount." });
    }

    // Rate: 100,000 earned coin = 1,000 wallet money (100 earned coin = 1 wallet money)
    const rate = settingJSON.minCoinForCashOut && settingJSON.minCoinForCashOut > 0 ? settingJSON.minCoinForCashOut : 100;
    const amount = Math.floor(coin / rate);

    if (amount <= 0) {
      return res.status(200).json({
        status: false,
        message: `Minimum ${rate} earned coins required to convert to 1 wallet money.`,
      });
    }

    console.log("Coin:", coin);
    console.log("minCoinForCashOut rate:", rate);
    console.log("Rounded wallet amount:", amount);

    const [user, uniqueId] = await Promise.all([User.findOne({ _id: userId, isActive: true }), generateHistoryUniqueId()]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found." });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    // Rule: User can only transfer EARNED coin to wallet money
    const userEarnedCoin = user.earnedCoin || 0;
    if (coin > userEarnedCoin) {
      return res.status(200).json({
        status: false,
        message: "Insufficient earned coins. Only earned coins can be transferred to wallet money.",
      });
    }

    const minConvert = settingJSON.minConvertCoin || 100;
    if (coin < minConvert) {
      return res.status(200).json({
        status: false,
        message: `Minimum ${minConvert} earned coins required to transfer to wallet.`,
      });
    }

    // Deduct strictly from earnedCoin and total coin, credit to totalEarningAmount (wallet money)
    const [updatedUser, historyEntry] = await Promise.all([
      User.findOneAndUpdate(
        { _id: user._id, earnedCoin: { $gte: coin } },
        {
          $inc: {
            coin: -Math.abs(coin),
            earnedCoin: -Math.abs(coin),
            totalEarningAmount: amount,
          },
        },
        { new: true }
      ),
      WalletHistory({
        userId: user._id,
        uniqueId: uniqueId,
        coin: coin,
        amount: amount,
        type: 2,
        date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      }).save(),
    ]);

    if (!updatedUser) {
      return res.status(200).json({
        status: false,
        message: "Failed to transfer earned coins. Please try again.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Earned coins successfully transferred to wallet money.",
      data: amount,
      totalEarningAmount: updatedUser.totalEarningAmount || 0,
      earnedCoin: updatedUser.earnedCoin || 0,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};

//Withdraw request made by particular user (earning from monetization OR earning from coin conversion)
exports.createWithdrawRequest = async (req, res) => {
  try {
    if (!req.body.userId || !req.body.requestAmount || !req.body.paymentGateway || !req.body.paymentDetails) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!" });
    }

    const requestAmount = parseInt(req.body.requestAmount); //remove decimal points

    const [user, uniqueId] = await Promise.all([User.findOne({ _id: req.body.userId, isActive: true }), generateHistoryUniqueId()]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found." });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    if (!settingJSON) {
      return res.status(200).json({
        status: false,
        message: "Setting does not found!",
      });
    }

    if (requestAmount > parseInt(user.totalEarningAmount)) {
      return res.status(200).json({
        status: false,
        message: "The user does not have sufficient funds to make the withdrawal.",
      });
    }

    if (requestAmount < settingJSON.minWithdrawalRequestedAmount) {
      return res.status(200).json({
        status: false,
        message: "Oops ! withdrawal request amount must be greater than specified by the admin.",
      });
    }

    const [pendingExistRequest, declinedExistRequest] = await Promise.all([WithDrawRequest.findOne({ userId: user._id, status: 1 }), WithDrawRequest.findOne({ userId: user._id, status: 3 })]);

    if (pendingExistRequest) {
      return res.status(200).json({ status: true, message: "Withdrawal request already send by you to admin.", withDrawRequest: pendingExistRequest });
    } else if (declinedExistRequest) {
      await declinedExistRequest.deleteOne();

      const saveRequest = await WithDrawRequest.create({
        userId: user._id,
        channelId: user.channelId,
        channelName: user.fullName,
        requestAmount: requestAmount,
        paymentGateway: req.body.paymentGateway?.trim(),
        paymentDetails: req.body.paymentDetails.map((detail) => detail.replace("[", "").replace("]", "")),
        uniqueId: uniqueId,
        requestDate: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      });

      res.status(200).json({
        status: true,
        message: "Withdrawal request already declined by admin and new request has been created.",
        withDrawRequest: saveRequest,
      });

      //checks if the user has an fcmToken
      if (user.fcmToken && user.fcmToken !== null) {
        const adminPromise = await admin;

        const payload = {
          token: user.fcmToken,
          notification: {
            title: "🔔 Withdrawal Request Submitted! 🔔",
            body: "Your withdrawal request has been successfully created. We will process it shortly. Thank you for using our service!",
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
    } else {
      const saveRequest = await WithDrawRequest.create({
        userId: user._id,
        channelId: user.channelId,
        channelName: user.fullName,
        requestAmount: requestAmount,
        paymentGateway: req.body.paymentGateway?.trim(),
        paymentDetails: req.body.paymentDetails.map((detail) => detail.replace("[", "").replace("]", "")),
        uniqueId: uniqueId,
        requestDate: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      });

      res.status(200).json({ status: true, message: "Withdrawal request send to admin.", withDrawRequest: saveRequest });

      //checks if the user has an fcmToken
      if (user.fcmToken && user.fcmToken !== null) {
        const adminPromise = await admin;

        const payload = {
          token: user.fcmToken,
          notification: {
            title: "🔔 Withdrawal Request Submitted! 🔔",
            body: "Your withdrawal request has been successfully created. We will process it shortly. Thank you for using our service!",
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
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

//get all withdraw request by particular user
exports.getWithdrawRequests = async (req, res) => {
  try {
    if (!req.query.startDate || !req.query.endDate || !req.query.userId) {
      return res.status(200).json({ status: false, message: "Oops! Invalid details!" });
    }

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

    const [user, WithDrawRequests] = await Promise.all([
      User.findOne({ _id: req.query.userId, isActive: true }),
      WithDrawRequest.find({ userId: req.query.userId, ...dateFilterQuery }).sort({ createdAt: -1 }),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found." });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    if (!WithDrawRequests) {
      return res.status(200).json({ status: false, message: "WithDrawRequests does not found for that user." });
    }

    return res.status(200).json({
      status: true,
      message: "Retrive withdraw requests for that user.",
      WithDrawRequests: WithDrawRequests,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};
