export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'هذا السجل موجود بالفعل' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'السجل غير موجود' });
    }
  }

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'بيانات غير صالحة',
      details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
    });
  }

  const status = err.status || 500;
  const message = err.message || 'خطأ في الخادم';

  res.status(status).json({ error: message });
};

export class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.name = 'AppError';
  }
}