const cron = require("node-cron");
const User = require("../models/user.model");

const startPremiumPlanCron = () => {
  // Runs every day at 12:00 AM
  cron.schedule("0 0 * * *", async () => {
    try {
      console.log("Checking expired premium plans...");

      const result = await User.updateMany(
        {
          isPremiumPlan: true,
          "plan.planEndDate": { $lte: new Date() },
        },
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

      console.log(
        `Premium expiry cron completed. Updated ${result.modifiedCount} user(s).`
      );
    } catch (error) {
      console.error("Premium Plan Cron Error:", error);
    }
  });

  console.log("Premium Plan Cron Started");
};

module.exports = startPremiumPlanCron;