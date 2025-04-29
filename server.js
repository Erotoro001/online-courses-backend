const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();

app.use(express.json());
app.use(cors({ origin: ['http://localhost:3000', 'https://erotoro001.github.io'] }));

const db = new sqlite3.Database('database.db');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Використовуй змінну середовища на Render

// Ініціалізація бази даних
db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT, password TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS lessons (id INTEGER PRIMARY KEY, title TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS results (id INTEGER PRIMARY KEY, userId INTEGER, lessonId INTEGER, score INTEGER)');
  // Очищаємо таблицю уроків і додаємо нові
  db.run('DELETE FROM lessons');
  db.run('INSERT OR IGNORE INTO lessons (id, title) VALUES (1, "Урок 1"), (2, "Урок 2"), (3, "Урок 3"), (4, "Урок 4")');
});

// Middleware для перевірки JWT
const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'Токен відсутній' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error('Помилка авторизації:', error.message);
    res.status(401).json({ error: 'Неправильний токен' });
  }
};

// Реєстрація
app.post('/register', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email і пароль обов’язкові' });
  db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, password], function (err) {
    if (err) {
      console.error('Помилка реєстрації:', err.message);
      return res.status(500).json({ error: 'Помилка реєстрації' });
    }
    res.json({ message: 'Користувач зареєстрований', userId: this.lastID });
  });
});

// Вхід
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email і пароль обов’язкові' });
  db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, user) => {
    if (err) {
      console.error('Помилка входу:', err.message);
      return res.status(500).json({ error: 'Помилка сервера' });
    }
    if (!user) return res.status(401).json({ error: 'Неправильний email або пароль' });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  });
});

// Отримання уроків
app.get('/lessons', authenticate, (req, res) => {
  db.all('SELECT * FROM lessons', [], (err, lessons) => {
    if (err) {
      console.error('Помилка завантаження уроків:', err.message);
      return res.status(500).json({ error: 'Помилка завантаження уроків' });
    }
    res.json(lessons);
  });
});

// Збереження результатів
app.post('/results', authenticate, (req, res) => {
  const { lessonId, score } = req.body;
  if (!lessonId || score === undefined) return res.status(400).json({ error: 'lessonId і score обов’язкові' });
  const userId = req.userId;
  db.run('INSERT INTO results (userId, lessonId, score) VALUES (?, ?, ?)', [userId, lessonId, score], (err) => {
    if (err) {
      console.error('Помилка збереження результату:', err.message);
      return res.status(500).json({ error: 'Помилка збереження результату' });
    }
    res.json({ message: 'Результат збережено' });
  });
});

app.listen(3001, () => {
  console.log('Сервер запущено на порту 3001');
});