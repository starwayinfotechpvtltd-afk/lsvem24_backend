const PremiumPlan = require("../../models/premiumPlan.model");

//import model
const User = require("../../models/user.model");
const PremiumPlanHistory = require("../../models/premiumPlanHistory.model");
const History = require("../../models/history.model");
const CoinPlanHistory = require("../../models/coinplanHistory.model");

//moment
const moment = require("moment");

const mongoose = require("mongoose");

//get all premiumPlan for user (isActive)
exports.index = async (req, res) => {
  try {
    const premiumPlan = await PremiumPlan.find({ isActive: true }).sort({
      validityType: 1,
      validity: 1,
    });

    return res
      .status(200)
      .json({ status: true, message: "Success", premiumPlan });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//when user purchase the premiumPlan create premiumPlan history by user
exports.createHistory = async (req, res) => {
  try {
    if (
      !req.body.userId ||
      !req.body.premiumPlanId ||
      !req.body.paymentGateway
    ) {
      return res.json({ status: false, message: "Oops ! Invalid details." });
    }

    const [user, premiumPlan] = await Promise.all([
      User.findOne({ _id: req.body.userId, isActive: true }),
      PremiumPlan.findById(req.body.premiumPlanId),
    ]);

    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "user does not found." });
    }

    if (user.isBlock) {
      return res
        .status(200)
        .json({ status: false, message: "you are blocked by admin!" });
    }

    if (!premiumPlan) {
      return res
        .status(200)
        .json({ status: false, message: "PremiumPlan does not found." });
    }

    const currentDate = new Date();

    let planEndDate = new Date(currentDate);

    if (premiumPlan.validityType === "day") {
      planEndDate.setDate(planEndDate.getDate() + premiumPlan.validity);
    } else if (premiumPlan.validityType === "month") {
      planEndDate.setDate(planEndDate.getDate() + premiumPlan.validity * 30);
    } else if (premiumPlan.validityType === "year") {
      planEndDate.setFullYear(planEndDate.getFullYear() + premiumPlan.validity);
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
    history.paymentGateway = req.body.paymentGateway; //(razorPay or stripe)
    history.date = moment().toISOString();

    await Promise.all([user.save(), history.save()]);

    return res.status(200).json({
      status: true,
      message:
        "When user purchase the premiumPlan created premiumPlan history!",
      history: history,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//get premiumPlanHistory of particular user (user)
exports.planHistoryOfUser = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res
        .status(200)
        .json({ status: false, message: "userId must be required." });
    }

    const [user, history] = await Promise.all([
      User.findById(req.query.userId),
      PremiumPlanHistory.aggregate([
        {
          $match: { userId: req.query.userId },
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
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $project: {
            paymentGateway: 1,
            premiumPlanId: 1,
            userId: 1,
            fullName: "$user.fullName",
            nickName: "$user.nickName",
            image: "$user.image",
            planStartDate: "$user.plan.planStartDate",
            planEndDate: "$user.plan.planEndDate",
            amount: "$user.plan.amount",
            validity: "$user.plan.validity",
            validityType: "$user.plan.validityType",
            planBenefit: "$user.plan.planBenefit",
          },
        },
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
      .json({ status: true, message: "Success", planHistory: history });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//get coinPlanHistory of particular user (user)
exports.fetchCoinplanHistoryOfUser = async (req, res) => {
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
            type: 8,
            userId: userId,
          },
        },
        {
          $project: {
            _id: 1,
            type: 1,  
            coin: 1,
            uniqueId: 1,
            paymentGateway: 1,
            date: 1,
            amount: 1,
            createdAt: 1,
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
