import { z } from 'zod';

export const schemas = {
  register: z.object({
    email: z.string().email('بريد إلكتروني غير صالح'),
    password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
    fullName: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
    role: z.enum(['ADMIN', 'MANAGER', 'ASSISTANT', 'TEACHER', 'STUDENT', 'PARENT']).default('STUDENT'),
    gender: z.enum(['MALE', 'FEMALE']).optional(),
    phone: z.string().optional()
  }),

  login: z.object({
    email: z.string().email('بريد إلكتروني غير صالح'),
    password: z.string().min(1, 'كلمة المرور مطلوبة')
  }),

  createClass: z.object({
    name: z.string().min(1, 'اسم الصف مطلوب'),
    grade: z.number().int().min(1).max(12),
    section: z.string().min(1, 'الشعبة مطلوبة'),
    teacherId: z.string().optional()
  }),

  createAnnouncement: z.object({
    title: z.string().min(1, 'العنوان مطلوب'),
    content: z.string().min(1, 'المحتوى مطلوب'),
    targetRoles: z.array(z.enum(['ADMIN', 'MANAGER', 'ASSISTANT', 'TEACHER', 'STUDENT', 'PARENT'])).default(['STUDENT', 'TEACHER', 'PARENT'])
  }),

  createAssignment: z.object({
    title: z.string().min(1, 'العنوان مطلوب'),
    description: z.string().min(1, 'الوصف مطلوب'),
    classId: z.string().min(1, 'الصف مطلوب'),
    dueDate: z.string().datetime('تاريخ غير صالح'),
    maxScore: z.number().int().positive().default(100),
    attachments: z.array(z.string().url()).default([])
  }),

  submitAssignment: z.object({
    content: z.string().optional(),
    attachments: z.array(z.string().url()).default([])
  }),

  gradeSubmission: z.object({
    score: z.number().int().min(0),
    feedback: z.string().optional()
  }),

  createExam: z.object({
    title: z.string().min(1, 'العنوان مطلوب'),
    classId: z.string().min(1, 'الصف مطلوب'),
    subject: z.string().min(1, 'المادة مطلوبة'),
    examDate: z.string().datetime('تاريخ غير صالح'),
    duration: z.number().int().positive(),
    maxScore: z.number().int().positive().default(100)
  }),

  recordAttendance: z.object({
    studentId: z.string().min(1, 'الطالب مطلوب'),
    classId: z.string().min(1, 'الصف مطلوب'),
    status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
    notes: z.string().optional()
  }),

  sendMessage: z.object({
    receiverId: z.string().min(1, 'المستلم مطلوب'),
    content: z.string().min(1, 'الرسالة مطلوبة')
  }),

  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
};