import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './src/config/env.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import classRoutes from './src/routes/classRoutes.js';
import announcementRoutes from './src/routes/announcementRoutes.js';
import assignmentRoutes from './src/routes/assignmentRoutes.js';
import messageRoutes from './src/routes/messageRoutes.js';
import attendanceRoutes from './src/routes/attendanceRoutes.js';
import examRoutes from './src/routes/examRoutes.js';
import scheduleRoutes from './src/routes/scheduleRoutes.js';

const app = express();

app.use(cors({
  origin: config.clientUrl,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/schedules', scheduleRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

export default app;
