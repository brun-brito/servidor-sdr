const { db, admin } = require('../config/firebase');
const { gerarLinkCurto } = require('../utils/linkCurto');
const levenshteinDistance = require('../utils/levenshtein');
const calcularDistancia = require('../utils/calcularDistancia');
const calcularPontuacao = require('../utils/calcularPontuacao');

// Função modificada para aceitar uma lista de produtos e suas quantidades
async function buscarProdutosPorNomes(produtos, profissional) {
    try {
        console.log(`Iniciando busca por múltiplos produtos.`);

        const usersRef = admin.firestore().collection('distribuidores');
        const usersSnapshot = await usersRef.get();

        if (usersSnapshot.empty) {
            console.log('Nenhum distribuidor encontrado');
            return [];
        }

        const resultadosAgrupados = [];

        // Itera por cada distribuidor
        for (const userDoc of usersSnapshot.docs) {
            const distribuidorData = userDoc.data();
            const userId = userDoc.id;
            console.log(`Buscando produtos para distribuidor: ${distribuidorData.nome_fantasia}`);

            const produtosRef = usersRef.doc(userId).collection('produtos');
            const produtosSnapshot = await produtosRef.get();

            if (produtosSnapshot.empty) {
                console.log(`Nenhum produto encontrado para o distribuidor: ${distribuidorData.nome_fantasia}`);
                continue;
            }

            const distanciaDistribuidor = await calcularDistancia(profissional.cep, distribuidorData.cep);

            let produtosDisponiveis = 0;
            let totalProdutosExatos = 0;
            const totalProdutos = produtos.length;
            let valorTotalOrcamento = 0;
            let nomesDosProdutos = [];
            let produtosDoDistribuidor = [];

            for (const item of produtos) {
                const nomeProduto = normalizarTexto(item.nome);
                const quantidadeDesejada = item.quantidade;
                const partesNomeProduto = item.nome.split(' ').map(parte => normalizarTexto(parte));
                let produtoEncontrado = false;
                let melhorSimilaridade = Infinity;
                let melhorProduto;
            
                produtosSnapshot.forEach(produtoDoc => {
                    const produtoData = produtoDoc.data();
                    const nomeProdutoDataNormalizado = normalizarTexto(produtoData.nome_lowercase);
                    const similaridade = levenshteinDistance(nomeProduto, nomeProdutoDataNormalizado);
            
                    if (similaridade === 0 && produtoData.quantidade >= quantidadeDesejada) {
                        produtosDisponiveis++;
                        totalProdutosExatos++;
                        valorTotalOrcamento += produtoData.preco * quantidadeDesejada;
                        nomesDosProdutos.push(`${quantidadeDesejada} unidade(s) de ${produtoData.nome}`);
                        produtoEncontrado = true;
            
                        produtosDoDistribuidor.push({
                            nome: produtoData.nome,
                            precoUnitario: produtoData.preco,
                            quantidadeDesejada: quantidadeDesejada,
                            precoTotal: produtoData.preco * quantidadeDesejada
                        });
                    } else if (similaridade > 0 && similaridade <= 3 && produtoData.quantidade >= quantidadeDesejada) {
                        if (similaridade < melhorSimilaridade) {
                            melhorSimilaridade = similaridade;
                            melhorProduto = {
                                nome: produtoData.nome,
                                precoUnitario: produtoData.preco,
                                quantidadeDesejada: quantidadeDesejada,
                                precoTotal: produtoData.preco * quantidadeDesejada
                            };
                        }
                    } else if (partesNomeProduto.some(parte => nomeProdutoDataNormalizado.includes(parte)) && produtoData.quantidade >= quantidadeDesejada) {
                        if (similaridade < melhorSimilaridade) {
                            melhorSimilaridade = similaridade;
                            melhorProduto = {
                                nome: produtoData.nome,
                                precoUnitario: produtoData.preco,
                                quantidadeDesejada: quantidadeDesejada,
                                precoTotal: produtoData.preco * quantidadeDesejada
                            };
                        }
                    } else {
                        
                    }
                });
            
                if (!produtoEncontrado && melhorProduto) {
                    produtosDisponiveis++;
                    valorTotalOrcamento += melhorProduto.precoTotal;
                    nomesDosProdutos.push(`${quantidadeDesejada} unidade(s) de ${melhorProduto.nome}`);
                    produtosDoDistribuidor.push(melhorProduto);
                }
            }
            

            const completude = totalProdutosExatos === totalProdutos;
            const mensagem = produtosDoDistribuidor.length === 1
                ? `Olá, vim pela plataforma de orçamentos, gostaria de comprar ${produtosDoDistribuidor[0].quantidadeDesejada} unidade(s) do produto ${produtosDoDistribuidor[0].nome} pelo valor de R$${produtosDoDistribuidor[0].precoTotal}`
                : `Olá, vim pela plataforma de orçamentos, gostaria de comprar ${nomesDosProdutos.join(', ')} pelo valor de R$${valorTotalOrcamento}`;

            const longUrl = `https://api.whatsapp.com/send?phone=${distribuidorData.telefone}&text=${encodeURIComponent(mensagem)}`;
            const shortLink = gerarLinkCurto(longUrl, userId, profissional, nomesDosProdutos.join(', '));

            const pontuacao = calcularPontuacao(distanciaDistribuidor, completude, valorTotalOrcamento);

            if (produtosDoDistribuidor.length > 0) {
                resultadosAgrupados.push({
                    orcamento: "",
                    distancia: distanciaDistribuidor,
                    valorTotalOrcamento: valorTotalOrcamento,
                    temTodosOsProdutos: completude,
                    produtos: produtosDoDistribuidor,
                    pontuacao: pontuacao,
                    link: shortLink
                });
            }
        }

        const resultados = resultadosAgrupados.sort((a, b) => b.pontuacao - a.pontuacao);

        resultados.forEach((resultado, index) => {
            resultado.orcamento = `Orçamento ${index + 1}`;
        });

        if (resultados.length === 0) {
            console.log('Nenhum produto encontrado.');
            return [{ mensagem: 'Nenhum produto foi encontrado com base nos critérios de busca.' }];
        }

        return resultados.slice(0, 3);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        throw new Error('Erro ao buscar produtos no Firestore');
    }
}

function normalizarTexto(texto) {
    const textoSemAcento = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const textoNormalizado = textoSemAcento.replace(/[^a-z0-9]/gi, '').toLowerCase();
    return textoNormalizado;
}

async function buscarProfissionalPorCep(cep) {
    try {
        const usuariosRef = db.collection('profissionais');
        const snapshot = await usuariosRef.get();

        if (snapshot.empty) {
            console.log('Nenhum usuário encontrado.');
            return null;
        }

        let usuarioCorrespondente = null;
        let menorDistancia = Infinity;

        snapshot.forEach(doc => {
            const usuarioData = doc.data();
            const cepBanco = usuarioData.cep;
            const distancia = levenshteinDistance(cep, cepBanco);
            const limiteSimilaridade = 1;

            if (distancia <= limiteSimilaridade && distancia < menorDistancia) {
                menorDistancia = distancia;
                usuarioCorrespondente = usuarioData;
            }
        });

        if (usuarioCorrespondente) {
            return usuarioCorrespondente;
        } else {
            console.log(`Nenhum usuário encontrado com CEP similar ao fornecido: ${cep}`);
            return null;
        }
    } catch (error) {
        console.error('Erro ao buscar o usuário pelo CEP:', error);
        throw new Error('Erro ao buscar o usuário pelo CEP');
    }
}

module.exports = { buscarProdutosPorNomes };
