//import model
const User = require("../models/user.model");
const UserWiseSubscription = require("../models/userWiseSubscription.model");
const WatchHistory = require("../models/watchHistory.model");

//Check if user meets the monetization criteria
const monetizationEnabled = async (userId) => {
  try {
    const user = await User.findOne({ _id: userId });
    console.log("Inside monetizationEnabled user =================", user._id);
    console.log("requried minWatchTime :    ", settingJSON.minWatchTime);
    console.log("requried minSubScriber :   ", settingJSON.minSubScriber);

    const [subscriptions, totalViewMinutesOfOwnChannel] = await Promise.all([
      UserWiseSubscription.countDocuments({ channelId: user.channelId }),
      WatchHistory.aggregate([
        { $match: { videoChannelId: user.channelId } },
        {
          $group: {
            _id: null,
            totalWatchTime: { $sum: "$totalWatchTime" },
          },
        },
      ]),
    ]);

    const totalWatchTime = totalViewMinutesOfOwnChannel.length > 0 ? totalViewMinutesOfOwnChannel[0].totalWatchTime : 0;
    const totalWatchTimeHours = totalWatchTime / 60; //Convert total watch time from minutes to hours

    //console.log("total subscriptions: ", subscriptions);
    console.log("total WatchTime Minutes", totalWatchTime);
    console.log("total WatchTime Hours  ", totalWatchTimeHours);

    //Check if user meets the criteria
    const isMonetizationEnabled = totalWatchTimeHours >= settingJSON.minWatchTime && subscriptions >= settingJSON.minSubScriber;
    console.log("isMonetizationEnabled before", isMonetizationEnabled);

    if (isMonetizationEnabled) {
      console.log("If isMonetizationEnabled is", isMonetizationEnabled);

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
