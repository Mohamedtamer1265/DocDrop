import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('[Error Middleware]', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds maximum allowed limit (50 MB).',
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  // PostgreSQL specific errors
  if (err.code === '22001') {
    return res.status(400).json({
      success: false,
      message: 'Input exceeds maximum allowed length (e.g. title or MIME type too long).',
      code: err.code,
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'A duplicate record already exists.',
      code: err.code,
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced user, tag, or department does not exist.',
      code: err.code,
    });
  }

  const statusCode = err.statusCode || (err.message && err.message.includes('not found') ? 404 : 500);

  return res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected error occurred.',
  });
}
