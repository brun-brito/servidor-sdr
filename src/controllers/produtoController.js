const { admin, db } = require("../config/firebase");
const Fuse = require("fuse.js");

const buscarProdutos = async (req, res) => {
  const { produtos } = req.body;

  if (!produtos || !Array.isArray(produtos)) {
    return res.status(400).json({ message: "Formato inválido. Deve incluir um array de produtos." });
  }

  try {
    const snapshot = await db.collection("produtos").get();
    if (snapshot.empty) {
      return res.status(404).json({ message: "Nenhum produto encontrado no banco." });
    }

    const produtosNoBanco = snapshot.docs.map((doc) => {
      const data = doc.data();
      const vencimentoTimestamp = data.vencimento;

      let vencimentoFormatado = null;
      if (
        vencimentoTimestamp &&
        typeof vencimentoTimestamp.seconds === "number"
      ) {
        vencimentoFormatado = new Date(vencimentoTimestamp.seconds * 1000).toLocaleDateString("pt-BR");
      }

      return {
        id: doc.id,
        ...data,
        vencimento: vencimentoFormatado,
      };
    });

    const fuse = new Fuse(produtosNoBanco, {
      includeScore: true,
      keys: [
        { name: "nome", weight: 0.5 },
        { name: "marca", weight: 0.3 },
        { name: "volume", weight: 0.2 },
      ],
      threshold: 0.4,
    });

    const resultados = produtos.map((produtoRequisitado) => {
      if (!produtoRequisitado.nome || !produtoRequisitado.quantidade) {
        return {
          busca: produtoRequisitado,
          resultado: null,
          mensagem: "Nome e quantidade são obrigatórios para a busca.",
        };
      }

      // Construir objeto de busca dinamicamente, incluindo apenas valores válidos
      const buscaQuery = {};
      if (produtoRequisitado.nome) buscaQuery.nome = produtoRequisitado.nome;
      if (produtoRequisitado.marca) buscaQuery.marca = produtoRequisitado.marca;
      if (produtoRequisitado.volume) buscaQuery.volume = produtoRequisitado.volume;

      const buscaPrimaria = fuse.search(buscaQuery);

      // Calcula diferenças e cria resposta detalhada
      const calcularDiferencas = (requisitado, encontrado) => {
        const diferencas = [];
        if (
          requisitado.marca &&
          requisitado.marca.toLowerCase() !== encontrado.marca.toLowerCase()
        ) {
          diferencas.push(`Marca encontrada: ${encontrado.marca} (buscada: ${requisitado.marca})`);
        }
        if (
          requisitado.volume &&
          requisitado.volume.toLowerCase() !== encontrado.volume.toLowerCase()
        ) {
          diferencas.push(`Volume encontrado: ${encontrado.volume} (buscado: ${requisitado.volume})`);
        }
        return diferencas;
      };

      if (buscaPrimaria.length > 0) {
        const melhorMatch = buscaPrimaria[0].item;
        const diferencas = calcularDiferencas(produtoRequisitado, melhorMatch);
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
          diferencas: diferencas.length > 0 ? diferencas : null,
          mensagem: diferencas.length > 0
            ? "Produto encontrado, mas com discrepâncias nos atributos."
            : "Produto encontrado com exatidão.",
        };
      }

      // Busca secundária (nome apenas)
      const buscaSecundaria = fuse.search({ nome: produtoRequisitado.nome });

      if (buscaSecundaria.length > 0) {
        const melhorMatch = buscaSecundaria[0].item;
        const diferencas = calcularDiferencas(produtoRequisitado, melhorMatch);

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
          },
          diferencas: diferencas.length > 0 ? diferencas : null,
          mensagem: "Produto encontrado, mas com discrepâncias nos atributos.",
        };
      }

      return {
        busca: produtoRequisitado,
        resultado: null,
        mensagem: "Nenhum produto compatível encontrado.",
      };
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
