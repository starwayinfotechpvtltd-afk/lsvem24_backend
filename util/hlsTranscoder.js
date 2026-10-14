const path = require("path");
const fs = require("fs");
const { S3, PutObjectCommand } = require("@aws-sdk/client-s3");
const { ffmpeg, probeVideo } = require("./ffmpegHelper");

// Target quality profiles
const LANDSCAPE_PROFILES = [
  { label: "1080p", height: 1080, width: 1920, videoBitrate: "4500k", maxrate: "5000k", bufsize: "9000k", audioBitrate: "128k", bandwidth: 5000000 },
  { label: "720p",  height: 720,  width: 1280, videoBitrate: "2500k", maxrate: "2800k", bufsize: "5000k", audioBitrate: "128k", bandwidth: 2800000 },
  { label: "480p",  height: 480,  width: 854,  videoBitrate: "1000k", maxrate: "1200k", bufsize: "2000k", audioBitrate: "96k",  bandwidth: 1200000 },
  { label: "360p",  height: 360,  width: 640,  videoBitrate: "600k",  maxrate: "700k",  bufsize: "1200k", audioBitrate: "64k",  bandwidth: 700000 },
  { label: "144p",  height: 144,  width: 256,  videoBitrate: "200k",  maxrate: "250k",  bufsize: "400k", audioBitrate: "48k",  bandwidth: 250000 },
];

const PORTRAIT_PROFILES = [
  { label: "1080p", height: 1920, width: 1080, videoBitrate: "3500k", maxrate: "4000k", bufsize: "7000k", audioBitrate: "128k", bandwidth: 4000000 },
  { label: "720p",  height: 1280, width: 720,  videoBitrate: "2000k", maxrate: "2400k", bufsize: "4000k", audioBitrate: "128k", bandwidth: 2400000 },
  { label: "480p",  height: 854,  width: 480,  videoBitrate: "900k",  maxrate: "1100k", bufsize: "1800k", audioBitrate: "96k",  bandwidth: 1100000 },
  { label: "360p",  height: 640,  width: 360,  videoBitrate: "500k",  maxrate: "600k",  bufsize: "1000k", audioBitrate: "64k",  bandwidth: 600000 },
  { label: "144p",  height: 256,  width: 144,  videoBitrate: "150k",  maxrate: "200k",  bufsize: "300k", audioBitrate: "48k",  bandwidth: 200000 },
];

/**
 * Filter available profiles based on original resolution.
 * Rule: Do not generate a quality higher than the original video resolution.
 */
function getTargetProfiles(originalWidth, originalHeight, isPortrait) {
  const baseProfiles = isPortrait ? PORTRAIT_PROFILES : LANDSCAPE_PROFILES;
  
  const eligible = baseProfiles.filter((profile) => {
    if (isPortrait) {
      // For vertical shorts, compare width primarily (and height)
      return profile.width <= originalWidth && profile.height <= originalHeight;
    } else {
      // For landscape, compare height primarily
      return profile.height <= originalHeight;
    }
  });

  // If source resolution is lower than lowest ladder (e.g. 240p), include at least original resolution
  if (eligible.length === 0) {
    const label = `${Math.min(originalWidth, originalHeight)}p`;
    eligible.push({
      label,
      width: originalWidth % 2 === 0 ? originalWidth : originalWidth - 1,
      height: originalHeight % 2 === 0 ? originalHeight : originalHeight - 1,
      videoBitrate: "400k",
      maxrate: "500k",
      bufsize: "1000k",
      audioBitrate: "64k",
      bandwidth: 500000,
      isOriginal: true,
    });
  }

  return eligible;
}

/**
 * Transcode single resolution profile into HLS segments and playlist.
 */
function transcodeProfile({ inputPath, outputDir, profile, isPortrait, segmentDuration, fps = 30, onProgress }) {
  return new Promise((resolve, reject) => {
    const qualityDir = path.join(outputDir, profile.label);
    if (!fs.existsSync(qualityDir)) {
      fs.mkdirSync(qualityDir, { recursive: true });
    }

    const playlistPath = path.join(qualityDir, "index.m3u8");
    const segmentPattern = path.join(qualityDir, "segment_%03d.ts");

    // Scale filter preserving aspect ratio with even dimensions
    let scaleFilter;
    if (isPortrait) {
      scaleFilter = `scale=${profile.width}:-2`;
    } else {
      scaleFilter = `scale=-2:${profile.height}`;
    }

    const validFps = Math.max(15, Math.min(60, Math.round(fps || 30)));
    const gopSize = Math.round(validFps * segmentDuration);

    const command = ffmpeg(inputPath)
      .outputOptions([
        "-c:v libx264",
        "-preset veryfast",
        "-pix_fmt yuv420p",
        `-vf ${scaleFilter}`,
        `-b:v ${profile.videoBitrate}`,
        `-maxrate ${profile.maxrate}`,
        `-bufsize ${profile.bufsize}`,
        "-c:a aac",
        `-b:a ${profile.audioBitrate}`,
        "-ar 44100",
        "-ac 2",
        `-g ${gopSize}`,
        `-keyint_min ${gopSize}`,
        "-sc_threshold 0",
        `-force_key_frames expr:gte(t,n_forced*${segmentDuration})`,
        `-hls_time ${segmentDuration}`,
        "-hls_playlist_type vod",
        "-hls_flags independent_segments",
        `-hls_segment_filename ${segmentPattern}`,
      ])
      .output(playlistPath);

    if (onProgress) {
      command.on("progress", (progress) => {
        onProgress(progress);
      });
    }

    command
      .on("end", () => {
        // Probe actual output resolution to register exact dimensions
        probeVideo(playlistPath)
          .then((meta) => {
            resolve({
              label: profile.label,
              width: meta.width || profile.width,
              height: meta.height || profile.height,
              bitrate: profile.bandwidth,
              playlistFile: `${profile.label}/index.m3u8`,
            });
          })
          .catch(() => {
            resolve({
              label: profile.label,
              width: profile.width,
              height: profile.height,
              bitrate: profile.bandwidth,
              playlistFile: `${profile.label}/index.m3u8`,
            });
          });
      })
      .on("error", (err, stdout, stderr) => {
        console.error(`Transcode failed for ${profile.label}:`, err.message);
        reject(new Error(`FFmpeg error on ${profile.label}: ${err.message}`));
      })
      .run();
  });
}

/**
 * Generate HLS master playlist (master.m3u8) referencing all variant renditions.
 */
function generateMasterPlaylist(outputDir, renditions) {
  let masterContent = "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-INDEPENDENT-SEGMENTS\n\n";

  // Sort lowest quality to highest (ascending) so initial chunk startup is instantaneous on all networks
  const sorted = [...renditions].sort((a, b) => a.bitrate - b.bitrate);

  for (const rendition of sorted) {
    const avgBandwidth = Math.round(rendition.bitrate * 0.9);
    let codecs = "avc1.4d401f,mp4a.40.2";
    if (rendition.height >= 1080) {
      codecs = "avc1.640028,mp4a.40.2";
    } else if (rendition.height <= 360) {
      codecs = "avc1.42e01e,mp4a.40.2";
    }

    masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${rendition.bitrate},AVERAGE-BANDWIDTH=${avgBandwidth},RESOLUTION=${rendition.width}x${rendition.height},FRAME-RATE=30.000,CODECS="${codecs}",NAME="${rendition.label}"\n`;
    masterContent += `${rendition.playlistFile}\n\n`;
  }

  const masterPath = path.join(outputDir, "master.m3u8");
  fs.writeFileSync(masterPath, masterContent, "utf8");
  return masterPath;
}

/**
 * Upload entire HLS directory to S3 or DigitalOcean Spaces if cloud storage is active.
 */
async function uploadHlsDirectoryToCloud({ localDir, cloudPrefix, activeStorage }) {
  if (activeStorage !== "aws" && activeStorage !== "digitalocean") {
    return;
  }

  const isAws = activeStorage === "aws";
  const s3Config = isAws
    ? {
        region: settingJSON.awsRegion,
        credentials: {
          accessKeyId: settingJSON.awsAccessKey,
          secretAccessKey: settingJSON.awsSecretKey,
        },
      }
    : {
        endpoint: settingJSON?.doHostname,
        region: settingJSON?.doRegion,
        credentials: {
          accessKeyId: settingJSON?.doAccessKey,
          secretAccessKey: settingJSON?.doSecretKey,
        },
      };

  const s3 = new S3(s3Config);
  const bucket = isAws ? settingJSON.awsBucketName : settingJSON?.doBucketName;

  async function uploadRecursive(currentDir, currentPrefix) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const s3Key = `${currentPrefix}/${entry.name}`.replace(/\\/g, "/");

      if (entry.isDirectory()) {
        await uploadRecursive(fullPath, s3Key);
      } else {
        const fileStream = fs.createReadStream(fullPath);
        const fileStat = fs.statSync(fullPath);
        const isM3u8 = entry.name.endsWith(".m3u8");
        const contentType = isM3u8 ? "application/vnd.apple.mpegurl" : "video/MP2T";
        const cacheControl = isM3u8 ? "no-cache" : "max-age=31536000";

        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: s3Key,
            Body: fileStream,
            ContentLength: fileStat.size,
            ContentType: contentType,
            CacheControl: cacheControl,
            ACL: "public-read",
          })
        );
      }
    }
  }

  await uploadRecursive(localDir, cloudPrefix);
  console.log(`Uploaded HLS folder to ${activeStorage}: ${cloudPrefix}`);
}

/**
 * Main transcoding orchestrator.
 * Accepts input video path/URL, processes HLS multi-bitrate ladder,
 * writes master.m3u8, and returns HLS metadata and playlist URLs.
 */
async function transcodeToHLS({ inputPath, videoId, videoType, onProgress }) {
  console.log(`Starting HLS transcoding for video: ${videoId}`);
  
  // 1. Probe input video properties
  const meta = await probeVideo(inputPath);
  console.log(`Video metadata for ${videoId}:`, {
    width: meta.width,
    height: meta.height,
    duration: meta.duration,
    bitrate: meta.bitrate,
    isPortrait: meta.isPortrait,
  });

  // 2. Determine orientation & segment duration
  // videoType == 2 is Short (or meta.isPortrait)
  const isShort = videoType === 2 || meta.isPortrait;
  const segmentDuration = isShort ? 2 : 4; // 2s segments for Shorts; 4s for landscape

  // 3. Select target ladder based on resolution
  const targetProfiles = getTargetProfiles(meta.width, meta.height, isShort);
  console.log(
    `Selected ${targetProfiles.length} quality profiles for video ${videoId} (${isShort ? "Portrait/Shorts" : "Landscape"}):`,
    targetProfiles.map((p) => p.label)
  );

  // 4. Create output directory: uploads/videos/<videoId>/hls/
  const hlsDir = path.join(__dirname, "../uploads/videos", String(videoId), "hls");
  if (!fs.existsSync(hlsDir)) {
    fs.mkdirSync(hlsDir, { recursive: true });
  }

  // 5. Transcode each profile sequentially to preserve server resources
  const completedRenditions = [];
  const totalProfiles = targetProfiles.length;

  for (let i = 0; i < totalProfiles; i++) {
    const profile = targetProfiles[i];
    console.log(`Encoding rendition [${i + 1}/${totalProfiles}]: ${profile.label} for video ${videoId}...`);

    try {
      const result = await transcodeProfile({
        inputPath,
        outputDir: hlsDir,
        profile,
        isPortrait: isShort,
        segmentDuration,
        fps: meta.fps || 30,
        onProgress: (prog) => {
          if (onProgress && meta.duration > 0 && prog && typeof prog.timemark === "string") {
            try {
              const parts = prog.timemark.split(":");
              if (parts.length >= 3) {
                const hours = parseFloat(parts[0]) || 0;
                const minutes = parseFloat(parts[1]) || 0;
                const seconds = parseFloat(parts[2]) || 0;
                const totalSeconds = hours * 3600 + minutes * 60 + seconds;
                const profileProgress = Math.max(0, Math.min(1, totalSeconds / meta.duration));
                const overall = Math.round(((i + profileProgress) / totalProfiles) * 90);
                if (Number.isFinite(overall) && !Number.isNaN(overall)) {
                  onProgress(Math.max(5, Math.min(95, overall)));
                }
              }
            } catch (err) {
              // Ignore progress parsing errors
            }
          }
        },
      });

      completedRenditions.push(result);
    } catch (profileErr) {
      console.error(`Failed to transcode profile ${profile.label} for video ${videoId}:`, profileErr);
    }
  }

  if (completedRenditions.length === 0) {
    throw new Error(`All HLS renditions failed for video: ${videoId}`);
  }

  // 6. Generate master.m3u8
  generateMasterPlaylist(hlsDir, completedRenditions);
  console.log(`master.m3u8 generated successfully for video: ${videoId} with ${completedRenditions.length} renditions`);

  // 7. Resolve final master playlist URL
  const settings = global.settingJSON || {};
  let activeStorage = "local";
  if (settings.storage?.local) activeStorage = "local";
  else if (settings.storage?.awsS3) activeStorage = "aws";
  else if (settings.storage?.digitalOcean) activeStorage = "digitalocean";

  let masterUrl = "";
  const cloudPrefix = `videos/${videoId}/hls`;

  if (activeStorage === "local") {
    masterUrl = `${process.env.baseURL || ""}/uploads/videos/${videoId}/hls/master.m3u8`;
  } else {
    // Upload local HLS folder to Cloud
    await uploadHlsDirectoryToCloud({
      localDir: hlsDir,
      cloudPrefix,
      activeStorage,
    });

    const endpoint = activeStorage === "aws" ? settings.awsEndpoint : settings.doEndpoint;
    masterUrl = `${endpoint}/${cloudPrefix}/master.m3u8`;

    // Optionally cleanup local transcode folder after cloud upload
    try {
      fs.rmSync(path.join(__dirname, "../uploads/videos", String(videoId)), { recursive: true, force: true });
    } catch (cleanupErr) {
      console.warn("Local HLS cleanup warning:", cleanupErr.message);
    }
  }

  const qualityMetadata = completedRenditions.map((r) => {
    let playlistUrl = "";
    if (activeStorage === "local") {
      playlistUrl = `${process.env.baseURL || ""}/uploads/videos/${videoId}/hls/${r.playlistFile}`;
    } else {
      const endpoint = activeStorage === "aws" ? settings.awsEndpoint : settings.doEndpoint;
      playlistUrl = `${endpoint}/${cloudPrefix}/${r.playlistFile}`;
    }
    return {
      label: r.label,
      resolution: `${r.width}x${r.height}`,
      width: r.width,
      height: r.height,
      bitrate: r.bitrate,
      playlistUrl,
    };
  });

  return {
    hlsUrl: masterUrl,
    qualities: qualityMetadata,
    availableQualities: qualityMetadata.map((q) => q.label),
    duration: meta.duration,
    width: meta.width,
    height: meta.height,
    resolution: `${meta.width}x${meta.height}`,
    bitrate: meta.bitrate,
    isPortrait: isShort,
  };
}

module.exports = {
  transcodeToHLS,
  getTargetProfiles,
};
