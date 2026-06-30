import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Essential Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',  // Local Web Dev Server
    'http://localhost',       // Capacitor Webview Native iOS/Android default
    'http://localhost:8080'   // Capacitor alternative wrapper local port
  ],
  credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Expense Tracker API is running smoothly!');
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Expense Tracker API running on http://localhost:${PORT}`);
});

import authRoutes from './routes/auth-routes.js';

// Place beneath your app.use(express.json()) middleware
app.use('/api/auth', authRoutes);

import expenseRoutes from './routes/expense-routes.js';

app.use('/api', expenseRoutes);