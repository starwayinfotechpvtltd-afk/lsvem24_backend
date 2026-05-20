const CoinPlan = require("../../models/coinplan.model");
const History = require("../../models/history.model");

//create coinplan
exports.store = async (req, res) => {
  try {
    if (!req.body.coin || !req.body.extraCoin || !req.body.amount || !req.body.productKey) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    const { coin, extraCoin, amount, productKey } = req.body;

    const coinplan = new CoinPlan();
    coinplan.coin = coin;
    coinplan.extraCoin = extraCoin;
    coinplan.amount = amount;
    coinplan.productKey = productKey;
    await coinplan.save();

    return res.status(200).json({
      status: true,
      message: "Coinplan create Successfully",
      data: coinplan,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server error" });
  }
};

//update coinplan
exports.update = async (req, res) => {
  try {
    if (!req.query.coinPlanId) {
      return res.status(200).json({ status: false, message: "coinPlanId must be needed." });
    }

    const coinplan = await CoinPlan.findById(req.query.coinPlanId);
    if (!coinplan) {
      return res.status(200).json({ status: false, message: "CoinPlan does not found." });
    }

    coinplan.coin = req.body.coin ? Number(req.body.coin) : coinplan.coin;
    coinplan.extraCoin = req.body.extraCoin ? Number(req.body.extraCoin) : coinplan.extraCoin;
    coinplan.amount = req.body.amount ? Number(req.body.amount) : coinplan.amount;
    coinplan.productKey = req.body.productKey ? req.body.productKey : coinplan.productKey;

    await coinplan.save();

    return res.status(200).json({
      status: true,
      message: "Coinplan update Successfully",
      data: coinplan,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server error" });
  }
};

//handle isPopular switch
exports.handleisPopularSwitch = async (req, res) => {
  try {
    if (!req.query.coinPlanId) {
      return res.status(200).json({ status: false, message: "coinPlanId must be needed." });
    }

    const coinplan = await CoinPlan.findById(req.query.coinPlanId);
    if (!coinplan) {
      return res.status(200).json({ status: false, message: "CoinPlan does not found." });
    }

    coinplan.isPopular = !coinplan.isPopular;
    await coinplan.save();

    return res.status(200).json({ status: true, message: "Success", data: coinplan });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//handle isActive switch
exports.handleisActiveSwitch = async (req, res) => {
  try {
    if (!req.query.coinPlanId) {
      return res.status(200).json({ status: false, message: "coinPlanId must be needed." });
    }

    const coinplan = await CoinPlan.findById(req.query.coinPlanId);
    if (!coinplan) {
      return res.status(200).json({ status: false, message: "CoinPlan does not found." });
    }

    coinplan.isActive = !coinplan.isActive;
    await coinplan.save();

    return res.status(200).json({ status: true, message: "Success", data: coinplan });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//delete coinplan
exports.delete = async (req, res) => {
  try {
    if (!req.query.coinPlanId) {
      return res.status(200).json({ status: false, message: "coinPlanId must be needed." });
    }

    const coinplan = await CoinPlan.findById(req.query.coinPlanId);
    if (!coinplan) {
      return res.status(200).json({ status: false, message: "CoinPlan does not found." });
    }

    const icon = coinplan?.icon.split("storage");
    if (icon) {
      if (fs.existsSync("storage" + icon[1])) {
        fs.unlinkSync("storage" + icon[1]);
      }
    }

    await coinplan.deleteOne();

    return res.status(200).json({
      status: true,
      message: "Coinplan deleted Successfully",
      data: coinplan,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server error" });
  }
};

//get coinPlan
exports.fetchCoinplan = async (req, res) => {
  try {
    const coinPlan = await CoinPlan.find().sort({ coin: 1, amount: 1 });

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

//get coinplan histories of users (admin earning)
exports.retrieveUserCoinplanRecords = async (req, res) => {
  try {
    if (!req.query.startDate || !req.query.endDate) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!" });
    }

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

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

    const [totalHistory, adminEarnings, history] = await Promise.all([
      History.countDocuments({
        ...dateFilterQuery,
        type: 8,
        amount: { $exists: true, $ne: 0 },
      }),
      History.aggregate([
        {
          $match: {
            ...dateFilterQuery,
            type: 8,
            amount: { $exists: true, $ne: 0 },
          },
        },
        { $group: { _id: null, totalEarnings: { $sum: "$amount" } } },
      ]),
      History.aggregate([
        {
          $match: {
            ...dateFilterQuery,
            type: 8,
            amount: { $exists: true, $ne: 0 },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        {
          $unwind: "$userDetails",
        },
        {
          $group: {
            _id: "$userDetails._id",
            fullName: { $first: "$userDetails.fullName" },
            nickName: { $first: "$userDetails.nickName" },
            image: { $first: "$userDetails.image" },
            totalPlansPurchased: { $sum: 1 },
            totalAmountSpent: { $sum: "$amount" },
            coinPlanPurchase: {
              $push: {
                _id: "$_id",
                coin: "$coin",
                uniqueId: "$uniqueId",
                paymentGateway: "$paymentGateway",
                amount: "$amount",
                date: "$date",
              },
            },
          },
        },
        { $sort: { totalPlansPurchased: -1 } },
        { $skip: (start - 1) * limit }, //how many records you want to skip
        { $limit: limit },
      ]),
    ]);

    const totalAdminEarnings = adminEarnings.length > 0 ? adminEarnings[0].totalEarnings : 0;

    return res.status(200).json({
      status: true,
      message: "Retrieve all histories grouped by user.",
      totalAdminEarnings: totalAdminEarnings,
      total: totalHistory,
      data: history,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};
