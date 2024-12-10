const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

exports.audio = (req, res) => {
  const { outputAudio, outputFilename } = req.body;

  if (!outputAudio || typeof outputAudio !== 'string') {
    return res.status(400).json({ error: 'Campo "outputAudio" inválido ou ausente' });
  }

  if (!outputFilename || typeof outputFilename !== 'string') {
    return res.status(400).json({ error: 'Campo "outputFilename" inválido ou ausente' });
  }

  try {
    // Extrair os dados reais de áudio (após `:`)
    const match = outputAudio.match(/: (.+)$/);
    if (!match || !match[1]) {
      return res.status(400).json({ error: 'Formato inválido no campo "outputAudio"' });
    }

    const hexData = match[1].replace(/\s+/g, ''); // Limpar espaços e quebras de linha

    // Log do tamanho dos dados hexadecimais
    console.log(`Tamanho dos dados hexadecimais: ${hexData.length}`);

    // Converter os dados em buffer binário
    const binaryData = Buffer.from(hexData, 'hex');

    // Caminho para salvar o arquivo bruto
    const rawFilePath = path.join(__dirname, '..', 'public', 'temp.raw');
    fs.writeFileSync(rawFilePath, binaryData);

    // Caminho para o arquivo MP3 final
    const finalFilePath = path.join(__dirname, '..', 'public', outputFilename);

    // Configurar o comando ffmpeg
    const ffmpegCommand = `ffmpeg -f s16le -ar 16000 -ac 1 -i ${rawFilePath} ${finalFilePath}`;

    console.log('Executando comando:', ffmpegCommand);

    exec(ffmpegCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('Erro ao converter o arquivo com ffmpeg:', error);
        console.error('Saída do ffmpeg:', stderr);
        return res.status(500).json({ error: 'Erro ao converter o arquivo' });
      }

      console.log('Saída do ffmpeg:', stdout);
      console.log('Arquivo convertido com sucesso:', finalFilePath);

      // Retornar o caminho do arquivo convertido
      res.status(200).json({ success: true, filePath: finalFilePath });

      // Remover o arquivo bruto temporário
      fs.unlinkSync(rawFilePath);
    });
  } catch (error) {
    console.error('Erro ao processar os dados:', error);
    res.status(500).json({ error: 'Erro ao processar os dados' });
  }
};
