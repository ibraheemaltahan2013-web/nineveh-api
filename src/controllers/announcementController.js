import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { schemas } from '../utils/validation.js';

export const createAnnouncement = async (req, res, next) => {
  try {
    const data = schemas.createAnnouncement.parse(req.body);
    const announcement = await prisma.announcement.create({
      data: { title: data.title, content: data.content, authorId: req.user.id, targetRoles: data.targetRoles },
      include: { author: { select: { fullName: true, role: true, avatar: true } } }
    });
    res.status(201).json({ announcement });
  } catch (error) {
    next(error);
  }
};

export const getAnnouncements = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, targetRole } = req.query;
    const skip = (page - 1) * limit;
    
    const where = targetRole ? { targetRoles: { has: targetRole } } : {};
    
    // Students see announcements targeted to STUDENT or PARENT
    // Teachers see announcements targeted to TEACHER
    // Admins see all
    if (req.user.role === 'STUDENT') {
      where.targetRoles = { hasSome: ['STUDENT', 'PARENT'] };
    } else if (req.user.role === 'TEACHER') {
      where.targetRoles = { hasSome: ['TEACHER', 'ADMIN'] };
    } else if (req.user.role === 'PARENT') {
      where.targetRoles = { hasSome: ['PARENT', 'STUDENT'] };
    }

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        include: { author: { select: { fullName: true, role: true, avatar: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.announcement.count({ where })
    ]);

    res.json({ announcements, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

export const getAnnouncementById = async (req, res, next) => {
  try {
    const announcement = await prisma.announcement.findUnique({
      where: { id: req.params.id },
      include: { author: { select: { fullName: true, role: true, avatar: true } } }
    });
    if (!announcement) throw new AppError('الإعلان غير موجود', 404);
    res.json({ announcement });
  } catch (error) {
    next(error);
  }
};

export const updateAnnouncement = async (req, res, next) => {
  try {
    const { title, content, targetRoles } = req.body;
    const announcement = await prisma.announcement.update({
      where: { id: req.params.id },
      data: { title, content, targetRoles },
      include: { author: { select: { fullName: true, role: true, avatar: true } } }
    });
    res.json({ announcement });
  } catch (error) {
    next(error);
  }
};

export const deleteAnnouncement = async (req, res, next) => {
  try {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ message: 'تم حذف الإعلان بنجاح' });
  } catch (error) {
    next(error);
  }
};