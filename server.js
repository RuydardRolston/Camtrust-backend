import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { initSocket } from './utils/socket.js';
import { connectDB, syncDB } from './db_connect.js';
import './models/index.js';
import userRouter from './Route/userRoute.js';
import projectRouter from './Route/projectRoute.js';
import milestoneRouter from './Route/milestoneRoute.js';
import evidenceRouter from './Route/evidenceRoute.js';
import reportRouter from './Route/reportRoute.js';
import documentRouter from './Route/documentRoute.js';
import verificationRouter from './Route/verificationRoute.js';
import verificationDocumentRouter from './Route/verificationDocumentRoute.js';
import notificationRouter from './Route/notificationRoute.js';
import assignmentRouter from './Route/assignmentRoute.js';
import assignmentProposalRouter from './Route/assignmentProposalRoute.js';
import aiRouter from './Route/aiRoute.js';
import adminRouter from './Route/adminRoute.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use('/uploads', express.static('uploads'));

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

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'CamTrust API is running' });
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
