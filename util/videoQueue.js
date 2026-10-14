const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");
const { EventEmitter } = require("events");
const Video = require("../models/video.model");
const { transcodeToHLS } = require("./hlsTranscoder");

class VideoTranscodeQueue extends EventEmitter {
  constructor(concurrency = 1) {
    super();
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  /**
   * Add a video transcoding job to the queue
   * @param {{ videoId: string, videoUrl: string, videoType: number }} jobData 
   */
  enqueue(jobData) {
    console.log(`[VideoQueue] Enqueueing job for videoId: ${jobData.videoId}`);
    this.queue.push(jobData);
    this._processNext();
  }

  async _processNext() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.running++;
    const job = this.queue.shift();

    try {
      await this._executeJob(job);
    } catch (err) {
      console.error(`[VideoQueue] Job failed for videoId: ${job.videoId}`, err);
    } finally {
      this.running--;
      this._processNext();
    }
  }

  /**
   * Resolve video file from local path or remote URL
   */
  async _resolveLocalSource(job) {
    const { videoId, videoUrl } = job;
    const uploadsDir = path.resolve(__dirname, "../uploads");

    // 1. If it's already a relative path like "uploads/..." or "/uploads/..."
    let relative = videoUrl.replace(/^[a-zA-Z]+:\/\/[^/]+/, ""); // strip protocol & host
    if (relative.startsWith("/uploads/")) {
      relative = relative.replace(/^\/uploads\//, "");
    } else if (relative.startsWith("uploads/")) {
      relative = relative.replace(/^uploads\//, "");
    }

    const localAttempt = path.join(uploadsDir, relative);
    if (fs.existsSync(localAttempt)) {
      return { localPath: localAttempt, isTemp: false };
    }

    // 2. Also check if the filename exists directly in uploads
    const basename = path.basename(relative);
    const directLocal = path.join(uploadsDir, basename);
    if (fs.existsSync(directLocal)) {
      return { localPath: directLocal, isTemp: false };
    }

    // 3. If remote URL (e.g. S3 / DigitalOcean), download to temp file
    const tempDir = path.join(uploadsDir, "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempFilePath = path.join(tempDir, `${videoId}_source_${Date.now()}.mp4`);

    console.log(`[VideoQueue] Downloading remote video to ${tempFilePath} from ${videoUrl}...`);
    await this._downloadFile(videoUrl, tempFilePath);
    return { localPath: tempFilePath, isTemp: true };
  }

  _downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      const client = url.startsWith("https") ? https : http;

      client
        .get(url, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            // Handle redirects
            return this._downloadFile(res.headers.location, dest).then(resolve).catch(reject);
          }
          if (res.statusCode !== 200) {
            return reject(new Error(`Failed to download video, status code: ${res.statusCode}`));
          }
          res.pipe(file);
          file.on("finish", () => {
            file.close(resolve);
          });
        })
        .on("error", (err) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
    });
  }

  async _executeJob(job) {
    const { videoId, videoType } = job;
    console.log(`[VideoQueue] Starting transcode job for videoId: ${videoId}`);

    // Update status to processing
    await Video.findByIdAndUpdate(videoId, {
      $set: {
        processingStatus: "processing",
        processingProgress: 5,
      },
    });

    if (global.io) {
      global.io.emit("video_processing_progress", { videoId, progress: 5, status: "processing" });
    }

    let sourceInfo = null;

    try {
      sourceInfo = await this._resolveLocalSource(job);
      console.log(`[VideoQueue] Resolved source file path: ${sourceInfo.localPath}`);

      const result = await transcodeToHLS({
        inputPath: sourceInfo.localPath,
        videoId,
        videoType: parseInt(videoType) || 1,
        onProgress: async (progress) => {
          const validProgress = Number.isFinite(progress) && !Number.isNaN(progress)
            ? Math.max(0, Math.min(100, Math.round(progress)))
            : null;
          if (validProgress !== null) {
            await Video.findByIdAndUpdate(videoId, {
              $set: { processingProgress: validProgress },
            });
            if (global.io) {
              global.io.emit("video_processing_progress", { videoId, progress: validProgress, status: "processing" });
            }
          }
        },
      });

      // Update MongoDB document with HLS master URL, quality variants, and video specs
      await Video.findByIdAndUpdate(videoId, {
        $set: {
          hlsUrl: result.hlsUrl,
          videoUrl: result.hlsUrl, // Default playback URL is now adaptive HLS master
          processingStatus: "completed",
          processingProgress: 100,
          qualities: result.qualities,
          availableQualities: result.availableQualities,
          resolution: result.resolution,
          width: result.width,
          height: result.height,
          bitrate: result.bitrate,
          duration: Number.isFinite(result.duration) ? Math.round(result.duration) : 0,
        },
      });

      console.log(`[VideoQueue] Successfully transcoded video: ${videoId}`);
      console.log(`[VideoQueue] HLS Master: ${result.hlsUrl}`);

      if (global.io) {
        global.io.emit("video_transcoded", {
          videoId,
          status: "completed",
          hlsUrl: result.hlsUrl,
          qualities: result.qualities,
        });
      }
    } catch (err) {
      console.error(`[VideoQueue] Error during transcode for ${videoId}:`, err);

      await Video.findByIdAndUpdate(videoId, {
        $set: {
          processingStatus: "failed",
        },
      });

      if (global.io) {
        global.io.emit("video_transcode_failed", {
          videoId,
          status: "failed",
          error: err.message,
        });
      }
    } finally {
      // Clean up temporary downloaded file if used
      if (sourceInfo && sourceInfo.isTemp && fs.existsSync(sourceInfo.localPath)) {
        try {
          fs.unlinkSync(sourceInfo.localPath);
        } catch (e) {
          console.warn("Failed to remove temp source file:", e.message);
        }
      }
    }
  }
}

// Singleton background queue instance
const videoTranscodeQueue = new VideoTranscodeQueue(1);

module.exports = videoTranscodeQueue;
