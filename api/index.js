import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const registerSchema = z.object({
  email: z.string().email('بريد غير صالح'),
  password: z.string().min(8, 'كلمة المرور 8 أحرف على الأقل'),
  fullName: z.string().min(2, 'الاسم مطلوب'),
  role: z.enum(['ADMIN', 'MANAGER', 'ASSISTANT', 'TEACHER', 'STUDENT', 'PARENT']),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  phone: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return res.status(409).json({ error: 'البريد مستخدم بالفعل' });
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: { email: data.email, passwordHash, fullName: data.fullName, role: data.role, gender: data.gender, phone: data.phone },
      select: { id: true, email: true, fullName: true, role: true, avatar: true, createdAt: true }
    });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.status(201).json({ user, token });
  } catch (error) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'بيانات غير صالحة', details: error.errors });
    console.error('Register error:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) return res.status(401).json({ error: 'بريد أو كلمة مرور غير صحيحة' });
    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'بريد أو كلمة مرور غير صحيحة' });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    const { passwordHash: _, ...userData } = user;
    res.json({ user: userData, token });
  } catch (error) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'بيانات غير صالحة' });
    console.error('Login error:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.cookie('token', '', { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 0 });
  res.json({ message: 'تم تسجيل الخروج' });
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'غير مصرح' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, email: true, fullName: true, role: true, gender: true, phone: true, avatar: true } });
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'غير مصرح' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({ select: { id: true, email: true, fullName: true, role: true, gender: true, phone: true, avatar: true, createdAt: true } });
    res.json({ users });
  } catch (error) {
    console.error('Users error:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.get('/api/users/stats', async (req, res) => {
  try {
    const total = await prisma.user.count();
    const byRole = await prisma.user.groupBy({ by: ['role'], _count: true });
    res.json({ total, byRole: byRole.map(r => ({ role: r.role, count: r._count })) });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.get('/api/classes', async (req, res) => {
  try {
    const classes = await prisma.class.findMany({ include: { _count: { select: { students: true } } } });
    res.json({ classes });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.post('/api/classes', async (req, res) => {
  try {
    const { name, grade, section } = req.body;
    const cls = await prisma.class.create({ data: { name, grade: parseInt(grade), section } });
    res.status(201).json({ class: cls });
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.get('/api/announcements', async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({ include: { author: { select: { fullName: true, role: true } } }, orderBy: { createdAt: 'desc' } });
    res.json({ announcements });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.get('/api/assignments', async (req, res) => {
  try {
    const assignments = await prisma.assignment.findMany({ include: { class: true, teacher: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' } });
    res.json({ assignments });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.get('/api/schedules', async (req, res) => {
  try {
    const schedules = await prisma.schedule.findMany({ include: { class: true, teacher: { select: { fullName: true } } } });
    res.json({ schedules });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.get('/api/attendance', async (req, res) => {
  try {
    const attendance = await prisma.attendance.findMany({ include: { student: { include: { user: { select: { fullName: true } } } }, teacher: { select: { fullName: true } } }, orderBy: { date: 'desc' } });
    res.json({ attendance });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.get('/api/exams', async (req, res) => {
  try {
    const exams = await prisma.exam.findMany({ include: { class: true } });
    res.json({ exams });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    res.json({ messages: [] });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

export default app;
