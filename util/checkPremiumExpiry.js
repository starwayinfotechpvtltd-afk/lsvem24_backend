const checkPremiumExpiry = async (user) => {
  try {
    if (!user || !user.isPremiumPlan) return;

    if (!user.plan?.planEndDate) {
      return;
    }

    const endDate = new Date(user.plan.planEndDate);

    if (new Date() > endDate) {
      console.log(`Premium expired for user ${user._id}`);

      await User.updateOne(
        { _id: user._id },
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

      // Update current object also
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
  } catch (error) {
    console.log("Premium Expiry Check Error:", error);
  }
};

module.exports = {checkPremiumExpiry};