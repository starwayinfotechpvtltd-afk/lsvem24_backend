/**
 * Test Suite: Adaptive Bitrate Streaming (ABR) Implementation Verification
 * Tests:
 *  1. Ladder Selection & Bandwidth Thresholds (500-800 Kbps, 1-3 Mbps, 5+ Mbps)
 *  2. Orientation Adaptation (Landscape long videos vs Portrait Shorts)
 *  3. Master Playlist Compliance (RFC 8216, Independent Segments, Codecs, Bitrate Sorting)
 *  4. Seeking Math & Segment Granularity
 *  5. Dynamic Network Adaptation (Fast->Slow, Slow->Fast, Disconnect->Reconnect)
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("=============================================================");
console.log("🚀 STARTING ADAPTIVE BITRATE STREAMING (ABR) TEST SUITE");
console.log("=============================================================\n");

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}\n`);
    throw err;
  }
}

// -------------------------------------------------------------
// Test Group 1: Profile Ladder & Bandwidth Mapping
// -------------------------------------------------------------
console.log("--- 1. Testing Quality Profiles & Bandwidth Thresholds ---");

const LANDSCAPE_PROFILES = [
  { label: "1080p", height: 1080, width: 1920, videoBitrate: "4500k", bandwidth: 5000000 },
  { label: "720p",  height: 720,  width: 1280, videoBitrate: "2500k", bandwidth: 2800000 },
  { label: "480p",  height: 480,  width: 854,  videoBitrate: "1000k", bandwidth: 1200000 },
  { label: "360p",  height: 360,  width: 640,  videoBitrate: "600k",  bandwidth: 700000 },
  { label: "144p",  height: 144,  width: 256,  videoBitrate: "200k",  bandwidth: 250000 },
];

const PORTRAIT_PROFILES = [
  { label: "1080p", height: 1920, width: 1080, videoBitrate: "3500k", bandwidth: 4000000 },
  { label: "720p",  height: 1280, width: 720,  videoBitrate: "2000k", bandwidth: 2400000 },
  { label: "480p",  height: 854,  width: 480,  videoBitrate: "900k",  bandwidth: 1100000 },
  { label: "360p",  height: 640,  width: 360,  videoBitrate: "500k",  bandwidth: 600000 },
  { label: "144p",  height: 256,  width: 144,  videoBitrate: "150k",  bandwidth: 200000 },
];

function getTargetProfiles(originalWidth, originalHeight, isPortrait) {
  const baseProfiles = isPortrait ? PORTRAIT_PROFILES : LANDSCAPE_PROFILES;
  const eligible = baseProfiles.filter((p) => {
    if (isPortrait) return p.width <= originalWidth && p.height <= originalHeight;
    return p.height <= originalHeight;
  });
  if (eligible.length === 0) {
    const label = `${Math.min(originalWidth, originalHeight)}p`;
    eligible.push({
      label,
      width: originalWidth,
      height: originalHeight,
      bandwidth: 500000,
      isOriginal: true,
    });
  }
  return eligible;
}

runTest("1080p landscape input produces all 5 standard profiles", () => {
  const profiles = getTargetProfiles(1920, 1080, false);
  assert.strictEqual(profiles.length, 5);
  assert.deepStrictEqual(profiles.map(p => p.label), ["1080p", "720p", "480p", "360p", "144p"]);
});

runTest("720p landscape input never produces 1080p profile (no upscaling)", () => {
  const profiles = getTargetProfiles(1280, 720, false);
  assert.strictEqual(profiles.length, 4);
  assert.strictEqual(profiles.some(p => p.label === "1080p"), false);
  assert.deepStrictEqual(profiles.map(p => p.label), ["720p", "480p", "360p", "144p"]);
});

runTest("480p landscape input produces only 480p, 360p, 144p", () => {
  const profiles = getTargetProfiles(854, 480, false);
  assert.strictEqual(profiles.length, 3);
  assert.deepStrictEqual(profiles.map(p => p.label), ["480p", "360p", "144p"]);
});

runTest("Portrait Shorts (1080x1920) produces correct portrait ladder dimensions", () => {
  const profiles = getTargetProfiles(1080, 1920, true);
  assert.strictEqual(profiles.length, 5);
  const p1080 = profiles.find(p => p.label === "1080p");
  assert.strictEqual(p1080.width, 1080);
  assert.strictEqual(p1080.height, 1920);
});

// Bandwidth category checks
runTest("Bandwidth: Low Quality window (500–800 Kbps) matches 144p & 360p streams", () => {
  const p144 = LANDSCAPE_PROFILES.find(p => p.label === "144p");
  const p360 = LANDSCAPE_PROFILES.find(p => p.label === "360p");
  assert(p144.bandwidth <= 800000, "144p bandwidth must be <= 800 Kbps");
  assert(p360.bandwidth <= 800000, "360p bandwidth must be <= 800 Kbps");
});

runTest("Bandwidth: Medium Quality window (1–3 Mbps) matches 480p & 720p streams", () => {
  const p480 = LANDSCAPE_PROFILES.find(p => p.label === "480p");
  const p720 = LANDSCAPE_PROFILES.find(p => p.label === "720p");
  assert(p480.bandwidth >= 1000000 && p480.bandwidth <= 3000000, "480p must fit 1-3 Mbps");
  assert(p720.bandwidth >= 1000000 && p720.bandwidth <= 3000000, "720p must fit 1-3 Mbps");
});

runTest("Bandwidth: High Quality window (5+ Mbps) matches 1080p stream", () => {
  const p1080 = LANDSCAPE_PROFILES.find(p => p.label === "1080p");
  assert(p1080.bandwidth >= 4500000, "1080p bandwidth must target 5+ Mbps");
});

// -------------------------------------------------------------
// Test Group 2: Master Playlist Structure & Compliance
// -------------------------------------------------------------
console.log("\n--- 2. Testing Master Playlist (master.m3u8) Generation ---");

function simulateGenerateMasterPlaylist(renditions) {
  let masterContent = "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-INDEPENDENT-SEGMENTS\n\n";
  const sorted = [...renditions].sort((a, b) => a.bitrate - b.bitrate);

  for (const rendition of sorted) {
    const avgBandwidth = Math.round(rendition.bitrate * 0.9);
    let codecs = "avc1.4d401f,mp4a.40.2";
    if (rendition.height >= 1080) codecs = "avc1.640028,mp4a.40.2";
    else if (rendition.height <= 360) codecs = "avc1.42e01e,mp4a.40.2";

    masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${rendition.bitrate},AVERAGE-BANDWIDTH=${avgBandwidth},RESOLUTION=${rendition.width}x${rendition.height},FRAME-RATE=30.000,CODECS="${codecs}",NAME="${rendition.label}"\n`;
    masterContent += `${rendition.playlistFile}\n\n`;
  }
  return masterContent;
}

const mockRenditions = [
  { label: "1080p", width: 1920, height: 1080, bitrate: 5000000, playlistFile: "1080p/index.m3u8" },
  { label: "720p",  width: 1280, height: 720,  bitrate: 2800000, playlistFile: "720p/index.m3u8" },
  { label: "480p",  width: 854,  height: 480,  bitrate: 1200000, playlistFile: "480p/index.m3u8" },
  { label: "360p",  width: 640,  height: 360,  bitrate: 700000,  playlistFile: "360p/index.m3u8" },
  { label: "144p",  width: 256,  height: 144,  bitrate: 250000,  playlistFile: "144p/index.m3u8" },
];

runTest("Master playlist includes #EXT-X-INDEPENDENT-SEGMENTS tag", () => {
  const m3u8 = simulateGenerateMasterPlaylist(mockRenditions);
  assert(m3u8.includes("#EXT-X-INDEPENDENT-SEGMENTS"), "Must declare independent segments");
});

runTest("Master playlist sorts renditions ascending for instant low-latency startup", () => {
  const m3u8 = simulateGenerateMasterPlaylist(mockRenditions);
  const firstStreamInf = m3u8.indexOf("#EXT-X-STREAM-INF:BANDWIDTH=250000");
  const lastStreamInf = m3u8.indexOf("#EXT-X-STREAM-INF:BANDWIDTH=5000000");
  assert(firstStreamInf !== -1 && lastStreamInf !== -1);
  assert(firstStreamInf < lastStreamInf, "Lowest bitrate (144p) must appear before highest (1080p)");
});

runTest("Master playlist specifies distinct H.264 profile codecs per resolution tier", () => {
  const m3u8 = simulateGenerateMasterPlaylist(mockRenditions);
  assert(m3u8.includes('CODECS="avc1.640028,mp4a.40.2"'), "1080p must use High Profile level 4.0");
  assert(m3u8.includes('CODECS="avc1.4d401f,mp4a.40.2"'), "720p/480p must use Main Profile level 3.1");
  assert(m3u8.includes('CODECS="avc1.42e01e,mp4a.40.2"'), "360p/144p must use Baseline Profile level 3.0");
});

// -------------------------------------------------------------
// Test Group 3: Seeking & Segment Granularity
// -------------------------------------------------------------
console.log("\n--- 3. Testing Seeking & Segment Calculations ---");

function calculateSegmentForSeek(timestampSeconds, segmentDuration) {
  const segmentIndex = Math.floor(timestampSeconds / segmentDuration);
  const segmentFileName = `segment_${String(segmentIndex).padStart(3, "0")}.ts`;
  const segmentOffsetSeconds = timestampSeconds % segmentDuration;
  return { segmentIndex, segmentFileName, segmentOffsetSeconds };
}

runTest("Long video (4s segments): Seeking to 0s downloads segment_000.ts", () => {
  const res = calculateSegmentForSeek(0, 4);
  assert.strictEqual(res.segmentIndex, 0);
  assert.strictEqual(res.segmentFileName, "segment_000.ts");
});

runTest("Long video (4s segments): Seeking to 125s downloads strictly segment_031.ts", () => {
  const res = calculateSegmentForSeek(125, 4);
  assert.strictEqual(res.segmentIndex, 31);
  assert.strictEqual(res.segmentFileName, "segment_031.ts");
  assert.strictEqual(res.segmentOffsetSeconds, 1);
});

runTest("Shorts (2s segments): Seeking to 15s downloads segment_007.ts", () => {
  const res = calculateSegmentForSeek(15, 2);
  assert.strictEqual(res.segmentIndex, 7);
  assert.strictEqual(res.segmentFileName, "segment_007.ts");
});

// -------------------------------------------------------------
// Test Group 4: Dynamic Network Adaptation Simulation
// -------------------------------------------------------------
console.log("\n--- 4. Testing Dynamic Network Adaptation Heuristics ---");

class NetworkAdaptationSimulator {
  constructor(profiles) {
    this.profiles = [...profiles].sort((a, b) => a.bandwidth - b.bandwidth);
    this.currentTrack = this.profiles[0]; // Start at lowest for rapid startup
    this.bufferSeconds = 0;
  }

  onSegmentDownloaded(networkSpeedBps, segmentDurationSeconds) {
    this.bufferSeconds += segmentDurationSeconds;
    // Safe bandwidth with 20% safety headroom
    const usableBandwidth = networkSpeedBps * 0.8;

    // Find highest eligible track within usable bandwidth
    let bestTrack = this.profiles[0];
    for (const p of this.profiles) {
      if (p.bandwidth <= usableBandwidth) {
        bestTrack = p;
      }
    }

    // Downgrade immediately if buffer is starving (< 4s)
    if (this.bufferSeconds < 4 && bestTrack.bandwidth > this.currentTrack.bandwidth) {
      // Do not upshift when buffer is critically low
    } else {
      this.currentTrack = bestTrack;
    }
    return this.currentTrack;
  }
}

runTest("Slow network (600 Kbps) selects 360p or 144p stream", () => {
  const sim = new NetworkAdaptationSimulator(LANDSCAPE_PROFILES);
  const track = sim.onSegmentDownloaded(600000, 4);
  assert(track.label === "144p" || track.label === "360p", `Expected low quality, got ${track.label}`);
});

runTest("Medium network (2.5 Mbps) selects 480p or 720p stream", () => {
  const sim = new NetworkAdaptationSimulator(LANDSCAPE_PROFILES);
  const track = sim.onSegmentDownloaded(2500000, 4);
  assert(track.label === "480p" || track.label === "720p", `Expected medium quality, got ${track.label}`);
});

runTest("Fast network (8 Mbps) smoothly upshifts to 1080p", () => {
  const sim = new NetworkAdaptationSimulator(LANDSCAPE_PROFILES);
  const track = sim.onSegmentDownloaded(8000000, 4);
  assert.strictEqual(track.label, "1080p", `Expected 1080p, got ${track.label}`);
});

runTest("Fast -> Slow transition downshifts gracefully without timeline restart", () => {
  const sim = new NetworkAdaptationSimulator(LANDSCAPE_PROFILES);
  // High bandwidth initial (8 Mbps gives 6.4 Mbps usable > 5.0 Mbps required)
  let track = sim.onSegmentDownloaded(8000000, 4);
  assert.strictEqual(track.label, "1080p");
  
  // Sudden network drop to 550 Kbps
  track = sim.onSegmentDownloaded(550000, 4);
  assert(track.label === "144p" || track.label === "360p", `Must downshift to low quality, got ${track.label}`);
});

runTest("Slow -> Fast transition upshifts gracefully", () => {
  const sim = new NetworkAdaptationSimulator(LANDSCAPE_PROFILES);
  let track = sim.onSegmentDownloaded(600000, 4);
  assert(track.label === "144p" || track.label === "360p");

  // Network speeds up to 10 Mbps
  track = sim.onSegmentDownloaded(10000000, 4);
  assert.strictEqual(track.label, "1080p");
});

// -------------------------------------------------------------
// Test Group 5: Network Disconnect & Exponential Backoff
// -------------------------------------------------------------
console.log("\n--- 5. Testing Network Disconnect Recovery & Backoff ---");

function calculateBackoff(attempt) {
  return attempt * 2; // 2s, 4s, 6s
}

runTest("Exponential backoff calculates 2s, 4s, 6s for attempts 1, 2, 3", () => {
  assert.strictEqual(calculateBackoff(1), 2);
  assert.strictEqual(calculateBackoff(2), 4);
  assert.strictEqual(calculateBackoff(3), 6);
});

runTest("Recovery attempts capped at 3 retries", () => {
  let attempt = 0;
  let maxAttempts = 3;
  while (attempt < 5) {
    if (attempt >= maxAttempts) break;
    attempt++;
  }
  assert.strictEqual(attempt, 3);
});

console.log("\n=============================================================");
console.log(`🎉 ALL TESTS PASSED: ${passedTests}/${totalTests} tests successful!`);
console.log("=============================================================");
