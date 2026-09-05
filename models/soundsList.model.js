const mongoose = require("mongoose");

const soundsListSchema = new mongoose.Schema(
  {
    singerName: { type: String },
    soundTitle: { type: String },
    soundTime: { type: Number, min: 0 }, //that value always save in seconds
    soundLink: { type: String },
    soundImage: { type: String },
    soundCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: "SoundCategory" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

soundsListSchema.index({ soundCategoryId: 1 });

module.exports = mongoose.model("SoundList", soundsListSchema);
