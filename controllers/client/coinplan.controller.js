const CoinPlan = require("../../models/coinplan.model");

//import models
const User = require("../../models/user.model");
const History = require("../../models/history.model");
const CoinPlanHistory = require("../../models/coinplanHistory.model");

//mongoose
const mongoose = require("mongoose");

const moment = require("moment");

//generateHistoryUniqueId
const { generateHistoryUniqueId } = require("../../util/generateHistoryUniqueId");

//get coinPlan
exports.retriveCoinplanByUser = async (req, res) => {
  try {
    const coinPlan = await CoinPlan.find({ isActive: true }).sort({ coin: 1, amount: 1 });

    return res.status(200).json({
      status: true,
      message: "Retrive CoinPlan Successfully",
      data: coinPlan,
    });
  } catch {
    console.error(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server error" });
  }
};

//when user purchase the coinPlan create coinPlan history by user
exports.createCoinPlanHistory = async (req, res) => {
  try {
    if (!req.body.userId || !req.body.coinPlanId || !req.body.paymentGateway) {
      return res.json({ status: false, message: "Oops ! Invalid details." });
    }

    const userId = new mongoose.Types.ObjectId(req.body.userId);
    const coinPlanId = new mongoose.Types.ObjectId(req.body.coinPlanId);
    const paymentGateWay = req.body.paymentGateway.trim();

    const [uniqueId, user, coinPlan] = await Promise.all([generateHistoryUniqueId(), User.findOne({ _id: userId }), CoinPlan.findById(coinPlanId)]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found." });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    if (!coinPlan) {
      return res.status(200).json({ status: false, message: "CoinPlan does not found." });
    }

    res.status(200).json({
      status: true,
      message: "When user purchase the coinPlan created coinPlan history!",
    });

    const history = new CoinPlanHistory();
    history.userId = user._id;
    history.coinplanId = coinPlan._id;
    history.paymentGateway = paymentGateWay; //(razorPay or stripe)
    history.date = moment().toISOString();

    const newCoinPlan = {
      amount: coinPlan.amount,
      coin: coinPlan.coin,
      extraCoin: coinPlan.extraCoin,
      purchasedAt: new Date(),
    };

    const totalCoins = coinPlan.coin + coinPlan.extraCoin;

    await Promise.all([
      User.updateOne(
        { _id: userId },
        {
          $inc: {
            coin: totalCoins,
            purchasedCoin: totalCoins,
          },
          $push: {
            coinplan: newCoinPlan,
          },
        }
      )
        .then((result) => {
          console.log("User successfully purchased new coin plan:", result.purchasedCoin);
        })
        .catch((err) => {
          console.error("Error purchasing new coin plan:", err);
        }),
      history.save(),
      History.create({
        userId: user._id,
        coinplan: coinPlan._id,
        coin: coinPlan.coin,
        amount: coinPlan.amount,
        paymentGateway: paymentGateWay,
        uniqueId: uniqueId,
        type: 8,
        date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      }),
    ]);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};
