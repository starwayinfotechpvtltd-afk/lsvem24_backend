//import model
const User = require("../models/user.model");
const Video = require("../models/video.model");
const UserWiseSubscription = require("../models/userWiseSubscription.model");
const WatchHistory = require("../models/watchHistory.model");

//Check if user meets the monetization criteria
const monetizationEnabled = async (userId) => {
  try {
    const user = await User.findOne({ _id: userId });
    if (!user) return null;

    const currentSettings = global.settingJSON || require("../setting");
    const minSubScriber = (currentSettings && currentSettings.minSubScriber) ? currentSettings.minSubScriber : 500;
    const minWatchTime = (currentSettings && currentSettings.minWatchTime) ? currentSettings.minWatchTime : 3000;
    const minShortsViews = (currentSettings && currentSettings.minShortsViews) ? currentSettings.minShortsViews : 3000000;

    const channelIdentifiers = [user.channelId, user._id ? user._id.toString() : null].filter(Boolean);

    // Find all video IDs of this user/channel to ensure accurate matching
    const userVideos = await Video.find({
      $or: [
        { channelId: { $in: channelIdentifiers } },
        { userId: user._id },
      ],
    }).select("_id videoType visibilityType");

    const longVideoIds = userVideos
      .filter((v) => (v.videoType === 1 || !v.videoType) && (v.visibilityType === 1 || !v.visibilityType))
      .map((v) => v._id);

    const shortsVideoIds = userVideos
      .filter((v) => v.videoType === 2 && (v.visibilityType === 1 || !v.visibilityType))
      .map((v) => v._id);

    const [subscriptions, longWatchHistoryResults, shortsViewsResults] = await Promise.all([
      UserWiseSubscription.countDocuments({ channelId: { $in: channelIdentifiers } }),
      WatchHistory.aggregate([
        {
          $match: {
            $or: [
              { videoId: { $in: longVideoIds } },
              { videoChannelId: { $in: channelIdentifiers } },
              { videoUserId: user._id },
            ],
          },
        },
        {
          $lookup: {
            from: "videos",
            localField: "videoId",
            foreignField: "_id",
            as: "video",
          },
        },
        { $unwind: "$video" },
        {
          $match: {
            "video.videoType": 1, // long video
            "video.visibilityType": 1, // public
          },
        },
        {
          $group: {
            _id: null,
            totalWatchTime: { $sum: "$totalWatchTime" },
          },
        },
      ]),
      WatchHistory.aggregate([
        {
          $match: {
            $or: [
              { videoId: { $in: shortsVideoIds } },
              { videoChannelId: { $in: channelIdentifiers } },
              { videoUserId: user._id },
            ],
          },
        },
        {
          $lookup: {
            from: "videos",
            localField: "videoId",
            foreignField: "_id",
            as: "video",
          },
        },
        { $unwind: "$video" },
        {
          $match: {
            "video.videoType": 2, // shorts video
            "video.visibilityType": 1, // public
          },
        },
        {
          $count: "totalShortsViews",
        },
      ]),
    ]);

    const totalWatchTimeMinutes = longWatchHistoryResults.length > 0 ? (longWatchHistoryResults[0].totalWatchTime || 0) : 0;
    const maxWatchTimeMinutes = Math.max(totalWatchTimeMinutes, user.totalWatchTime || 0);
    const totalWatchTimeHours = parseFloat((maxWatchTimeMinutes / 60).toFixed(2));
    const totalShortsViews = shortsViewsResults.length > 0 ? (shortsViewsResults[0].totalShortsViews || 0) : 0;

    // Monetization rule:
    // Minimum 500 subscribers AND (total 3000 public watch hours for long videos OR total 3 million public shorts views)
    const hasEnoughSubscribers = subscriptions >= minSubScriber;
    const hasEnoughWatchHoursOrShortsViews = totalWatchTimeHours >= minWatchTime || totalShortsViews >= minShortsViews;
    const isMonetizationEnabled = hasEnoughSubscribers && hasEnoughWatchHoursOrShortsViews;

    if (isMonetizationEnabled && !user.isMonetization) {
      await User.updateOne({ _id: user._id }, { $set: { isMonetization: isMonetizationEnabled } });
    }

    const data = await User.findById(user._id);
    return data;
  } catch (error) {
    console.error("Error in checking monetization eligibility:", error);
    throw error;
  }
};

module.exports = { monetizationEnabled };
