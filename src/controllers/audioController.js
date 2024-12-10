const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Caminho da pasta pública onde os áudios serão salvos
const publicDir = path.resolve(__dirname, "../public");

// Criar a pasta "public" se não existir
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// Endpoint para converter texto em áudio
exports.convertTextToAudio = async (req, res) => {
  const { text, filename } = req.body;

  if (!text || !filename) {
    return res.status(400).json({ error: "Campos 'text' e 'filename' são obrigatórios" });
  }

  try {
    // Gerar o áudio usando a API da OpenAI
    const audioResponse = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });

    // Converter a resposta em um buffer e salvar como arquivo MP3
    const buffer = Buffer.from(await audioResponse.arrayBuffer());
    const filePath = path.join(publicDir, filename);
    await fs.promises.writeFile(filePath, buffer);

    console.log(`Áudio salvo em: ${filePath}`);
    res.status(200).json({ success: true, message: "Áudio gerado com sucesso", filename });
  } catch (error) {
    console.error("Erro ao gerar o áudio:", error);
    res.status(500).json({ error: "Erro ao gerar o áudio", details: error.message });
  }
};

// Endpoint para disponibilizar o áudio gerado
exports.serveAudio = (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(publicDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Arquivo não encontrado" });
  }

  res.sendFile(filePath);
};
