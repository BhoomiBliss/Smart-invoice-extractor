const express = require("express");
const { extractController, upload } = require("./controllers/extractController");

const router = express.Router();

router.post("/extract", upload.single("file"), extractController);

module.exports = router;
