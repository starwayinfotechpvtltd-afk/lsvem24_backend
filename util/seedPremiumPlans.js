const PremiumPlan = require('../models/premiumPlan.model');

const defaultPlans = [
  {
    amount: 199,
    validity: 30,
    validityType: 'days',
    productKey: 'normal_user_plan_30d',
    planBenefit: [
      'Ad-free video streaming',
      'High quality HD download',
      'Background playback support',
      'Ad-free experience'
    ],
    isActive: true
  },
  {
    amount: 499,
    validity: 30,
    validityType: 'days',
    productKey: 'creator_plan_30d',
    planBenefit: [
      'Promote 5 videos per month',
      'Priority video listing',
      'Basic analytics dashboard',
      'Ad-free & HD downloads'
    ],
    isActive: true
  },
  {
    amount: 1499,
    validity: 30,
    validityType: 'days',
    productKey: 'celebrity_plan_30d',
    planBenefit: [
      'Promote 15 videos per month',
      'Top trending placement',
      'Priority customer support',
      'Access to brand collaborations',
      'Ad-free & HD downloads'
    ],
    isActive: true
  },
  {
    amount: 1999,
    validity: 30,
    validityType: 'days',
    productKey: 'business_plan_30d',
    planBenefit: [
      'Unlimited video promotion',
      'Top trending placement',
      'Dedicated account manager',
      'Advanced audience insights',
      'Commercial advertising tools',
      'Ad-free & Unlimited HD downloads'
    ],
    isActive: true
  }
];

async function seedPremiumPlans() {
  try {
    for (const plan of defaultPlans) {
      await PremiumPlan.findOneAndUpdate(
        { productKey: plan.productKey },
        { $set: plan },
        { upsert: true, new: true }
      );
    }
    const validProductKeys = defaultPlans.map((p) => p.productKey);
    await PremiumPlan.deleteMany({ productKey: { $nin: validProductKeys } });
    console.log('✅ Seeded/synced 4 premium plans successfully in database');
  } catch (error) {
    console.error('Error seeding premium plans:', error);
  }
}

module.exports = seedPremiumPlans;

