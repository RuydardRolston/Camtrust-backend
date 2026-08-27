import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, sequelize } from './db_connect.js';
import userRouter from './Route/userRoute.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Enable CORS for frontend clients
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'CamTrust API is running' });
});

// User routes
app.use('/api/users', userRouter);

app.listen(port, async () => {
  try {
    await connectDB();
    await sequelize.sync({ force: false });
    console.log(`Server is running and listening on port ${port}`);
  } catch (error) {
    console.error('Failed to initialize database connection:', error);
  }
});