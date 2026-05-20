const Notification = require("../../models/notification.model");

//import model
const User = require("../../models/user.model");

//dayjs
const dayjs = require("dayjs");

//mongoose
const mongoose = require("mongoose");

//get notification list for that user
exports.getNotificationList = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!!" });
    }

    let now = dayjs();
    const userId = new mongoose.Types.ObjectId(req.query.userId);

    const [user, notification] = await Promise.all([
      User.findOne({ _id: userId, isActive: true }),
      Notification.find({ userId: userId }).sort({ createdAt: -1 }),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "user does not found." });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin." });
    }

    const notificationList = notification?.map(({ _doc: data }) => ({
      ...data,
      time:
        now.diff(data.createdAt, "minute") === 0
          ? "Just Now"
          : now.diff(data.createdAt, "minute") <= 60 && now.diff(data.createdAt, "minute") >= 0
          ? now.diff(data.createdAt, "minute") + " minutes ago"
          : now.diff(data.createdAt, "hour") >= 24
          ? now.diff(data.createdAt, "day") + " days ago"
          : now.diff(data.createdAt, "hour") + " hours ago",
    }));

    return res.status(200).json({ status: true, message: "Success", notification: notificationList });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};

//clear all notification for particular user
exports.clearNotificationHistory = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res.status(200).json({ status: false, message: "userId must be requried." });
    }

    const userId = new mongoose.Types.ObjectId(req.query.userId);

    const [user, clearNotificationHistory] = await Promise.all([
      User.findOne({ _id: userId, isActive: true }),
      Notification.deleteMany({ userId: userId }),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "user does not found." });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    if (clearNotificationHistory.deletedCount > 0) {
      return res.status(200).json({
        status: true,
        message: "Successfully cleared all Notification history for the user.",
      });
    } else {
      return res.status(200).json({
        status: false,
        message: "Notification history not found for the user.",
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
