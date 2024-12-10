const express = require('express');
const cors = require('cors');
const produtoRoutes = require('./routes/produtoRoutes');
const audioRoutes = require('./routes/audioRoutes');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/v1', produtoRoutes);
app.use('/v1', audioRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});