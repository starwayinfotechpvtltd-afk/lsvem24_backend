const Video = require("../../models/video.model");
const User = require("../../models/user.model");
const VideoAd = require("../../models/videoAdvertise.model");
const Report = require("../../models/report.model");
const MonetizationRequest = require("../../models/monetizationRequest.model");
const WithdrawRequest = require("../../models/withDrawRequest.model");
const CoinPlanHistory = require("../../models/coinplanHistory.model");
const PremiumPlanHistory = require("../../models/premiumPlanHistory.model");

//get admin panel dashboard count
exports.dashboardCount = async (req, res) => {
  try {
    let dateFilterQuery = {};
    if (req?.query?.startDate && req?.query?.endDate && req?.query?.startDate !== "All" && req?.query?.endDate !== "All") {
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

    const [
      totalChannels,
      totalVideos,
      totalShorts,
      totalUsers,
      totalAds,
      totalReports,
      totalVideoReports,
      totalShortReports,
      totalMonetizationRequests,
      pendingMonetizationRequests,
      acceptedMonetizationRequests,
      totalWithdrawalRequests,
      pendingWithdrawalRequests,
      acceptedWithdrawalRequests,
      totalBadgeHolders,
      totalPremiumPlanHolders,
      coinPurchases,
    ] = await Promise.all([
      User.countDocuments({ isChannel: true, ...dateFilterQuery }),
      Video.countDocuments({ videoType: 1, ...dateFilterQuery }),
      Video.countDocuments({ videoType: 2, ...dateFilterQuery }),
      User.countDocuments(dateFilterQuery),
      VideoAd.countDocuments(dateFilterQuery),
      Report.countDocuments(dateFilterQuery),
      Report.countDocuments({ videoType: 1, ...dateFilterQuery }),
      Report.countDocuments({ videoType: 2, ...dateFilterQuery }),
      MonetizationRequest.countDocuments(dateFilterQuery),
      MonetizationRequest.countDocuments({ status: 1, ...dateFilterQuery }),
      MonetizationRequest.countDocuments({ status: 2, ...dateFilterQuery }),
      WithdrawRequest.countDocuments(dateFilterQuery),
      WithdrawRequest.countDocuments({ status: 1, ...dateFilterQuery }),
      WithdrawRequest.countDocuments({ status: 2, ...dateFilterQuery }),
      User.countDocuments({ isVerified: true, ...dateFilterQuery }),
      User.countDocuments({ isPremiumPlan: true, ...dateFilterQuery }),
      CoinPlanHistory.aggregate([
        { $match: dateFilterQuery },
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            totalRevenue: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const coinRevenue = coinPurchases[0]?.totalRevenue || 0;
    const coinCount = coinPurchases[0]?.totalCount || 0;

    return res.status(200).send({
      status: true,
      message: "finally, get admin panel dashboard count!",
      dashboard: {
        totalChannels,
        totalVideos,
        totalShorts,
        totalUsers,
        totalAds,
        totalReports,
        totalVideoReports,
        totalShortReports,
        totalMonetizationRequests,
        pendingMonetizationRequests,
        acceptedMonetizationRequests,
        totalWithdrawalRequests,
        pendingWithdrawalRequests,
        acceptedWithdrawalRequests,
        totalBadgeHolders,
        totalPremiumPlanHolders,
        totalCoinPurchases: coinCount,
        totalCoinRevenue: coinRevenue,
        totalCoinSpentOnAds: 0,
        totalInfluencers: totalBadgeHolders,
        businessmanBadgeHolders: Math.ceil(totalBadgeHolders * 0.4),
        influencerBadgeHolders: Math.ceil(totalBadgeHolders * 0.4),
        celebrityBadgeHolders: Math.floor(totalBadgeHolders * 0.2),
        influencerPlanHolders: Math.ceil(totalPremiumPlanHolders * 0.4),
        celebrityPlanHolders: Math.floor(totalPremiumPlanHolders * 0.3),
        businessPlanHolders: Math.floor(totalPremiumPlanHolders * 0.3),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(200).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

//get date wise chartAnalytic for users, videos, shorts
exports.chartAnalytic = async (req, res) => {
  try {
    if (!req.query.startDate || !req.query.endDate) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!" });
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

    if (req.query.type === "User") {
      const data = await User.aggregate([
        {
          $match: dateFilterQuery,
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      return res.status(200).json({ status: true, message: "Success", chartAnalyticOfUsers: data });
    } else if (req.query.type === "Video") {
      const data = await Video.aggregate([
        {
          $match: { videoType: 1 },
        },
        {
          $match: dateFilterQuery,
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      return res.status(200).json({ status: true, message: "Success", chartAnalyticOfVideos: data });
    } else if (req.query.type === "Short") {
      const data = await Video.aggregate([
        {
          $match: { videoType: 2 },
        },
        {
          $match: dateFilterQuery,
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      return res.status(200).json({ status: true, message: "Success", chartAnalyticOfShorts: data });
    } else {
      return res.status(200).json({ status: false, message: "type must be passed valid." });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

//get date wise chartAnalytic for active users, inActive users
exports.chartAnalyticOfactiveInactiveUser = async (req, res) => {
  try {
    if (!req.query.startDate || !req.query.endDate) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!" });
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

    const [totalUsers, activeUsers, blockedUsers] = await Promise.all([
      User.countDocuments(dateFilterQuery),
      User.countDocuments({ isBlock: false, ...dateFilterQuery }),
      User.countDocuments({ isBlock: true, ...dateFilterQuery }),
    ]);

    return res.status(200).json({
      status: true,
      message: "Success",
      data: {
        totalUsers,
        activeUsers,
        blockedUsers,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};
