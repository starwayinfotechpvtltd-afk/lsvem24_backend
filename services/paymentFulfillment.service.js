const moment = require("moment");
const mongoose = require("mongoose");

const User = require("../models/user.model");
const PremiumPlan = require("../models/premiumPlan.model");
const PremiumPlanHistory = require("../models/premiumPlanHistory.model");
const CoinPlan = require("../models/coinplan.model");
const CoinPlanHistory = require("../models/coinplanHistory.model");
const History = require("../models/history.model");
const { generateHistoryUniqueId } = require("../util/generateHistoryUniqueId");

async function fulfillPremiumPlan(userId, premiumPlanId) {
  const [user, premiumPlan] = await Promise.all([
    User.findOne({ _id: userId, isActive: true }),
    PremiumPlan.findById(premiumPlanId),
  ]);

  if (!user) {
    throw new Error("User not found.");
  }
  if (user.isBlock) {
    throw new Error("You are blocked by admin.");
  }
  if (!premiumPlan) {
    throw new Error("Premium plan not found.");
  }

  const currentDate = new Date();
  const planEndDate = new Date(currentDate);

  if (premiumPlan.validityType === "month") {
    planEndDate.setMonth(currentDate.getMonth() + premiumPlan.validity);
  } else if (premiumPlan.validityType === "year") {
    planEndDate.setFullYear(currentDate.getFullYear() + premiumPlan.validity);
  }

  user.isPremiumPlan = true;
  user.plan.planStartDate = moment().toISOString();
  user.plan.planEndDate = moment(planEndDate).toISOString();
  user.plan.premiumPlanId = premiumPlan._id;
  user.plan.amount = premiumPlan.amount;
  user.plan.validity = premiumPlan.validity;
  user.plan.validityType = premiumPlan.validityType;
  user.plan.planBenefit = premiumPlan.planBenefit;
  user.plan.productKey = premiumPlan.productKey;

  const history = new PremiumPlanHistory();
  history.userId = user._id;
  history.premiumPlanId = premiumPlan._id;
  history.paymentGateway = "Razorpay";
  history.date = moment().toISOString();

  await Promise.all([user.save(), history.save()]);

  return { history };
}

async function fulfillCoinPlan(userId, coinPlanId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const coinPlanObjectId = new mongoose.Types.ObjectId(coinPlanId);

  const [uniqueId, user, coinPlan] = await Promise.all([
    generateHistoryUniqueId(),
    User.findOne({ _id: userObjectId }),
    CoinPlan.findById(coinPlanObjectId),
  ]);

  if (!user) {
    throw new Error("User not found.");
  }
  if (user.isBlock) {
    throw new Error("You are blocked by admin.");
  }
  if (!coinPlan) {
    throw new Error("Coin plan not found.");
  }

  const history = new CoinPlanHistory();
  history.userId = user._id;
  history.coinplanId = coinPlan._id;
  history.paymentGateway = "Razorpay";
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
      { _id: userObjectId },
      {
        $inc: { coin: totalCoins, purchasedCoin: totalCoins },
        $push: { coinplan: newCoinPlan },
      },
    ),
    history.save(),
    History.create({
      userId: user._id,
      coinplan: coinPlan._id,
      coin: coinPlan.coin,
      amount: coinPlan.amount,
      paymentGateway: "Razorpay",
      uniqueId,
      type: 8,
      date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    }),
  ]);

  return { history };
}

module.exports = { fulfillPremiumPlan, fulfillCoinPlan };
