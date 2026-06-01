/**
 * Ad budget in coins from file size, duration, ad type, and placement.
 */

const TYPE_MULTIPLIERS = {
  skippable: 1.5,
  "non-skippable": 2,
  overlay: 0.8,
  banner: 0.5,
};

const PLACEMENT_MULTIPLIERS = {
  "pre-roll": 1,
  "mid-roll": 1.2,
  both: 1.5,
};

/**
 * @param {object} params
 * @param {number} params.fileSizeMB
 * @param {number} params.durationSeconds - video length; 0 for image-only
 * @param {string} params.adType - skippable | non-skippable | banner | overlay
 * @param {string} params.placement - pre-roll | mid-roll | both
 * @param {"video"|"image"} [params.mediaType]
 */
function calculateAdBudget({
  fileSizeMB = 0,
  durationSeconds = 0,
  adType = "skippable",
  placement = "pre-roll",
  mediaType = "video",
}) {
  const sizeMB = Math.max(0, Number(fileSizeMB) || 0);
  const durationSec = Math.max(0, Number(durationSeconds) || 0);
  const type = String(adType || "skippable").toLowerCase();
  const place = String(placement || "pre-roll").toLowerCase();

  // Base cost from file size (MB)
  let budget = sizeMB * 10;

  if (mediaType === "video" && durationSec > 0) {
    // 2 coins per 10 seconds of video
    budget += Math.ceil(durationSec / 10) * 2;
  } else if (mediaType === "image") {
    budget += 5;
  }

  const typeMul = TYPE_MULTIPLIERS[type] ?? 1;
  const placeMul = PLACEMENT_MULTIPLIERS[place] ?? 1;

  budget *= typeMul * placeMul;

  return Math.max(1, Math.ceil(budget));
}

function getBudgetBreakdown(params) {
  const sizeMB = Math.max(0, Number(params.fileSizeMB) || 0);
  const durationSec = Math.max(0, Number(params.durationSeconds) || 0);
  const mediaType = params.mediaType === "image" ? "image" : "video";

  const sizeCost = Math.ceil(sizeMB * 10);
  const durationCost =
    mediaType === "video" && durationSec > 0
      ? Math.ceil(durationSec / 10) * 2
      : mediaType === "image"
        ? 5
        : 0;
  const subtotal = sizeCost + durationCost;
  const budget = calculateAdBudget({ ...params, mediaType });

  return {
    sizeCost,
    durationCost,
    subtotal,
    budget,
    fileSizeMB: sizeMB,
    durationSeconds: durationSec,
    adType: params.adType || "skippable",
    placement: params.placement || "pre-roll",
    mediaType,
  };
}

module.exports = calculateAdBudget;
module.exports.calculateAdBudget = calculateAdBudget;
module.exports.getBudgetBreakdown = getBudgetBreakdown;
