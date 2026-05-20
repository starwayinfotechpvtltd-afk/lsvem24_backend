const MonetizationRequest = require("../../models/monetizationRequest.model");
const WalletHistory = require("../../models/walletHistory.model");

//generateHistoryUniqueId
const { generateHistoryUniqueId } = require("../../util/generateHistoryUniqueId");

//import model
const User = require("../../models/user.model");

//private key
const admin = require("../../util/privateKey");

//get all monetization requests
exports.getAllMonetizationRequests = async (req, res) => {
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
      MonetizationRequest.countDocuments({
        ...dateFilterQuery,
        ...typeQuery,
      }),

      MonetizationRequest.find({
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
      message: "Retrive monetization requests get by the admin.",
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

//accept or decline monetization request
exports.handleMonetizationRequest = async (req, res) => {
  try {
    if (!req.query.monetizationRequestId || !req.query.type) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    if (req.query.type == 3 && !req.query.reason) {
      return res.status(200).json({ status: false, message: "Reason must be requried when request declined by the admin." });
    }

    const monetizationRequest = await MonetizationRequest.findById(req.query.monetizationRequestId);
    if (!monetizationRequest) {
      return res.status(200).json({ status: false, message: "Monetization request does not found!" });
    }

    const [user, uniqueId] = await Promise.all([User.findOne({ _id: monetizationRequest.userId }), generateHistoryUniqueId()]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by the admin!" });
    }

    if (req.query.type == 2) {
      if (monetizationRequest.status == 2) {
        return res.status(200).json({ status: false, message: "Monetization request already accepted by the admin." });
      }

      if (monetizationRequest.status == 3) {
        return res.status(200).json({ status: false, message: "Monetization request already declined by the admin." });
      }

      res.status(200).json({ status: true, message: "Monetization request accepted by the admin." });

      await Promise.all([
        User.updateOne(
          { _id: user._id, totalWithdrawableAmount: { $gt: 0 } },
          {
            $inc: {
              totalWithdrawableAmount: -Math.abs(user?.totalWithdrawableAmount),
              totalEarningAmount: Math.abs(user?.totalWithdrawableAmount),
            },
          },
          {
            $set: { totalWatchTime: 0 },
          }
        ),
        WalletHistory({
          userId: user._id,
          uniqueId: uniqueId,
          coin: 0,
          amount: user?.totalWithdrawableAmount || 0,
          type: 1,
          date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
          totalWatchTimeInHours: monetizationRequest.totalWatchTimeInHours,
        }).save(),

        MonetizationRequest.updateOne({ _id: monetizationRequest._id }, { $set: { status: 2 } }),
      ]);

      //checks if the user has an fcmToken
      if (user.fcmToken && user.fcmToken !== null) {
        const adminPromise = await admin;

        const payload = {
          token: user.fcmToken,
          notification: {
            title: "✅ Monetization Request Approved ✅",
            body: "Good news! Your monetization request has been approved. You can now start earning from your content. Thank you for your patience!",
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
    } else if (req.query.type == 3) {
      if (monetizationRequest.status == 3) {
        return res.status(200).json({ status: false, message: "Monetization request already declined by the admin." });
      }

      if (monetizationRequest.status == 2) {
        return res.status(200).json({ status: false, message: "Monetization request already accepted by the admin." });
      }

      res.status(200).json({ status: true, message: "Monetization request declined by the admin." });

      await MonetizationRequest.updateOne({ _id: monetizationRequest._id }, { $set: { status: 3, reason: req.query.reason?.trim() } });

      //checks if the user has an fcmToken
      if (user.fcmToken && user.fcmToken !== null) {
        const adminPromise = await admin;

        const payload = {
          token: user.fcmToken,
          notification: {
            title: "⚠️ Monetization Request Rejected ⚠️",
            body: "Your monetization request has been reviewed and unfortunately declined. Please check the feedback provided and contact support for any further assistance.",
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
