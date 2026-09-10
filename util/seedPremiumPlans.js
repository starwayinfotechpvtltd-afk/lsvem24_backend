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
    ],
    isActive: true
  },
  {
    amount: 499,
    validity: 30,
    validityType: 'days',
    productKey: 'creator_plan_30d',
    planBenefit: [
      'Ad-free video streaming',
      'High quality HD download',
      'Background playback support',
      'Single blue tick'
    ],
    isActive: true
  },
  {
    amount: 1499,
    validity: 30,
    validityType: 'days',
    productKey: 'celebrity_plan_30d',
    planBenefit: [
      'Ad-free video streaming',
      'High quality HD download',
      'Background playback support',
      'Yellow double tick'
    ],
    isActive: true
  },
  {
    amount: 1999,
    validity: 30,
    validityType: 'days',
    productKey: 'business_plan_30d',
    planBenefit: [
      'Ad-free video streaming',
      'High quality HD download',
      'Background playback support',
      'Advanced audience insights',
      'Green badge',
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

