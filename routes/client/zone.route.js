const express = require("express");
const {
  createZone,
  getAllZones,
  updateZone,
  deleteZone,
} = require("../../controllers/admin/zone.controller");

const zoneRouter = express.Router();

zoneRouter.post("/create", createZone);
zoneRouter.get("/all", getAllZones);
zoneRouter.put("/update/:id", updateZone);
zoneRouter.delete("/delete/:id", deleteZone);

module.exports = zoneRouter;
