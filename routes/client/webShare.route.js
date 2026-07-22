const express = require("express");
const router = express.Router();
const webShareController = require("../../controllers/client/webShare.controller");

// Video share links (long & shorts & legacy)
router.get("/videos/:slugOrId", webShareController.openVideoShareLink);
router.get("/shorts/:slugOrId", webShareController.openVideoShareLink);
router.get("/video/:slugOrId", webShareController.openVideoShareLink);

// Referral share links
router.get("/invite/:referralCode", webShareController.openReferralShareLink);
router.get("/referral/:referralCode", webShareController.openReferralShareLink);

module.exports = router;
