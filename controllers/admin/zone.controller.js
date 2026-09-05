const Zone = require("../../models/zone.model");
const mongoose = require("mongoose");

const createZone = async (req, res) => {
  try {
    const { name, description, countries, states, cities, radiusTarget } = req.body;
    if (!name) return res.status(400).json({ message: "Zone name is required" });

    const zone = await Zone.create({ name, description, countries, states, cities, radiusTarget });
    return res.status(201).json({ message: "Zone created", status: true, zone });
  } catch (error) {
    if (error.code === 11000)
      return res.status(400).json({ message: "Zone name already exists", status: false });
    return res.status(500).json({ message: "Server error", status: false });
  }
};

const getAllZones = async (req, res) => {
  try {
    const zones = await Zone.find({ isActive: true });
    return res
      .status(200)
      .json({ message: "Zones fetched", status: true, zones });
  } catch {
    return res.status(500).json({ message: "Server error", status: false });
  }
};

const updateZone = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid zone ID" });

    const zone = await Zone.findByIdAndUpdate(id, req.body, { new: true });
    if (!zone) return res.status(404).json({ message: "Zone not found" });
    return res.status(200).json({ message: "Zone updated", status: true, zone });
  } catch {
    return res.status(500).json({ message: "Server error", status: false });
  }
};

const deleteZone = async (req, res) => {
  try {
    const { id } = req.params;
    await Zone.findByIdAndUpdate(id, { isActive: false });
    return res.status(200).json({ message: "Zone deactivated", status: true });
  } catch {
    return res.status(500).json({ message: "Server error", status: false });
  }
};

module.exports = { createZone, getAllZones, updateZone, deleteZone };