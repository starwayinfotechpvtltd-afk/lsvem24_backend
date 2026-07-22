const VideoAd = require("../../models/videoAdvertise.model");
const { generateUniqueAdsId } = require("../../util/generateUniqueAdsId");
const mongoose=require("mongoose")

// ─── CREATE ──────────────────────────────────────────────────────────────────

exports.createAd = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      placement,
      duration,
      skipAfter,
      ctaText,
      ctaLink,
      targetTags,
      zones,
      expiresAt,
      isActive,
      userId
    } = req.body;

    // Store the multer file path directly (e.g. served via express.static)
    const videoUrl = req.files?.video?.[0]?.path ?? null;
    const imageUrl = req.files?.image?.[0]?.path ?? null;


    if(!title || !description || !type || !placement || !targetTags || !zones || !expiresAt || !userId || (!videoUrl || !imageUrl)){
      return res.json({status: false, message: "All fields are required"})
    }

    const ad = await VideoAd.create({
      title,
      description,
      type,
      placement,
      duration: Number(duration),
      skipAfter: skipAfter ? Number(skipAfter) : 5,
      ctaText,
      ctaLink,
      targetTags: targetTags ? JSON.parse(targetTags) : [],
      zones: zones ? JSON.parse(zones) : [],
      expiresAt: expiresAt || null,
      isActive:
        isActive !== undefined
          ? isActive === "true" || isActive === true
          : true,
      isVerified: true,
      video: videoUrl,
      image: imageUrl,
      userId,
      adRuns: req.body.adRuns || "long videos",
      uniqueAdsId: generateUniqueAdsId()
    });

    res.status(201).json({ success: true, data: ad });
  } catch (err) {
    console.error("createAd error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET ALL ─────────────────────────────────────────────────────────────────

exports.getAllAds = async (req, res) => {
  try {
    console.log("Query", req.query);
    const {
      page = 1,
      limit = 10,
      type,
      placement,
      isActive,
      isVerified,
      search,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const filter = {};

    if (placement && placement !== "All") {
      filter.placement = placement;
    }

    if (isActive !== undefined && isActive !== "" && isActive !== "All") {
      filter.isActive = isActive === "true";
    }

    if (isVerified !== undefined && isVerified !== "" && isVerified !== "All") {
      filter.isVerified = isVerified === "true";
    }

    if (search && search !== "All" && search.trim() !== "") {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    console.log("Final Filter:", filter);

    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    const [ads, total] = await Promise.all([
      VideoAd.find(filter)
        .populate("zones", "name")
        .populate("userId", "fullName image uniqueId")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(Number(limit)),
      VideoAd.countDocuments(filter),
    ]);

    console.log("All ads", ads);

    res.status(200).json({
      success: true,
      data: ads,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("getAllAds error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET ONE ─────────────────────────────────────────────────────────────────

exports.getAdById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("Find ads by id:", id);

    // Validate MongoDB ObjectId first
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ad id",
      });
    }

    const ad = await VideoAd.findById(id).populate("zones", "name");

    console.log("Ad:", ad);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "Ad not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: ad,
    });
  } catch (err) {
    console.error("getAdById error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getAdByUser = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("Find ads by id:", id);

    // Validate MongoDB ObjectId first
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ad id",
      });
    }

    const ad = await VideoAd.find({userId: id})

    console.log("Ad:", ad);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "Ad not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: ad,
    });
  } catch (err) {
    console.error("getAdById error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────

exports.updateAd = async (req, res) => {
  try {
    const ad = await VideoAd.findById(req.params.id);
    if (!ad)
      return res.status(404).json({ success: false, message: "Ad not found" });

    const {
      title,
      description,
      type,
      placement,
      duration,
      skipAfter,
      ctaText,
      ctaLink,
      targetTags,
      zones,
      expiresAt,
      isActive,
    } = req.body;

    // Only overwrite media if a new file was uploaded
    if (req.files?.video?.[0]) ad.video = req.files.video[0].path;
    if (req.files?.image?.[0]) ad.image = req.files.image[0].path;

    if (title !== undefined) ad.title = title;
    if (description !== undefined) ad.description = description;
    if (type !== undefined) ad.type = type;
    if (placement !== undefined) ad.placement = placement;
    if (duration !== undefined) ad.duration = Number(duration);
    if (skipAfter !== undefined) ad.skipAfter = Number(skipAfter);
    if (ctaText !== undefined) ad.ctaText = ctaText;
    if (ctaLink !== undefined) ad.ctaLink = ctaLink;
    if (targetTags !== undefined) ad.targetTags = JSON.parse(targetTags);
    if (zones !== undefined) ad.zones = JSON.parse(zones);
    if (expiresAt !== undefined) ad.expiresAt = expiresAt || null;
    if (isActive !== undefined)
      ad.isActive = isActive === "true" || isActive === true;
    if (req.body.isVerified !== undefined)
      ad.isVerified = req.body.isVerified === "true" || req.body.isVerified === true;
    if (req.body.adRuns !== undefined) ad.adRuns = req.body.adRuns;

    await ad.save();
    res.status(200).json({ success: true, data: ad });
  } catch (err) {
    console.error("updateAd error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────

exports.deleteAd = async (req, res) => {
  try {
    const ad = await VideoAd.findByIdAndDelete(req.params.id);
    if (!ad)
      return res.status(404).json({ success: false, message: "Ad not found" });
    res.status(200).json({ success: true, message: "Ad deleted successfully" });
  } catch (err) {
    console.error("deleteAd error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── BULK DELETE ──────────────────────────────────────────────────────────────

exports.bulkDeleteAds = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length)
      return res
        .status(400)
        .json({ success: false, message: "No IDs provided" });

    const result = await VideoAd.deleteMany({ _id: { $in: ids } });
    res
      .status(200)
      .json({ success: true, message: `${result.deletedCount} ad(s) deleted` });
  } catch (err) {
    console.error("bulkDeleteAds error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── TOGGLE ACTIVE ────────────────────────────────────────────────────────────

exports.toggleAdStatus = async (req, res) => {
  try {
    const ad = await VideoAd.findById(req.params.id);
    if (!ad)
      return res.status(404).json({ success: false, message: "Ad not found" });

    ad.isActive = !ad.isActive;
    await ad.save();

    res.status(200).json({
      success: true,
      message: `Ad is now ${ad.isActive ? "active" : "inactive"}`,
      isActive: ad.isActive,
    });
  } catch (err) {
    console.error("toggleAdStatus error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── TOGGLE VERIFICATION ──────────────────────────────────────────────────────

exports.toggleAdVerification = async (req, res) => {
  try {
    const ad = await VideoAd.findById(req.params.id);
    if (!ad)
      return res.status(404).json({ success: false, message: "Ad not found" });

    ad.isVerified = !ad.isVerified;
    await ad.save();

    res.status(200).json({
      success: true,
      message: `Ad is now ${ad.isVerified ? "verified" : "unverified"}`,
      isVerified: ad.isVerified,
    });
  } catch (err) {
    console.error("toggleAdVerification error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── BULK TOGGLE ──────────────────────────────────────────────────────────────

exports.bulkToggleStatus = async (req, res) => {
  try {
    const { ids, isActive } = req.body;
    if (!ids || !ids.length)
      return res
        .status(400)
        .json({ success: false, message: "No IDs provided" });

    await VideoAd.updateMany(
      { _id: { $in: ids } },
      { $set: { isActive: Boolean(isActive) } },
    );

    res.status(200).json({
      success: true,
      message: `${ids.length} ad(s) set to ${isActive ? "active" : "inactive"}`,
    });
  } catch (err) {
    console.error("bulkToggleStatus error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── BULK TOGGLE VERIFICATION ─────────────────────────────────────────────────

exports.bulkToggleVerification = async (req, res) => {
  try {
    const { ids, isVerified } = req.body;
    if (!ids || !ids.length)
      return res
        .status(400)
        .json({ success: false, message: "No IDs provided" });

    await VideoAd.updateMany(
      { _id: { $in: ids } },
      { $set: { isVerified: Boolean(isVerified) } },
    );

    res.status(200).json({
      success: true,
      message: `${ids.length} ad(s) set to ${isVerified ? "verified" : "unverified"}`,
    });
  } catch (err) {
    console.error("bulkToggleVerification error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── RECORD VIEW ──────────────────────────────────────────────────────────────

exports.recordView = async (req, res) => {
  try {
    const ad = await VideoAd.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true, select: "views" },
    );
    if (!ad)
      return res.status(404).json({ success: false, message: "Ad not found" });
    res.status(200).json({ success: true, views: ad.views });
  } catch (err) {
    console.error("recordView error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── RECORD CLICK ─────────────────────────────────────────────────────────────

exports.recordClick = async (req, res) => {
  try {
    const ad = await VideoAd.findByIdAndUpdate(
      req.params.id,
      { $inc: { clicks: 1 } },
      { new: true, select: "clicks" },
    );
    if (!ad)
      return res.status(404).json({ success: false, message: "Ad not found" });
    res.status(200).json({ success: true, clicks: ad.clicks });
  } catch (err) {
    console.error("recordClick error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── ANALYTICS SUMMARY ────────────────────────────────────────────────────────

exports.getAnalytics = async (req, res) => {
  try {
    const [totals, byType, byPlacement, topAds] = await Promise.all([
      VideoAd.aggregate([
        {
          $group: {
            _id: null,
            totalAds: { $sum: 1 },
            totalViews: { $sum: "$views" },
            totalClicks: { $sum: "$clicks" },
            activeAds: { $sum: { $cond: ["$isActive", 1, 0] } },
          },
        },
      ]),
      VideoAd.aggregate([
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
            views: { $sum: "$views" },
            clicks: { $sum: "$clicks" },
          },
        },
      ]),
      VideoAd.aggregate([
        {
          $group: {
            _id: "$placement",
            count: { $sum: 1 },
            views: { $sum: "$views" },
            clicks: { $sum: "$clicks" },
          },
        },
      ]),
      VideoAd.find()
        .sort({ clicks: -1 })
        .limit(5)
        .select("title views clicks type isActive"),
    ]);

    const summary = totals[0] || {
      totalAds: 0,
      totalViews: 0,
      totalClicks: 0,
      activeAds: 0,
    };
    const ctr =
      summary.totalViews > 0
        ? ((summary.totalClicks / summary.totalViews) * 100).toFixed(2)
        : "0.00";

    res.status(200).json({
      success: true,
      data: {
        summary: { ...summary, ctr: `${ctr}%` },
        byType,
        byPlacement,
        topAds,
      },
    });
  } catch (err) {
    console.error("getAnalytics error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET ACTIVE ADS (for video player) ────────────────────────────────────────

exports.getActiveAds = async (req, res) => {
  try {
    const { type, placement, tags } = req.query;

    const filter = {
      isActive: true,
      isVerified: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    };

    if (type) filter.type = type;
    if (placement) filter.placement = { $in: [placement, "both"] };
    if (tags) {
      const tagArray = tags.split(",").map((t) => t.trim());
      filter.targetTags = { $in: tagArray };
    }

    const ads = await VideoAd.find(filter)
      .populate("zones", "name")
      .select("-__v");
    res.status(200).json({ success: true, data: ads });
  } catch (err) {
    console.error("getActiveAds error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── RESET STATS ──────────────────────────────────────────────────────────────

exports.resetAdStats = async (req, res) => {
  try {
    const ad = await VideoAd.findByIdAndUpdate(
      req.params.id,
      { $set: { views: 0, clicks: 0 } },
      { new: true },
    );
    if (!ad)
      return res.status(404).json({ success: false, message: "Ad not found" });
    res.status(200).json({ success: true, message: "Stats reset", data: ad });
  } catch (err) {
    console.error("resetAdStats error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
