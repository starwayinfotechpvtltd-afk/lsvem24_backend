const fs = require("fs");
const path = require("path");
const compressVideo = require("./videoProcessor");
const compressImage = require("./imageProcessor");

const uploadsDir = path.resolve(__dirname, "..", "uploads");

function getActiveStorage() {
  const settings = global.settingJSON || {};
  if (settings.storage?.local) return "local";
  if (settings.storage?.awsS3) return "aws";
  if (settings.storage?.digitalOcean) return "digitalocean";
  return "local";
}

function getLocalPathFromUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== "string") return null;

  try {
    let relative = "";
    if (fileUrl.includes("/uploads/")) {
      relative = decodeURIComponent(
        fileUrl.split("/uploads/")[1].split("?")[0],
      );
    } else if (fileUrl.startsWith("/uploads/")) {
      relative = decodeURIComponent(fileUrl.replace(/^\/uploads\//, ""));
    } else {
      return null;
    }

    if (!relative) return null;

    const absolute = path.join(uploadsDir, relative);
    if (!absolute.startsWith(uploadsDir) || !fs.existsSync(absolute)) {
      return null;
    }
    return absolute;
  } catch {
    return null;
  }
}

function buildPublicUrl(absolutePath, originalUrl) {
  const filename = path.basename(absolutePath);
  if (originalUrl && originalUrl.includes("/uploads/")) {
    const base = originalUrl.split("/uploads/")[0];
    return `${base}/uploads/${filename}`;
  }

  const port = process.env.PORT || 5001;
  let base = (process.env.baseURL || process.env.MEDIA_BASE_URL || "").trim();
  base = base.replace(/\/api\/?$/i, "").replace(/\/$/, "");
  if (!base) {
    base = `http://localhost:${port}`;
  } else if (!/^https?:\/\//i.test(base)) {
    base = `http://${base}`;
  }
  return `${base}/uploads/${filename}`;
}

async function optimizeVideoFile(inputPath, isShort) {
  const dir = path.dirname(inputPath);
  const outputPath = path.join(dir, `opt_${Date.now()}.mp4`);
  await compressVideo(inputPath, outputPath, isShort);
  try {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
  } catch (_) {}
  return outputPath;
}

async function optimizeImageFile(inputPath) {
  const dir = path.dirname(inputPath);
  const outputPath = path.join(dir, `opt_${Date.now()}.jpg`);
  await compressImage(inputPath, outputPath);
  try {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
  } catch (_) {}
  return outputPath;
}

/**
 * Re-encode locally stored uploads before saving video record.
 * Cloud URLs are returned unchanged (client already compresses).
 */
async function optimizeMediaUrls({ videoUrl, videoImage, isShort = false }) {
  if (getActiveStorage() !== "local") {
    return { videoUrl, videoImage };
  }

  let finalVideoUrl = videoUrl;
  let finalImageUrl = videoImage;

  const videoPath = getLocalPathFromUrl(videoUrl);
  if (videoPath) {
    try {
      const optimizedPath = await optimizeVideoFile(videoPath, isShort);
      finalVideoUrl = buildPublicUrl(optimizedPath, videoUrl);
    } catch (err) {
      console.warn("Server video optimize skipped:", err.message);
    }
  }

  const imagePath = getLocalPathFromUrl(videoImage);
  if (imagePath) {
    try {
      const optimizedPath = await optimizeImageFile(imagePath);
      finalImageUrl = buildPublicUrl(optimizedPath, videoImage);
    } catch (err) {
      console.warn("Server image optimize skipped:", err.message);
    }
  }

  return { videoUrl: finalVideoUrl, videoImage: finalImageUrl };
}

/** Optimize ad image/video URLs before saving VideoAd record. */
async function optimizeAdMediaUrls({ video, image, adRuns }) {
  const isShort = adRuns === "short videos";
  const { videoUrl, videoImage } = await optimizeMediaUrls({
    videoUrl: video || "",
    videoImage: image || "",
    isShort,
  });
  return { video: videoUrl || video || "", image: videoImage || image || "" };
}

module.exports = {
  optimizeMediaUrls,
  optimizeAdMediaUrls,
  getLocalPathFromUrl,
};
