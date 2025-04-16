const express = require('express');
const path = require('path');
const multer = require('multer');
const mysql = require('mysql2');
const fs = require('fs');

const app = express();
const port = 3000;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Antetokounmpo34!',
  database: 'empresa'
});

db.connect(err => {
  if (err) {
    console.error('Erro ao conectar:', err);
    return;
  }
  console.log('✅ Conectado ao MySQL');
});

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Criar colaborador
app.post('/api/criar-colaborador', upload.single('profile-picture'), (req, res) => {
  const {
    primeiro_nome,
    ultimo_nome,
    numero_contato,
    email,
    nome_usuario,
    senha
  } = req.body;

  const foto = req.file ? req.file.filename : null;

  if (!primeiro_nome || !ultimo_nome || !numero_contato || !email || !nome_usuario || !senha) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  const sql = `
    INSERT INTO colaboradores (primeiro_nome, ultimo_nome, numero_contato, email, nome_usuario, senha, foto)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [primeiro_nome, ultimo_nome, numero_contato, email, nome_usuario, senha, foto];

  db.execute(sql, values, (err, result) => {
    if (err) {
      console.error('Erro ao inserir:', err);
      return res.status(500).json({ error: 'Erro ao criar colaborador.' });
    }
    res.status(201).json({ message: 'Colaborador criado com sucesso!' });
  });
});

// Buscar todos os colaboradores
app.get('/api/colaboradores', (req, res) => {
  const sql = 'SELECT * FROM colaboradores';

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Erro ao buscar colaboradores:', err);
      return res.status(500).json({ error: 'Erro ao buscar colaboradores.' });
    }

    const colaboradores = results.map(colab => ({
      ...colab,
      foto: colab.foto ? `/uploads/${colab.foto}` : null,
    }));

    res.json(colaboradores);
  });
});

// Buscar colaborador por ID
app.get('/api/colaboradores/:id', (req, res) => {
  const id = req.params.id;

  const sql = 'SELECT * FROM colaboradores WHERE id = ?';
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('Erro ao buscar colaborador:', err);
      return res.status(500).json({ error: 'Erro ao buscar colaborador.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Colaborador não encontrado.' });
    }

    const colaborador = results[0];
    colaborador.foto = colaborador.foto ? `/uploads/${colaborador.foto}` : null;

    res.json(colaborador);
  });
});

// Atualizar colaborador
app.put('/api/colaboradores/:id', upload.single('foto'), (req, res) => {
  const { id } = req.params;
  const {
    primeiro_nome,
    ultimo_nome,
    numero_contato,
    email,
    nome_usuario,
    senha
  } = req.body;

  const foto = req.file ? req.file.filename : null;  // Verifica se há foto

  console.log('Dados recebidos para atualização:', req.body);  // Log para verificar os dados recebidos

  // Monta campos para atualizar
  const campos = [];
  const valores = [];

  if (primeiro_nome) {
    campos.push('primeiro_nome = ?');
    valores.push(primeiro_nome);
  }
  if (ultimo_nome) {
    campos.push('ultimo_nome = ?');
    valores.push(ultimo_nome);
  }
  if (numero_contato) {
    campos.push('numero_contato = ?');
    valores.push(numero_contato);
  }
  if (email) {
    campos.push('email = ?');
    valores.push(email);
  }
  if (nome_usuario) {
    campos.push('nome_usuario = ?');
    valores.push(nome_usuario);
  }
  if (senha) {
    campos.push('senha = ?');
    valores.push(senha);
  }
  if (foto) {  // Só adiciona o campo de foto se houver uma nova foto
    campos.push('foto = ?');
    valores.push(foto);
  }

  if (campos.length === 0) {
    console.log('Nenhum campo fornecido para atualização');
    return res.status(400).json({ error: 'Nenhum campo fornecido para atualização.' });
  }

  valores.push(id);  // Adiciona o ID ao final para a cláusula WHERE

  const sql = `UPDATE colaboradores SET ${campos.join(', ')} WHERE id = ?`;

  console.log('Consulta SQL gerada:', sql);  // Log para verificar a consulta gerada

  db.query(sql, valores, (err, result) => {
    if (err) {
      console.error('Erro ao atualizar colaborador:', err);
      return res.status(500).json({ error: 'Erro ao atualizar colaborador.' });
    }

    res.json({ message: 'Colaborador atualizado com sucesso.' });
  });
});

// Excluir colaborador
app.delete('/api/colaboradores/:id', (req, res) => {
  const id = req.params.id;

  db.query('SELECT foto FROM colaboradores WHERE id = ?', [id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ error: 'Colaborador não encontrado.' });
    }

    const foto = results[0].foto;

    db.query('DELETE FROM colaboradores WHERE id = ?', [id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao excluir colaborador.' });
      }

      if (foto) {
        const caminho = path.join(__dirname, 'uploads', foto);
        if (fs.existsSync(caminho)) {
          fs.unlinkSync(caminho);
        }
      }

      res.json({ message: 'Colaborador excluído com sucesso.' });
    });
  });
});

app.listen(port, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});
