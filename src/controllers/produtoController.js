const { db, admin } = require('../config/firebase');
const { levenshteinDistance } = require("../utils/levenshtein");

const searchProducts = async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ message: "A consulta (query) é obrigatória." });
  }

  try {
    const produtosRef = db.collection("produtos");
    const snapshot = await produtosRef.get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "Nenhum produto encontrado." });
    }

    const produtos = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const distancia = levenshteinDistance(query.toLowerCase(), data.nome.toLowerCase());
      produtos.push({ ...data, distancia });
    });

    // Filtra produtos com distância de Levenshtein aceitável (por exemplo, <= 3)
    const resultados = produtos.filter((produto) => produto.distancia <= 3);

    // Ordena os produtos pela distância mais próxima
    resultados.sort((a, b) => a.distancia - b.distancia);

    if (resultados.length === 0) {
      return res.status(404).json({ message: "Nenhum produto correspondente encontrado." });
    }

    return res.status(200).json(resultados);
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    return res.status(500).json({ message: "Erro interno no servidor." });
  }
};

module.exports = { searchProducts };
