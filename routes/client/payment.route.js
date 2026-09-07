const express = require("express");
const route = express.Router();
const checkAccess = require("../../checkAccess");

const PaymentController = require("../../controllers/client/payment.controller");

// Razorpay Public Config for Mobile App
route.get("/razorpay-config", checkAccess(), PaymentController.getRazorpayConfig);

// Razorpay Order Creation
route.post("/razorpay/create-order", checkAccess(), PaymentController.createRazorpayOrder);

// Razorpay Payment Verification
route.post("/razorpay/verify", checkAccess(), PaymentController.verifyRazorpayPayment);

// Razorpay Order Status Check
route.get("/razorpay/status", checkAccess(), PaymentController.getRazorpayPaymentStatus);

// Razorpay Payment Failed Callback
route.post("/razorpay/payment-failed", checkAccess(), PaymentController.updateRazorpayPaymentFailed);

// Razorpay Webhook
route.post("/razorpay/webhook", PaymentController.razorpayWebhook);

module.exports = route;
