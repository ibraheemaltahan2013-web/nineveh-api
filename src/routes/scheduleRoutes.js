import { Router } from 'express';
import { createSchedule, getSchedules, getClassSchedule, getMySchedule, updateSchedule, deleteSchedule } from '../controllers/scheduleController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getSchedules);
router.get('/my', authenticate, getMySchedule);
router.get('/class/:classId', authenticate, getClassSchedule);
router.post('/', authenticate, authorize('ADMIN', 'TEACHER'), createSchedule);
router.put('/:id', authenticate, authorize('ADMIN', 'TEACHER'), updateSchedule);
router.delete('/:id', authenticate, authorize('ADMIN', 'TEACHER'), deleteSchedule);

export default router;