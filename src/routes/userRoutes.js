import { Router } from 'express';
import { getUsers, getUserById, updateUser, deleteUser, getDashboardStats } from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/stats', authenticate, authorize('ADMIN'), getDashboardStats);
router.get('/', authenticate, authorize('ADMIN'), getUsers);
router.get('/:id', authenticate, getUserById);
router.put('/:id', authenticate, authorize('ADMIN'), updateUser);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteUser);

export default router;