const express = require('express');
const { buscarProdutos } = require('../controllers/produtoController');
const { webhook } = require('../controllers/webhook');
const { audio } = require('../controllers/audio');

const router = express.Router();

router.post("/search", buscarProdutos);
router.post('/webhook', webhook);
router.post('/audio', audio);

module.exports = router;