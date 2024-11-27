const { admin, db } = require("../config/firebase");
const Fuse = require("fuse.js");

/**
 * Busca produtos na coleção 'produtos' do Firestore usando Fuse.js.
 */
const buscarProdutos = async (req, res) => {
  const { produtos } = req.body;

  if (!produtos || !Array.isArray(produtos)) {
    return res.status(400).json({ message: "Formato inválido. Deve incluir um array de produtos." });
  }

  try {
    // Obter todos os produtos da coleção do Firestore
    const snapshot = await db.collection("produtos").get();
    if (snapshot.empty) {
      return res.status(404).json({ message: "Nenhum produto encontrado no banco." });
    }

    // Preparar os produtos do Firestore
    const produtosNoBanco = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Configuração do Fuse.js
    const fuse = new Fuse(produtosNoBanco, {
      includeScore: true,
      keys: [
        { name: "nome", weight: 0.8 }, // Nome do produto tem maior peso
        { name: "marca", weight: 0.2 }, // Marca tem menor peso
      ],
      threshold: 0.4, // Sensibilidade da busca fuzzy
    });

    // Processar cada produto enviado pelo cliente
    const resultados = produtos.map((produtoRequisitado) => {
      const busca = fuse.search(produtoRequisitado.nome);

      if (busca.length > 0) {
        const melhorMatch = busca[0].item;
        return {
          busca: produtoRequisitado.nome, // Nome buscado pelo cliente
          quantidade_solicitada: produtoRequisitado.quantidade ?? null, // Quantidade solicitada pelo cliente
          resultado_encontrado: {
            nome: melhorMatch.nome,
            marca: melhorMatch.marca,
            preco: melhorMatch.preco,
            quantidade_disponivel: melhorMatch.quantidade, // Quantidade disponível no banco
          },
        };
      } else {
        return {
          busca: produtoRequisitado.nome, // Nome buscado pelo cliente
          quantidade_solicitada: produtoRequisitado.quantidade, // Quantidade solicitada pelo cliente
          resultado: null, // Indica que não foi encontrado
          mensagem: "Nenhum produto compatível encontrado",
        };
      }
    });

    // Resposta final
    return res.status(200).json({ resultados });
  } catch (error) {
    console.error("Erro ao buscar :", error);
    return res.status(500).json({ message: "Erro interno no servidor." });
  }
};

module.exports = { buscarProdutos };
