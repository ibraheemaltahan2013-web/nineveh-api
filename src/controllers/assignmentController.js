import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { schemas } from '../utils/validation.js';

export const createAssignment = async (req, res, next) => {
  try {
    const data = schemas.createAssignment.parse(req.body);
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    if (!teacher) throw new AppError('مدرس غير موجود', 404);

    const assignment = await prisma.assignment.create({
      data: {
        title: data.title,
        description: data.description,
        classId: data.classId,
        teacherId: teacher.id,
        dueDate: new Date(data.dueDate),
        maxScore: data.maxScore,
        attachments: data.attachments
      },
      include: { class: { select: { name: true } }, teacher: { include: { user: { select: { fullName: true } } } } }
    });
    res.status(201).json({ assignment });
  } catch (error) {
    next(error);
  }
};

export const getAssignments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, classId, status } = req.query;
    const skip = (page - 1) * limit;
    const where = {};

    if (classId) where.classId = classId;
    
    // Filter by role
    if (req.user.role === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (teacher) where.teacherId = teacher.id;
    } else if (req.user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (student?.classId) where.classId = student.classId;
    } else if (req.user.role === 'PARENT') {
      const parent = await prisma.parent.findUnique({ where: { userId: req.user.id } });
      const studentIds = parent?.students.map(s => s.id) || [];
      where.classId = { in: studentIds.map(id => id) }; // This needs fixing
    }

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        include: {
          class: { select: { name: true, grade: true, section: true } },
          teacher: { include: { user: { select: { fullName: true } } } },
          _count: { select: { submissions: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.assignment.count({ where })
    ]);

    res.json({ assignments, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

export const getAssignmentById = async (req, res, next) => {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.id },
      include: {
        class: { select: { name: true, grade: true, section: true } },
        teacher: { include: { user: { select: { fullName: true, avatar: true } } } },
        submissions: {
          include: { student: { include: { user: { select: { fullName: true, avatar: true } } } } },
          orderBy: { submittedAt: 'desc' }
        }
      }
    });
    if (!assignment) throw new AppError('الواجب غير موجود', 404);
    res.json({ assignment });
  } catch (error) {
    next(error);
  }
};

export const updateAssignment = async (req, res, next) => {
  try {
    const { title, description, dueDate, maxScore, attachments } = req.body;
    const assignment = await prisma.assignment.update({
      where: { id: req.params.id },
      data: { title, description, dueDate: dueDate ? new Date(dueDate) : undefined, maxScore, attachments },
      include: { class: { select: { name: true } } }
    });
    res.json({ assignment });
  } catch (error) {
    next(error);
  }
};

export const deleteAssignment = async (req, res, next) => {
  try {
    await prisma.assignment.delete({ where: { id: req.params.id } });
    res.json({ message: 'تم حذف الواجب بنجاح' });
  } catch (error) {
    next(error);
  }
};

export const submitAssignment = async (req, res, next) => {
  try {
    const data = schemas.submitAssignment.parse(req.body);
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) throw new AppError('طالب غير موجود', 404);

    const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id } });
    if (!assignment) throw new AppError('الواجب غير موجود', 404);

    const existing = await prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id } }
    });

    let submission;
    if (existing) {
      submission = await prisma.submission.update({
        where: { id: existing.id },
        data: { content: data.content, attachments: data.attachments, status: 'SUBMITTED', submittedAt: new Date() },
        include: { student: { include: { user: { select: { fullName: true } } } } }
      });
    } else {
      submission = await prisma.submission.create({
        data: {
          assignmentId: assignment.id,
          studentId: student.id,
          content: data.content,
          attachments: data.attachments,
          status: 'SUBMITTED',
          submittedAt: new Date()
        },
        include: { student: { include: { user: { select: { fullName: true } } } } }
      });
    }
    res.json({ submission });
  } catch (error) {
    next(error);
  }
};

export const getMySubmissions = async (req, res, next) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) throw new AppError('طالب غير موجود', 404);

    const submissions = await prisma.submission.findMany({
      where: { studentId: student.id },
      include: { assignment: { include: { class: { select: { name: true } }, teacher: { include: { user: { select: { fullName: true } } } } } }, grade: true },
      orderBy: { submittedAt: 'desc' }
    });
    res.json({ submissions });
  } catch (error) {
    next(error);
  }
};

export const gradeSubmission = async (req, res, next) => {
  try {
    const data = schemas.gradeSubmission.parse(req.body);
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    if (!teacher) throw new AppError('مدرس غير موجود', 404);

    const submission = await prisma.submission.findUnique({ where: { id: req.params.id } });
    if (!submission) throw new AppError('التسليم غير موجود', 404);

    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: { status: 'GRADED', gradedAt: new Date() },
      include: { student: { include: { user: { select: { fullName: true } } } }, assignment: true }
    });

    // Create grade record
    await prisma.grade.create({
      data: {
        studentId: submission.studentId,
        teacherId: teacher.id,
        assignmentId: submission.assignmentId,
        score: data.score,
        maxScore: submission.assignment.maxScore,
        feedback: data.feedback
      }
    });

    res.json({ submission: updated });
  } catch (error) {
    next(error);
  }
};