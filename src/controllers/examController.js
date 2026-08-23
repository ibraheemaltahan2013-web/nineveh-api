import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { schemas } from '../utils/validation.js';

export const createExam = async (req, res, next) => {
  try {
    const data = schemas.createExam.parse(req.body);
    const exam = await prisma.exam.create({
      data: {
        title: data.title,
        classId: data.classId,
        subject: data.subject,
        examDate: new Date(data.examDate),
        duration: data.duration,
        maxScore: data.maxScore
      },
      include: { class: { select: { name: true } } }
    });
    res.status(201).json({ exam });
  } catch (error) {
    next(error);
  }
};

export const getExams = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, classId } = req.query;
    const skip = (page - 1) * limit;
    const where = classId ? { classId } : {};

    if (req.user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (student?.classId) where.classId = student.classId;
    } else if (req.user.role === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (teacher) {
        const classes = await prisma.class.findMany({ where: { teacherId: teacher.id }, select: { id: true } });
        where.classId = { in: classes.map(c => c.id) };
      }
    }

    const [exams, total] = await Promise.all([
      prisma.exam.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        include: { class: { select: { name: true, grade: true, section: true } }, _count: { select: { grades: true } } },
        orderBy: { examDate: 'desc' }
      }),
      prisma.exam.count({ where })
    ]);

    res.json({ exams, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

export const getExamById = async (req, res, next) => {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: req.params.id },
      include: { 
        class: { select: { name: true, grade: true, section: true } },
        grades: { include: { student: { include: { user: { select: { fullName: true } } } } } }
      }
    });
    if (!exam) throw new AppError('الامتحان غير موجود', 404);
    res.json({ exam });
  } catch (error) {
    next(error);
  }
};

export const updateExam = async (req, res, next) => {
  try {
    const { title, subject, examDate, duration, maxScore } = req.body;
    const exam = await prisma.exam.update({
      where: { id: req.params.id },
      data: { title, subject, examDate: examDate ? new Date(examDate) : undefined, duration, maxScore },
      include: { class: { select: { name: true } } }
    });
    res.json({ exam });
  } catch (error) {
    next(error);
  }
};

export const deleteExam = async (req, res, next) => {
  try {
    await prisma.exam.delete({ where: { id: req.params.id } });
    res.json({ message: 'تم حذف الامتحان بنجاح' });
  } catch (error) {
    next(error);
  }
};

export const recordExamGrade = async (req, res, next) => {
  try {
    const { studentId, score, feedback } = req.body;
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    if (!teacher) throw new AppError('مدرس غير موجود', 404);

    const exam = await prisma.exam.findUnique({ where: { id: req.params.id } });
    if (!exam) throw new AppError('الامتحان غير موجود', 404);

    const grade = await prisma.grade.create({
      data: {
        studentId,
        teacherId: teacher.id,
        examId: exam.id,
        score,
        maxScore: exam.maxScore,
        feedback
      },
      include: { student: { include: { user: { select: { fullName: true } } } } }
    });
    res.status(201).json({ grade });
  } catch (error) {
    next(error);
  }
};