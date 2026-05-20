//import model
const PremiumPlan = require("../models/premiumPlan.model");
const User = require("../models/user.model");

//momemt
const moment = require("moment");

//check user plan is expired or not
const checkPlan = async (userId, res) => {
  console.log("Inside checkPlan userId", userId);

  const user = await User.findById(userId);
  if (!user) {
    return res.status(200).json({ status: false, message: "user does not found!" });
  }

  if (user.isBlock) {
    return res.status(200).json({ status: false, message: "you are blocked by admin!" });
  }

  if (user.plan.planStartDate !== null && user.plan.premiumPlanId !== null) {
    const plan = await PremiumPlan.findById(user.plan.premiumPlanId);
    if (!plan) {
      return res.status(200).json({ status: false, message: "premiumPlan does not found for that user!" });
    }

    if (plan.validityType.toLowerCase() === "day") {
      const currentDate = moment();
      const planStartDate = moment(user.plan.planStartDate);

      const diffTime = currentDate.diff(planStartDate, "days");
      console.log("diffTime in day: ", diffTime);

      if (diffTime > plan.validity) {
        user.isPremiumPlan = false;
        user.plan.planStartDate = null;
        user.plan.planEndDate = null;
        user.plan.premiumPlanId = null;
        user.plan.amount = 0;
        user.plan.validity = 0;
        user.plan.validityType = null;
        user.plan.planBenefit = [];
      }
    }

    if (plan.validityType.toLowerCase() === "month") {
      const diffTime = moment().diff(moment(user.plan.planStartDate), "month");
      console.log("diffTime in month: ", diffTime);

      if (diffTime >= plan.validity) {
        user.isPremiumPlan = false;
        user.plan.planStartDate = null;
        user.plan.planEndDate = null;
        user.plan.premiumPlanId = null;
        user.plan.amount = 0;
        user.plan.validity = 0;
        user.plan.validityType = null;
        user.plan.planBenefit = [];
      }
    }

    if (plan.validityType.toLowerCase() === "year") {
      const diffTime = moment().diff(moment(user.plan.planStartDate), "year");
      console.log("diffTime in year: ", diffTime);

      if (diffTime >= plan.validity) {
        user.isPremiumPlan = false;
        user.plan.planStartDate = null;
        user.plan.planEndDate = null;
        user.plan.premiumPlanId = null;
        user.plan.amount = 0;
        user.plan.validity = 0;
        user.plan.validityType = null;
        user.plan.planBenefit = [];
      }
    }
  }

  await user.save();
  return user;
};

module.exports = { checkPlan };
