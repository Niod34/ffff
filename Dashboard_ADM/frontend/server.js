const express = require('express');
const path = require('path');
const multer = require('multer');
const mysql = require('mysql2');
const fs = require('fs');

const app = express();
const port = 4000;

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
  password: 'cimatec',
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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

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
