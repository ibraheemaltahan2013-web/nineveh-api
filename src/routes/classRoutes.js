import { Router } from 'express';
import { 
  createClass, getClasses, getClassById, updateClass, deleteClass,
  getMyClasses, getClassStudents, assignStudentToClass, removeStudentFromClass
} from '../controllers/classController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { schemas } from '../utils/validation.js';

const router = Router();

router.get('/my-classes', authenticate, getMyClasses);
router.get('/', authenticate, getClasses);
router.post('/', authenticate, authorize('ADMIN'), validate(schemas.createClass), createClass);
router.get('/:id', authenticate, getClassById);
router.put('/:id', authenticate, authorize('ADMIN'), updateClass);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteClass);
router.get('/:id/students', authenticate, getClassStudents);
router.post('/:id/students', authenticate, authorize('ADMIN', 'TEACHER'), assignStudentToClass);
router.delete('/:id/students', authenticate, authorize('ADMIN', 'TEACHER'), removeStudentFromClass);

export default router;