const express = require("express");
const router = express.Router();
const referralController = require("../../controllers/client/referral.controller");

router.get("/share-link/:userId", referralController.generateReferralLink);

router.get("/invite/:referralCode", referralController.openReferralLink);

module.exports = router;