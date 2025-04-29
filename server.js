const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors({ origin: ['http://localhost:3000', 'https://Erotoro001.github.io'] }));

const db = new sqlite3.Database('./database.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT, password TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS lessons (id INTEGER PRIMARY KEY, title TEXT, content TEXT)`);
  db.run(`INSERT INTO lessons (title, content) VALUES (?, ?)`, ['Урок 1', 'Введення в математику']);
  db.run(`INSERT INTO lessons (title, content) VALUES (?, ?)`, ['Урок 2', 'Основи програмування']);
  db.run(`CREATE TABLE IF NOT EXISTS results (id INTEGER PRIMARY KEY, user_id INTEGER, lesson_id INTEGER, score INTEGER)`);
});

// Реєстрація
app.post('/register', (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  db.run(`INSERT INTO users (email, password) VALUES (?, ?)`, [email, hashedPassword], (err) => {
    if (err) return res.status(500).send('Помилка реєстрації');
    res.send('Користувач зареєстрований');
  });
});

// Вхід
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
    if (err || !user) return res.status(401).send('Користувача не знайдено');
    if (bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user.id }, 'secret_key', { expiresIn: '1h' });
      res.json({ token });
    } else {
      res.status(401).send('Невірний пароль');
    }
  });
});

// Middleware для аутентифікації
const authenticate = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).send('Токен відсутній');
  jwt.verify(token, 'secret_key', (err, decoded) => {
    if (err) return res.status(401).send('Невірний токен');
    req.userId = decoded.id;
    next();
  });
};

// Отримання уроків
app.get('/lessons', authenticate, (req, res) => {
  db.all(`SELECT * FROM lessons`, [], (err, rows) => {
    if (err) return res.status(500).send('Помилка сервера');
    res.json(rows);
  });
});

// Збереження результатів
app.post('/results', authenticate, (req, res) => {
  const { lessonId, score } = req.body;
  db.run(`INSERT INTO results (user_id, lesson_id, score) VALUES (?, ?, ?)`, [req.userId, lessonId, score], (err) => {
    if (err) return res.status(500).send('Помилка збереження');
    res.send('Результат збережено');
  });
});

app.listen(3001, () => console.log('Сервер запущено на порту 3001'));