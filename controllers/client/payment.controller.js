const mongoose = require("mongoose");

const RazorpayPayment = require("../../models/razorpayPayment.model");
const User = require("../../models/user.model");
const PremiumPlan = require("../../models/premiumPlan.model");
const CoinPlan = require("../../models/coinplan.model");
const {
  getRazorpayInstance,
  verifyPaymentSignature,
} = require("../../util/razorpayClient");
const { fulfillRazorpayOrder } = require("../../services/razorpayPayment.service");

function getCurrency() {
  const setting = global.settingJSON || {};
  return setting?.currency?.currencyCode || setting?.currency?.code || "INR";
}

exports.getRazorpayConfig = async (req, res) => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

    if (!keyId || !keySecret) {
      return res.status(200).json({
        status: false,
        message: "Razorpay is not configured on the server.",
      });
    }

    const setting = global.settingJSON || {};
    const enabled = Boolean(setting.razorPaySwitch);

    return res.status(200).json({
      status: true,
      message: "Razorpay config fetched",
      keyId,
      currency: getCurrency(),
      enabled,
    });
  } catch (error) {
    console.error("getRazorpayConfig error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/** Step 1 — Create Razorpay order and store pending payment. */
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { userId, purpose, premiumPlanId, coinPlanId } = req.body;

    if (!userId || !purpose) {
      return res.status(200).json({
        status: false,
        message: "userId and purpose are required.",
      });
    }

    if (!["premium_plan", "coin_plan"].includes(purpose)) {
      return res.status(200).json({
        status: false,
        message: "Invalid purpose. Use premium_plan or coin_plan.",
      });
    }

    const user = await User.findOne({ _id: userId, isActive: true });
    if (!user) {
      return res
        .status(404)
        .json({ status: false, message: "User not found." });
    }
    if (user.isBlock) {
      return res
        .status(200)
        .json({ status: false, message: "You are blocked by admin." });
    }

    let amountRupees = 0;
    let planRef = {};

    if (purpose === "premium_plan") {
      if (!premiumPlanId) {
        return res.status(200).json({
          status: false,
          message: "premiumPlanId is required.",
        });
      }
      const plan = await PremiumPlan.findById(premiumPlanId);
      if (!plan || !plan.isActive) {
        return res.status(200).json({
          status: false,
          message: "Premium plan not found.",
        });
      }
      amountRupees = Number(plan.amount);
      planRef.premiumPlanId = plan._id;
    } else {
      if (!coinPlanId) {
        return res.status(200).json({
          status: false,
          message: "coinPlanId is required.",
        });
      }
      const plan = await CoinPlan.findById(coinPlanId);
      if (!plan || !plan.isActive) {
        return res.status(200).json({
          status: false,
          message: "Coin plan not found.",
        });
      }
      amountRupees = Number(plan.amount);
      planRef.coinPlanId = plan._id;
    }

    if (!amountRupees || amountRupees <= 0) {
      return res.status(200).json({
        status: false,
        message: "Invalid plan amount.",
      });
    }

    const amountPaise = Math.round(amountRupees * 100);
    const currency = getCurrency();
    // Razorpay receipt max length is 40 characters
    const purposeCode = purpose === "premium_plan" ? "pp" : "cp";
    const receipt = `${purposeCode}_${Date.now()}`.slice(0, 40);

    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency,
      receipt,
      notes: {
        userId: String(userId),
        purpose,
        premiumPlanId: premiumPlanId ? String(premiumPlanId) : "",
        coinPlanId: coinPlanId ? String(coinPlanId) : "",
      },
    });

    const paymentRecord = await RazorpayPayment.create({
      userId,
      purpose,
      ...planRef,
      amount: amountPaise,
      currency,
      razorpayOrderId: order.id,
      receipt,
      status: "created",
      paymentGateway: "Razorpay",
    });

    return res.status(200).json({
      status: true,
      message: "Razorpay order created",
      orderId: order.id,
      amount: amountPaise,
      currency,
      keyId: process.env.RAZORPAY_KEY_ID?.trim(),
      paymentRecordId: paymentRecord._id,
      purpose,
    });
  } catch (error) {
    console.error("createRazorpayOrder error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Failed to create Razorpay order",
    });
  }
};

/** Step 2 — Verify signature, Step 3 — Fulfill plan & update status. */
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const { userId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      req.body;

    if (
      !userId ||
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature
    ) {
      return res.status(200).json({
        status: false,
        message:
          "userId, razorpayOrderId, razorpayPaymentId and razorpaySignature are required.",
      });
    }

    const paymentRecord = await RazorpayPayment.findOne({
      razorpayOrderId,
    });

    if (!paymentRecord) {
      return res.status(200).json({
        status: false,
        message: "Payment order not found.",
      });
    }

    if (String(paymentRecord.userId) !== String(userId)) {
      return res.status(200).json({
        status: false,
        message: "Payment does not belong to this user.",
      });
    }

    if (paymentRecord.status === "fulfilled") {
      return res.status(200).json({
        status: true,
        message: "Payment already verified and fulfilled.",
        paymentStatus: paymentRecord.status,
        purpose: paymentRecord.purpose,
      });
    }

    const isValid = verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) {
      paymentRecord.status = "failed";
      paymentRecord.razorpayPaymentId = razorpayPaymentId;
      paymentRecord.razorpaySignature = razorpaySignature;
      paymentRecord.failureReason = "Invalid payment signature";
      await paymentRecord.save();

      return res.status(200).json({
        status: false,
        message: "Payment verification failed.",
        paymentStatus: paymentRecord.status,
      });
    }

    try {
      const result = await fulfillRazorpayOrder(razorpayOrderId, {
        razorpayPaymentId,
        razorpaySignature,
      });

      if (!result.ok) {
        const latest = await RazorpayPayment.findOne({ razorpayOrderId });
        return res.status(200).json({
          status: latest?.status === "fulfilled",
          message:
            latest?.status === "fulfilled"
              ? "Payment fulfilled via webhook."
              : "Payment is being processed. Check status shortly.",
          paymentStatus: latest?.status || paymentRecord.status,
          purpose: latest?.purpose || paymentRecord.purpose,
        });
      }

      return res.status(200).json({
        status: true,
        message: result.alreadyFulfilled
          ? "Payment already fulfilled."
          : "Payment verified and plan activated successfully.",
        paymentStatus: "fulfilled",
        purpose: result.purpose,
        history: result.history || null,
      });
    } catch (fulfillError) {
      const latest = await RazorpayPayment.findOne({ razorpayOrderId });
      console.error("Fulfillment error:", fulfillError);
      return res.status(500).json({
        status: false,
        message:
          fulfillError.message || "Payment verified but fulfillment failed.",
        paymentStatus: latest?.status || "paid",
      });
    }
  } catch (error) {
    console.error("verifyRazorpayPayment error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Payment verification failed",
    });
  }
};

/** Get stored payment status by Razorpay order id. */
exports.getRazorpayPaymentStatus = async (req, res) => {
  try {
    const { orderId, userId } = req.query;

    if (!orderId || !userId) {
      return res.status(200).json({
        status: false,
        message: "orderId and userId are required.",
      });
    }

    const paymentRecord = await RazorpayPayment.findOne({
      razorpayOrderId: orderId,
      userId,
    }).lean();

    if (!paymentRecord) {
      return res.status(200).json({
        status: false,
        message: "Payment record not found.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Payment status fetched",
      payment: paymentRecord,
    });
  } catch (error) {
    console.error("getRazorpayPaymentStatus error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/** Mark payment failed (optional client callback on Razorpay error). */
exports.updateRazorpayPaymentFailed = async (req, res) => {
  try {
    const { userId, razorpayOrderId, reason } = req.body;

    if (!userId || !razorpayOrderId) {
      return res.status(200).json({
        status: false,
        message: "userId and razorpayOrderId are required.",
      });
    }

    const paymentRecord = await RazorpayPayment.findOne({
      razorpayOrderId,
      userId,
    });

    if (!paymentRecord) {
      return res.status(200).json({
        status: false,
        message: "Payment record not found.",
      });
    }

    if (paymentRecord.status === "fulfilled") {
      return res.status(200).json({
        status: true,
        message: "Payment already fulfilled.",
        paymentStatus: paymentRecord.status,
      });
    }

    paymentRecord.status = "failed";
    paymentRecord.failureReason = reason || "Payment failed or cancelled";
    await paymentRecord.save();

    return res.status(200).json({
      status: true,
      message: "Payment status updated to failed.",
      paymentStatus: paymentRecord.status,
    });
  } catch (error) {
    console.error("updateRazorpayPaymentFailed error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};
