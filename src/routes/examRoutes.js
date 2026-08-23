import { Router } from 'express';
import { createExam, getExams, getExamById, updateExam, deleteExam, recordExamGrade } from '../controllers/examController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { schemas } from '../utils/validation.js';

const router = Router();

router.get('/', authenticate, getExams);
router.post('/', authenticate, authorize('TEACHER', 'ADMIN'), validate(schemas.createExam), createExam);
router.get('/:id', authenticate, getExamById);
router.put('/:id', authenticate, authorize('TEACHER', 'ADMIN'), updateExam);
router.delete('/:id', authenticate, authorize('TEACHER', 'ADMIN'), deleteExam);
router.post('/:id/grades', authenticate, authorize('TEACHER', 'ADMIN'), recordExamGrade);

export default router;