const crypto = require("crypto");
const Razorpay = require("razorpay");

function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys are not configured in .env");
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret || !orderId || !paymentId || !signature) {
    return false;
  }
  const payload = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return expected === signature;
}

function verifyWebhookSignature({ rawBody, signature }) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !rawBody || !signature) {
    return false;
  }
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}

module.exports = {
  getRazorpayInstance,
  verifyPaymentSignature,
  verifyWebhookSignature,
};
