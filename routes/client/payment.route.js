const express = require("express");
const checkAccessWithSecretKey = require("../../checkAccess");
const {
  getRazorpayConfig,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getRazorpayPaymentStatus,
  updateRazorpayPaymentFailed,
} = require("../../controllers/client/payment.controller");

const payment = express.Router();

payment.get("/razorpay-config", checkAccessWithSecretKey(), getRazorpayConfig);
payment.post(
  "/razorpay/create-order",
  checkAccessWithSecretKey(),
  createRazorpayOrder,
);
payment.post(
  "/razorpay/verify",
  checkAccessWithSecretKey(),
  verifyRazorpayPayment,
);
payment.get(
  "/razorpay/status",
  checkAccessWithSecretKey(),
  getRazorpayPaymentStatus,
);
payment.post(
  "/razorpay/payment-failed",
  checkAccessWithSecretKey(),
  updateRazorpayPaymentFailed,
);

module.exports = payment;
