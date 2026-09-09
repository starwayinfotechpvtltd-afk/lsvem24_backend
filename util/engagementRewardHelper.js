const History = require("../models/history.model");
const User = require("../models/user.model");
const { generateHistoryUniqueId } = require("./generateHistoryUniqueId");
const admin = require("./privateKey");
const dayjs = require("dayjs");

const DAILY_ENGAGEMENT_LIMIT = 10;

/**
 * Get total coins earned today by the user through like (type 7) and comment (type 6).
 */
const getTodayEngagementCoins = async (userId) => {
  const startOfToday = dayjs().startOf("day").toDate();
  const todayHistory = await History.find({
    userId: userId,
    type: { $in: [6, 7] },
    coin: { $gt: 0 },
    createdAt: { $gte: startOfToday },
  });
  return todayHistory.reduce((sum, h) => sum + (h.coin || 0), 0);
};

/**
 * Award engagement coins for liking or commenting, enforcing the combined 10 coins/day limit.
 */
const awardEngagementReward = async ({ user, type, baseRewardCoins, fcmTitle, fcmBody, fcmType }) => {
  const todayEarned = await getTodayEngagementCoins(user._id);
  const remainingAllowance = Math.max(0, DAILY_ENGAGEMENT_LIMIT - todayEarned);
  const coinsToAward = Math.min(Number(baseRewardCoins) || 0, remainingAllowance);

  if (coinsToAward > 0) {
    const uniqueId = await generateHistoryUniqueId();
    await Promise.all([
      User.findOneAndUpdate(
        { _id: user._id },
        {
          $inc: {
            coin: coinsToAward,
            earnedCoin: coinsToAward,
          },
        },
        { new: true }
      ),
      History({
        userId: user._id,
        uniqueId: uniqueId,
        coin: coinsToAward,
        type: type,
        date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      }).save(),
    ]);

    if (user.fcmToken && user.fcmToken !== null) {
      try {
        const adminPromise = await admin;
        const payload = {
          token: user.fcmToken,
          notification: {
            title: typeof fcmTitle === "function" ? fcmTitle(coinsToAward) : fcmTitle,
            body: typeof fcmBody === "function" ? fcmBody(coinsToAward) : fcmBody,
          },
          data: {
            type: fcmType,
          },
        };

        adminPromise
          .messaging()
          .send(payload)
          .then((response) => {
            console.log("Engagement reward FCM sent successfully:", response);
          })
          .catch((error) => {
            console.log("Engagement reward FCM error:", error);
          });
      } catch (err) {
        console.log("Error initializing admin for engagement FCM:", err);
      }
    }
  }

  const todayTotal = todayEarned + coinsToAward;
  const dailyLimitReached = todayTotal >= DAILY_ENGAGEMENT_LIMIT;

  return {
    rewardEarned: coinsToAward,
    todayEngagementCoins: todayTotal,
    dailyLimitReached,
  };
};

module.exports = {
  DAILY_ENGAGEMENT_LIMIT,
  getTodayEngagementCoins,
  awardEngagementReward,
};
