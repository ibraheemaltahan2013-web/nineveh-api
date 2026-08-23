import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { schemas } from '../utils/validation.js';

export const recordAttendance = async (req, res, next) => {
  try {
    const data = schemas.recordAttendance.parse(req.body);
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    if (!teacher) throw new AppError('مدرس غير موجود', 404);

    const attendance = await prisma.attendance.upsert({
      where: { studentId_classId_date: { studentId: data.studentId, classId: data.classId, date: new Date() } },
      create: { ...data, teacherId: teacher.id, date: new Date() },
      update: { status: data.status, notes: data.notes, teacherId: teacher.id },
      include: { student: { include: { user: { select: { fullName: true } } } } }
    });
    res.json({ attendance });
  } catch (error) {
    next(error);
  }
};

export const recordBulkAttendance = async (req, res, next) => {
  try {
    const { classId, records } = req.body;
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    if (!teacher) throw new AppError('مدرس غير موجود', 404);

    const date = new Date();
    const results = await Promise.all(records.map(r => 
      prisma.attendance.upsert({
        where: { studentId_classId_date: { studentId: r.studentId, classId, date } },
        create: { studentId: r.studentId, classId, teacherId: teacher.id, status: r.status, notes: r.notes, date },
        update: { status: r.status, notes: r.notes, teacherId: teacher.id }
      })
    ));

    res.json({ attendances: results });
  } catch (error) {
    next(error);
  }
};

export const getAttendance = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, classId, studentId, date, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (classId) where.classId = classId;
    if (studentId) where.studentId = studentId;
    if (date) where.date = new Date(date);
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    // Filter by role
    if (req.user.role === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (teacher) where.teacherId = teacher.id;
    } else if (req.user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (student) where.studentId = student.id;
    } else if (req.user.role === 'PARENT') {
      const parent = await prisma.parent.findUnique({ where: { userId: req.user.id } });
      where.studentId = { in: parent?.students.map(s => s.id) || [] };
    }

    const [attendance, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        include: { 
          student: { include: { user: { select: { fullName: true, avatar: true } } } },
          class: { select: { name: true } },
          teacher: { include: { user: { select: { fullName: true } } } }
        },
        orderBy: { date: 'desc' }
      }),
      prisma.attendance.count({ where })
    ]);

    res.json({ attendance, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceStats = async (req, res, next) => {
  try {
    const { classId, studentId, startDate, endDate } = req.query;
    const where = {};
    if (classId) where.classId = classId;
    if (studentId) where.studentId = studentId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const stats = await prisma.attendance.groupBy({
      by: ['status'],
      where,
      _count: { status: true }
    });

    const total = stats.reduce((sum, s) => sum + s._count.status, 0);
    const byStatus = stats.reduce((acc, s) => {
      acc[s.status] = s._count.status;
      return acc;
    }, {});

    res.json({ 
      stats: { 
        total, 
        present: byStatus.PRESENT || 0,
        absent: byStatus.ABSENT || 0,
        late: byStatus.LATE || 0,
        excused: byStatus.EXCUSED || 0,
        attendanceRate: total > 0 ? ((byStatus.PRESENT || 0) + (byStatus.LATE || 0) + (byStatus.EXCUSED || 0)) / total * 100 : 0
      } 
    });
  } catch (error) {
    next(error);
  }
};

export const getMyAttendance = async (req, res, next) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) throw new AppError('طالب غير موجود', 404);

    const attendance = await prisma.attendance.findMany({
      where: { studentId: student.id },
      include: { class: { select: { name: true } }, teacher: { include: { user: { select: { fullName: true } } } } },
      orderBy: { date: 'desc' }
    });
    res.json({ attendance });
  } catch (error) {
    next(error);
  }
};