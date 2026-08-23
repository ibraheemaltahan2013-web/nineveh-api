import { Router } from 'express';
import { 
  createAssignment, getAssignments, getAssignmentById, updateAssignment, deleteAssignment,
  submitAssignment, getMySubmissions, gradeSubmission
} from '../controllers/assignmentController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { schemas } from '../utils/validation.js';

const router = Router();

router.get('/', authenticate, getAssignments);
router.post('/', authenticate, authorize('TEACHER', 'ADMIN'), validate(schemas.createAssignment), createAssignment);
router.get('/my-submissions', authenticate, authorize('STUDENT'), getMySubmissions);
router.get('/:id', authenticate, getAssignmentById);
router.put('/:id', authenticate, authorize('TEACHER', 'ADMIN'), updateAssignment);
router.delete('/:id', authenticate, authorize('TEACHER', 'ADMIN'), deleteAssignment);
router.post('/:id/submit', authenticate, authorize('STUDENT'), validate(schemas.submitAssignment), submitAssignment);
router.post('/:id/grade', authenticate, authorize('TEACHER', 'ADMIN'), validate(schemas.gradeSubmission), gradeSubmission);

export default router;