import { Router } from 'express';
import { recordAttendance, recordBulkAttendance, getAttendance, getAttendanceStats, getMyAttendance } from '../controllers/attendanceController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { schemas } from '../utils/validation.js';

const router = Router();

router.get('/', authenticate, getAttendance);
router.get('/stats', authenticate, getAttendanceStats);
router.get('/my', authenticate, authorize('STUDENT', 'PARENT'), getMyAttendance);
router.post('/', authenticate, authorize('TEACHER', 'ADMIN'), validate(schemas.recordAttendance), recordAttendance);
router.post('/bulk', authenticate, authorize('TEACHER', 'ADMIN'), recordBulkAttendance);

export default router;