const User = require("../models/user.model");

const resetPremiumPlan = async (userId) => {
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        isPremiumPlan: false,
        "plan.planStartDate": null,
        "plan.planEndDate": null,
        "plan.premiumPlanId": null,
        "plan.amount": 0,
        "plan.validity": 0,
        "plan.validityType": null,
        "plan.planBenefit": [],
        "plan.productKey": null,
      },
    }
  );
};

const checkPremiumExpiry = async (user) => {
  try {
    if (!user) return;

    if (!user.isPremiumPlan) return;

    if (!user.plan || !user.plan.planEndDate) return;

    const now = new Date();
    const endDate = new Date(user.plan.planEndDate);

    // Expire immediately when current date reaches or exceeds end date
    if (now >= endDate) {
      console.log(`Premium expired for user: ${user._id}`);

      await resetPremiumPlan(user._id);

      // Update current object so current request gets updated data
      user.isPremiumPlan = false;
      user.plan = {
        planStartDate: null,
        planEndDate: null,
        premiumPlanId: null,
        amount: 0,
        validity: 0,
        validityType: null,
        planBenefit: [],
        productKey: null,
      };
    }
  } catch (err) {
    console.error("checkPremiumExpiry:", err);
  }
};

module.exports = {
  checkPremiumExpiry,
  resetPremiumPlan,
};