import { Router } from 'express';
import { createAnnouncement, getAnnouncements, getAnnouncementById, updateAnnouncement, deleteAnnouncement } from '../controllers/announcementController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { schemas } from '../utils/validation.js';

const router = Router();

router.get('/', authenticate, getAnnouncements);
router.post('/', authenticate, authorize('ADMIN', 'TEACHER'), validate(schemas.createAnnouncement), createAnnouncement);
router.get('/:id', authenticate, getAnnouncementById);
router.put('/:id', authenticate, authorize('ADMIN', 'TEACHER'), updateAnnouncement);
router.delete('/:id', authenticate, authorize('ADMIN', 'TEACHER'), deleteAnnouncement);

export default router;