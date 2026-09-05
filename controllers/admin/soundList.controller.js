const SoundList = require("../../models/soundsList.model");

//import model
const SoundCategory = require("../../models/soundCategory.model");

//deleteFromStorage
const { deleteFromStorage } = require("../../util/storageHelper");

//create soundList by admin
exports.createSoundList = async (req, res) => {
  try {
    if (!req.body.singerName || !req.body.soundTitle || !req.body.soundLink || !req.body.soundTime || !req.body.soundImage || !req.body.soundCategoryId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!!" });
    }

    const soundCategory = await SoundCategory.findById(req.body.soundCategoryId);
    if (!soundCategory) {
      return res.status(200).json({ status: false, message: "soundCategory does not found!" });
    }

    const soundList = new SoundList();

    soundList.singerName = req.body.singerName;
    soundList.soundTitle = req.body.soundTitle;
    soundList.soundLink = req.body.soundLink;
    soundList.soundTime = req.body.soundTime;
    soundList.soundImage = req.body.soundImage;
    soundList.soundCategoryId = soundCategory._id;

    await soundList.save();

    const data = await SoundList.findById(soundList._id).populate("soundCategoryId", "name image");

    return res.status(200).json({
      status: true,
      message: "finally, soundList added by admin!",
      soundList: data,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

//update soundList by admin
exports.updateSoundList = async (req, res) => {
  try {
    if (!req.query.soundListId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!!" });
    }

    const soundList = await SoundList.findById(req.query.soundListId);
    if (!soundList) {
      return res.status(200).json({ status: false, message: "soundList does not found!" });
    }

    if (req.body.soundCategoryId) {
      const soundCategory = await SoundCategory.findById(req.body.soundCategoryId);
      if (!soundCategory) {
        return res.status(200).json({ status: false, message: "soundCategory does not found!" });
      }

      soundList.soundCategoryId = req.body.soundCategoryId ? soundCategory._id : soundList.soundCategoryId;
    }

    soundList.singerName = req.body.singerName ? req.body.singerName : soundList.singerName;
    soundList.soundTitle = req.body.soundTitle ? req.body.soundTitle : soundList.soundTitle;
    soundList.soundTime = req.body.soundTime ? req.body.soundTime : soundList.soundTime;

    if (req?.body?.soundLink) {
      if (soundList.soundLink) {
        await deleteFromStorage(soundList.soundLink);
      }

      soundList.soundLink = req.body.soundLink ? req.body.soundLink : soundList.soundLink;
    }

    if (req?.body?.soundImage) {
      if (soundList.soundImage) {
        await deleteFromStorage(soundList.soundImage);
      }

      soundList.soundImage = req.body.soundImage ? req.body.soundImage : soundList.soundImage;
      console.log("updated soundList soundImage: ", soundList.soundImage);
    }

    await soundList.save();

    const data = await SoundList.findById(soundList._id).populate("soundCategoryId", "name image");

    return res.status(200).json({
      status: true,
      message: "finally, soundList updated by admin!",
      soundList: data,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

//get all soundList
exports.getSoundList = async (req, res, next) => {
  try {
    const data = await SoundList.find().populate("soundCategoryId", "name image").sort({ createdAt: -1 });

    return res.status(200).json({ status: true, message: "finally, get all soundList by admin!", soundList: data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};

//delete soundList by admin (multiple or single)
exports.deleteSoundList = async (req, res) => {
  try {
    if (!req.query.soundListId) {
      return res.status(200).json({ status: false, message: "soundListId must be required!" });
    }

    const soundListIds = req.query.soundListId.split(",");

    const soundLists = await Promise.all(soundListIds.map((Id) => SoundList.findById(Id)));
    if (soundLists.some((soundList) => !soundList)) {
      return res.status(200).json({ status: false, message: "No soundLists found with the provided IDs." });
    }

    //delete soundImage and soundLink from DigitalOcean Spaces
    for (const soundListId of soundListIds) {
      const soundList = await SoundList.findById(soundListId);

      if (soundList?.soundImage) {
        await deleteFromStorage(soundList?.soundImage);
      }

      if (soundList?.soundLink) {
        await deleteFromStorage(soundList?.soundLink);
      }
    }

    const result = await SoundList.deleteMany({ _id: { $in: soundListIds } });
    if (result.deletedCount > 0) {
      return res.status(200).json({ status: true, message: "finally, soundLists has been deleted by admin!" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};
