const express = require('express');
const { buscarProdutos } = require('../controllers/produtoController');

const router = express.Router();

router.post("/search", buscarProdutos);

module.exports = router;