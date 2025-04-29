const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors'); // Оголошуємо cors лише один раз
const app = express();

app.use(express.json());
app.use(cors({ origin: ['http://localhost:3000', 'https://erotoro001.github.io'] }));

const db = new sqlite3.Database('database.db');

// Ініціалізація бази даних
db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT, password TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS lessons (id INTEGER PRIMARY KEY, title TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS results (id INTEGER PRIMARY KEY, userId INTEGER, lessonId INTEGER, score INTEGER)');
  db.run('DELETE FROM lessons WHERE id > 2');
  db.run('INSERT OR IGNORE INTO lessons (id, title) VALUES (1, "Урок 1"), (2, "Урок 2")');;
});

// Реєстрація
app.post('/register', (req, res) => {
  const { email, password } = req.body;
  db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, password], (err) => {
    if (err) return res.status(500).json({ error: 'Помилка реєстрації' });
    res.json({ message: 'Користувач зареєстрований' });
  });
});

// Вхід
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Неправильний email або пароль' });
    res.json({ token: 'fake-jwt-token' }); // Замініть на реальний JWT, якщо потрібно
  });
});

// Отримання уроків
app.get('/lessons', (req, res) => {
  db.all('SELECT * FROM lessons', [], (err, lessons) => {
    if (err) return res.status(500).json({ error: 'Помилка завантаження уроків' });
    res.json(lessons);
  });
});

// Збереження результатів
app.post('/results', (req, res) => {
  const { lessonId, score } = req.body;
  const userId = 1; // Замініть на реальний userId із токена
  db.run('INSERT INTO results (userId, lessonId, score) VALUES (?, ?, ?)', [userId, lessonId, score], (err) => {
    if (err) return res.status(500).json({ error: 'Помилка збереження результату' });
    res.json({ message: 'Результат збережено' });
  });
});

app.listen(3001, () => {
  console.log('Сервер запущено на порту 3001');
});