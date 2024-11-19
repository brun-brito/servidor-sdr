const express = require('express');
const cors = require('cors');
const produtoRoutes = require('./routes/produtoRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());

app.use(express.json());
app.use('/v1', produtoRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});