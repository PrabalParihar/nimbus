import { Request, Response, NextFunction } from 'express';
import { Logger } from 'winston';

// Error types
interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

export const errorHandler = (error: AppError, req: Request, res: Response, next: NextFunction) => {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  // Default error values
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.name === 'MongoError' && error.message.includes('duplicate key')) {
    statusCode = 409;
    message = 'Duplicate entry';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    message = 'File upload error';
  }

  // Log error (don't log client errors in production)
  if (statusCode >= 500 || process.env.NODE_ENV === 'development') {
    const logger = req.app.get('logger') || console;
    logger.error('Error Handler:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }

  const errorResponse: ErrorResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };

  // Add details in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
  }

  res.status(statusCode).json(errorResponse);
};

// 404 handler
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  const error = new Error(`Route ${req.originalUrl} not found`) as AppError;
  error.statusCode = 404;
  next(error);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Create operational errors
export const createError = (message: string, statusCode: number = 500): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

// Handle unhandled promise rejections
export const handleUnhandledRejection = (logger?: Logger) => {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    if (logger) {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    } else {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    }
    
    // Close server gracefully
    process.exit(1);
  });
};

// Handle uncaught exceptions
export const handleUncaughtException = (logger?: Logger) => {
  process.on('uncaughtException', (error: Error) => {
    if (logger) {
      logger.error('Uncaught Exception:', error);
    } else {
      console.error('Uncaught Exception:', error);
    }
    
    // Close server gracefully
    process.exit(1);
  });
};

// Graceful shutdown
export const gracefulShutdown = (server: any, logger?: Logger) => {
  const shutdown = (signal: string) => {
    if (logger) {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
    } else {
      console.log(`Received ${signal}. Shutting down gracefully...`);
    }
    
    server.close(() => {
      if (logger) {
        logger.info('Process terminated');
      } else {
        console.log('Process terminated');
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}; 