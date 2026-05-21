const RazorpayPayment = require("../models/razorpayPayment.model");
const {
  fulfillPremiumPlan,
  fulfillCoinPlan,
} = require("./paymentFulfillment.service");

/**
 * Atomically lock a payment for fulfillment (created/paid → processing).
 * Returns null if already fulfilled or being processed by another worker.
 */
async function lockPaymentForFulfillment(razorpayOrderId, { razorpayPaymentId, razorpaySignature } = {}) {
  const update = {
    status: "processing",
    razorpayPaymentId: razorpayPaymentId || undefined,
    razorpaySignature: razorpaySignature || undefined,
  };

  Object.keys(update).forEach((key) => {
    if (update[key] === undefined) delete update[key];
  });

  return RazorpayPayment.findOneAndUpdate(
    {
      razorpayOrderId,
      status: { $in: ["created", "paid"] },
    },
    { $set: update },
    { new: true },
  );
}

async function runFulfillment(paymentRecord) {
  if (paymentRecord.purpose === "premium_plan") {
    return fulfillPremiumPlan(
      paymentRecord.userId,
      paymentRecord.premiumPlanId,
    );
  }
  if (paymentRecord.purpose === "coin_plan") {
    return fulfillCoinPlan(paymentRecord.userId, paymentRecord.coinPlanId);
  }
  throw new Error("Unknown payment purpose.");
}

/**
 * Lock, fulfill plan, mark fulfilled. Idempotent when already fulfilled.
 */
async function fulfillRazorpayOrder(razorpayOrderId, extras = {}) {
  const existing = await RazorpayPayment.findOne({ razorpayOrderId }).lean();
  if (!existing) {
    return { ok: false, reason: "not_found" };
  }
  if (existing.status === "fulfilled") {
    return { ok: true, alreadyFulfilled: true, purpose: existing.purpose };
  }

  const paymentRecord = await lockPaymentForFulfillment(razorpayOrderId, extras);
  if (!paymentRecord) {
    const latest = await RazorpayPayment.findOne({ razorpayOrderId }).lean();
    if (latest?.status === "fulfilled") {
      return { ok: true, alreadyFulfilled: true, purpose: latest.purpose };
    }
    return { ok: false, reason: "locked_or_failed", status: latest?.status };
  }

  try {
    const fulfillment = await runFulfillment(paymentRecord);
    paymentRecord.status = "fulfilled";
    paymentRecord.fulfilledAt = new Date();
    paymentRecord.failureReason = null;
    await paymentRecord.save();
    return {
      ok: true,
      alreadyFulfilled: false,
      purpose: paymentRecord.purpose,
      history: fulfillment?.history || null,
    };
  } catch (error) {
    paymentRecord.status = "paid";
    paymentRecord.failureReason = error.message;
    await paymentRecord.save();
    throw error;
  }
}

module.exports = { lockPaymentForFulfillment, fulfillRazorpayOrder, runFulfillment };
