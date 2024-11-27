const express = require('express');
const { buscarProdutos } = require('../controllers/produtoController');
const { webhook } = require('../controllers/webhook');

const router = express.Router();

router.post("/search", buscarProdutos);
router.post('/webhook', webhook);

module.exports = router;