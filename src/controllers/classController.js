import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { schemas } from '../utils/validation.js';

export const createClass = async (req, res, next) => {
  try {
    const data = schemas.createClass.parse(req.body);
    const cls = await prisma.class.create({
      data: { name: data.name, grade: data.grade, section: data.section, teacherId: data.teacherId },
      include: { teacher: { include: { user: { select: { fullName: true } } } } }
    });
    res.status(201).json({ class: cls });
  } catch (error) {
    next(error);
  }
};

export const getClasses = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, grade } = req.query;
    const skip = (page - 1) * limit;
    const where = grade ? { grade: Number(grade) } : {};

    const [classes, total] = await Promise.all([
      prisma.class.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        include: { teacher: { include: { user: { select: { fullName: true } } } }, _count: { select: { students: true } } },
        orderBy: [{ grade: 'asc' }, { section: 'asc' }]
      }),
      prisma.class.count({ where })
    ]);

    res.json({ classes, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

export const getClassById = async (req, res, next) => {
  try {
    const cls = await prisma.class.findUnique({
      where: { id: req.params.id },
      include: {
        teacher: { include: { user: { select: { fullName: true, email: true, avatar: true } } } },
        students: { include: { user: { select: { fullName: true, email: true, avatar: true } } } },
        schedules: { include: { teacher: { select: { fullName: true } } } }
      }
    });
    if (!cls) throw new AppError('الصف غير موجود', 404);
    res.json({ class: cls });
  } catch (error) {
    next(error);
  }
};

export const updateClass = async (req, res, next) => {
  try {
    const { name, grade, section, teacherId } = req.body;
    const cls = await prisma.class.update({
      where: { id: req.params.id },
      data: { name, grade, section, teacherId },
      include: { teacher: { include: { user: { select: { fullName: true } } } } }
    });
    res.json({ class: cls });
  } catch (error) {
    next(error);
  }
};

export const deleteClass = async (req, res, next) => {
  try {
    await prisma.class.delete({ where: { id: req.params.id } });
    res.json({ message: 'تم حذف الصف بنجاح' });
  } catch (error) {
    next(error);
  }
};

export const getMyClasses = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let classes;

    if (req.user.role === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({ where: { userId } });
      if (!teacher) throw new AppError('مدرس غير موجود', 404);
      classes = await prisma.class.findMany({
        where: { teacherId: teacher.id },
        include: { _count: { select: { students: true } } }
      });
    } else if (req.user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { userId } });
      if (!student || !student.classId) return res.json({ classes: [] });
      classes = await prisma.class.findMany({
        where: { id: student.classId },
        include: { teacher: { include: { user: { select: { fullName: true } } } } }
      });
    } else {
      classes = await prisma.class.findMany({
        include: { teacher: { include: { user: { select: { fullName: true } } } }, _count: { select: { students: true } } }
      });
    }

    res.json({ classes });
  } catch (error) {
    next(error);
  }
};

export const getClassStudents = async (req, res, next) => {
  try {
    const students = await prisma.student.findMany({
      where: { classId: req.params.id },
      include: { user: { select: { id: true, fullName: true, email: true, avatar: true, gender: true, phone: true } }, parent: { include: { user: { select: { fullName: true, phone: true } } } } },
      orderBy: { user: { fullName: 'asc' } }
    });
    res.json({ students });
  } catch (error) {
    next(error);
  }
};

export const assignStudentToClass = async (req, res, next) => {
  try {
    const { studentId } = req.body;
    const student = await prisma.student.update({
      where: { id: studentId },
      data: { classId: req.params.id },
      include: { user: { select: { fullName: true } } }
    });
    res.json({ student });
  } catch (error) {
    next(error);
  }
};

export const removeStudentFromClass = async (req, res, next) => {
  try {
    const { studentId } = req.body;
    await prisma.student.update({
      where: { id: studentId },
      data: { classId: null }
    });
    res.json({ message: 'تم إزالة الطالب من الصف' });
  } catch (error) {
    next(error);
  }
};