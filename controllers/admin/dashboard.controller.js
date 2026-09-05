const Video = require("../../models/video.model");
const User = require("../../models/user.model");

//get admin panel dashboard count
exports.dashboardCount = async (req, res) => {
  try {
    if (!req.query.startDate || !req.query.endDate) {
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

    const [totalChannels, totalVideos, totalShorts, totalUsers] = await Promise.all([
      User.aggregate([{ $match: { isChannel: true } }, { $match: dateFilterQuery }, { $group: { _id: null, total: { $sum: 1 } } }]),
      Video.aggregate([{ $match: { videoType: 1 } }, { $match: dateFilterQuery }, { $group: { _id: null, total: { $sum: 1 } } }]),
      Video.aggregate([{ $match: { videoType: 2 } }, { $match: dateFilterQuery }, { $group: { _id: null, total: { $sum: 1 } } }]),
      User.aggregate([{ $match: dateFilterQuery }, { $group: { _id: null, total: { $sum: 1 } } }]),
    ]);

    return res.status(200).send({
      status: true,
      message: "finally, get admin panel dashboard count!",
      dashboard: {
        totalChannels: totalChannels[0]?.total > 0 ? totalChannels[0].total : 0,
        totalVideos: totalVideos[0]?.total > 0 ? totalVideos[0]?.total : 0,
        totalShorts: totalShorts[0]?.total > 0 ? totalShorts[0]?.total : 0,
        totalUsers: totalUsers[0]?.total > 0 ? totalUsers[0]?.total : 0,
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
