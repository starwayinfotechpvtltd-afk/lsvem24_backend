const User = require("../../models/user.model");

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.lsvem24.app";

const WEBSITE_URL = "https://api.lsvem24.com";

exports.generateReferralLink = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const referralLink = `${WEBSITE_URL}/invite/${user.referralCode}`;

    return res.status(200).json({
      status: true,
      referralCode: user.referralCode,
      referralLink,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.openReferralLink = async (req, res) => {
  try {
    const { referralCode } = req.params;

    const user = await User.findOne({
      referralCode,
      isActive: true,
    });

    if (!user) {
      return res.redirect(
        "https://play.google.com/store/apps/details?id=com.lsvem24.app"
      );
    }

    return res.redirect(
      `${PLAY_STORE_URL}&referrer=${encodeURIComponent(referralCode)}`
    );
  } catch (error) {
    console.log(error);

    return res.redirect(
      "https://play.google.com/store/apps/details?id=com.lsvem24.app"
    );
  }
};