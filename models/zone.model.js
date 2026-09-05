const mongoose = require("mongoose");

const ZoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: String,

    // Geographic targeting — use one or more of these
    countries: [String],
    states: [String],
    cities: [String],

    // Optional: radius-based targeting
    radiusTarget: {
      lat: Number,
      lng: Number,
      radiusKm: { type: Number, default: 50 },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Zone = mongoose.model("Zone", ZoneSchema);
module.exports = Zone;
