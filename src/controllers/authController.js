import { prisma } from '../config/prisma.js';
import { hashPassword, comparePassword, generateToken, setTokenCookie, clearTokenCookie } from '../utils/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { schemas } from '../utils/validation.js';

export const register = async (req, res, next) => {
  try {
    const data = schemas.register.parse(req.body);
    
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw new AppError('هذا البريد الإلكتروني مستخدم بالفعل', 409);

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        role: data.role,
        gender: data.gender,
        phone: data.phone
      },
      select: { id: true, email: true, fullName: true, role: true, avatar: true, createdAt: true }
    });

    const token = generateToken(user.id);
    setTokenCookie(res, token);

    res.status(201).json({ user, token });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const data = schemas.login.parse(req.body);
    
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new AppError('بريد إلكتروني أو كلمة مرور غير صحيحة', 401);

    const valid = await comparePassword(data.password, user.passwordHash);
    if (!valid) throw new AppError('بريد إلكتروني أو كلمة مرور غير صحيحة', 401);

    const token = generateToken(user.id);
    setTokenCookie(res, token);

    const { passwordHash: _, ...userData } = user;
    res.json({ user: userData, token });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  clearTokenCookie(res);
  res.json({ message: 'تم تسجيل الخروج بنجاح' });
};

export const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { 
        id: true, email: true, fullName: true, role: true, avatar: true, 
        gender: true, phone: true, createdAt: true,
        teacher: { select: { employeeId: true, subject: true } },
        student: { select: { studentId: true, class: true } },
        parent: { select: { students: { select: { id: true, user: { select: { fullName: true } } } } } }
      }
    });
    if (!user) throw new AppError('المستخدم غير موجود', 404);
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { fullName, phone, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { fullName, phone, avatar },
      select: { id: true, email: true, fullName: true, role: true, avatar: true, phone: true }
    });
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    
    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) throw new AppError('كلمة المرور الحالية غير صحيحة', 401);

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });
    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (error) {
    next(error);
  }
};