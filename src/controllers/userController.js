import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { schemas } from '../utils/validation.js';

export const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const skip = (page - 1) * limit;
    
    const where = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        select: { id: true, email: true, fullName: true, role: true, avatar: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    res.json({ users, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, fullName: true, role: true, avatar: true, gender: true, phone: true, createdAt: true }
    });
    if (!user) throw new AppError('المستخدم غير موجود', 404);
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { fullName, role, gender, phone, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { fullName, role, gender, phone, avatar },
      select: { id: true, email: true, fullName: true, role: true, avatar: true, gender: true, phone: true }
    });
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'تم حذف المستخدم بنجاح' });
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const [totalUsers, totalStudents, totalTeachers, totalClasses, totalAssignments, pendingSubmissions] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'TEACHER' } }),
      prisma.class.count(),
      prisma.assignment.count(),
      prisma.submission.count({ where: { status: 'PENDING' } })
    ]);

    res.json({
      stats: { totalUsers, totalStudents, totalTeachers, totalClasses, totalAssignments, pendingSubmissions }
    });
  } catch (error) {
    next(error);
  }
};