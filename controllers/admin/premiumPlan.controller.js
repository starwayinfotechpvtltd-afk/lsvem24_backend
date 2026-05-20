const PremiumPlan = require("../../models/premiumPlan.model");

//import model
const PremiumPlanHistory = require("../../models/premiumPlanHistory.model");

//create premiumPlan by admin
exports.store = async (req, res) => {
  try {
    if (!req?.body?.validity || !req?.body?.validityType || !req?.body?.amount || !req?.body?.planBenefit || !req.body.productKey) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!!" });
    }

    const premiumPlan = new PremiumPlan();

    premiumPlan.amount = req?.body?.amount;
    premiumPlan.validity = req?.body?.validity;
    premiumPlan.validityType = req?.body?.validityType;
    premiumPlan.productKey = req?.body?.productKey;
    premiumPlan.planBenefit = req?.body?.planBenefit?.split(",");
    await premiumPlan.save();

    return res.status(200).json({ status: true, message: "finally, plan has been created by the admin.", premiumPlan: premiumPlan });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//update premiumPlan by admin
exports.update = async (req, res) => {
  try {
    const premiumPlan = await PremiumPlan.findById(req.query.premiumPlanId);
    if (!premiumPlan) {
      return res.status(200).json({ status: false, message: "premiumPlan does not found!" });
    }

    premiumPlan.amount = req.body.amount ? req.body.amount : premiumPlan.amount;
    premiumPlan.validity = req.body.validity ? req.body.validity : premiumPlan.validity;
    premiumPlan.validityType = req.body.validityType ? req.body.validityType : premiumPlan.validityType;
    premiumPlan.productKey = req.body.productKey ? req.body.productKey : premiumPlan.productKey;

    const planbenefit = req.body.planBenefit.toString();
    premiumPlan.planBenefit = planbenefit ? planbenefit.split(",") : premiumPlan.planBenefit;
    await premiumPlan.save();

    return res.status(200).json({ status: true, message: "finally, plan has been updated by the admin.", premiumPlan: premiumPlan });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//delete premiumPlan by admin
exports.destroy = async (req, res) => {
  try {
    const premiumPlan = await PremiumPlan.findById(req.query.premiumPlanId);
    if (!premiumPlan) {
      return res.status(200).json({ status: false, message: "premiumPlan does not found." });
    }

    await premiumPlan.deleteOne();

    return res.status(200).json({ status: true, message: "finally, plan has been deleted by the admin." });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//get premiumPlan for admin
exports.index = async (req, res) => {
  try {
    const premiumPlan = await PremiumPlan.find().sort({ validityType: 1, validity: 1 });
    if (!premiumPlan) {
      return res.status(200).json({ status: false, message: "No data found." });
    }

    return res.status(200).json({ status: true, message: "Success", premiumPlan });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//handle activation of premiumPlan
exports.handleisActive = async (req, res) => {
  try {
    if (!req.query.premiumPlanId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!" });
    }

    const premiumPlan = await PremiumPlan.findById(req.query.premiumPlanId);
    if (!premiumPlan) {
      return res.status(200).json({ status: false, message: "premiumPlan does not found!" });
    }

    premiumPlan.isActive = !premiumPlan.isActive;
    await premiumPlan.save();

    return res.status(200).json({ status: true, message: "finally, activation of premiumPlan handled by admin!", premiumPlan });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

//get premiumPlan histories of users (admin earning)
exports.getpremiumPlanHistory = async (req, res) => {
  try {
    if (!req.query.startDate || !req.query.endDate || !req.query.start || !req.query.limit) {
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

    const [totalHistory, adminEarnings, history] = await Promise.all([
      PremiumPlanHistory.countDocuments(),
      PremiumPlanHistory.aggregate([
        {
          $match: dateFilterQuery,
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
            amount: "$user.plan.amount",
          },
        },
        { $group: { _id: null, totalEarnings: { $sum: "$amount" } } },
      ]),
      PremiumPlanHistory.aggregate([
        {
          $match: dateFilterQuery,
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
            userId: 1,
            paymentGateway: 1,
            premiumPlanId: 1,
            createdAt: 1,
            fullName: "$user.fullName",
            nickName: "$user.nickName",
            image: "$user.image",
            amount: "$user.plan.amount",
            validity: "$user.plan.validity",
            validityType: "$user.plan.validityType",
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: (start - 1) * limit },
        { $limit: limit },
      ]),
    ]);

    const totalAdminEarnings = adminEarnings.length > 0 ? adminEarnings[0].totalEarnings : 0;

    return res.status(200).json({
      status: true,
      message: "Success",
      totalAdminEarnings: totalAdminEarnings,
      totalHistory: totalHistory,
      history: history,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};
