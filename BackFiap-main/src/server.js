require('dotenv').config(); // Carrega as configurações do arquivo .env
const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 3003;
const MONGO_URI = process.env.MONGO_URI;

if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET) < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters.');
}

// Tenta conectar ao banco de dados ANTES de ligar o servidor
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Conectado ao MongoDB com sucesso!');
    
    // Só liga o servidor se o banco estiver online
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Erro fatal ao conectar ao MongoDB:', err);
  });