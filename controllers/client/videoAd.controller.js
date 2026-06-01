const mongoose = require("mongoose");
const VideoAd = require("../../models/videoAdvertise.model");
const Zone = require("../../models/zone.model");
const { resolveMatchingZones } = require("../../util/zoneResolver");
const { optimizeAdMediaUrls } = require("../../util/optimizeUploadedMedia");
const User = require("../../models/user.model");
const {
  calculateAdBudget,
  getBudgetBreakdown,
} = require("../../util/adBudgetCalculator");

function parseDurationSeconds(body) {
  const ms = parseInt(body.durationMs ?? body.videoTimeMs, 10);
  if (!Number.isNaN(ms) && ms > 0) {
    return Math.ceil(ms / 1000);
  }
  const raw = parseInt(
    body.durationSeconds ?? body.duration ?? body.videoTime,
    10,
  );
  if (Number.isNaN(raw) || raw <= 0) return 0;
  if (raw > 3600) return Math.ceil(raw / 1000);
  return raw;
}

function resolvePlacement(placement) {
  const p = String(placement || "pre-roll").toLowerCase();
  return ["pre-roll", "mid-roll", "both"].includes(p) ? p : "pre-roll";
}

const calculateBudget = async (req, res) => {
  try {
    const { userId, fileSizeMB, type, placement, mediaType } = req.body;

    if (!userId) {
      return res.status(200).json({
        status: false,
        message: "userId is required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(200).json({
        status: false,
        message: "User not found",
      });
    }

    const durationSeconds = parseDurationSeconds(req.body);
    const hasVideo = String(mediaType || "").toLowerCase() === "video";
    const breakdown = getBudgetBreakdown({
      fileSizeMB: Number(fileSizeMB) || 0,
      durationSeconds,
      adType: type || "skippable",
      placement: resolvePlacement(placement),
      mediaType: hasVideo ? "video" : "image",
    });

    const currentCoin = user.currentCoin ?? 0;
    const purchasedCoin = user.purchasedCoin ?? 0;

    return res.status(200).json({
      status: true,
      budget: breakdown.budget,
      breakdown,
      currentCoin: currentCoin,
      purchasedCoin,
      canUpload: currentCoin >= breakdown.budget,
    });
  } catch (e) {
    return res.status(500).json({
      status: false,
      message: e.message,
    });
  }
};



const uploadVideoAd = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      duration,
      skipAfter,
      ctaText,
      ctaLink,
      targetTags,
      zones,
      country,
      budget,
      state,
      city,
      category,
      video,
      image,
      adRuns,
      placement,
    } = req.body;

    const { userId } = req.query;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(200).json({
        status: false,
        message: "User not found.",
      });
    }

    if (!video && !image) {
      return res.status(200).json({
        status: false,
        message: "Please upload image or video.",
      });
    }

    const tagsArray = targetTags
      ? String(targetTags)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    let zoneIds = [];
    if (zones) {
      try {
        zoneIds = JSON.parse(zones);
      } catch {
        zoneIds = String(zones)
          .split(",")
          .map((z) => z.trim())
          .filter(Boolean);
      }
      const validZones = await Zone.find({
        _id: { $in: zoneIds },
        isActive: true,
      });
      if (validZones.length !== zoneIds.length) {
        return res.status(200).json({
          status: false,
          message: "One or more zone IDs are invalid.",
        });
      }
    }

    const runs = adRuns || "long videos";
    const { video: optimizedVideo, image: optimizedImage } =
      await optimizeAdMediaUrls({
        video: video || "",
        image: image || "",
        adRuns: runs,
      });

    const durationSeconds = parseDurationSeconds(req.body);
    const placementValue = resolvePlacement(placement);
    const fileSizeMB = Number(req.body.fileSizeMB) || 0;
    const mediaType = video ? "video" : "image";

    const calculatedBudget = calculateAdBudget({
      fileSizeMB,
      durationSeconds,
      adType: type || "skippable",
      placement: placementValue,
      mediaType,
    });

    const budgetToCharge = calculatedBudget;

    const currentCoin = user.currentCoin ?? 0;

    if (budgetToCharge > currentCoin) {
      return res.status(200).json({
        status: false,
        message: "Insufficient coins. Ad budget exceeds your coin balance.",
        budget: budgetToCharge,
        currentCoin: currentCoin,
        purchasedCoin: user.purchasedCoin ?? 0,
      });
    }

  
    const ad = await VideoAd.create({
      video: optimizedVideo || null,
      image: optimizedImage || null,
      title,
      description,
      type: type || "skippable",
      duration,
      skipAfter: skipAfter || 5,
      ctaText,
      ctaLink,
      targetTags: tagsArray,
      zones: zoneIds,
      country,
      state,
      city,
      category,
      budget: budgetToCharge,
      userId,
      adRuns: runs,
      placement: placementValue,
    });

    user.currentCoin = currentCoin - budgetToCharge;
    user.usedForAdsCoin = (user.usedForAdsCoin ?? 0) + budgetToCharge;
    await user.save();

    return res.status(200).json({
      status: true,
      message: "Ad created successfully",
      ad,
    });
  } catch (error) {
    console.error("Upload ad failed", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Server error",
    });
  }
};

const getAdsByLocation = async (req, res) => {
  try {
    const { placement, country, state, city, lat, lng } = req.query;

    const now = new Date();
    const baseQuery = {
      isActive: true,
      $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }],
    };

    if (placement && ["pre-roll", "mid-roll", "both"].includes(placement)) {
      baseQuery.placement = { $in: [placement, "both"] };
    }

    const allZones = await Zone.find({ isActive: true });

    const matchedZoneIds = resolveMatchingZones(
      { country, state, city, lat: parseFloat(lat), lng: parseFloat(lng) },
      allZones,
    );

    let ads = [];

    if (matchedZoneIds.length > 0) {
      ads = await VideoAd.find({
        ...baseQuery,
        zones: { $in: matchedZoneIds },
      }).populate("zones", "name");
    }

    if (ads.length === 0) {
      ads = await VideoAd.find({
        ...baseQuery,
        $or: [{ zones: { $size: 0 } }, { zones: { $exists: false } }],
      });
    }

    return res.status(200).json({
      message: "Ads fetched successfully",
      status: true,
      ads,
      matchedZones: matchedZoneIds,
    });
  } catch (error) {
    console.error("Get ads by location failed", error);
    return res.status(500).json({ message: "Server error", status: false });
  }
};

const getAllVideoAd = async (req, res) => {
  try {
    const videos = await VideoAd.find({}).populate("zones", "name description");
    return res
      .status(200)
      .json({ message: "Video Ads fetched", status: true, videos });
  } catch {
    return res.status(500).json({ message: "Server error", status: false });
  }
};

const videoAdById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid ID", status: false });

    const video = await VideoAd.findById(id).populate("zones", "name");
    if (!video)
      return res.status(404).json({ message: "Ad not found", status: false });
    return res.status(200).json({ message: "Ad fetched", status: true, video });
  } catch {
    return res.status(500).json({ message: "Server error", status: false });
  }
};

const trackAdView = async (req, res) => {
  try {
    const { id } = req.params;
    await VideoAd.findByIdAndUpdate(id, { $inc: { views: 1 } });
    return res.status(200).json({ message: "View tracked", status: true });
  } catch {
    return res.status(500).json({ message: "Server error", status: false });
  }
};

const trackAdClick = async (req, res) => {
  try {
    const { id } = req.params;
    await VideoAd.findByIdAndUpdate(id, { $inc: { clicks: 1 } });
    return res.status(200).json({ message: "Click tracked", status: true });
  } catch {
    return res.status(500).json({ message: "Server error", status: false });
  }
};

/** Active ads for long-form video (pre-roll / mid-roll). */
const getLongVideoAds = async (req, res) => {
  try {
    const { placement } = req.query;
    const now = new Date();
    const query = {
      isActive: true,
      adRuns: { $in: ["long videos", "both videos"] },
      $and: [
        { $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }] },
        {
          $or: [
            { video: { $exists: true, $nin: [null, ""] } },
            { image: { $exists: true, $nin: [null, ""] } },
          ],
        },
      ],
    };

    if (placement && ["pre-roll", "mid-roll", "both"].includes(placement)) {
      query.placement = { $in: [placement, "both"] };
    }

    const ads = await VideoAd.find(query)
      .select(
        "video image title description ctaText ctaLink type placement skipAfter duration adRuns",
      )
      .lean();

    const playable = ads.filter(
      (ad) =>
        (ad.video && String(ad.video).trim() !== "") ||
        (ad.image && String(ad.image).trim() !== ""),
    );

    return res.status(200).json({
      message: "Long video ads fetched",
      status: true,
      ads: playable,
    });
  } catch (error) {
    console.error("Get long video ads failed", error);
    return res.status(500).json({ message: "Server error", status: false });
  }
};

/** Active ads eligible for the shorts vertical feed (image and/or video). */
const getShortsFeedAds = async (req, res) => {
  try {
    const now = new Date();
    const ads = await VideoAd.find({
      isActive: true,
      adRuns: { $in: ["short videos", "both videos"] },
      $and: [
        { $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }] },
        {
          $or: [
            { video: { $exists: true, $nin: [null, ""] } },
            { image: { $exists: true, $nin: [null, ""] } },
          ],
        },
      ],
    })
      .select("video image title description ctaText ctaLink type adRuns")
      .lean();

    const playable = ads.filter(
      (ad) =>
        (ad.video && String(ad.video).trim() !== "") ||
        (ad.image && String(ad.image).trim() !== ""),
    );

    return res.status(200).json({
      message: "Shorts feed ads fetched",
      status: true,
      ads: playable,
    });
  } catch (error) {
    console.error("Get shorts feed ads failed", error);
    return res.status(500).json({ message: "Server error", status: false });
  }
};

module.exports = {
  uploadVideoAd,
  calculateBudget,
  getAllVideoAd,
  videoAdById,
  getAdsByLocation,
  getShortsFeedAds,
  getLongVideoAds,
  trackAdView,
  trackAdClick,
};
