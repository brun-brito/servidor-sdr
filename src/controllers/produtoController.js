const { admin, db } = require("../config/firebase");
const Fuse = require("fuse.js");

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
    const produtosNoBanco = snapshot.docs.map((doc) => {
      const data = doc.data();
      const vencimentoTimestamp = data.vencimento;

      let vencimentoFormatado = null;

      // Verificar e formatar a data de vencimento, se válida
      if (
        vencimentoTimestamp &&
        typeof vencimentoTimestamp.seconds === "number"
      ) {
        vencimentoFormatado = new Date(vencimentoTimestamp.seconds * 1000).toLocaleDateString("pt-BR");
      }

      return {
        id: doc.id,
        ...data,
        vencimento: vencimentoFormatado, // Adiciona o vencimento formatado ou null
      };
    });

    // Configuração do Fuse.js
    const fuse = new Fuse(produtosNoBanco, {
      includeScore: true,
      keys: [
        { name: "nome", weight: 0.5 },
        { name: "marca", weight: 0.3 },
        { name: "volume", weight: 0.2 },
      ],
      threshold: 0.4,
    });

    // Processar cada produto enviado pelo cliente
    const resultados = produtos.map((produtoRequisitado) => {
      if (!produtoRequisitado.nome || !produtoRequisitado.quantidade) {
        return {
          busca: produtoRequisitado,
          resultado: null,
          mensagem: "Nome e quantidade são obrigatórios para a busca.",
        };
      }

      const buscaQuery = {
        nome: produtoRequisitado.nome,
        ...(produtoRequisitado.marca && { marca: produtoRequisitado.marca }),
        ...(produtoRequisitado.volume && { volume: produtoRequisitado.volume }),
      };

      const busca = fuse.search(buscaQuery);

      if (busca.length > 0) {
        const melhorMatch = busca[0].item;
        const quantidadeSolicitada = produtoRequisitado.quantidade;

        return {
          busca: produtoRequisitado,
          resultado_encontrado: {
            nome: melhorMatch.nome,
            marca: melhorMatch.marca,
            volume: melhorMatch.volume,
            preco: melhorMatch.preco,
            vencimento: melhorMatch.vencimento,
            hoje: new Date().toLocaleDateString("pt-BR"),
            quantidade_disponivel: melhorMatch.quantidade,
            quantidade_atendida:
              melhorMatch.quantidade >= quantidadeSolicitada
                ? quantidadeSolicitada
                : melhorMatch.quantidade,
          },
        };
      } else {
        return {
          busca: produtoRequisitado,
          resultado: null,
          mensagem: "Nenhum produto compatível encontrado.",
        };
      }
    });

    return res.status(200).json({
      resultados,
      mensagem_geral: resultados.some((r) => r.resultado_encontrado)
        ? "Alguns produtos foram encontrados"
        : "Nenhum produto foi encontrado",
    });
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    return res.status(500).json({ message: "Erro interno no servidor." });
  }
};

module.exports = { buscarProdutos };
