const DailyRewardCoin = require('../models/dailyRewardCoin.model');

const defaultDailyRewards = [
  { day: 1, dailyRewardCoin: 10 },
  { day: 2, dailyRewardCoin: 10 },
  { day: 3, dailyRewardCoin: 20 },
  { day: 4, dailyRewardCoin: 20 },
  { day: 5, dailyRewardCoin: 30 },
  { day: 6, dailyRewardCoin: 50 },
  { day: 7, dailyRewardCoin: 50 },
];

async function seedDailyRewards() {
  try {
    for (const reward of defaultDailyRewards) {
      await DailyRewardCoin.findOneAndUpdate(
        { day: reward.day },
        { $set: { dailyRewardCoin: reward.dailyRewardCoin } },
        { upsert: true, new: true }
      );
    }
    console.log('✅ Daily reward coins synced: 10, 10, 20, 20, 30, 50, 50');
  } catch (error) {
    console.error('Error seeding daily rewards:', error);
  }
}

module.exports = seedDailyRewards;
