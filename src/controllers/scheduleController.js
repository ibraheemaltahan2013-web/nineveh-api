import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export const createSchedule = async (req, res, next) => {
  try {
    const { classId, subject, teacherId, dayOfWeek, startTime, endTime, room } = req.body;
    const schedule = await prisma.schedule.create({
      data: { classId, subject, teacherId, dayOfWeek: Number(dayOfWeek), startTime, endTime, room },
      include: { class: { select: { name: true } }, teacher: { select: { fullName: true } } }
    });
    res.status(201).json({ schedule });
  } catch (error) {
    next(error);
  }
};

export const getSchedules = async (req, res, next) => {
  try {
    const { classId, teacherId } = req.query;
    const where = {};
    if (classId) where.classId = classId;
    if (teacherId) where.teacherId = teacherId;

    if (req.user.role === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (teacher) where.teacherId = teacher.id;
    } else if (req.user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (student?.classId) where.classId = student.classId;
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: { class: { select: { name: true, grade: true, section: true } }, teacher: { select: { fullName: true, avatar: true } } },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });
    res.json({ schedules });
  } catch (error) {
    next(error);
  }
};

export const getClassSchedule = async (req, res, next) => {
  try {
    const schedules = await prisma.schedule.findMany({
      where: { classId: req.params.classId },
      include: { teacher: { select: { fullName: true, avatar: true } } },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });
    res.json({ schedules });
  } catch (error) {
    next(error);
  }
};

export const getMySchedule = async (req, res, next) => {
  try {
    let schedules;
    if (req.user.role === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      schedules = await prisma.schedule.findMany({
        where: { teacherId: teacher?.id },
        include: { class: { select: { name: true, grade: true, section: true } } },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
      });
    } else if (req.user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (student?.classId) {
        schedules = await prisma.schedule.findMany({
          where: { classId: student.classId },
          include: { teacher: { select: { fullName: true, avatar: true } } },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
        });
      } else {
        schedules = [];
      }
    } else {
      schedules = await prisma.schedule.findMany({
        include: { class: { select: { name: true } }, teacher: { select: { fullName: true } } },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
      });
    }
    res.json({ schedules });
  } catch (error) {
    next(error);
  }
};

export const updateSchedule = async (req, res, next) => {
  try {
    const { subject, teacherId, dayOfWeek, startTime, endTime, room } = req.body;
    const schedule = await prisma.schedule.update({
      where: { id: req.params.id },
      data: { subject, teacherId, dayOfWeek: dayOfWeek ? Number(dayOfWeek) : undefined, startTime, endTime, room },
      include: { class: { select: { name: true } }, teacher: { select: { fullName: true } } }
    });
    res.json({ schedule });
  } catch (error) {
    next(error);
  }
};

export const deleteSchedule = async (req, res, next) => {
  try {
    await prisma.schedule.delete({ where: { id: req.params.id } });
    res.json({ message: 'تم حذف الحصة بنجاح' });
  } catch (error) {
    next(error);
  }
};