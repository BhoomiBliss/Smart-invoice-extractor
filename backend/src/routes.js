"use strict";
const express = require("express");
const { extractController, upload } = require("./controllers/extractController");
const router = express.Router();
router.post("/extract", upload.single("invoice"), extractController);
module.exports = router;
