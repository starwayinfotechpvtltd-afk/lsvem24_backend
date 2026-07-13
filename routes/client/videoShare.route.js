const express = require("express");
const router = express.Router();
const videoShareController=require("../../controllers/client/video.controller")

router.get("/:videoId", videoShareController.openVideoLink);

module.exports = router;