const Withdraw = require("../../models/withdraw.model");

//get withdraw method added by admin
exports.withdrawList = async (req, res) => {
  try {
    const withdrawMethod = await Withdraw.find({ isEnabled: true }).sort({ createdAt: -1 });

    return res.status(200).json({ status: true, message: "finally, get withdraw method added by admin.", withdrawMethod });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};
