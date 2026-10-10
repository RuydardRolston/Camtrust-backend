import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { initSocket } from './utils/socket.js';
import { connectDB, syncDB } from './db_connect.js';
import './models/index.js';
import userRouter from './routes/userRoute.js';
import projectRouter from './routes/projectRoute.js';
import milestoneRouter from './routes/milestoneRoute.js';
import evidenceRouter from './routes/evidenceRoute.js';
import reportRouter from './routes/reportRoute.js';
import documentRouter from './routes/documentRoute.js';
import verificationRouter from './routes/verificationRoute.js';
import verificationDocumentRouter from './routes/verificationDocumentRoute.js';
import notificationRouter from './routes/notificationRoute.js';
import assignmentRouter from './routes/assignmentRoute.js';
import assignmentProposalRouter from './routes/assignmentProposalRoute.js';
import aiRouter from './routes/aiRoute.js';
import adminRouter from './routes/adminRoute.js';
import messageRouter from './routes/messageRoute.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
}, express.static('uploads'));

app.use('/api/users', userRouter);
app.use('/api/projects', projectRouter);
app.use('/api/milestones', milestoneRouter);
app.use('/api/evidence', evidenceRouter);
app.use('/api/reports', reportRouter);
app.use('/api/documents', documentRouter);
app.use('/api/verifications', verificationRouter);
app.use('/api/verifications', verificationDocumentRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/assignments', assignmentRouter);
app.use('/api/assignments', assignmentProposalRouter);
app.use('/api/ai', aiRouter);
app.use('/api/admin', adminRouter);
app.use('/api/messages', messageRouter);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'CamTrust API is running' });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

const startServer = async () => {
  try {
    await connectDB();
    await syncDB();

    const httpServer = createServer(app);
    initSocket(httpServer);

    httpServer.listen(port, () => {
      console.log(`Server is running and listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
};

startServer();

export { app, startServer };
