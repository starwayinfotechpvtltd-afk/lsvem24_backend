const Setting = require("../../models/setting.model");
const Advertise = require("../../models/advertise.model");

function toPlainDoc(doc) {
  if (!doc) return {};
  if (doc._doc && typeof doc._doc === "object") return { ...doc._doc };
  return { ...doc };
}

//get setting
exports.get = async (req, res) => {
  try {
    const [advertise, setting] = await Promise.all([
      Advertise.findOne().sort({ createdAt: -1 }),
      global.settingJSON ? global.settingJSON : null,
    ]);

    if (!setting) {
      return res.status(200).json({ status: false, message: "Setting does not found." });
    }

    const settingPayload = {
      ...toPlainDoc(setting),
      ...toPlainDoc(advertise),
    };

    // Take Razorpay details strictly from environment variables (.env)
    const rzpSwitch = process.env.RAZORPAY_SWITCH;
    const isRzpSwitchEnabled =
      rzpSwitch === undefined || rzpSwitch === "true" || rzpSwitch === true;
    settingPayload.razorPayId = process.env.RAZORPAY_KEY_ID || "";
    settingPayload.razorPaySwitch = Boolean(
      process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      isRzpSwitchEnabled
    );
    delete settingPayload.razorSecretKey;

    return res.status(200).json({
      status: true,
      message: "Success",
      setting: settingPayload,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};
