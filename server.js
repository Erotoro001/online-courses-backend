const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Ініціалізація Express
const app = express();
app.use(express.json());

// Налаштування CORS для дозволу запитів із фронтенду
app.use(cors({
  origin: ['http://localhost:3000', 'https://erotoro001.github.io'],
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Константи для порту, JWT і MongoDB
const PORT = process.env.PORT || 3001; // Render використовує process.env.PORT
const JWT_SECRET = process.env.JWT_SECRET || 'GbJOlHezyu1Oew89';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Erotoro:GbJOlHezyu1Oew89@cluster0.mezaxrk.mongodb.net/onlinecourses?retryWrites=true&w=majority&appName=Cluster0';

// Логування для діагностики
console.log('MONGODB_URI:', MONGODB_URI);

// Підключення до MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB підключено'))
  .catch(err => console.error('Помилка підключення до MongoDB:', err.message));

// Схема користувача
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Пароль буде захешований
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const User = mongoose.model('User', userSchema);

// Схема уроків
const lessonSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true }, // Числове ID для відповідності фронтенду
  title: { type: String, required: true },
});
const Lesson = mongoose.model('Lesson', lessonSchema);

// Схема результатів
const resultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lessonId: { type: Number, required: true }, // Зберігаємо числове ID уроку
  score: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }, // Додаємо дату створення
});
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
      console.log('Уроки ініціалізовані, кількість:', 4);
    } else {
      console.log('Уроки вже ініціалізовані, кількість:', lessonCount);
    }
  } catch (err) {
    console.error('Помилка ініціалізації уроків:', err.message);
  }
};

// Виконуємо ініціалізацію після підключення до MongoDB
mongoose.connection.once('open', initializeLessons);

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

// Реєстрація користувача з хешуванням пароля
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email і пароль обов’язкові' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10); // Хешуємо пароль
    const user = new User({ email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'Користувач зареєстрований', userId: user._id });
  } catch (err) {
    console.error('Помилка реєстрації:', err.message);
    res.status(500).json({ error: 'Помилка реєстрації' });
  }
});

// Вхід користувача з перевіркою пароля
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email і пароль обов’язкові' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Неправильний email або пароль' });
    }
    const isMatch = await bcrypt.compare(password, user.password); // Перевіряємо пароль
    if (!isMatch) {
      return res.status(401).json({ error: 'Неправильний email або пароль' });
    }
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error('Помилка входу:', err.message);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Отримання списку уроків
app.get('/lessons', authenticate, async (req, res) => {
  try {
    const lessons = await Lesson.find().sort({ id: 1 });
    res.json(lessons);
  } catch (err) {
    console.error('Помилка завантаження уроків:', err.message);
    res.status(500).json({ error: 'Помилка завантаження уроків' });
  }
});

// Збереження результатів тесту
app.post('/results', authenticate, async (req, res) => {
  const { lessonId, score } = req.body;
  if (!lessonId || score === undefined) {
    return res.status(400).json({ error: 'lessonId і score обов’язкові' });
  }
  const userId = req.userId;
  try {
    const result = new Result({ userId, lessonId, score });
    await result.save();
    res.status(201).json({ message: 'Результат збережено' });
  } catch (err) {
    console.error('Помилка збереження результату:', err.message);
    res.status(500).json({ error: 'Помилка збереження результату' });
  }
});

// Отримання результатів користувача
app.get('/user-results', authenticate, async (req, res) => {
  try {
    const results = await Result.find({ userId: req.userId });
    res.json(results);
  } catch (err) {
    console.error('Помилка завантаження результатів:', err.message);
    res.status(500).json({ error: 'Помилка завантаження результатів' });
  }
});

// Отримання профілю користувача
app.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'Користувач не знайдений' });
    res.json(user);
  } catch (error) {
    console.error('Помилка завантаження профілю:', error.message);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Оновлення профілю користувача
app.put('/profile', authenticate, async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Користувач не знайдений' });

    if (email) user.email = email;
    if (password) user.password = password; // bcrypt хешування відбудеться в pre('save')
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;

    await user.save();
    res.json({ message: 'Профіль оновлено' });
  } catch (error) {
    console.error('Помилка оновлення профілю:', error.message);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущено на порту ${PORT}`);
});