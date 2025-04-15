const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost', // Endereço do banco de dados
  user: 'root', // Usuário do MySQL
  password: 'Antetokounmpo34!', // Senha do MySQL
  database: 'empresa' // Nome do banco de dados
});

connection.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao MySQL:', err);
  } else {
    console.log('Conectado ao MySQL!');
  }
});

module.exports = connection;