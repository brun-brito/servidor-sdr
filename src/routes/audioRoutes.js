const express = require('express');
const { convertTextToAudio, serveAudio } = require("../controllers/audioController");

const router = express.Router();

router.post("/convert-text-to-audio", convertTextToAudio);
router.get("/audio/:filename", serveAudio);

module.exports = router;