import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { schemas } from '../utils/validation.js';

export const sendMessage = async (req, res, next) => {
  try {
    const data = schemas.sendMessage.parse(req.body);
    
    const receiver = await prisma.user.findUnique({ where: { id: data.receiverId } });
    if (!receiver) throw new AppError('المستلم غير موجود', 404);

    const message = await prisma.message.create({
      data: { senderId: req.user.id, receiverId: data.receiverId, content: data.content },
      include: { sender: { select: { fullName: true, avatar: true } }, receiver: { select: { fullName: true, avatar: true } } }
    });
    
    res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, userId } = req.query;
    const skip = (page - 1) * limit;
    
    const where = userId ? {
      OR: [
        { senderId: req.user.id, receiverId: userId },
        { senderId: userId, receiverId: req.user.id }
      ]
    } : {
      OR: [{ senderId: req.user.id }, { receiverId: req.user.id }]
    };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        include: { sender: { select: { fullName: true, avatar: true } }, receiver: { select: { fullName: true, avatar: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.message.count({ where })
    ]);

    // Mark as read
    if (userId) {
      await prisma.message.updateMany({
        where: { senderId: userId, receiverId: req.user.id, read: false },
        data: { read: true }
      });
    }

    res.json({ messages: messages.reverse(), total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

export const getConversations = async (req, res, next) => {
  try {
    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: req.user.id }, { receiverId: req.user.id }] },
      include: { sender: { select: { id: true, fullName: true, avatar: true, role: true } }, receiver: { select: { id: true, fullName: true, avatar: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const conversationMap = new Map();
    for (const msg of messages) {
      const otherUser = msg.senderId === req.user.id ? msg.receiver : msg.sender;
      if (!conversationMap.has(otherUser.id)) {
        conversationMap.set(otherUser.id, {
          user: otherUser,
          lastMessage: msg,
          unreadCount: 0
        });
      }
      if (msg.receiverId === req.user.id && !msg.read) {
        const conv = conversationMap.get(otherUser.id);
        conv.unreadCount++;
      }
    }

    res.json({ conversations: Array.from(conversationMap.values()) });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    await prisma.message.updateMany({
      where: { senderId: req.params.userId, receiverId: req.user.id, read: false },
      data: { read: true }
    });
    res.json({ message: 'تم تحديد الرسائل كمقروءة' });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await prisma.message.count({
      where: { receiverId: req.user.id, read: false }
    });
    res.json({ count });
  } catch (error) {
    next(error);
  }
};

export const getAvailableUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { id: { not: req.user.id } },
      select: { id: true, fullName: true, role: true, avatar: true },
      orderBy: { fullName: 'asc' }
    });
    res.json({ users });
  } catch (error) {
    next(error);
  }
};