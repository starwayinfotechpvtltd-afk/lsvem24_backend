const { VIDEO_TYPE } = require("../types/constant");
const { VISIBILITY_TYPE } = require("../types/constant");
const { AUDIENCE_TYPE } = require("../types/constant");
const { COMMENT_TYPE } = require("../types/constant");
const { SCHEDULE_TYPE } = require("../types/constant");
const { VIDEO_PRIVACY_TYPE } = require("../types/constant");

const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    uniqueVideoId: { type: String, default: null },
    title: { type: String },
    description: { type: String },
    hashTag: [{ type: String }], 
    videoType: { type: Number, enum: VIDEO_TYPE },
    videoPrivacyType: { type: Number, enum: VIDEO_PRIVACY_TYPE }, //1.free 2.paid
    videoTime: { type: Number, min: 0 }, //that value always save in millisecond
    duration: { type: Number, default: 0 }, // duration in seconds
    videoUrl: { type: String },

    // Adaptive Bitrate Streaming (ABR) & Transcoding Fields
    originalUrl: { type: String, default: null }, // Original uploaded video URL/path
    hlsUrl: { type: String, default: null }, // Master playlist URL (master.m3u8)
    resolution: { type: String, default: null }, // Video resolution (e.g. "1920x1080", "720x1280")
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    bitrate: { type: Number, default: null }, // Original video bitrate (bps)
    availableQualities: [{ type: String }], // List of available quality labels: ["1080p", "720p", "480p", "360p"]
    qualities: [
      {
        label: { type: String }, // "1080p", "720p", "480p", "360p"
        resolution: { type: String }, // "1280x720"
        width: { type: Number },
        height: { type: Number },
        bitrate: { type: Number }, // in bps (e.g. 2500000)
        playlistUrl: { type: String }, // Path or URL to variant index.m3u8
      },
    ],
    processingStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "completed",
    },
    processingProgress: { type: Number, default: 0, min: 0, max: 100 },

    videoImage: { type: String },
    visibilityType: { type: Number, enum: VISIBILITY_TYPE },
    audienceType: { type: Number, enum: AUDIENCE_TYPE },
    commentType: { type: Number, enum: COMMENT_TYPE },
    scheduleType: { type: Number, enum: SCHEDULE_TYPE },
    scheduleTime: { type: String }, //if scheduleType 1 then SCHEDULED, if scheduleType 2 then NOW
    location: { type: String },
    locationCoordinates: {
      latitude: { type: String },
      longitude: { type: String },
    },

    soundListId: { type: mongoose.Schema.Types.ObjectId, ref: "SoundList", default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    channelId: { type: String, trim: true },

    isActive: { type: Boolean, default: true },
    isAddByAdmin: { type: Boolean, default: false },

    shareCount: { type: Number, default: 0 }, //when user share the video then shareCount increased
    like: { type: Number, default: 0 },
    dislike: { type: Number, default: 0 },
    allowRemix: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

videoSchema.index({ uniqueVideoId: 1 });
videoSchema.index({ userId: 1 });
videoSchema.index({ soundListId: 1 });
videoSchema.index({ processingStatus: 1 });

module.exports = mongoose.model("Video", videoSchema);
