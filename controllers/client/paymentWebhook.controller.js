const {
  verifyWebhookSignature,
} = require("../../util/razorpayClient");
const { fulfillRazorpayOrder } = require("../../services/razorpayPayment.service");

/** Razorpay server webhook — fulfills order after payment.captured. */
exports.razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
    if (!secret) {
      console.error("razorpayWebhook: RAZORPAY_WEBHOOK_SECRET is not set");
      return res.status(500).send("webhook secret not configured");
    }

    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.rawBody || "";

    if (!verifyWebhookSignature({ rawBody, signature })) {
      return res.status(401).json({
        status: false,
        message: "Invalid webhook signature",
      });
    }

    const event = req.body?.event;
    if (event !== "payment.captured") {
      return res.status(200).send("ignored");
    }

    const payment = req.body?.payload?.payment?.entity;
    const orderId = payment?.order_id;
    const paymentId = payment?.id;

    if (!orderId || !paymentId) {
      return res.status(200).send("missing payment data");
    }

    const result = await fulfillRazorpayOrder(orderId, {
      razorpayPaymentId: paymentId,
    });

    if (!result.ok && result.reason === "not_found") {
      console.warn("razorpayWebhook: order not found", orderId);
      return res.status(200).send("order not found");
    }

    return res.status(200).send("success");
  } catch (err) {
    console.error("razorpayWebhook error:", err);
    return res.status(500).send("error");
  }
};
