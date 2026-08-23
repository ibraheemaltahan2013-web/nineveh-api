import { Router } from 'express';
import { sendMessage, getMessages, getConversations, markAsRead, getUnreadCount, getAvailableUsers } from '../controllers/messageController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { schemas } from '../utils/validation.js';

const router = Router();

router.get('/conversations', authenticate, getConversations);
router.get('/unread-count', authenticate, getUnreadCount);
router.get('/users', authenticate, getAvailableUsers);
router.get('/:userId', authenticate, getMessages);
router.post('/', authenticate, validate(schemas.sendMessage), sendMessage);
router.put('/:userId/read', authenticate, markAsRead);

export default router;