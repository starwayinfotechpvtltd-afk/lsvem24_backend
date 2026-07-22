const { VIDEO_TYPE } = require("../types/constant");
const { VISIBILITY_TYPE } = require("../types/constant");
const { AUDIENCE_TYPE } = require("../types/constant");
const { COMMENT_TYPE } = require("../types/constant");
const { SCHEDULE_TYPE } = require("../types/constant");
const { VIDEO_PRIVACY_TYPE } = require("../types/constant");

const mongoose = require("mongoose");
const crypto = require("crypto");

function generateSlug(length = 11) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  let slug = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    slug += chars[bytes[i] % chars.length];
  }
  return slug;
}

const videoSchema = new mongoose.Schema(
  {
    slug: { type: String, unique: true, sparse: true },
    uniqueVideoId: { type: String, default: null },
    title: { type: String },
    description: { type: String },
    hashTag: [{ type: String }],
    videoType: { type: Number, enum: VIDEO_TYPE },
    videoPrivacyType: { type: Number, enum: VIDEO_PRIVACY_TYPE }, //1.free 2.paid
    videoTime: { type: Number, min: 0 }, //that value always save in millisecond
    videoUrl: { type: String },
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

    soundListId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SoundList",
      default: null,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    channelId: { type: String, trim: true },

    isActive: { type: Boolean, default: true },
    isAddByAdmin: { type: Boolean, default: false },
    views: {
      type: Number,
      default: 0,
    },

    viewedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    shareCount: { type: Number, default: 0 }, //when user share the video then shareCount increased
    like: { type: Number, default: 0 },
    dislike: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

videoSchema.pre("save", async function (next) {
  if (!this.slug) {
    let isUnique = false;
    let newSlug = "";
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      newSlug = generateSlug(11);
      const existing = await mongoose.models.Video.findOne({ slug: newSlug });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }
    this.slug = newSlug;
  }
  next();
});

videoSchema.index({ slug: 1 });
videoSchema.index({ uniqueVideoId: 1 });
videoSchema.index({ userId: 1 });
videoSchema.index({ soundListId: 1 });

module.exports = mongoose.model("Video", videoSchema);
