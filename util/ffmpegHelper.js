const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

// 1. Resolve ffmpeg path
let ffmpegPath = process.env.FFMPEG_PATH;
if (!ffmpegPath) {
  try {
    ffmpegPath = require("ffmpeg-static");
  } catch (err) {
    console.warn("ffmpeg-static not found, using system ffmpeg");
  }
}

// 2. Resolve ffprobe path
let ffprobePath = process.env.FFPROBE_PATH;
if (!ffprobePath) {
  try {
    const ffprobeStatic = require("ffprobe-static");
    ffprobePath = ffprobeStatic.path;
  } catch (err) {
    console.warn("ffprobe-static not found, using system ffprobe");
  }
}

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
  console.log("FFmpeg binary path configured:", ffmpegPath);
}
if (ffprobePath) {
  ffmpeg.setFfprobePath(ffprobePath);
  console.log("FFprobe binary path configured:", ffprobePath);
}

/**
 * Inspect video properties using ffprobe
 * @param {string} inputPath 
 * @returns {Promise<{width: number, height: number, duration: number, bitrate: number, isPortrait: boolean, fps: number, codec: string}>}
 */
const probeVideo = (inputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);

      const videoStream = (metadata.streams || []).find((s) => s.codec_type === "video");
      if (!videoStream) {
        return reject(new Error("No video stream found in file"));
      }

      // Check rotation metadata (some mobile cameras store rotation 90 or 270 in side data)
      let rotation = 0;
      if (videoStream.side_data_list) {
        const sideData = videoStream.side_data_list.find((sd) => sd.rotation !== undefined);
        if (sideData) rotation = parseInt(sideData.rotation) || 0;
      }
      if (videoStream.tags && videoStream.tags.rotate) {
        rotation = parseInt(videoStream.tags.rotate) || 0;
      }

      let width = videoStream.width || 0;
      let height = videoStream.height || 0;

      // If video is rotated 90 or 270 degrees, swap width & height
      if (Math.abs(rotation) === 90 || Math.abs(rotation) === 270) {
        const temp = width;
        width = height;
        height = temp;
      }

      const duration = parseFloat(metadata.format?.duration || videoStream.duration || 0);
      const bitrate = parseInt(metadata.format?.bit_rate || videoStream.bit_rate || 0);

      let fps = 30;
      if (videoStream.r_frame_rate) {
        const parts = videoStream.r_frame_rate.split("/");
        if (parts.length === 2 && parseInt(parts[1]) > 0) {
          fps = Math.round(parseInt(parts[0]) / parseInt(parts[1]));
        }
      }

      const isPortrait = height > width;

      resolve({
        width,
        height,
        duration,
        bitrate,
        isPortrait,
        fps,
        codec: videoStream.codec_name,
        rotation,
      });
    });
  });
};

module.exports = {
  ffmpeg,
  ffmpegPath,
  ffprobePath,
  probeVideo,
};
