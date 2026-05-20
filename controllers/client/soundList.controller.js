const SoundList = require("../../models/soundsList.model");

//get all soundList for user
exports.getSoundList = async (req, res, next) => {
  try {
    const data = await SoundList.find().populate("soundCategoryId", "name image");

    return res.status(200).json({ status: true, message: "Success", soundList: data.length > 0 ? data : [] });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};
