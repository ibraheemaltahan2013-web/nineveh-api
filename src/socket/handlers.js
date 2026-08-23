import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { prisma } from '../config/prisma.js';

const userSockets = new Map();

export const setupSocketHandlers = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) return next(new Error('غير مصرح'));
      
      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, fullName: true, role: true, avatar: true }
      });
      if (!user) return next(new Error('مستخدم غير موجود'));
      
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('رمز غير صالح'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.fullName} (${socket.user.id})`);
    
    userSockets.set(socket.user.id, socket.id);
    socket.join(`user:${socket.user.id}`);

    socket.on('join:conversation', (otherUserId) => {
      const room = [socket.user.id, otherUserId].sort().join(':');
      socket.join(`chat:${room}`);
    });

    socket.on('leave:conversation', (otherUserId) => {
      const room = [socket.user.id, otherUserId].sort().join(':');
      socket.leave(`chat:${room}`);
    });

    socket.on('message:send', async (data) => {
      try {
        const { receiverId, content } = data;
        
        const message = await prisma.message.create({
          data: { senderId: socket.user.id, receiverId, content },
          include: { sender: { select: { fullName: true, avatar: true } }, receiver: { select: { fullName: true, avatar: true } } }
        });

        const room = [socket.user.id, receiverId].sort().join(':');
        io.to(`chat:${room}`).emit('message:new', message);
        
        // Notify receiver if not in chat
        const receiverSocket = userSockets.get(receiverId);
        if (receiverSocket) {
          io.to(receiverSocket).emit('notification:new', {
            type: 'message',
            from: socket.user,
            message: content.substring(0, 50) + (content.length > 50 ? '...' : '')
          });
        }
      } catch (error) {
        console.error('Send message error:', error);
      }
    });

    socket.on('message:read', async (data) => {
      const { senderId } = data;
      await prisma.message.updateMany({
        where: { senderId, receiverId: socket.user.id, read: false },
        data: { read: true }
      });
      const room = [socket.user.id, senderId].sort().join(':');
      io.to(`chat:${room}`).emit('message:read', { readerId: socket.user.id });
    });

    socket.on('typing:start', (data) => {
      const { receiverId } = data;
      const room = [socket.user.id, receiverId].sort().join(':');
      socket.to(`chat:${room}`).emit('typing:start', { userId: socket.user.id });
    });

    socket.on('typing:stop', (data) => {
      const { receiverId } = data;
      const room = [socket.user.id, receiverId].sort().join(':');
      socket.to(`chat:${room}`).emit('typing:stop', { userId: socket.user.id });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.fullName}`);
      userSockets.delete(socket.user.id);
    });
  });
};

export const broadcastToUser = (io, userId, event, data) => {
  const socketId = userSockets.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
  }
};

export const broadcastToRole = (io, role, event, data) => {
  io.emit(`role:${role}:${event}`, data);
};

export const notifyNewAnnouncement = (io, announcement) => {
  io.emit('announcement:new', announcement);
};

export const notifyNewAssignment = (io, assignment) => {
  io.to(`class:${assignment.classId}`).emit('assignment:new', assignment);
};

export const notifyGradePosted = (io, grade) => {
  io.to(`user:${grade.studentId}`).emit('grade:new', grade);
};