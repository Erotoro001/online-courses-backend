const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());
app.use(cors({ origin: ['http://localhost:3000', 'https://erotoro001.github.io'] }));

const JWT_SECRET = process.env.JWT_SECRET || 'GbJOlHezyu1Oew89';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Erotoro:<db_password>@cluster0.mezaxrk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Підключення до MongoDB
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB підключено'))
  .catch(err => console.error('Помилка підключення до MongoDB:', err.message));

// Схеми та моделі
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const lessonSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
});
const resultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  lessonId: { type: Number, required: true },
  score: { type: Number, required: true },
});

const User = mongoose.model('User', userSchema);
const Lesson = mongoose.model('Lesson', lessonSchema);
const Result = mongoose.model('Result', resultSchema);

// Ініціалізація уроків
const initializeLessons = async () => {
  try {
    const lessonCount = await Lesson.countDocuments();
    if (lessonCount === 0) {
      await Lesson.insertMany([
        { id: 1, title: 'Урок 1' },
        { id: 2, title: 'Урок 2' },
        { id: 3, title: 'Урок 3' },
        { id: 4, title: 'Урок 4' },
      ]);
      console.log('Уроки ініціалізовані');
    }
  } catch (err) {
    console.error('Помилка ініціалізації уроків:', err.message);
  }
};
initializeLessons();

// Middleware для перевірки JWT
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Токен відсутній або неправильний формат' });
  }
  const token = authHeader.split(' ')[1];
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
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email і пароль обов’язкові' });
  try {
    const user = new User({ email, password });
    await user.save();
    res.json({ message: 'Користувач зареєстрований', userId: user._id });
  } catch (err) {
    console.error('Помилка реєстрації:', err.message);
    res.status(500).json({ error: 'Помилка реєстрації' });
  }
});

// Вхід
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email і пароль обов’язкові' });
  try {
    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).json({ error: 'Неправильний email або пароль' });
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error('Помилка входу:', err.message);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Отримання уроків
app.get('/lessons', authenticate, async (req, res) => {
  try {
    const lessons = await Lesson.find().sort({ id: 1 });
    res.json(lessons);
  } catch (err) {
    console.error('Помилка завантаження уроків:', err.message);
    res.status(500).json({ error: 'Помилка завантаження уроків' });
  }
});

// Збереження результатів
app.post('/results', authenticate, async (req, res) => {
  const { lessonId, score } = req.body;
  if (!lessonId || score === undefined) return res.status(400).json({ error: 'lessonId і score обов’язкові' });
  const userId = req.userId;
  try {
    const result = new Result({ userId, lessonId, score });
    await result.save();
    res.json({ message: 'Результат збережено' });
  } catch (err) {
    console.error('Помилка збереження результату:', err.message);
    res.status(500).json({ error: 'Помилка збереження результату' });
  }
});

app.listen(3001, () => {
  console.log('Сервер запущено на порту 3001');
});