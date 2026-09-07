const crypto = require("crypto");
const mongoose = require("mongoose");
const moment = require("moment");
const Razorpay = require("razorpay");

// Models
const RazorpayOrder = require("../../models/razorpayOrder.model");
const User = require("../../models/user.model");
const CoinPlan = require("../../models/coinplan.model");
const CoinPlanHistory = require("../../models/coinplanHistory.model");
const PremiumPlan = require("../../models/premiumPlan.model");
const PremiumPlanHistory = require("../../models/premiumPlanHistory.model");
const History = require("../../models/history.model");

// Util
const { generateHistoryUniqueId } = require("../../util/generateHistoryUniqueId");

/**
 * Creates and returns an instance of Razorpay SDK
 * using credentials strictly read from environment variables (.env).
 */
function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials not configured in environment variables (.env)");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * GET /api/client/payment/razorpay-config
 * Returns public Razorpay configuration for mobile client.
 * Does not expose secrets or store details in DB.
 */
exports.getRazorpayConfig = async (req, res) => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID || "";
    const hasSecret = Boolean(process.env.RAZORPAY_KEY_SECRET);
    const currency = process.env.RAZORPAY_CURRENCY || "INR";
    const switchValue = process.env.RAZORPAY_SWITCH;
    const isSwitchEnabled =
      switchValue === undefined || switchValue === "true" || switchValue === true;
    const enabled = Boolean(keyId && hasSecret && isSwitchEnabled);

    return res.status(200).json({
      status: true,
      enabled: enabled,
      keyId: keyId,
      currency: currency,
    });
  } catch (error) {
    console.error("getRazorpayConfig error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * POST /api/client/payment/razorpay/create-order
 * Creates a Razorpay order with the amount derived from the selected plan.
 */
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { userId, purpose, coinPlanId, premiumPlanId } = req.body;

    if (!userId || !purpose) {
      return res.status(400).json({
        status: false,
        message: "userId and purpose are required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        status: false,
        message: "Invalid userId format.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found.",
      });
    }

    if (user.isBlock) {
      return res.status(403).json({
        status: false,
        message: "You are blocked by admin.",
      });
    }

    let amount = 0; // amount in primary currency (e.g. INR)
    let coinPlan = null;
    let premiumPlan = null;

    if (purpose === "coin_plan") {
      if (!coinPlanId || !mongoose.Types.ObjectId.isValid(coinPlanId)) {
        return res.status(400).json({
          status: false,
          message: "Valid coinPlanId is required for coin_plan purpose.",
        });
      }

      coinPlan = await CoinPlan.findById(coinPlanId);
      if (!coinPlan) {
        return res.status(404).json({
          status: false,
          message: "Coin plan not found.",
        });
      }

      amount = coinPlan.amount;
    } else if (purpose === "premium_plan") {
      if (!premiumPlanId || !mongoose.Types.ObjectId.isValid(premiumPlanId)) {
        return res.status(400).json({
          status: false,
          message: "Valid premiumPlanId is required for premium_plan purpose.",
        });
      }

      premiumPlan = await PremiumPlan.findById(premiumPlanId);
      if (!premiumPlan) {
        return res.status(404).json({
          status: false,
          message: "Premium plan not found.",
        });
      }

      amount = premiumPlan.amount;
    } else {
      return res.status(400).json({
        status: false,
        message: "Invalid purpose. Allowed: 'coin_plan', 'premium_plan'.",
      });
    }

    const amountInPaise = Math.round(Number(amount) * 100);
    if (!amountInPaise || amountInPaise <= 0) {
      return res.status(400).json({
        status: false,
        message: "Plan amount must be greater than zero.",
      });
    }

    const razorpay = getRazorpayInstance();
    const currency = process.env.RAZORPAY_CURRENCY || "INR";
    const receipt = `rcpt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    const rzpOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: currency,
      receipt: receipt,
      notes: {
        userId: user._id.toString(),
        purpose: purpose,
        planId: (coinPlanId || premiumPlanId || "").toString(),
      },
    });

    // Track order metadata in database (no secrets stored)
    await RazorpayOrder.create({
      orderId: rzpOrder.id,
      userId: user._id,
      purpose: purpose,
      coinPlanId: purpose === "coin_plan" ? coinPlan._id : null,
      premiumPlanId: purpose === "premium_plan" ? premiumPlan._id : null,
      amount: amountInPaise,
      currency: rzpOrder.currency || currency,
      receipt: rzpOrder.receipt || receipt,
      status: "created",
    });

    return res.status(200).json({
      status: true,
      orderId: rzpOrder.id,
      amount: amountInPaise,
      currency: rzpOrder.currency || currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      purpose: purpose,
    });
  } catch (error) {
    console.error("createRazorpayOrder error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * Helper to fulfill plan purchase idempotently upon successful verification.
 */
async function fulfillOrder(order, paymentId, signature) {
  if (order.status === "fulfilled") {
    return { alreadyFulfilled: true };
  }

  if (order.purpose === "coin_plan") {
    const coinPlan = await CoinPlan.findById(order.coinPlanId);
    if (!coinPlan) {
      throw new Error("Coin plan not found for fulfillment");
    }

    const user = await User.findById(order.userId);
    if (!user) {
      throw new Error("User not found for fulfillment");
    }

    const totalCoins = coinPlan.coin + (coinPlan.extraCoin || 0);
    const uniqueId = await generateHistoryUniqueId();

    const newCoinPlanItem = {
      amount: coinPlan.amount,
      coin: coinPlan.coin,
      extraCoin: coinPlan.extraCoin || 0,
      purchasedAt: new Date(),
    };

    const history = new CoinPlanHistory();
    history.userId = user._id;
    history.coinplanId = coinPlan._id;
    history.paymentGateway = "razorPay";
    history.date = moment().toISOString();

    await Promise.all([
      User.updateOne(
        { _id: user._id },
        {
          $inc: {
            coin: totalCoins,
            purchasedCoin: totalCoins,
          },
          $push: {
            coinplan: newCoinPlanItem,
          },
        }
      ),
      history.save(),
      History.create({
        userId: user._id,
        coinplan: coinPlan._id,
        coin: coinPlan.coin,
        amount: coinPlan.amount,
        paymentGateway: "razorPay",
        uniqueId: uniqueId,
        type: 8,
        date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      }),
    ]);
  } else if (order.purpose === "premium_plan") {
    const premiumPlan = await PremiumPlan.findById(order.premiumPlanId);
    if (!premiumPlan) {
      throw new Error("Premium plan not found for fulfillment");
    }

    const user = await User.findById(order.userId);
    if (!user) {
      throw new Error("User not found for fulfillment");
    }

    const currentDate = new Date();
    let planEndDate = new Date(currentDate);

    if (premiumPlan.validityType === "month") {
      planEndDate.setMonth(currentDate.getMonth() + premiumPlan.validity);
    } else if (premiumPlan.validityType === "year") {
      planEndDate.setFullYear(currentDate.getFullYear() + premiumPlan.validity);
    }

    user.isPremiumPlan = true;
    user.plan = {
      planStartDate: moment().toISOString(),
      planEndDate: moment(planEndDate).toISOString(),
      premiumPlanId: premiumPlan._id,
      amount: premiumPlan.amount,
      validity: premiumPlan.validity,
      validityType: premiumPlan.validityType,
      planBenefit: premiumPlan.planBenefit || [],
      productKey: premiumPlan.productKey || "",
    };

    const history = new PremiumPlanHistory();
    history.userId = user._id;
    history.premiumPlanId = premiumPlan._id;
    history.paymentGateway = "razorPay";
    history.date = moment().toISOString();

    await Promise.all([user.save(), history.save()]);
  }

  order.status = "fulfilled";
  order.paymentId = paymentId || order.paymentId;
  order.signature = signature || order.signature;
  order.fulfilledAt = new Date();
  await order.save();

  return { alreadyFulfilled: false };
}

/**
 * POST /api/client/payment/razorpay/verify
 * Verifies Razorpay payment signature and credits the purchased plan.
 */
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const { userId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!userId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        status: false,
        message: "Missing payment verification parameters.",
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(500).json({
        status: false,
        message: "Razorpay secret key not configured.",
      });
    }

    // Verify HMAC-SHA256 signature
    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(text)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({
        status: false,
        message: "Invalid payment signature.",
      });
    }

    // Lookup order
    const order = await RazorpayOrder.findOne({
      orderId: razorpayOrderId,
      userId: userId,
    });

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Payment order not found.",
      });
    }

    await fulfillOrder(order, razorpayPaymentId, razorpaySignature);

    return res.status(200).json({
      status: true,
      message: "Payment verified successfully",
      paymentStatus: "fulfilled",
      purpose: order.purpose,
    });
  } catch (error) {
    console.error("verifyRazorpayPayment error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * GET /api/client/payment/razorpay/status
 * Check order status (used by client polling if webhook/verify delay occurs).
 */
exports.getRazorpayPaymentStatus = async (req, res) => {
  try {
    const { userId, orderId } = req.query;

    if (!userId || !orderId) {
      return res.status(400).json({
        status: false,
        message: "userId and orderId query params are required.",
      });
    }

    const order = await RazorpayOrder.findOne({ orderId, userId });
    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found.",
      });
    }

    return res.status(200).json({
      status: true,
      payment: {
        status: order.status,
        purpose: order.purpose,
      },
    });
  } catch (error) {
    console.error("getRazorpayPaymentStatus error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * POST /api/client/payment/razorpay/payment-failed
 * Record failed payment attempt for tracking.
 */
exports.updateRazorpayPaymentFailed = async (req, res) => {
  try {
    const { userId, razorpayOrderId, reason } = req.body;

    if (!userId || !razorpayOrderId) {
      return res.status(400).json({
        status: false,
        message: "userId and razorpayOrderId are required.",
      });
    }

    const order = await RazorpayOrder.findOne({
      orderId: razorpayOrderId,
      userId: userId,
    });

    if (order && order.status !== "fulfilled") {
      order.status = "failed";
      order.failureReason = reason || "Payment failed or cancelled";
      await order.save();
    }

    return res.status(200).json({
      status: true,
      message: "Payment marked as failed",
    });
  } catch (error) {
    console.error("updateRazorpayPaymentFailed error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * POST /api/client/payment/razorpay/webhook
 * Optional webhook listener from Razorpay dashboard to fulfill asynchronous payments.
 */
exports.razorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const webhookSignature = req.headers["x-razorpay-signature"];

    if (webhookSecret && webhookSignature) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (expectedSignature !== webhookSignature) {
        return res.status(400).json({ status: false, message: "Invalid webhook signature." });
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === "order.paid" || event === "payment.captured") {
      const orderEntity = payload?.order?.entity;
      const paymentEntity = payload?.payment?.entity;
      const orderId = orderEntity?.id || paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        const order = await RazorpayOrder.findOne({ orderId: orderId });
        if (order && order.status !== "fulfilled") {
          await fulfillOrder(order, paymentId, null);
        }
      }
    }

    return res.status(200).json({ status: true });
  } catch (error) {
    console.error("razorpayWebhook error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};
