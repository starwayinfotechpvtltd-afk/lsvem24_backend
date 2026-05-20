const WithdrawRequest = require("../../models/withDrawRequest.model");

//import model
const User = require("../../models/user.model");

//moment
const moment = require("moment");

//private key
const admin = require("../../util/privateKey");

exports.index = async (req, res) => {
  try {
    if (!req.query.startDate || !req.query.endDate || !req.query.type) {
      return res.status(200).json({ status: false, message: "Oops! Invalid details!" });
    }

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    let typeQuery = {};
    if (req.query.type !== "All") {
      typeQuery.status = parseInt(req.query.type);
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

    const [total, request] = await Promise.all([
      WithdrawRequest.countDocuments({
        ...dateFilterQuery,
        ...typeQuery,
      }),

      WithdrawRequest.find({
        ...dateFilterQuery,
        ...typeQuery,
      })
        .populate("userId", "fullName nickName image")
        .skip((start - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 }),
    ]);

    return res.status(200).json({
      status: true,
      message: "Withdrawal request fetch successfully!",
      total: total,
      request: request,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

exports.acceptWithdrawalRequest = async (req, res) => {
  try {
    if (!req.query.requestId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    const request = await WithdrawRequest.findById(req.query.requestId);
    if (!request) {
      return res.status(200).json({ status: false, message: "Withdrawal Request does not found!" });
    }

    if (request.status == 2) {
      return res.status(200).json({ status: false, message: "Withdrawal request already accepted by the admin." });
    }

    if (request.status == 3) {
      return res.status(200).json({ status: false, message: "Withdrawal request already declined by the admin." });
    }

    const user = await User.findOne({ _id: request.userId });
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    request.paymentDate = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    request.status = 2;
    await request.save();

    res.status(200).json({
      status: true,
      message: "Withdrawal request accepted and paid to particular user.",
      request,
    });

    const earningPerHour = global.settingJSON.earningPerHour;
    const requestAmount = parseFloat(request.requestAmount);
    const hoursOfPayment = requestAmount / earningPerHour;
    const minutesToCut = hoursOfPayment * 60;

    await User.updateOne(
      { _id: user._id, totalEarningAmount: { $gt: 0 } },
      {
        $inc: {
          totalCurrentWatchTime: -minutesToCut,
          //totalWithdrawableAmount: -requestAmount,
          totalEarningAmount: -Math.abs(requestAmount),
        },
      }
    );

    //checks if the user has an fcmToken
    if (user.fcmToken && user.fcmToken !== null) {
      const adminPromise = await admin;

      const payload = {
        token: user.fcmToken,
        notification: {
          title: "🔔 Withdrawal Request Accepted! 🔔",
          body: "Good news! Your withdrawal request has been accepted and is being processed. Thank you for using our service!",
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
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

exports.declineWithdrawalRequest = async (req, res) => {
  try {
    if (!req.query.requestId || !req.query.reason) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    const request = await WithdrawRequest.findById(req.query.requestId);
    if (!request) {
      return res.status(200).json({ status: false, message: "Withdrawal Request does not found!" });
    }

    if (request.status == 3) {
      return res.status(200).json({ status: false, message: "Withdrawal request already declined by the admin." });
    }

    if (request.status == 2) {
      return res.status(200).json({ status: false, message: "Withdrawal request already accepted by the admin." });
    }

    const user = await User.findOne({ _id: request.userId });
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    res.status(200).json({ status: true, message: "Withdrawal Request has been declined by the admin." });

    await WithdrawRequest.updateOne({ _id: request._id }, { $set: { status: 3, reason: req.query.reason?.trim() } });

    //checks if the user has an fcmToken
    if (user.fcmToken && user.fcmToken !== null) {
      const adminPromise = await admin;

      const payload = {
        token: user?.fcmToken,
        notification: {
          title: "🔔 Withdrawal Request Declined! 🔔",
          body: "We're sorry, but your withdrawal request has been declined. Please contact support for more information.",
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
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};
