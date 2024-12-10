const fs = require('fs');
const path = require('path');

// Função para processar a entrada e gerar o link do arquivo MP3
exports.audio = (req, res) => {
  const { hexString } = req.body; // Obtém a string hexadecimal do corpo da requisição

  if (!hexString || typeof hexString !== 'string') {
    return res.status(400).json({ error: 'String hexadecimal inválida ou ausente' });
  }

  try {
    // Caminho da pasta "public"
    const publicDir = path.join(__dirname, '..', 'public');

    // Verificar se a pasta "public" existe, caso contrário, criar
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Limpar a string para remover espaços e quebras de linha
    const hexDataCleaned = hexString.replace(/\s+/g, '');

    // Converter a sequência hexadecimal em um buffer binário
    const binaryData = Buffer.from(hexDataCleaned, 'hex');

    // Salvar o arquivo MP3 localmente
    const fileName = `audio_${Date.now()}.mp3`; // Nome único para evitar conflitos
    const filePath = path.join(publicDir, fileName);
    fs.writeFileSync(filePath, binaryData);

    // Construir e retornar o link público
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/public/${fileName}`;

    res.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error('Erro ao processar a string hexadecimal:', error);
    res.status(500).json({ error: 'Erro ao processar a string hexadecimal' });
  }
};
